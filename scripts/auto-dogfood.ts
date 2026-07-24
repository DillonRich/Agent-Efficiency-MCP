/**
 * Automated dogfood: install surface + mock gate turns + synthetic host outcomes.
 *
 * This does NOT claim Cursor first-call compliance (hosts can skip tools).
 * It proves the product loop end-to-end offline and validates dogfood tooling.
 *
 *   npm run auto-dogfood
 */
import { config as loadEnv } from "dotenv";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { BLUEPRINT_FILENAME } from "../src/constants.js";
import {
  gatherWorkspaceContext,
  writeAgentIntent,
} from "../src/context.js";
import { generateOptimizedBlueprint } from "../src/engine.js";
import { buildFreezeMessage } from "../src/freeze.js";
import { runDoctor, formatDoctorReport } from "../src/doctor.js";
import {
  installCursorRulesFile,
  installHostGuidance,
  mergeLegacyRuleFiles,
} from "../src/install/rules.js";
import {
  mergeMcpConfig,
  resolveHostTargets,
} from "../src/install/mcp-hosts.js";
import { parseDirectives } from "../src/directives.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: join(root, ".env") });

interface CaseRow {
  id: string;
  type: string;
  prompt: string;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  process.env.REWRITE_PROVIDER = "mock";
  process.env.PROMPT_MCP_SMOKE_OFFLINE = "1";
  delete process.env.PROMPT_MCP_DRY_RUN;

  const packageRoot = root;
  const project = mkdtempSync(join(tmpdir(), "aee-dogfood-"));
  const outDir = join(root, "fixtures", "dogfood");
  mkdirSync(outDir, { recursive: true });

  const report: Record<string, unknown> = {
    started: new Date().toISOString(),
    project,
    steps: [] as string[],
    turns: [] as unknown[],
    ok: false,
  };

  try {
    writeFileSync(join(project, "package.json"), '{"name":"dogfood-demo"}\n');
    writeFileSync(join(project, "AGENTS.md"), "# Dogfood demo\n");
    mkdirSync(join(project, "src"), { recursive: true });
    writeFileSync(join(project, "src", "app.ts"), "export const x = 1;\n");

    // 1) Install surface (same functions as CLI init)
    const rules = installCursorRulesFile(project);
    mergeLegacyRuleFiles(project);
    installHostGuidance(project);
    const cursor = resolveHostTargets(project).find((t) => t.id === "cursor-project");
    assert(cursor, "cursor-project target missing");
    mergeMcpConfig(cursor, join(packageRoot, "dist", "server.js"), {}, {
      write: true,
      onlyIfHostDirExists: false,
      launch: "node",
      cliJsAbs: join(packageRoot, "dist", "cli.js"),
    });
    report.steps = [...(report.steps as string[]), "install"];

    const doctor = runDoctor({ packageRoot, projectRoot: project });
    writeFileSync(
      join(outDir, "auto-doctor.txt"),
      formatDoctorReport(doctor),
      "utf8",
    );
    assert(
      doctor.findings.some((f) => /PRIORITY 0/i.test(f.message)),
      "doctor must see PRIORITY 0 rules",
    );
    report.steps = [...(report.steps as string[]), "doctor"];

    // 2) Simulated host turns over eval cases
    const cases = JSON.parse(
      readFileSync(join(root, "fixtures/eval/cases.json"), "utf8"),
    ) as CaseRow[];

    let gateEligible = 0;
    let called = 0;
    let recovered = 0;
    let skipped = 0;
    const csvLines = ["date,host,expected,outcome,notes"];

    for (const c of cases) {
      const directives = parseDirectives(c.prompt);
      const expectedGate = !directives.ignore && !directives.help;

      // Deterministic synthetic host behavior for tooling validation:
      // - ignore/help: expected=no
      // - E03 follow-ups: first "skip", then recovery call (tests recovery path)
      // - everything else: called on first attempt
      let outcome: "called" | "skipped" | "recovered" | "n/a" = "n/a";
      let freezeOk = false;

      if (!expectedGate) {
        outcome = "n/a";
        const r = await generateOptimizedBlueprint(
          c.prompt,
          gatherWorkspaceContext(project, { rawPrompt: c.prompt }),
          "mock",
        );
        assert(r.ignored || r.helpOnly || r.skipWrite, `${c.id} should skip write`);
        csvLines.push(
          `${new Date().toISOString().slice(0, 10)},auto,no,n/a,${c.id} exempt`,
        );
      } else {
        gateEligible += 1;
        const simulateSkipFirst = c.id === "E03";

        if (simulateSkipFirst) {
          // Host "skipped" then recovery
          skipped += 1; // first attempt skipped (simulated)
          recovered += 1;
          outcome = "recovered";
        } else {
          called += 1;
          outcome = "called";
        }

        const ctx = gatherWorkspaceContext(project, {
          forcedFiles: directives.files,
          forcedMedia: directives.media,
          scopes: directives.scopes,
          rawPrompt: c.prompt,
        });
        const r = await generateOptimizedBlueprint(c.prompt, ctx, "mock");
        assert(!r.ignored && !r.helpOnly, `${c.id} should optimize`);
        assert(r.blueprint.length > 80, `${c.id} empty blueprint`);

        const written = writeAgentIntent(project, r.blueprint);
        const freeze = buildFreezeMessage(written, r.blueprint);
        freezeOk =
          /Type GO to proceed/i.test(freeze) &&
          /hard checkpoint/i.test(freeze) &&
          existsSync(written);
        assert(freezeOk, `${c.id} freeze contract failed`);

        const arch = r.blueprint.match(/archetype:\s*(\S+)/i);

        csvLines.push(
          `${new Date().toISOString().slice(0, 10)},auto,yes,${outcome},${c.id} freeze_ok=${freezeOk}`,
        );

        (report.turns as unknown[]).push({
          id: c.id,
          outcome,
          freezeOk,
          provider: r.provider,
          model: r.model,
          archetype: arch?.[1] || "n/a",
          blueprintChars: r.blueprint.length,
        });
      }
    }

    const firstCallRate = gateEligible ? called / gateEligible : 0;
    const withRecovery =
      gateEligible ? (called + recovered) / gateEligible : 0;

    // Auto dogfood log (tracked sample for CI tooling)
    const autoCsv = join(outDir, "auto-gate-log.csv");
    writeFileSync(autoCsv, csvLines.join("\n") + "\n", "utf8");

    // 3) dogfood-summary against the auto log
    const tsxCli = join(root, "node_modules", "tsx", "dist", "cli.mjs");
    const summary2 = spawnSync(
      process.execPath,
      [tsxCli, join(root, "scripts/dogfood-summary.ts"), "--file", autoCsv],
      { encoding: "utf8", cwd: root },
    );
    const summaryOut = `${summary2.stdout || ""}\n${summary2.stderr || ""}`;
    assert(
      summary2.status === 0 || summary2.status === 1,
      `dogfood-summary spawn failed: ${summaryOut}`,
    );
    assert(/first_call_rate/i.test(summaryOut), `dogfood-summary failed:\n${summaryOut}`);
    report.steps = [...(report.steps as string[]), "dogfood-summary"];

    // 4) History exists after multiple writes
    const hist = join(project, ".promptmcp", "history");
    const histCount = existsSync(hist)
      ? readdirSync(hist).filter((f) => f.endsWith(".md")).length
      : 0;

    // Rule self-check: zero-token language present
    const ruleBody = readFileSync(rules, "utf8");
    assert(/ZERO.?TOKEN|first action this turn MUST/i.test(ruleBody), "stale rules");

    report.ok = true;
    report.metrics = {
      gateEligible,
      called,
      recovered,
      skippedSimulated: skipped,
      first_call_rate: Number(firstCallRate.toFixed(3)),
      with_recovery: Number(withRecovery.toFixed(3)),
      historyArchives: histCount,
      blueprint: join(project, BLUEPRINT_FILENAME),
    };
    report.summary = summaryOut.trim();
    report.finished = new Date().toISOString();
    report.note =
      "Synthetic host outcomes validate tooling only. Real Cursor first-call rate still needs personal dogfood.";

    writeFileSync(
      join(outDir, "auto-results.json"),
      JSON.stringify(report, null, 2),
      "utf8",
    );

    console.log("Automated dogfood PASS");
    console.log(JSON.stringify(report.metrics, null, 2));
    console.log(summaryOut.trim());
    console.log(`Artifacts: ${outDir}`);
  } catch (err) {
    report.ok = false;
    report.error = err instanceof Error ? err.message : String(err);
    writeFileSync(
      join(outDir, "auto-results.json"),
      JSON.stringify(report, null, 2),
      "utf8",
    );
    console.error("Automated dogfood FAIL:", report.error);
    process.exitCode = 1;
  } finally {
    // Keep temp project path in report; clean disk
    try {
      rmSync(project, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

main();
