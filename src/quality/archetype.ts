/**
 * Classify messy user prompts so the rewriter can apply the right strategy.
 */
export type PromptArchetype =
  | "messy_polite"
  | "vague"
  | "overconstrained"
  | "contradictory"
  | "long_ramble"
  | "multi_goal"
  | "follow_up"
  | "concrete"
  | "planning"
  | "other";

export interface ArchetypeResult {
  primary: PromptArchetype;
  tags: PromptArchetype[];
  signals: string[];
}

const FILLER =
  /\b(please|thanks|thank you|kinda|sort of|somehow|super|really|just|maybe|i think|would you|could you|can you help)\b/gi;
const VAGUE =
  /\b(what should we|what next|improve (it|things|the code)|make it better|fix stuff|clean up|whatever|somehow|do something)\b/i;
const PLANNING =
  /\b(next steps|roadmap|blockers|hurdles|portfolio|priorit|strategy|plan)\b/i;
const FOLLOW_UP =
  /\b(expand on|tell me more|go deeper|what about|also|building on|as above|the blockers)\b/i;
const MULTI =
  /\b(and also|as well as|;|then also)\b/i;

export function classifyPromptArchetype(rawPrompt: string): ArchetypeResult {
  const text = rawPrompt.trim();
  const tags: PromptArchetype[] = [];
  const signals: string[] = [];
  const words = text.split(/\s+/).filter(Boolean).length;
  const fillerHits = (text.match(FILLER) || []).length;

  if (fillerHits >= 2 || /\b(clean|elegant|beautiful|nice)\b/i.test(text)) {
    tags.push("messy_polite");
    signals.push(`filler_hits=${fillerHits}`);
  }
  if (VAGUE.test(text) || words <= 6) {
    tags.push("vague");
    signals.push("vague_or_tiny");
  }
  if (PLANNING.test(text)) {
    tags.push("planning");
    signals.push("planning_language");
  }
  if (FOLLOW_UP.test(text)) {
    tags.push("follow_up");
    signals.push("follow_up_language");
  }
  if (words >= 120 || text.length >= 700) {
    tags.push("long_ramble");
    signals.push(`words=${words}`);
  }

  // Overconstrained: many must/should/never + comma lists
  const constraintHits = (
    text.match(/\b(must|should|never|always|don't|do not|cannot|need to|have to)\b/gi) ||
    []
  ).length;
  if (constraintHits >= 5 || (constraintHits >= 3 && text.includes(","))) {
    tags.push("overconstrained");
    signals.push(`constraint_hits=${constraintHits}`);
  }

  // Contradictory: both do X and don't do X patterns / long+short style
  if (
    (/\balways\b/i.test(text) && /\bnever\b/i.test(text)) ||
    (/\bmust\b/i.test(text) && /\bmust not\b/i.test(text)) ||
    (/\bkeep it simple\b/i.test(text) && /\benterprise|comprehensive|full suite\b/i.test(text)) ||
    (/\bno tests\b/i.test(text) && /\badd tests\b/i.test(text))
  ) {
    tags.push("contradictory");
    signals.push("contradiction_pattern");
  }

  if (MULTI.test(text) && words >= 25) {
    tags.push("multi_goal");
    signals.push("multi_goal_language");
  }

  if (
    tags.length === 0 &&
    /\b(add|fix|implement|create|update|wire|refactor|remove)\b/i.test(text)
  ) {
    tags.push("concrete");
    signals.push("imperative_coding");
  }

  if (tags.length === 0) tags.push("other");

  // Primary priority
  const priority: PromptArchetype[] = [
    "contradictory",
    "overconstrained",
    "vague",
    "long_ramble",
    "multi_goal",
    "follow_up",
    "messy_polite",
    "planning",
    "concrete",
    "other",
  ];
  const primary =
    priority.find((p) => tags.includes(p)) || tags[0] || "other";

  return { primary, tags: [...new Set(tags)], signals };
}

/** Strategy block injected into the rewrite system prompt */
export function buildArchetypeStrategy(archetype: ArchetypeResult): string {
  const blocks: string[] = [
    `\n## PROMPT ARCHETYPE\nPrimary: ${archetype.primary}\nTags: ${archetype.tags.join(", ")}\n`,
  ];

  const strategies: Partial<Record<PromptArchetype, string>> = {
    messy_polite: `
### Strategy: messy / polite
- Strip all pleasantries and aesthetic adjectives (clean, elegant, beautiful).
- Convert vibes into concrete engineering outcomes.
- Prefer one small, verifiable deliverable over a vague "helper".
`,
    vague: `
### Strategy: vague
- Ground the task in workspace signals (git changes, README, stack hints).
- Pick ONE concrete next action the coding agent can execute after GO.
- Add explicit Non-goals so the agent does not tour the whole repo.
- Prefer "read these N paths" over "explore the codebase".
`,
    overconstrained: `
### Strategy: overconstrained
- Extract the true primary outcome in Absolute Objective.
- Turn the constraint pile into a short bullet list; drop duplicates.
- Add Non-goals for lower-priority asks that would cause scope creep.
- If constraints conflict, keep the safer / smaller interpretation and note the conflict under Requirements.
`,
    contradictory: `
### Strategy: contradictory
- Detect the conflict explicitly in Requirements (one bullet starting with CONFLICT:).
- Choose the interpretation that is smaller, safer, and verifiable.
- Put the rejected interpretation in Non-goals.
`,
    long_ramble: `
### Strategy: long ramble
- Compress ruthlessly. Keep only actionable constraints and acceptance criteria.
- Absolute Objective = one sentence covering the single primary outcome.
- Drop anecdotes, history, and repeated restatements.
`,
    multi_goal: `
### Strategy: multi-goal
- Select ONE primary goal for this GO cycle.
- List remaining goals as Non-goals / deferred (do not implement now).
- Keep Targeted Codebase Vectors ≤ 6 paths for this slice.
`,
    follow_up: `
### Strategy: follow-up
- Treat as a fresh task still — do not assume prior chat memory beyond the prompt text.
- Infer the missing subject from workspace signals if the prompt is anaphoric ("the blockers").
- Produce a self-contained blueprint the agent can execute alone.
`,
    planning: `
### Strategy: planning
- Convert advice into an executable engineering plan with ordered phases under Requirements.
- Each Verification Checkpoint must be observable (command, file state, or checklist item).
- Still no application source code.
`,
    concrete: `
### Strategy: concrete
- Preserve the user's specific ask; do not expand scope.
- Add Non-goals only when needed to prevent common overreach.
- Include a concrete verification command when the stack is known (e.g. npm test / npm run typecheck).
`,
  };

  for (const t of archetype.tags) {
    if (strategies[t]) blocks.push(strategies[t]!);
  }
  if (!archetype.tags.some((t) => strategies[t])) {
    blocks.push(strategies.concrete!);
  }

  blocks.push(`
### Token-efficiency rules (all archetypes)
- Ban open-ended tours: never tell the agent to "read the whole codebase" or "look around".
- Cap Targeted Codebase Vectors at 6 high-signal paths (plus forced paths).
- Prefer reference-implementation pointers ("mirror pattern in X") over long prose.
- Every Requirement bullet must constrain behavior or scope — no filler.
`);

  return blocks.join("\n");
}
