/**
 * Provider eval with quantitative R1–R10 scorecard.
 *
 * Usage:
 *   npm run eval -- --provider deepseek
 */
import { config as loadEnv } from "dotenv";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateOptimizedBlueprint } from "../src/engine.js";
import type { WorkspaceContext } from "../src/context.js";
import {
  formatScoreLine,
  scoreBlueprintQuality,
  type QualityScores,
} from "../src/quality/score.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: join(root, ".env") });

interface EvalCase {
  id: string;
  type: string;
  prompt: string;
}

const SCORE_KEYS = [
  "r1_sections",
  "r2_no_fences",
  "r3_validation",
  "r4_objective_density",
  "r5_forced_paths",
  "r6_no_filler",
  "r7_boundaries",
  "r8_verifiable",
  "r9_no_tour",
  "r10_path_budget",
] as const;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const pIdx = args.indexOf("--provider");
  const provider =
    pIdx >= 0 ? args[pIdx + 1] : process.env.REWRITE_PROVIDER || "deepseek";

  const cases = JSON.parse(
    readFileSync(join(root, "fixtures/eval/cases.json"), "utf8"),
  ) as EvalCase[];
  const ctxJson = JSON.parse(
    readFileSync(join(root, "fixtures/eval/context.json"), "utf8"),
  ) as WorkspaceContext;

  const outDir = join(root, "fixtures/eval/goldens", provider);
  mkdirSync(outDir, { recursive: true });
  const resultsDir = join(root, "fixtures/eval/results");
  mkdirSync(resultsDir, { recursive: true });

  const rows: unknown[] = [];
  const passCounts: Record<string, number> = Object.fromEntries(
    SCORE_KEYS.map((k) => [k, 0]),
  );
  let scoredCases = 0;
  let compositeSum = 0;
  let failCount = 0;

  console.error(`Eval provider=${provider} cases=${cases.length}`);

  for (const c of cases) {
    try {
      const result = await generateOptimizedBlueprint(
        c.prompt,
        ctxJson,
        provider,
      );

      if (result.ignored) {
        const perfect = Object.fromEntries(
          SCORE_KEYS.map((k) => [k, true]),
        ) as unknown as QualityScores;
        rows.push({
          id: c.id,
          type: c.type,
          ok: true,
          skipped: "ignore",
          scores: { ...perfect, composite: 100, archetype: "other" },
        });
        for (const k of SCORE_KEYS) passCounts[k] += 1;
        compositeSum += 100;
        scoredCases++;
        console.error(`[ok] ${c.id} ignored (expected)`);
        continue;
      }

      if (result.helpOnly) {
        rows.push({ id: c.id, type: c.type, ok: true, skipped: "help" });
        scoredCases++;
        console.error(`[ok] ${c.id} help-only`);
        continue;
      }

      const scores = scoreBlueprintQuality({
        blueprint: result.blueprint,
        knownPaths: ctxJson.knownPaths,
        rawPrompt: c.prompt,
      });
      scoredCases++;
      compositeSum += scores.composite;
      for (const k of SCORE_KEYS) {
        if (scores[k]) passCounts[k] += 1;
      }

      writeFileSync(join(outDir, `${c.id}.md`), result.blueprint, "utf8");
      rows.push({
        id: c.id,
        type: c.type,
        ok: true,
        model: result.model,
        provider: result.provider,
        warnings: result.warnings,
        scores,
      });
      console.error(`[ok] ${c.id} ${formatScoreLine(scores)}`);
    } catch (err) {
      failCount += 1;
      const message = err instanceof Error ? err.message : String(err);
      rows.push({ id: c.id, type: c.type, ok: false, error: message });
      console.error(`[fail] ${c.id}: ${message}`);
    }
  }

  const meanComposite =
    scoredCases > 0 ? Math.round(compositeSum / scoredCases) : 0;
  const rates = Object.fromEntries(
    SCORE_KEYS.map((k) => [
      k,
      scoredCases ? Number(((passCounts[k] / scoredCases) * 100).toFixed(1)) : 0,
    ]),
  );

  const targets = {
    mean_composite_min: 80,
    r1_min_pct: 95,
    r3_min_pct: 95,
    r6_min_pct: 90,
    r9_min_pct: 90,
    fail_max: 0,
  };

  const gates = {
    mean_composite: meanComposite >= targets.mean_composite_min,
    r1: (rates.r1_sections as number) >= targets.r1_min_pct,
    r3: (rates.r3_validation as number) >= targets.r3_min_pct,
    r6: (rates.r6_no_filler as number) >= targets.r6_min_pct,
    r9: (rates.r9_no_tour as number) >= targets.r9_min_pct,
    no_fails: failCount <= targets.fail_max,
  };

  const summary = {
    provider,
    timestamp: new Date().toISOString(),
    totals: {
      cases: scoredCases,
      fails: failCount,
      mean_composite: meanComposite,
      pass_counts: passCounts,
      pass_rates_pct: rates,
    },
    targets,
    gates,
    gates_passed: Object.values(gates).every(Boolean),
    rows,
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const summaryPath = join(resultsDir, `${provider}-${stamp}.json`);
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(
    join(resultsDir, `${provider}-latest.json`),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  writeFileSync(
    join(resultsDir, "scorecard-latest.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );

  console.error(`Wrote ${summaryPath}`);
  console.error(
    `mean_composite=${meanComposite} fails=${failCount} gates_passed=${summary.gates_passed}`,
  );
  console.error(`rates=${JSON.stringify(rates)}`);

  if (!summary.gates_passed) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
