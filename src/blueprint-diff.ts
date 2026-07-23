/**
 * Summarize delta vs previous blueprint HUD for continuity + less rework.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveBlueprintFilename } from "./constants.js";

function extractSection(text: string, n: number, title: string): string {
  const re = new RegExp(
    `##\\s*${n}\\.\\s*${title}[\\s\\S]*?(?=\\n##\\s*\\d+\\.|\\n---\\s*|$)`,
    "i",
  );
  return (text.match(re)?.[0] ?? "").trim();
}

function bullets(section: string): string[] {
  return section
    .split(/\r?\n/)
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim());
}

export function readPreviousBlueprint(workspaceRoot: string): string | null {
  const name = resolveBlueprintFilename();
  const p = path.join(workspaceRoot, name);
  if (!fs.existsSync(p) || !fs.statSync(p).isFile()) return null;
  try {
    const body = fs.readFileSync(p, "utf8");
    if (/Waiting for first optimization/i.test(body) && body.length < 800) {
      return null;
    }
    return body;
  } catch {
    return null;
  }
}

/** Compact prior-blueprint summary for the rewrite user payload */
export function buildPriorBlueprintContext(previous: string): string {
  const obj = extractSection(previous, 1, "Absolute Objective")
    .replace(/^##\s*1\.\s*Absolute Objective\s*/i, "")
    .trim()
    .slice(0, 280);
  const reqs = bullets(extractSection(previous, 2, "Technical Requirements")).slice(
    0,
    6,
  );
  const paths = bullets(extractSection(previous, 3, "Targeted Codebase Vectors")).slice(
    0,
    6,
  );
  return [
    "Previous blueprint (for continuity — produce a fresh blueprint; note what changed):",
    obj ? `Prior objective: ${obj}` : "",
    reqs.length ? `Prior requirements:\n${reqs.map((r) => `- ${r}`).join("\n")}` : "",
    paths.length ? `Prior vectors:\n${paths.map((r) => `- ${r}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Append a short human-readable delta section after generation.
 */
export function appendBlueprintDelta(
  blueprint: string,
  previous: string | null,
): { text: string; added: boolean } {
  if (!previous) return { text: blueprint, added: false };

  const prevObj = extractSection(previous, 1, "Absolute Objective")
    .replace(/^##\s*1\.\s*Absolute Objective\s*/i, "")
    .trim();
  const nextObj = extractSection(blueprint, 1, "Absolute Objective")
    .replace(/^##\s*1\.\s*Absolute Objective\s*/i, "")
    .trim();
  const prevPaths = new Set(
    bullets(extractSection(previous, 3, "Targeted Codebase Vectors")).map((b) =>
      b.toLowerCase(),
    ),
  );
  const nextPaths = bullets(
    extractSection(blueprint, 3, "Targeted Codebase Vectors"),
  );
  const newPaths = nextPaths.filter((p) => !prevPaths.has(p.toLowerCase()));
  const dropped = [...prevPaths].filter(
    (p) => !nextPaths.some((n) => n.toLowerCase() === p),
  );

  const lines = [
    "",
    "## Delta vs previous blueprint",
    prevObj === nextObj
      ? "- Objective: unchanged intent (rewritten for this turn)."
      : `- Objective shifted: was “${prevObj.slice(0, 120)}${prevObj.length > 120 ? "…" : ""}”`,
    newPaths.length
      ? `- New vectors: ${newPaths.slice(0, 4).join(" | ")}`
      : "- New vectors: (none)",
    dropped.length
      ? `- Dropped prior vectors: ${dropped.slice(0, 4).join(" | ")}`
      : "- Dropped prior vectors: (none)",
  ];

  // Insert before approval footer if present
  if (/Awaiting Your Approval/i.test(blueprint)) {
    const text = blueprint.replace(
      /\n---\s*\n👉\s*\*\*Awaiting Your Approval/i,
      `${lines.join("\n")}\n\n---\n👉 **Awaiting Your Approval`,
    );
    return { text, added: true };
  }
  return { text: blueprint + "\n" + lines.join("\n") + "\n", added: true };
}
