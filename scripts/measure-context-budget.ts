import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gatherWorkspaceContext } from "../src/context.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lean = gatherWorkspaceContext(root, {
  rawPrompt:
    "Add input validation to the login form and show errors under each field",
});
const rich = gatherWorkspaceContext(root, {
  rawPrompt: "What should we do next",
});
const std = gatherWorkspaceContext(root, {
  rawPrompt: "Harden error handling across the MCP server without inventing files",
});

const reduction =
  rich.contextBytes > 0
    ? Number(
        (
          ((rich.contextBytes - lean.contextBytes) / rich.contextBytes) *
          100
        ).toFixed(1),
      )
    : 0;

const out = {
  timestamp: new Date().toISOString(),
  lean: { budget: lean.contextBudget, bytes: lean.contextBytes },
  standard: { budget: std.contextBudget, bytes: std.contextBytes },
  rich: { budget: rich.contextBudget, bytes: rich.contextBytes },
  lean_vs_rich_reduction_pct: reduction,
  target_reduction_pct: 15,
  target_met: reduction >= 15,
};

const dest = join(root, "fixtures/eval/results/context-budget-latest.json");
writeFileSync(dest, JSON.stringify(out, null, 2), "utf8");
console.error(JSON.stringify(out, null, 2));
console.error(`Wrote ${dest}`);
