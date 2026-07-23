/**
 * Archetype-driven context budgets — cut token waste for concrete asks,
 * keep richer signals for vague / planning prompts.
 */
import type { PromptArchetype } from "./archetype.js";
import { classifyPromptArchetype } from "./archetype.js";

export type ContextBudgetMode = "lean" | "standard" | "rich";

export interface ContextBudget {
  mode: ContextBudgetMode;
  maxWalkFiles: number;
  maxWalkDepth: number;
  maxTopLevel: number;
  docSnippetChars: number;
  maxDocTotalChars: number;
  forcedFileChars: number;
  maxForcedSnippets: number;
  gitLogLines: number;
  gitChangedCap: number;
  /** Prefer export/signature skeleton when forced file exceeds this */
  skeletonThreshold: number;
  includeDocSnippets: boolean;
  includeGitLog: boolean;
}

const LEAN: ContextBudget = {
  mode: "lean",
  maxWalkFiles: 60,
  maxWalkDepth: 2,
  maxTopLevel: 40,
  docSnippetChars: 1200,
  maxDocTotalChars: 3500,
  forcedFileChars: 2500,
  maxForcedSnippets: 6,
  gitLogLines: 3,
  gitChangedCap: 25,
  skeletonThreshold: 1800,
  includeDocSnippets: false,
  includeGitLog: false,
};

const STANDARD: ContextBudget = {
  mode: "standard",
  maxWalkFiles: 120,
  maxWalkDepth: 3,
  maxTopLevel: 60,
  docSnippetChars: 3500,
  maxDocTotalChars: 12000,
  forcedFileChars: 4000,
  maxForcedSnippets: 8,
  gitLogLines: 8,
  gitChangedCap: 80,
  skeletonThreshold: 3500,
  includeDocSnippets: true,
  includeGitLog: true,
};

const RICH: ContextBudget = {
  mode: "rich",
  maxWalkFiles: 140,
  maxWalkDepth: 3,
  maxTopLevel: 60,
  docSnippetChars: 4500,
  maxDocTotalChars: 14000,
  forcedFileChars: 4500,
  maxForcedSnippets: 8,
  gitLogLines: 12,
  gitChangedCap: 100,
  skeletonThreshold: 4000,
  includeDocSnippets: true,
  includeGitLog: true,
};

export function resolveContextBudget(
  rawPrompt?: string,
  tags?: PromptArchetype[],
): ContextBudget {
  const arch = tags?.length
    ? { tags }
    : classifyPromptArchetype(rawPrompt || "");

  const t = new Set(arch.tags);
  if (
    t.has("vague") ||
    t.has("planning") ||
    t.has("follow_up") ||
    t.has("long_ramble")
  ) {
    return { ...RICH };
  }
  if (
    t.has("concrete") ||
    (t.has("messy_polite") && !t.has("vague") && !t.has("overconstrained"))
  ) {
    // Concrete coding ask — lean context
    if (t.has("concrete") || (rawPrompt && rawPrompt.split(/\s+/).length < 40)) {
      return { ...LEAN };
    }
  }
  if (t.has("overconstrained") || t.has("contradictory") || t.has("multi_goal")) {
    return { ...STANDARD };
  }
  return { ...STANDARD };
}

/** Extract signature-ish lines for large source files */
export function skeletonizeSource(content: string, maxChars: number): string {
  const lines = content.split(/\r?\n/);
  const keep: string[] = [];
  const head = Math.min(40, lines.length);
  for (let i = 0; i < head; i++) keep.push(lines[i]);

  const sig =
    /^(export\s+|async\s+function|function\s+|class\s+|interface\s+|type\s+|const\s+\w+\s*=|def\s+|fn\s+|pub\s+)/;
  for (let i = head; i < lines.length; i++) {
    if (sig.test(lines[i].trim())) keep.push(lines[i]);
  }

  let out = keep.join("\n");
  if (out.length > maxChars) out = out.slice(0, maxChars);
  return `${out}\n\n…[skeleton: signatures/head only; full file not inlined]`;
}
