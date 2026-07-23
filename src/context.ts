import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveBlueprintFilename } from "./constants.js";
import { archiveBlueprintIfPresent } from "./history.js";
import {
  resolveContextBudget,
  skeletonizeSource,
  type ContextBudget,
} from "./quality/budget.js";
import { resolveUnderWorkspace } from "./security/paths.js";

export interface WorkspaceContext {
  workspaceRoot: string;
  gitDiff: string;
  gitLog: string;
  fileTree: string;
  packageSummary: string;
  stackHints: string;
  docSnippets: string;
  forcedFileSnippets: string;
  knownPaths: string[];
  forcedFiles: string[];
  forcedMedia: string[];
  contextWarnings: string[];
  /** Approximate bytes of context sent (for metrics) */
  contextBytes: number;
  gitChangedCount: number;
  /** lean | standard | rich */
  contextBudget?: string;
  /** Compact prior HUD summary for continuity */
  priorBlueprint?: string;
}

export interface GatherContextOptions {
  forcedFiles?: string[];
  forcedMedia?: string[];
  /** Directory/file prefixes that focus the walk */
  scopes?: string[];
  /** Used to pick archetype-aware context budget */
  rawPrompt?: string;
}
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  "coverage",
  ".turbo",
  ".cache",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  ".idea",
  ".vscode",
  ".cursor",
]);

const DOC_CANDIDATES = [
  "README.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "docs/PRODUCT.md",
  "docs/ARCHITECTURE.md",
];

/**
 * Resolve and validate the workspace root.
 * Prefer the tool argument; fall back to PROMPT_MCP_WORKSPACE env.
 */
export function resolveWorkspaceRoot(workspaceRootArg?: string): string {
  const candidate =
    workspaceRootArg?.trim() || process.env.PROMPT_MCP_WORKSPACE?.trim() || "";

  if (!candidate) {
    throw new Error(
      "workspace_root is required (absolute path to the open project). " +
        "Alternatively set PROMPT_MCP_WORKSPACE in the MCP server env.",
    );
  }

  if (!path.isAbsolute(candidate)) {
    throw new Error(
      `workspace_root must be an absolute path. Received: ${candidate}`,
    );
  }

  const resolved = path.normalize(candidate);

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(
      `workspace_root does not exist or is not a directory: ${resolved}`,
    );
  }

  return resolved;
}

function collectGitChangedFiles(workspaceRoot: string): {
  text: string;
  count: number;
} {
  const attempts = [
    ["diff", "--name-only"],
    ["diff", "--name-only", "--cached"],
    ["diff", "--name-only", "HEAD~1"],
    ["status", "--porcelain"],
  ] as const;

  const names = new Set<string>();

  for (const args of attempts) {
    try {
      const out = execFileSync("git", args, {
        cwd: workspaceRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 5000,
      }).trim();

      if (!out) continue;

      if (args[0] === "status") {
        for (const line of out.split(/\r?\n/)) {
          const file = line.slice(3).trim();
          if (file) names.add(file.replace(/^"|"$/g, ""));
        }
      } else {
        for (const line of out.split(/\r?\n/)) {
          const file = line.trim();
          if (file) names.add(file);
        }
      }
    } catch {
      // Not a git repo or git unavailable
    }
  }

  if (names.size === 0) return { text: "None detected", count: 0 };
  const list = [...names];
  return { text: list.join("\n"), count: list.length };
}

function collectGitLog(workspaceRoot: string, lines: number): string {
  try {
    const out = execFileSync(
      "git",
      ["log", `-${lines}`, "--oneline", "--no-decorate"],
      {
        cwd: workspaceRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 5000,
      },
    ).trim();
    return out || "None detected";
  } catch {
    return "None detected";
  }
}

function listTopLevel(workspaceRoot: string, maxTop: number): string[] {
  try {
    return fs
      .readdirSync(workspaceRoot, { withFileTypes: true })
      .filter((d) => !d.name.startsWith(".git"))
      .slice(0, maxTop)
      .map((d) => (d.isDirectory() ? `${d.name}/` : d.name));
  } catch {
    return [];
  }
}

function walkProjectFiles(
  workspaceRoot: string,
  maxFiles: number,
  maxDepth: number,
): string[] {
  const out: string[] = [];

  function walk(dir: string, depth: number): void {
    if (out.length >= maxFiles || depth > maxDepth) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (out.length >= maxFiles) break;
      if (ent.name.startsWith(".") && ent.name !== ".env.example") continue;
      if (SKIP_DIRS.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      const rel = path.relative(workspaceRoot, full).replace(/\\/g, "/");
      if (ent.isDirectory()) {
        out.push(rel + "/");
        walk(full, depth + 1);
      } else if (ent.isFile()) {
        out.push(rel);
      }
    }
  }

  walk(workspaceRoot, 0);
  return out;
}

function readPackageSummary(workspaceRoot: string): string {
  const pkgPath = path.join(workspaceRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    // Try pyproject / Cargo / go.mod briefly
    const alts = ["pyproject.toml", "Cargo.toml", "go.mod", "composer.json"];
    for (const a of alts) {
      if (fs.existsSync(path.join(workspaceRoot, a))) {
        return `Detected stack manifest: ${a}`;
      }
    }
    return "No package.json at workspace root.";
  }

  try {
    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as {
      name?: string;
      type?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const deps = Object.keys(pkg.dependencies ?? {}).slice(0, 40);
    const devDeps = Object.keys(pkg.devDependencies ?? {}).slice(0, 25);
    const scripts = Object.keys(pkg.scripts ?? {}).slice(0, 20);

    return [
      `name: ${pkg.name ?? "(unnamed)"}`,
      pkg.type ? `type: ${pkg.type}` : null,
      scripts.length ? `scripts: ${scripts.join(", ")}` : "scripts: (none)",
      deps.length ? `dependencies: ${deps.join(", ")}` : "dependencies: (none)",
      devDeps.length
        ? `devDependencies: ${devDeps.join(", ")}`
        : "devDependencies: (none)",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return "package.json present but could not be parsed.";
  }
}

function detectStackHints(workspaceRoot: string, walked: string[]): string {
  const hints: string[] = [];
  const lower = walked.map((w) => w.toLowerCase());
  const has = (ext: string) => lower.some((f) => f.endsWith(ext));

  if (has(".ts") || has(".tsx")) hints.push("TypeScript");
  if (has(".js") || has(".jsx")) hints.push("JavaScript");
  if (has(".py")) hints.push("Python");
  if (has(".rs")) hints.push("Rust");
  if (has(".go")) hints.push("Go");
  if (has(".java")) hints.push("Java");
  if (has(".cs")) hints.push("C#");
  if (fs.existsSync(path.join(workspaceRoot, "next.config.js")) ||
      fs.existsSync(path.join(workspaceRoot, "next.config.ts")) ||
      fs.existsSync(path.join(workspaceRoot, "next.config.mjs"))) {
    hints.push("Next.js");
  }
  if (fs.existsSync(path.join(workspaceRoot, "vite.config.ts")) ||
      fs.existsSync(path.join(workspaceRoot, "vite.config.js"))) {
    hints.push("Vite");
  }
  if (fs.existsSync(path.join(workspaceRoot, "tsconfig.json"))) {
    try {
      const ts = JSON.parse(
        fs.readFileSync(path.join(workspaceRoot, "tsconfig.json"), "utf8"),
      ) as { compilerOptions?: { paths?: Record<string, string[]> } };
      const paths = Object.keys(ts.compilerOptions?.paths ?? {}).slice(0, 15);
      if (paths.length) hints.push(`tsconfig paths: ${paths.join(", ")}`);
    } catch {
      /* ignore */
    }
  }
  return hints.length ? hints.join(" | ") : "Stack undetermined from file walk.";
}

function readDocSnippets(
  workspaceRoot: string,
  budget: ContextBudget,
): string {
  if (!budget.includeDocSnippets) {
    return "(Doc snippets omitted — lean context budget for concrete ask.)";
  }
  const parts: string[] = [];
  for (const rel of DOC_CANDIDATES) {
    const full = path.join(workspaceRoot, rel);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    try {
      const body = fs.readFileSync(full, "utf8").slice(0, budget.docSnippetChars);
      parts.push(`--- ${rel} ---\n${body}`);
    } catch {
      /* ignore */
    }
    if (parts.join("\n").length > budget.maxDocTotalChars) break;
  }
  return parts.length ? parts.join("\n\n") : "(No README/AGENTS-style docs found.)";
}

function resolveForcedPath(
  workspaceRoot: string,
  raw: string,
): { relative: string; abs: string; exists: boolean } {
  const r = resolveUnderWorkspace(workspaceRoot, raw);
  if (r.outside) {
    return {
      relative: raw.trim().replace(/\\/g, "/"),
      abs: r.abs,
      exists: false,
    };
  }
  return {
    relative: r.relative,
    abs: r.abs,
    exists: r.exists && fs.existsSync(r.abs),
  };
}

function readForcedSnippets(
  workspaceRoot: string,
  forcedFiles: string[],
  warnings: string[],
  budget: ContextBudget,
): string {
  const parts: string[] = [];
  let n = 0;
  for (const rel of forcedFiles) {
    if (n >= budget.maxForcedSnippets) {
      warnings.push(
        `Forced-file snippet cap (${budget.maxForcedSnippets}) reached; remaining paths listed by name only.`,
      );
      break;
    }
    const { abs, relative, exists } = resolveForcedPath(workspaceRoot, rel);
    if (!exists || !fs.statSync(abs).isFile()) continue;
    try {
      const raw = fs.readFileSync(abs, "utf8");
      let body: string;
      if (raw.length > budget.skeletonThreshold) {
        body = skeletonizeSource(raw, budget.forcedFileChars);
        warnings.push(
          `Forced file skeletonized (large): ${relative} (${raw.length} chars → skeleton)`,
        );
      } else {
        body = raw.slice(0, budget.forcedFileChars);
      }
      parts.push(`--- FORCED FILE: ${relative} ---\n${body}`);
      n += 1;
    } catch {
      warnings.push(`Could not read forced file: ${relative}`);
    }
  }
  return parts.length
    ? parts.join("\n\n")
    : "(No forced file contents loaded.)";
}

function buildKnownPaths(
  workspaceRoot: string,
  topLevel: string[],
  walked: string[],
  gitDiff: string,
): string[] {
  const known = new Set<string>();

  for (const entry of topLevel) {
    known.add(entry.replace(/\/$/, ""));
    known.add(entry);
  }
  for (const w of walked) {
    known.add(w);
    known.add(w.replace(/\/$/, ""));
    known.add(path.basename(w.replace(/\/$/, "")));
  }

  if (gitDiff !== "None detected") {
    for (const line of gitDiff.split(/\r?\n/)) {
      const p = line.trim();
      if (!p) continue;
      known.add(p);
      known.add(path.basename(p));
      known.add(p.replace(/\\/g, "/"));
    }
  }

  if (fs.existsSync(path.join(workspaceRoot, "package.json"))) {
    known.add("package.json");
  }
  known.add(resolveBlueprintFilename());

  return [...known];
}

export function gatherWorkspaceContext(
  workspaceRoot: string,
  options: GatherContextOptions = {},
): WorkspaceContext {
  const budget = resolveContextBudget(options.rawPrompt);
  const topLevel = listTopLevel(workspaceRoot, budget.maxTopLevel);
  let walked = walkProjectFiles(
    workspaceRoot,
    budget.maxWalkFiles,
    budget.maxWalkDepth,
  );
  const scopes = (options.scopes ?? [])
    .map((s) => s.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, ""))
    .filter(Boolean);
  let scopeWarning: string | undefined;
  if (scopes.length > 0) {
    const before = walked.length;
    walked = walked.filter((p) => {
      const n = p.replace(/\\/g, "/");
      return scopes.some(
        (s) => n === s || n.startsWith(s + "/") || s.startsWith(n),
      );
    });
    scopeWarning = `Scope filter: ${before} → ${walked.length} paths under ${scopes.join(", ")}`;
  }
  const gitAll = collectGitChangedFiles(workspaceRoot);
  const gitList = gitAll.text
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, budget.gitChangedCap);
  const gitDiff =
    gitAll.count === 0
      ? "None detected"
      : gitList.join("\n") +
        (gitAll.count > gitList.length
          ? `\n…(+${gitAll.count - gitList.length} more omitted — lean/standard cap)`
          : "");
  const gitChangedCount = gitAll.count;
  const gitLog = budget.includeGitLog
    ? collectGitLog(workspaceRoot, budget.gitLogLines)
    : "(Git log omitted — lean context budget.)";
  const packageSummary = readPackageSummary(workspaceRoot);
  const stackHints = detectStackHints(workspaceRoot, walked);
  const docSnippets = readDocSnippets(workspaceRoot, budget);

  const fileTree = [
    `## Top-level (budget=${budget.mode})`,
    topLevel.length ? topLevel.join("\n") : "(empty)",
    "",
    "## Walked paths (capped)",
    walked.length ? walked.join("\n") : "(none)",
  ].join("\n");

  const knownPaths = buildKnownPaths(
    workspaceRoot,
    topLevel,
    walked,
    gitDiff,
  );
  const contextWarnings: string[] = [
    `Context budget: ${budget.mode}`,
  ];
  if (scopeWarning) contextWarnings.push(scopeWarning);
  const forcedFiles: string[] = [];
  const forcedMedia: string[] = [];

  for (const raw of options.forcedFiles ?? []) {
    const { relative, exists } = resolveForcedPath(workspaceRoot, raw);
    forcedFiles.push(relative);
    knownPaths.push(relative);
    knownPaths.push(path.basename(relative));
    if (!exists) {
      contextWarnings.push(`Forced file not found on disk: ${relative}`);
    }
  }

  for (const raw of options.forcedMedia ?? []) {
    const { relative, exists } = resolveForcedPath(workspaceRoot, raw);
    forcedMedia.push(relative);
    knownPaths.push(relative);
    knownPaths.push(path.basename(relative));
    if (!exists) {
      contextWarnings.push(`Forced media not found on disk: ${relative}`);
    }
  }

  const forcedFileSnippets = readForcedSnippets(
    workspaceRoot,
    forcedFiles,
    contextWarnings,
    budget,
  );

  const known = [...new Set(knownPaths.map((p) => p.replace(/\\/g, "/")))];

  const contextBytes = [
    fileTree,
    packageSummary,
    stackHints,
    docSnippets,
    forcedFileSnippets,
    gitDiff,
    gitLog,
  ].join("").length;

  return {
    workspaceRoot,
    gitDiff,
    gitLog,
    fileTree,
    packageSummary,
    stackHints,
    docSnippets,
    forcedFileSnippets,
    knownPaths: known,
    forcedFiles: [...new Set(forcedFiles)],
    forcedMedia: [...new Set(forcedMedia)],
    contextWarnings,
    contextBytes,
    gitChangedCount,
    contextBudget: budget.mode,
  };
}

export function writeAgentIntent(
  workspaceRoot: string,
  blueprint: string,
  filename?: string,
): string {
  const name = filename || resolveBlueprintFilename();
  const target = path.join(workspaceRoot, name);
  try {
    archiveBlueprintIfPresent(workspaceRoot, name);
  } catch {
    /* history is best-effort */
  }
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, blueprint, "utf8");
  fs.renameSync(tmp, target);
  return path.resolve(target);
}

/** Starter stub for init / first open */
export function starterBlueprintStub(): string {
  return `# Agent Efficiency MCP — Blueprint HUD

This file is overwritten each time PromptMCP optimizes a prompt.
Review it, edit if needed, then type **GO** in chat to execute.

Waiting for first optimization…
`;
}
