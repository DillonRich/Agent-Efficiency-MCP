/**
 * Quantitative blueprint quality scoring (R1–R10 + composite).
 * Deterministic — no LLM judge required.
 */
import { parseDirectives } from "../directives.js";
import { validateAndSanitizeBlueprint } from "../validate.js";
import {
  classifyPromptArchetype,
  type PromptArchetype,
} from "./archetype.js";

export interface QualityScores {
  r1_sections: boolean;
  r2_no_fences: boolean;
  r3_validation: boolean;
  r4_objective_density: boolean;
  r5_forced_paths: boolean;
  r6_no_filler: boolean;
  r7_boundaries: boolean;
  r8_verifiable: boolean;
  r9_no_tour: boolean;
  r10_path_budget: boolean;
  invent_stripped: number;
  objective_sentences: number;
  section3_bullets: number;
  compression_ratio: number;
  composite: number;
  archetype: PromptArchetype;
  archetype_tags: PromptArchetype[];
}

const FILLER_IN_OUTPUT =
  /\b(please|thanks|thank you|super clean|elegant|beautiful|kinda|somehow)\b/i;
const TOUR =
  /\b(explore the (whole )?codebase|look around|read (all|every|the entire)|figure out where|browse (all|everything)|search the project)\b/i;
const BOUNDARY =
  /\b(non-?goals?|out of scope|do not\b|don't\b|must not\b|leave alone|no refactor|deferred)\b/i;

function extractSection(blueprint: string, n: number, title: string): string {
  const re = new RegExp(
    `##\\s*${n}\\.\\s*${title}[\\s\\S]*?(?=\\n##\\s*\\d+\\.|\\n---\\s*|$)`,
    "i",
  );
  return blueprint.match(re)?.[0] ?? "";
}

export function scoreBlueprintQuality(options: {
  blueprint: string;
  knownPaths: string[];
  rawPrompt: string;
}): QualityScores {
  const { blueprint, knownPaths, rawPrompt } = options;
  const directives = parseDirectives(rawPrompt);
  const archetype = classifyPromptArchetype(directives.cleanedPrompt || rawPrompt);

  const validated = validateAndSanitizeBlueprint(blueprint, knownPaths, {
    forcedPaths: [...directives.files, ...directives.media],
    strict: directives.strict,
  });

  const r1_sections =
    /Absolute Objective/i.test(blueprint) &&
    /Technical Requirements/i.test(blueprint) &&
    /Targeted Codebase Vectors/i.test(blueprint) &&
    /Verification Checkpoints/i.test(blueprint);

  const r2_no_fences = !/```/.test(validated.blueprint);
  const inventMatch = validated.warnings.join(" ").match(/Stripped (\d+)/);
  const invent_stripped = Number(inventMatch?.[1] || 0);
  const r3_validation = validated.ok && validated.errors.length === 0;

  const objectiveMatch = validated.blueprint.match(
    /##\s*1\.\s*Absolute Objective\s*\n+([\s\S]*?)(?=\n##\s*2\.|$)/i,
  );
  const objective = objectiveMatch?.[1]?.trim() ?? "";
  // Mask paths / code so `src/server.ts` does not count as sentence breaks
  const objectiveForSentences = objective
    .replace(/`[^`]+`/g, "PATH")
    .replace(/\b[\w@.-]+\.[A-Za-z][A-Za-z0-9]{0,7}\b/g, "PATH");
  const objective_sentences = objectiveForSentences
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
  const r4_objective_density =
    objective_sentences > 0 &&
    objective_sentences <= 2 &&
    objective.length <= 320;

  const forced = [...directives.files, ...directives.media];
  const r5_forced_paths =
    forced.length === 0 ||
    forced.every((f) =>
      validated.blueprint
        .toLowerCase()
        .includes(f.replace(/\\/g, "/").toLowerCase()),
    );

  const r6_no_filler = !FILLER_IN_OUTPUT.test(validated.blueprint);

  const reqSection = extractSection(
    validated.blueprint,
    2,
    "Technical Requirements",
  );
  // Vague / overconstrained / contradictory need explicit boundaries
  const needsBoundary = archetype.tags.some((t) =>
    ["vague", "overconstrained", "contradictory", "multi_goal", "long_ramble"].includes(
      t,
    ),
  );
  const r7_boundaries = needsBoundary
    ? BOUNDARY.test(reqSection) || BOUNDARY.test(validated.blueprint)
    : true; // optional for concrete / planning

  const verifySection = extractSection(
    validated.blueprint,
    4,
    "Verification Checkpoints",
  );
  const r8_verifiable =
    /^\s*[-*]\s*\[[ x]\]/im.test(verifySection) &&
    /\b(test|typecheck|build|lint|compile|run|assert|npm|pass|fail|error)\b/i.test(
      verifySection,
    );

  const r9_no_tour = !TOUR.test(validated.blueprint);

  const vectors = extractSection(
    validated.blueprint,
    3,
    "Targeted Codebase Vectors",
  );
  const section3_bullets = (vectors.match(/^\s*[-*]\s+/gm) || []).length;
  const forcedCount = forced.length;
  const r10_path_budget = section3_bullets <= Math.max(6, forcedCount + 2);

  const compression_ratio =
    rawPrompt.length > 0
      ? Number((validated.blueprint.length / rawPrompt.length).toFixed(3))
      : 0;

  const bools = [
    r1_sections,
    r2_no_fences,
    r3_validation,
    r4_objective_density,
    r5_forced_paths,
    r6_no_filler,
    r7_boundaries,
    r8_verifiable,
    r9_no_tour,
    r10_path_budget,
  ];
  const composite = Math.round(
    (bools.filter(Boolean).length / bools.length) * 100,
  );

  return {
    r1_sections,
    r2_no_fences,
    r3_validation,
    r4_objective_density,
    r5_forced_paths,
    r6_no_filler,
    r7_boundaries,
    r8_verifiable,
    r9_no_tour,
    r10_path_budget,
    invent_stripped,
    objective_sentences,
    section3_bullets,
    compression_ratio,
    composite,
    archetype: archetype.primary,
    archetype_tags: archetype.tags,
  };
}

export function formatScoreLine(s: QualityScores): string {
  const flags = [
    s.r1_sections && "R1",
    s.r2_no_fences && "R2",
    s.r3_validation && "R3",
    s.r4_objective_density && "R4",
    s.r5_forced_paths && "R5",
    s.r6_no_filler && "R6",
    s.r7_boundaries && "R7",
    s.r8_verifiable && "R8",
    s.r9_no_tour && "R9",
    s.r10_path_budget && "R10",
  ].filter(Boolean);
  return `composite=${s.composite} [${flags.join(",")}] archetype=${s.archetype}`;
}
