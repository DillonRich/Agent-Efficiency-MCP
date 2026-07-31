/**
 * Summarize personal gate dogfood CSV (fixtures/dogfood/gate-log.csv).
 *
 * Usage:
 *   npm run dogfood-summary
 *   npm run dogfood-summary -- --file fixtures/dogfood/gate-log.csv
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(",").map((c) => c.trim()));
}

function main(): void {
  const args = process.argv.slice(2);
  const fIdx = args.indexOf("--file");
  const file =
    fIdx >= 0
      ? args[fIdx + 1]
      : join(root, "fixtures/dogfood/gate-log.csv");
  const template = join(root, "fixtures/dogfood/gate-log.template.csv");

  if (!existsSync(file)) {
    console.error(`No dogfood log at ${file}`);
    console.error(`Copy template: ${template}`);
    console.error("Copy fixtures/dogfood/gate-log.template.csv → gate-log.csv");
    process.exit(2);
  }

  const rows = parseCsv(readFileSync(file, "utf8"));
  if (rows.length < 2) {
    console.error("CSV has no data rows.");
    process.exit(2);
  }

  const header = rows[0].map((h) => h.toLowerCase());
  const expectedIdx = header.indexOf("expected");
  const outcomeIdx = header.indexOf("outcome");
  if (expectedIdx < 0 || outcomeIdx < 0) {
    console.error("CSV needs columns: expected, outcome");
    process.exit(2);
  }

  let expectedYes = 0;
  let called = 0;
  let skipped = 0;
  let recovered = 0;

  for (const row of rows.slice(1)) {
    const expected = (row[expectedIdx] || "").toLowerCase();
    const outcome = (row[outcomeIdx] || "").toLowerCase();
    if (expected !== "yes") continue;
    expectedYes += 1;
    if (outcome === "called") called += 1;
    else if (outcome === "skipped") skipped += 1;
    else if (outcome === "recovered") recovered += 1;
  }

  const firstCallRate = expectedYes ? called / expectedYes : 0;
  const recoverRate = expectedYes
    ? (called + recovered) / expectedYes
    : 0;

  console.log(`Dogfood summary — ${file}`);
  console.log(`  expected=yes rows: ${expectedYes}`);
  console.log(`  called:            ${called}`);
  console.log(`  skipped:           ${skipped}`);
  console.log(`  recovered:         ${recovered}`);
  console.log(`  first_call_rate:   ${(firstCallRate * 100).toFixed(1)}% (target ≥ 70%)`);
  console.log(`  with_recovery:     ${(recoverRate * 100).toFixed(1)}%`);

  if (expectedYes < 20) {
    console.log(`  note: n=${expectedYes} < 20 — keep logging before claiming the gate target.`);
    process.exit(0);
  }
  if (firstCallRate < 0.7) {
    console.log("  result: BELOW TARGET — refresh rules via init; prefer @promptmcp:include + Agent mode.");
    process.exit(1);
  }
  console.log("  result: PASS (≥70% first-call)");
}

main();
