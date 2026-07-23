import { CENTRAL_COMPRESSION_PROMPT } from "./types.js";
import type { DirectiveSet } from "../directives.js";
import { buildDirectiveModifiers } from "../directives.js";
import {
  buildArchetypeStrategy,
  classifyPromptArchetype,
  type ArchetypeResult,
} from "../quality/archetype.js";

/**
 * Shared quality rubric appended to every provider dialect.
 * Factual checks only — no time-saved claims.
 */
export const QUALITY_RUBRIC = `
## SELF-CHECK BEFORE YOU FINISH (mandatory)
- [ ] Absolute Objective is ONE imperative sentence (≤ ~240 chars).
- [ ] Section 2 includes at least one Non-goals / out-of-scope bullet when the ask is vague, huge, or conflicting.
- [ ] Section 3 paths appear in Known Path Tokens / Forced User Files — never invented; ≤ 6 bullets unless forced paths require more.
- [ ] Every Forced User File and Forced Media path is cited.
- [ ] Every Forced Research URL is listed (if any).
- [ ] No fenced code blocks (\`\`\`) and no application source code.
- [ ] Verification Checkpoints are concrete and testable (mention test/typecheck/build/observable behavior).
- [ ] No tour language ("explore the codebase", "look around", "read everything").
- [ ] No "minutes saved" / "hours saved" / fake productivity estimates.
- [ ] Output matches the required markdown section headers (1–4) plus approval footer.
`;

/** Provider-specific instruction dialect for higher format compliance */
const DIALECTS: Record<string, string> = {
  deepseek: `
## PROVIDER DIALECT (DeepSeek)
Be maximally dense and literal. Prefer short bullets. Do not narrate your reasoning.
If unsure about a path, omit it rather than inventing one.
Always include a Non-goals bullet.
`,

  openai: `
## PROVIDER DIALECT (OpenAI)
Treat the template as a strict schema. Fill every required section.
Prefer precise engineering verbs (Implement, Extract, Validate, Wire, Guard).
Do not add preamble outside the template.
`,

  anthropic: `
## PROVIDER DIALECT (Anthropic / Claude)
You will output ONLY the blueprint markdown — no preamble, no apology, no "here is".
Obey path constraints even when the user prompt is vague; use Forced File contents as ground truth when present.
When LONG mode is on, use numbered phases under Requirements and expand Verification.
State Non-goals explicitly.
`,

  gemini: `
## PROVIDER DIALECT (Gemini)
Follow the section headers exactly (including numbering).
Keep Absolute Objective to a single line.
List only paths that appear in the provided context blocks.
Avoid speculative architecture outside the workspace signals.
Include Non-goals.
`,

  xai: `
## PROVIDER DIALECT (xAI / Grok)
Be blunt and structural. No jokes, no asides.
Fill the template completely. Cite forced paths even if you think they are unimportant.
Do not invent directories. Include Non-goals.
`,

  local: `
## PROVIDER DIALECT (local / small model)
Keep output SHORT and STRICT.
Use the exact headers below. Do not add extra sections except Media / Research if forced.
Absolute Objective = one sentence.
Section 3 = only paths from the known list (max 4 if unsure).
Include one Non-goals bullet. No code fences. No time estimates.
`,

  openai_compat: `
## PROVIDER DIALECT (OpenAI-compatible endpoint)
Treat this as a JSON-less structured markdown schema.
Reproduce the four numbered sections and the GO approval footer exactly.
Never invent file paths. Include Non-goals.
`,
};

export function buildSystemPrompt(
  providerName: string,
  directives: DirectiveSet,
  archetype?: ArchetypeResult,
): string {
  const key = providerName.toLowerCase();
  const dialect =
    DIALECTS[key] ||
    (key.includes("local") || key.includes("ollama")
      ? DIALECTS.local
      : DIALECTS.openai_compat);

  const arch =
    archetype ||
    classifyPromptArchetype(directives.cleanedPrompt || "");

  return (
    CENTRAL_COMPRESSION_PROMPT +
    dialect +
    QUALITY_RUBRIC +
    buildArchetypeStrategy(arch) +
    buildDirectiveModifiers(directives)
  );
}

export function buildRepairUserMessage(options: {
  previousOutput: string;
  errors: string[];
  warnings: string[];
}): string {
  return `Your previous blueprint FAILED validation. Fix it and output a COMPLETE corrected blueprint only (no apology).

Validation errors:
${options.errors.map((e) => `- ${e}`).join("\n") || "- (none)"}

Warnings to address:
${options.warnings.map((w) => `- ${w}`).join("\n") || "- (none)"}

Previous output:
${options.previousOutput}

Rules: keep required sections 1–4, include Non-goals, no code fences, only known/forced paths, no tour language, no time-saved claims, one-sentence Absolute Objective.`;
}
