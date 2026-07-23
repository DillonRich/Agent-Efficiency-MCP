/**
 * Deterministic polish pass — strip filler / boost verification language.
 */

/** Keep Absolute Objective to at most 2 sentences / 280 chars. */
export function tightenObjective(blueprint: string): {
  text: string;
  changed: boolean;
} {
  const re =
    /(##\s*1\.\s*Absolute Objective\s*\n+)([\s\S]*?)(?=\n##\s*2\.|$)/i;
  const m = blueprint.match(re);
  if (!m) return { text: blueprint, changed: false };
  let body = m[2].trim();
  const masked = body
    .replace(/`[^`]+`/g, "PATH")
    .replace(/\b[\w@.-]+\.[A-Za-z][A-Za-z0-9]{0,7}\b/g, "PATH");
  const sentences = masked
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Prefer keeping the original body when it is already a single dense sentence
  if (sentences.length <= 2 && body.length <= 320) {
    return { text: blueprint, changed: false };
  }
  // Fall back: take text before second real sentence boundary on original
  const parts = body.split(/(?<=[.!?])\s+(?=[A-Z])/).filter((s) => s.trim());
  body = parts.slice(0, 2).join(" ").trim();
  if (body.length > 320) body = body.slice(0, 317).trimEnd() + "…";
  const text = blueprint.replace(re, `$1${body}\n\n`);
  return { text, changed: true };
}

export function stripFillerLanguage(blueprint: string): {
  text: string;
  changed: boolean;
} {
  let text = blueprint;
  const before = text;
  // Soft removals that models sometimes leak
  text = text.replace(/\b(please|thanks|thank you)\b/gi, "");
  text = text.replace(/\b(super\s+)?(clean|elegant|beautiful)\b/gi, "");
  text = text.replace(/\b(kinda|somehow)\b/gi, "");
  text = text.replace(/[ \t]{2,}/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return { text, changed: text !== before };
}

/** If §4 lacks verifiable language, append stack-aware checks. */
export function ensureVerificationLanguage(
  blueprint: string,
  stackHints: string,
): { text: string; injected: boolean } {
  const verifyRe =
    /##\s*4\.\s*Verification Checkpoints([\s\S]*?)(?=\n##\s|\n---\s*|$)/i;
  const m = blueprint.match(verifyRe);
  if (!m) return { text: blueprint, injected: false };

  const body = m[1] || "";
  if (
    /\b(test|typecheck|build|lint|compile|npm|pytest|cargo|go test)\b/i.test(
      body,
    )
  ) {
    return { text: blueprint, injected: false };
  }

  const node = /typescript|node|javascript/i.test(stackHints);
  const extras = node
    ? [
        "- [ ] `npm run typecheck` passes",
        "- [ ] `npm test` passes (or add a focused assertion for this change)",
      ]
    : [
        "- [ ] Project build/typecheck command passes",
        "- [ ] Add or run a focused test proving the Absolute Objective",
      ];

  const injection = extras.join("\n");
  const text = blueprint.replace(verifyRe, (full, sectionBody: string) => {
    return full.replace(sectionBody, `${sectionBody.trimEnd()}\n${injection}\n`);
  });
  return { text, injected: true };
}
