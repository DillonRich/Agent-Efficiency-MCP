import type { WorkspaceContext } from "../context.js";
import type { RewriteProvider } from "./types.js";

/**
 * Deterministic offline rewriter for CI / no-key eval.
 * Produces a schema-valid dense blueprint from workspace signals only.
 */
export class MockProvider implements RewriteProvider {
  readonly name = "mock";
  readonly supportsVision = false;

  async generate(
    rawPrompt: string,
    context: WorkspaceContext,
    _options?: { systemPrompt?: string },
  ) {
    const cleaned = rawPrompt
      .replace(/@(?:promptmcp|mcp|ourmcp):[^\n]*/gi, "")
      .replace(
        /\b(explore the (whole )?codebase|look around|read (all|every|the entire)|figure out how everything works|improve whatever)\b/gi,
        "",
      )
      .replace(/\s+/g, " ")
      .trim();

    const hasConcreteVerb =
      /\b(add|fix|implement|create|update|wire|harden|refactor|diagnose)\b/i.test(
        cleaned,
      );
    const objectiveVerb = hasConcreteVerb
      ? cleaned.slice(0, 220)
      : "Execute one concrete engineering slice on the highest-signal paths from recent git changes and known project files";

    const objective =
      objectiveVerb.replace(/\.$/, "").slice(0, 300) +
      (objectiveVerb.length > 300 ? "…" : ".");

    const forced = [
      ...context.forcedFiles,
      ...context.forcedMedia,
    ];
    const candidates = [
      ...forced,
      ...context.gitDiff
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("…") && l !== "None detected"),
      ...context.knownPaths.filter((p) => /\.[a-z0-9]+$/i.test(p)),
    ];
    const vectors: string[] = [];
    const seen = new Set<string>();
    for (const p of candidates) {
      const n = p.replace(/\\/g, "/");
      if (seen.has(n.toLowerCase())) continue;
      if (n.includes("…")) continue;
      seen.add(n.toLowerCase());
      vectors.push(n);
      if (vectors.length >= 5) break;
    }
    if (vectors.length === 0) {
      vectors.push("package.json", "src/server.ts");
    }

    const vectorBlock = vectors
      .map(
        (p, i) =>
          `- \`${p}\` -> ${i === 0 ? "primary edit target" : "read-only reference / supporting path"}.`,
      )
      .join("\n");

    const content = `# 🎯 Current Task Blueprint: [ACTIVE]

## 1. Absolute Objective
${objective.endsWith(".") ? objective : objective + "."}

## 2. Technical Requirements & Boundary Rules
- Implement only what Absolute Objective states; prefer existing project patterns.
- Non-goals: Do not tour unrelated modules; no drive-by refactors outside Targeted Codebase Vectors.
- Do not invent file paths; stay within known/forced paths.
- Keep changes reviewable and verifiable with project scripts.

## 3. Targeted Codebase Vectors
${vectorBlock}

## 4. Verification Checkpoints
- [ ] npm run typecheck passes
- [ ] npm test passes (or add a focused assertion for this change)

---
👉 **Awaiting Your Approval:**
If this blueprint accurately maps your intention, reply with **"GO"** in the chat window.
If you want adjustments, modify this markdown file directly or type your adjustments in the chat before executing.
`;

    return { content, model: "mock-blueprint-v1" };
  }
}
