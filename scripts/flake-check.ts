/**
 * Run mock eval N times; fail if mean_composite variance > threshold.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runs = Number(process.argv[2] || "3");
const maxSpread = Number(process.env.PROMPT_MCP_FLAKE_MAX_SPREAD || "5");

const scores: number[] = [];
for (let i = 0; i < runs; i++) {
  const r = spawnSync(
    "npm",
    ["run", "eval", "--", "--provider", "mock"],
    { cwd: root, encoding: "utf8", shell: true, env: process.env },
  );
  if (r.status !== 0 && r.status !== 2) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  const latest = JSON.parse(
    readFileSync(join(root, "fixtures/eval/results/scorecard-latest.json"), "utf8"),
  ) as { totals?: { mean_composite?: number }; provider?: string };
  const mean = latest.totals?.mean_composite ?? 0;
  scores.push(mean);
  console.error(`run ${i + 1}/${runs}: mean_composite=${mean}`);
}

const min = Math.min(...scores);
const max = Math.max(...scores);
const spread = max - min;
const out = {
  timestamp: new Date().toISOString(),
  provider: "mock",
  runs: scores,
  min,
  max,
  spread,
  max_spread_allowed: maxSpread,
  pass: spread <= maxSpread,
};
mkdirSync(join(root, "fixtures/eval/results"), { recursive: true });
writeFileSync(
  join(root, "fixtures/eval/results/flake-latest.json"),
  JSON.stringify(out, null, 2),
  "utf8",
);
console.error(JSON.stringify(out, null, 2));
if (!out.pass) process.exit(2);
