/**
 * One iteration of the continuous quality improvement loop.
 * - unit tests + offline smoke
 * - optional live eval if key present and --eval
 * - writes fixtures/eval/results/SCORECARD.md snapshot (gitignored)
 *
 * Never pushes to git remotes.
 */
import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyPromptArchetype } from "../src/quality/archetype.js";
import { scoreBlueprintQuality } from "../src/quality/score.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: join(root, ".env") });

function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv): number {
  const r = spawnSync(cmd, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: true,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

function offlineFixtureSelfCheck(): {
  ok: boolean;
  lines: string[];
} {
  const lines: string[] = [];
  const cases = JSON.parse(
    readFileSync(join(root, "fixtures/eval/cases.json"), "utf8"),
  ) as Array<{ id: string; prompt: string }>;

  let ok = true;
  for (const c of cases) {
    const a = classifyPromptArchetype(c.prompt.replace(/@\w+:[^\s]+/g, ""));
    lines.push(`${c.id}: archetype=${a.primary} tags=${a.tags.join(",")}`);
  }

  // Synthetic blueprint quality sanity
  const good = `# 🎯 Current Task Blueprint: [ACTIVE]

## 1. Absolute Objective
Implement HTTP retry with backoff in src/http.ts only.

## 2. Technical Requirements & Boundary Rules
- Retry 429/5xx up to 2 times.
- Non-goals: do not redesign providers or touch README.
- Do not explore the whole repo.

## 3. Targeted Codebase Vectors
- \`src/http.ts\` -> edit
- \`src/providers/types.ts\` -> read-only reference

## 4. Verification Checkpoints
- [ ] npm test passes
- [ ] npm run typecheck passes

---
👉 **Awaiting Your Approval:**
GO
`;
  const known = ["src/http.ts", "src/providers/types.ts", "package.json"];
  const s = scoreBlueprintQuality({
    blueprint: good,
    knownPaths: known,
    rawPrompt:
      "Please somehow explore everything and make elegant retries thanks",
  });
  lines.push(`synthetic_good composite=${s.composite}`);
  if (s.composite < 80) {
    ok = false;
    lines.push("FAIL: synthetic good blueprint scored < 80");
  }

  const tourBad = good.replace(
    "Non-goals: do not redesign providers or touch README.",
    "Explore the whole codebase and figure out improvements.",
  );
  const bad = scoreBlueprintQuality({
    blueprint: tourBad,
    knownPaths: known,
    rawPrompt: "explore the whole codebase and improve whatever",
  });
  lines.push(`synthetic_tour_risk composite=${bad.composite} r9=${bad.r9_no_tour}`);
  if (bad.r9_no_tour) {
    ok = false;
    lines.push("FAIL: tour language should fail R9");
  }

  return { ok, lines };
}

async function main(): Promise<void> {
  const wantEval = process.argv.includes("--eval");
  const stamp = new Date().toISOString();
  console.error(`\n=== quality-loop ${stamp} ===`);

  let exit = 0;
  if (run("npm", ["run", "typecheck"]) !== 0) exit = 1;
  if (run("npm", ["test"]) !== 0) exit = 1;
  if (
    run("npm", ["run", "smoke"], { PROMPT_MCP_SMOKE_OFFLINE: "1" }) !== 0
  ) {
    exit = 1;
  }

  const self = offlineFixtureSelfCheck();
  for (const l of self.lines) console.error(l);
  if (!self.ok) exit = 1;

  // Always refresh trend + context budget metrics (offline)
  run("npm", ["run", "eval:mock"]);
  run("npm", ["run", "eval-trend"]);
  run("npm", ["run", "measure-context"]);

  let evalSummary: unknown = null;
  if (wantEval) {
    const code = run("npm", ["run", "eval", "--", "--provider", "deepseek"]);
    if (code !== 0 && code !== 2) exit = 1;
    const latest = join(root, "fixtures/eval/results/scorecard-latest.json");
    if (existsSync(latest)) {
      evalSummary = JSON.parse(readFileSync(latest, "utf8"));
    }
  } else if (existsSync(join(root, "fixtures/eval/results/scorecard-latest.json"))) {
    evalSummary = JSON.parse(
      readFileSync(join(root, "fixtures/eval/results/scorecard-latest.json"), "utf8"),
    );
  }

  const resultsDir = join(root, "fixtures/eval/results");
  mkdirSync(resultsDir, { recursive: true });
  const loopPath = join(resultsDir, "quality-loop-latest.json");
  const payload = {
    timestamp: stamp,
    exit,
    self_check_ok: self.ok,
    self_check: self.lines,
    eval: evalSummary,
    note: "No git push performed.",
  };
  writeFileSync(loopPath, JSON.stringify(payload, null, 2), "utf8");

  // Human-readable scorecard
  const scorecard = `# Scorecard (auto)

Updated: ${stamp}

## Offline gates
- typecheck / unit / smoke(offline): ${exit === 0 && self.ok ? "PASS" : "SEE LOGS"}
- archetype fixture classify: ${self.ok ? "PASS" : "FAIL"}

## Targets (live eval)
| Metric | Target |
|--------|--------|
| mean composite | ≥ 80 |
| R1 sections | ≥ 95% |
| R3 validation | ≥ 95% |
| R6 no filler | ≥ 90% |
| R9 no tour | ≥ 90% |
| hard fails | 0 |

${
  evalSummary
    ? `## Latest eval\n\`\`\`json\n${JSON.stringify(
        (evalSummary as { totals?: unknown; gates?: unknown }).totals ?? evalSummary,
        null,
        2,
      )}\n\`\`\`\n`
    : "## Latest eval\n_Not run this iteration (pass `--eval` when a provider key is available)._\n"
}

See [EVAL.md](./EVAL.md) and [QUALITY.md](./QUALITY.md).
`;
  const scorecardPath = join(root, "fixtures/eval/results/SCORECARD.md");
  mkdirSync(dirname(scorecardPath), { recursive: true });
  writeFileSync(scorecardPath, scorecard, "utf8");
  console.error(`Wrote ${scorecardPath} and ${loopPath}`);
  process.exit(exit);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
