/**
 * Composable @promptmcp: / @mcp: / @ourmcp: directives.
 * Parsed from raw_prompt; tags are stripped from the cleaned prompt body.
 */

export interface SearchDirective {
  target: string;
  note: string;
}

export interface DirectiveSet {
  ignore: boolean;
  include: boolean;
  long: boolean;
  short: boolean;
  test: boolean;
  tone: boolean;
  diff: boolean;
  strict: boolean;
  help: boolean;
  files: string[];
  media: string[];
  /** Directory/file prefixes that focus context gathering */
  scopes: string[];
  searches: SearchDirective[];
  cleanedPrompt: string;
  rawTags: string[];
  warnings: string[];
}

const PREFIX = String.raw`@(?:promptmcp|mcp|ourmcp):`;
const FLAG_NAMES =
  "ignore|include|long|short|test|tone|diff|strict|help";
const ARG_NAMES = "file|media|search|scope";

/** Match a directive tag with optional […], "…", or (…) args */
const TAG_RE = new RegExp(
  `${PREFIX}(${FLAG_NAMES}|${ARG_NAMES})` +
    String.raw`(?:\s*[\[("]([^\]")]+)[\]")]|\s*"([^"]+)"|\s*\(([^)]+)\))?`,
  "gi",
);

const PATH_LIKE_RE =
  /(?:^|[\s`"'([{:])((?:[\w.@+-]+\/)+[\w.@+-]+(?:\.[A-Za-z0-9]{1,12})?)/g;

const MEDIA_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|ico|mp4|webm|mov)$/i;

export const DIRECTIVE_HELP = `# PromptMCP directives

Prefixes: \`@promptmcp:\` (canonical), \`@mcp:\`, \`@ourmcp:\` — all equivalent.
Combine freely; repeatable arg tags merge.

| Directive | Effect |
|-----------|--------|
| \`ignore\` | Host must **not** call the optimizer; answer normally |
| \`include\` | Append original prompt under \`## Original Prompt\` in the blueprint |
| \`file[a, b]\` | Force-include these paths in Targeted Codebase Vectors |
| \`media[a.png]\` | Force-include media paths (agent inspects after GO) |
| \`scope[src/]\` | Focus context walk under these prefixes (token savings) |
| \`search[url]\` + note | Force research URLs + trailing note into blueprint |
| \`long\` | Deep, iterative multi-phase worklist |
| \`short\` | Aggressive single-pass compression |
| \`test\` | Require tests in requirements + verification |
| \`tone\` | Preserve emphatic conversational cues that encode intent |
| \`diff\` | Bias toward current git-changed files |
| \`strict\` | Never drop user-cited paths / media / URLs |
| \`help\` | Show this cheat-sheet (no rewrite if message is only help) |

Example:
\`\`\`
@promptmcp:include @promptmcp:long @promptmcp:file[src/server.ts]
@promptmcp:search[https://example.com/docs] focus on auth section
Build the feature described below…
\`\`\`
`;

function splitArgList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function uniq(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.replace(/\\/g, "/").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item.replace(/\\/g, "/"));
  }
  return out;
}

const PROJECT_PATH_ROOTS = new Set([
  "src",
  "test",
  "tests",
  "doc",
  "docs",
  "lib",
  "app",
  "apps",
  "package",
  "packages",
  "script",
  "scripts",
  "tool",
  "tools",
  "models",
  "data",
  "logs",
  "dist",
  "build",
  "fixture",
  "fixtures",
  "template",
  "templates",
  "asset",
  "assets",
  "public",
  "private",
  "cmd",
  "internal",
  "pkg",
  "website",
  "cloudflare-worker",
  "e2e",
  "wiremaps",
  "markdown files",
]);

/**
 * Reject English "a/b" phrases that look like paths but are not filesystem refs
 * (e.g. start/end, P0/P1, model/scanner, Rust/Tauri).
 */
export function looksLikeFilesystemPath(token: string): boolean {
  const t = token.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (!t || !t.includes("/")) return false;
  // Real files almost always have an extension
  if (/\.[A-Za-z0-9]{1,12}$/.test(t)) return true;
  // Extension-less paths: only if the first segment is a real project root dir
  const first = (t.split("/")[0] || "").toLowerCase();
  return PROJECT_PATH_ROOTS.has(first);
}

/**
 * Extract path-like tokens from free text (implicit force-include).
 */
export function extractPathLikeTokens(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(PATH_LIKE_RE)) {
    const token = m[1]?.replace(/\\/g, "/");
    if (token && looksLikeFilesystemPath(token)) found.push(token);
  }
  return uniq(found);
}

export function isMediaPath(p: string): boolean {
  return MEDIA_EXT_RE.test(p);
}

export function parseDirectives(rawPrompt: string): DirectiveSet {
  const warnings: string[] = [];
  const rawTags: string[] = [];
  const files: string[] = [];
  const media: string[] = [];
  const scopes: string[] = [];
  const searches: SearchDirective[] = [];

  let ignore = false;
  let include = false;
  let long = false;
  let short = false;
  let test = false;
  let tone = false;
  let diff = false;
  let strict = false;
  let help = false;

  const matches: Array<{
    index: number;
    length: number;
    name: string;
    args: string;
  }> = [];

  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(rawPrompt)) !== null) {
    const name = (m[1] || "").toLowerCase();
    const args = (m[2] || m[3] || m[4] || "").trim();
    matches.push({ index: m.index, length: m[0].length, name, args });
    rawTags.push(m[0]);
  }

  for (let i = 0; i < matches.length; i++) {
    const tag = matches[i];
    switch (tag.name) {
      case "ignore":
        ignore = true;
        break;
      case "include":
        include = true;
        break;
      case "long":
        long = true;
        break;
      case "short":
        short = true;
        break;
      case "test":
        test = true;
        break;
      case "tone":
        tone = true;
        break;
      case "diff":
        diff = true;
        break;
      case "strict":
        strict = true;
        break;
      case "help":
        help = true;
        break;
      case "file":
        files.push(...splitArgList(tag.args));
        break;
      case "media":
        media.push(...splitArgList(tag.args));
        break;
      case "scope":
        scopes.push(...splitArgList(tag.args));
        break;
      case "search": {
        const targets = splitArgList(tag.args);
        const endOfTag = tag.index + tag.length;
        const lineEnd = rawPrompt.indexOf("\n", endOfTag);
        const sameLineEnd = lineEnd === -1 ? rawPrompt.length : lineEnd;
        const nextTagStart =
          i + 1 < matches.length ? matches[i + 1].index : rawPrompt.length;
        const noteEnd = Math.min(sameLineEnd, nextTagStart);
        const note = rawPrompt.slice(endOfTag, noteEnd).trim();
        for (const target of targets) {
          searches.push({ target, note });
        }
        break;
      }
      default:
        break;
    }
  }

  // Strip directive tags. For search, also strip same-line trailing notes.
  let cleaned = rawPrompt;
  const removals: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < matches.length; i++) {
    const tag = matches[i];
    let end = tag.index + tag.length;
    if (tag.name === "search") {
      const lineEnd = rawPrompt.indexOf("\n", end);
      const sameLineEnd = lineEnd === -1 ? rawPrompt.length : lineEnd;
      const nextTagStart =
        i + 1 < matches.length ? matches[i + 1].index : rawPrompt.length;
      end = Math.min(sameLineEnd, nextTagStart);
    }
    removals.push({ start: tag.index, end });
  }
  removals.sort((a, b) => b.start - a.start);
  for (const r of removals) {
    cleaned = cleaned.slice(0, r.start) + cleaned.slice(r.end);
  }
  cleaned = cleaned.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (long && short) {
    short = false;
    warnings.push("Both long and short set; preferring long.");
  }

  // Implicit paths from remaining user text
  const implicit = extractPathLikeTokens(cleaned);
  for (const p of implicit) {
    if (isMediaPath(p)) media.push(p);
    else files.push(p);
  }

  return {
    ignore,
    include,
    long,
    short,
    test,
    tone,
    diff,
    strict,
    help,
    files: uniq(files),
    media: uniq(media),
    scopes: uniq(scopes),
    searches,
    cleanedPrompt: cleaned,
    rawTags,
    warnings,
  };
}

export function isHelpOnly(directives: DirectiveSet): boolean {
  return (
    directives.help &&
    !directives.cleanedPrompt.trim() &&
    directives.files.length === 0 &&
    directives.media.length === 0 &&
    directives.searches.length === 0 &&
    !directives.include &&
    !directives.long &&
    !directives.short &&
    !directives.test &&
    !directives.tone &&
    !directives.diff &&
    !directives.strict
  );
}

/** Extra system instructions derived from directive flags */
export function buildDirectiveModifiers(d: DirectiveSet): string {
  const lines: string[] = [
    "",
    "## PROMPTMCP DIRECTIVE MODIFIERS (mandatory)",
  ];

  if (d.long) {
    lines.push(
      "- LONG MODE: Produce a deep, iterative multi-phase worklist (phases / ordered steps).",
      "  Expand Verification Checkpoints into a longer checklist. Do not collapse into a single trivial step.",
    );
  }
  if (d.short) {
    lines.push(
      "- SHORT MODE: Aggressive compression — minimal vectors, few bullets, one crisp objective.",
    );
  }
  if (d.test) {
    lines.push(
      "- TEST MODE: Requirements MUST include testing expectations (existing suite and/or new tests).",
      "  Verification Checkpoints MUST include concrete test cases to run or add.",
    );
  }
  if (d.tone) {
    lines.push(
      "- TONE MODE: Preserve emphatic conversational cues from the user when they encode priority,",
      "  emotion, or non-negotiable emphasis. Still strip empty pleasantries.",
    );
  }
  if (d.diff) {
    lines.push(
      "- DIFF MODE: Prefer files listed under Recent Git File Modifications when choosing vectors.",
    );
  }
  if (d.strict || d.files.length || d.media.length || d.searches.length) {
    lines.push(
      "- STRICT / FORCED CITATIONS: You MUST cite EVERY path in Forced User Files and Forced Media,",
      "  and EVERY URL in Forced Research Targets. Do not omit them even if you think they are low priority.",
    );
  }
  if (d.include) {
    lines.push(
      "- INCLUDE: Focus on the dense blueprint only; the original prompt will be appended by the engine.",
    );
  }
  if (d.scopes.length) {
    lines.push(
      `- SCOPE: Prefer paths under ${d.scopes.map((s) => `\`${s}\``).join(", ")}. Do not expand outside these prefixes unless Forced files require it.`,
    );
  }
  if (d.files.length) {
    lines.push(
      `- Forced files (must appear in section 3): ${d.files.map((f) => `\`${f}\``).join(", ")}`,
    );
  }
  if (d.media.length) {
    lines.push(
      `- Forced media (add under Media / reference assets): ${d.media.map((f) => `\`${f}\``).join(", ")}`,
    );
  }
  if (d.searches.length) {
    lines.push("- Forced research targets (add under Research / web references):");
    for (const s of d.searches) {
      lines.push(
        `  - ${s.target}${s.note ? ` — note: ${s.note}` : ""}`,
      );
    }
  }

  if (lines.length <= 2) return "";
  return lines.join("\n");
}

/**
 * After model rewrite: inject any missing forced files/media/searches,
 * and optionally append Original Prompt.
 * Media/search sections are always fully rewritten when present so the IDE
 * agent has mandatory open/browse instructions after GO.
 */
export function applyDirectivePostProcess(
  blueprint: string,
  d: DirectiveSet,
  enrichment?: {
    media: Array<{
      path: string;
      abs: string;
      exists: boolean;
      bytes?: number;
    }>;
    searches: Array<{
      target: string;
      note: string;
      title?: string;
      snippet?: string;
      fetchOk: boolean;
    }>;
  },
): string {
  let text = blueprint;

  if (d.files.length > 0) {
    const missing = d.files.filter(
      (f) => !text.toLowerCase().includes(f.toLowerCase()),
    );
    if (missing.length > 0) {
      const bullets = missing
        .map(
          (f) =>
            `- \`${f}\` -> Must include (user-forced). Inspect and use as required.`,
        )
        .join("\n");
      text = injectAfterHeader(
        text,
        /^##\s*3\.\s*Targeted Codebase Vectors/im,
        bullets,
      );
    }
  }

  if (d.media.length > 0 || (enrichment?.media.length ?? 0) > 0) {
    const items = enrichment?.media?.length
      ? enrichment.media
      : d.media.map((p) => ({
          path: p,
          abs: p,
          exists: false as boolean,
          bytes: undefined as number | undefined,
        }));
    const bullets = items
      .map((m) => {
        const status = m.exists
          ? `exists (${m.bytes ?? "?"} bytes)`
          : "MISSING ON DISK — still open/search after GO";
        return `- \`${m.path}\`\n  - Absolute: \`${m.abs}\`\n  - Status: ${status}\n  - **REQUIRED after GO:** Open this media in the IDE / viewer and use it as creative or UI ground truth before coding.`;
      })
      .join("\n");
    text = upsertSection(
      text,
      /^##\s*Media\s*\/\s*reference assets/im,
      `## Media / reference assets\n\n${bullets}\n`,
    );
  }

  if (d.searches.length > 0 || (enrichment?.searches.length ?? 0) > 0) {
    const items = enrichment?.searches?.length
      ? enrichment.searches
      : d.searches.map((s) => ({
          ...s,
          title: undefined as string | undefined,
          snippet: undefined as string | undefined,
          fetchOk: false,
        }));
    const bullets = items
      .map((s) => {
        const bits = [
          `- ${s.target}`,
          s.note ? `  - User note: ${s.note}` : null,
          s.title ? `  - Page title: ${s.title}` : null,
          s.snippet ? `  - Snippet: ${s.snippet}` : null,
          `  - **REQUIRED after GO:** Browse this URL (and the noted section) before implementing; incorporate findings into the work.`,
        ].filter(Boolean);
        return bits.join("\n");
      })
      .join("\n");
    text = upsertSection(
      text,
      /^##\s*Research\s*\/\s*web references/im,
      `## Research / web references\n\n${bullets}\n`,
    );
  }

  if (
    (d.media.length > 0 || d.searches.length > 0) &&
    !/##\s*Host agent obligations/i.test(text)
  ) {
    text = injectBeforeApproval(
      text,
      `## Host agent obligations (after GO)\n\n- Open every Media path listed above before coding.\n- Browse every Research URL listed above before coding.\n- Do not skip these because the rewrite already summarized them — verify against the real assets/pages.\n`,
    );
  }

  if (d.include && d.cleanedPrompt.trim()) {
    if (!/##\s*Original Prompt/i.test(text)) {
      text = injectBeforeApproval(
        text,
        `## Original Prompt\n\n${d.cleanedPrompt.trim()}\n`,
      );
    }
  }

  return text;
}

function upsertSection(
  blueprint: string,
  headerRe: RegExp,
  fullSection: string,
): string {
  const lines = blueprint.split(/\r?\n/);
  const start = lines.findIndex((l) => headerRe.test(l));
  if (start < 0) {
    return injectBeforeApproval(blueprint, fullSection);
  }
  let end = start + 1;
  while (end < lines.length && !/^##\s+/.test(lines[end])) {
    end += 1;
  }
  const next = [
    ...lines.slice(0, start),
    ...fullSection.trim().split(/\r?\n/),
    ...lines.slice(end),
  ];
  return next.join("\n");
}

function injectAfterHeader(
  blueprint: string,
  headerRe: RegExp,
  block: string,
): string {
  const lines = blueprint.split(/\r?\n/);
  const idx = lines.findIndex((l) => headerRe.test(l));
  if (idx < 0) {
    return injectBeforeApproval(blueprint, `${block}\n`);
  }
  lines.splice(idx + 1, 0, block);
  return lines.join("\n");
}

function injectBeforeApproval(blueprint: string, block: string): string {
  const approval = blueprint.search(/^---\s*$/m);
  const awaitIdx = blueprint.search(/Awaiting Your Approval/i);
  const cut =
    approval >= 0 ? approval : awaitIdx >= 0 ? awaitIdx : blueprint.length;
  const before = blueprint.slice(0, cut).trimEnd();
  const after = blueprint.slice(cut);
  return `${before}\n\n${block.trim()}\n\n${after}`.replace(/\n{3,}/g, "\n\n");
}
