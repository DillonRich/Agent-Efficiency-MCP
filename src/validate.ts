export interface ValidationResult {
  ok: boolean;
  blueprint: string;
  warnings: string[];
  errors: string[];
}

const REQUIRED_HEADERS = [
  "# 🎯 Current Task Blueprint: [ACTIVE]",
  "## 1. Absolute Objective",
  "## 2. Technical Requirements & Boundary Rules",
  "## 3. Targeted Codebase Vectors",
  "## 4. Verification Checkpoints",
] as const;

/** Loose header matchers for models that drop emoji / exact wording */
const REQUIRED_PATTERNS: RegExp[] = [
  /^#\s+.*Current Task Blueprint/im,
  /^##\s*1\.\s*Absolute Objective/im,
  /^##\s*2\.\s*Technical Requirements/im,
  /^##\s*3\.\s*Targeted Codebase Vectors/im,
  /^##\s*4\.\s*Verification Checkpoints/im,
];

function stripCodeFences(text: string): { text: string; removed: number } {
  const fence = /```[\s\S]*?```/g;
  let removed = 0;
  const cleaned = text.replace(fence, () => {
    removed += 1;
    return "\n*[code fence removed — engine must not emit implementation code]*\n";
  });
  return { text: cleaned, removed };
}

function normalizePathToken(token: string): string {
  return token
    .trim()
    .replace(/^`+|`+$/g, "")
    .replace(/^\[|\]$/g, "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
}

/**
 * Extract candidate path-like tokens from a "Targeted Codebase Vectors" bullet.
 */
function extractPathCandidates(line: string): string[] {
  const candidates: string[] = [];

  // `path/to/file.ts`
  for (const m of line.matchAll(/`([^`]+)`/g)) {
    candidates.push(normalizePathToken(m[1]));
  }

  // bare path-ish tokens with a slash or extension
  for (const m of line.matchAll(
    /(?:^|[\s\-→>])((?:[\w.@-]+\/)*[\w.@-]+\.[A-Za-z0-9]{1,8})\b/g,
  )) {
    candidates.push(normalizePathToken(m[1]));
  }

  return candidates.filter(Boolean);
}

function pathIsKnown(candidate: string, knownPaths: string[]): boolean {
  if (!candidate) return false;
  const norm = normalizePathToken(candidate).toLowerCase();

  return knownPaths.some((k) => {
    const kn = normalizePathToken(k).toLowerCase();
    if (!kn) return false;
    if (norm === kn) return true;
    // Prefix / suffix path matches only — no bare basename equality
    // (avoids evil/server.ts matching src/server.ts)
    if (norm.endsWith("/" + kn) || kn.endsWith("/" + norm)) return true;
    if (norm.startsWith(kn + "/") || kn.startsWith(norm + "/")) return true;
    // Top-level only: both have no slash and same name
    if (
      !norm.includes("/") &&
      !kn.includes("/") &&
      pathBasename(norm) === pathBasename(kn)
    ) {
      return true;
    }
    return false;
  });
}

function pathBasename(p: string): string {
  const parts = p.split("/");
  return parts[parts.length - 1] ?? p;
}

function filterCodebaseVectorsSection(
  blueprint: string,
  knownPaths: string[],
  forcedPaths: string[] = [],
): { text: string; stripped: string[]; kept: number } {
  const lines = blueprint.split(/\r?\n/);
  const out: string[] = [];
  let inSection = false;
  let stripped: string[] = [];
  let kept = 0;
  const forcedLower = forcedPaths.map((p) => p.replace(/\\/g, "/").toLowerCase());

  for (const line of lines) {
    if (/^##\s*3\.\s*Targeted Codebase Vectors/i.test(line)) {
      inSection = true;
      out.push(line);
      continue;
    }

    if (inSection && /^##\s+/.test(line)) {
      inSection = false;
    }

    if (!inSection) {
      out.push(line);
      continue;
    }

    // Keep blank lines and non-bullet narrative lightly
    if (!/^\s*[-*]/.test(line)) {
      out.push(line);
      continue;
    }

    const candidates = extractPathCandidates(line);
    if (candidates.length === 0) {
      out.push(line);
      kept += 1;
      continue;
    }

    const isForced = candidates.some((c) => {
      const n = normalizePathToken(c).toLowerCase();
      return forcedLower.some(
        (f) =>
          n === f ||
          n.endsWith("/" + f) ||
          f.endsWith("/" + n) ||
          n.startsWith(f + "/") ||
          f.startsWith(n + "/"),
      );
    });

    const allKnown = candidates.every((c) => pathIsKnown(c, knownPaths));
    if (allKnown || isForced) {
      out.push(line);
      kept += 1;
    } else {
      stripped.push(line.trim());
    }
  }

  if (kept === 0) {
    const insertAt = out.findIndex((l) =>
      /^##\s*3\.\s*Targeted Codebase Vectors/i.test(l),
    );
    const fallback =
      "- Use only files discovered from the provided workspace listing and git changes; do not invent paths.";
    if (insertAt >= 0) {
      out.splice(insertAt + 1, 0, fallback);
    }
  }

  return { text: out.join("\n"), stripped, kept };
}

function hasApprovalFooter(text: string): boolean {
  return /Awaiting Your Approval/i.test(text) && /\bGO\b/.test(text);
}

export interface ValidateOptions {
  /** Paths that must never be stripped */
  forcedPaths?: string[];
  strict?: boolean;
}

export function validateAndSanitizeBlueprint(
  raw: string,
  knownPaths: string[],
  options: ValidateOptions = {},
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const forcedPaths = options.forcedPaths ?? [];

  let text = (raw ?? "").trim();
  if (!text) {
    return {
      ok: false,
      blueprint: "",
      warnings,
      errors: ["Rewrite provider returned an empty blueprint."],
    };
  }

  const fenced = stripCodeFences(text);
  text = fenced.text;
  if (fenced.removed > 0) {
    warnings.push(
      `Removed ${fenced.removed} fenced code block(s) from model output.`,
    );
  }

  for (let i = 0; i < REQUIRED_PATTERNS.length; i++) {
    if (!REQUIRED_PATTERNS[i].test(text)) {
      errors.push(`Missing required section: ${REQUIRED_HEADERS[i]}`);
    }
  }

  const filtered = filterCodebaseVectorsSection(
    text,
    knownPaths,
    forcedPaths,
  );
  text = filtered.text;
  if (filtered.stripped.length > 0) {
    warnings.push(
      `Stripped ${filtered.stripped.length} invented path reference(s) not present in workspace context.`,
    );
  }

  if (options.strict && forcedPaths.length > 0) {
    const missing = forcedPaths.filter(
      (p) => !text.toLowerCase().includes(p.replace(/\\/g, "/").toLowerCase()),
    );
    if (missing.length > 0) {
      warnings.push(
        `Strict mode: model omitted forced path(s); post-process will inject: ${missing.join(", ")}`,
      );
    }
  }

  if (!hasApprovalFooter(text)) {
    text += `

---
👉 **Awaiting Your Approval:**
If this blueprint accurately maps your intention, reply with **"GO"** in the chat window.
If you want adjustments, modify this markdown file directly or type your adjustments in the chat before executing.
`;
    warnings.push("Appended missing approval footer.");
  }

  return {
    ok: errors.length === 0,
    blueprint: text.trim() + "\n",
    warnings,
    errors,
  };
}
