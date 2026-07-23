/**
 * Ensure Non-goals / anti-tour boundaries exist when archetype needs them.
 */
import type { ArchetypeResult } from "./archetype.js";

const BOUNDARY =
  /\b(non-?goals?|out of scope|do not\b|don't\b|must not\b|deferred)\b/i;
const TOUR =
  /\b(explore the (whole )?codebase|look around|read (all|every|the entire)|figure out where)\b/i;

function defaultNonGoals(archetype: ArchetypeResult): string {
  switch (archetype.primary) {
    case "vague":
      return "Non-goals: Do not tour unrelated modules; execute only the single next action grounded in recent git/docs signals.";
    case "overconstrained":
      return "Non-goals: Defer lower-priority / conflicting asks; do not expand into a full rewrite.";
    case "contradictory":
      return "Non-goals: Reject the larger/conflicting interpretation; keep the safer smaller slice only.";
    case "long_ramble":
      return "Non-goals: Ignore anecdotes and repeated restatements; no repo-wide cleanup.";
    case "multi_goal":
      return "Non-goals: Defer secondary goals listed outside Absolute Objective to a later GO cycle.";
    case "messy_polite":
      return "Non-goals: No drive-by refactors or style-only churn outside the objective.";
    default:
      return "Non-goals: Do not explore unrelated paths; stay within Targeted Codebase Vectors.";
  }
}

/**
 * Inject a Non-goals bullet into §2 when missing for needy archetypes.
 * Also strips obvious tour-language bullets when possible.
 */
export function ensureBoundaryBullets(
  blueprint: string,
  archetype: ArchetypeResult,
): { text: string; injected: boolean; strippedTour: boolean } {
  const needs = archetype.tags.some((t) =>
    [
      "vague",
      "overconstrained",
      "contradictory",
      "multi_goal",
      "long_ramble",
      "messy_polite",
    ].includes(t),
  );

  let text = blueprint;
  let strippedTour = false;

  // Soft-strip tour bullets
  const lines = text.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    if (/^\s*[-*]\s+/.test(line) && TOUR.test(line)) {
      strippedTour = true;
      return false;
    }
    return true;
  });
  text = filtered.join("\n");

  if (!needs || BOUNDARY.test(text)) {
    return { text, injected: false, strippedTour };
  }

  const reqHeader = /^##\s*2\.\s*Technical Requirements[^\n]*/im;
  if (!reqHeader.test(text)) {
    return { text, injected: false, strippedTour };
  }

  const bullet = `- ${defaultNonGoals(archetype)}`;
  text = text.replace(reqHeader, (m) => `${m}\n${bullet}`);
  return { text, injected: true, strippedTour };
}
