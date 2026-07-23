import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RULES_MARKER_END,
  RULES_MARKER_START,
} from "../constants.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export function loadRuleBody(): string {
  const candidates = [
    path.join(here, "..", "..", "templates", "00-promptmcp.mdc"),
    path.join(here, "..", "templates", "00-promptmcp.mdc"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return fs.readFileSync(c, "utf8");
  }
  throw new Error("Could not find templates/00-promptmcp.mdc");
}

/**
 * Write/overwrite ONLY the PromptMCP rules file (does not delete other .mdc rules).
 */
export function installCursorRulesFile(projectRoot: string): string {
  const dest = path.join(projectRoot, ".cursor", "rules", "00-promptmcp.mdc");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, loadRuleBody(), "utf8");
  return path.resolve(dest);
}

function upsertMarkedBlock(filePath: string, blockBody: string): string {
  const wrapped = `${RULES_MARKER_START}\n${blockBody.trim()}\n${RULES_MARKER_END}\n`;
  let existing = "";
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, "utf8");
  }

  const start = existing.indexOf(RULES_MARKER_START);
  const end = existing.indexOf(RULES_MARKER_END);

  let next: string;
  if (start >= 0 && end > start) {
    next =
      existing.slice(0, start) +
      wrapped +
      existing.slice(end + RULES_MARKER_END.length).replace(/^\r?\n/, "");
  } else if (existing.trim()) {
    next = existing.replace(/\s*$/, "\n\n") + wrapped;
  } else {
    next = wrapped;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next, "utf8");
  return path.resolve(filePath);
}

/**
 * If .cursorrules, AGENTS.md, or .github/copilot-instructions.md already exist,
 * upsert PromptMCP block without deleting other content.
 */
export function mergeLegacyRuleFiles(projectRoot: string): string[] {
  const written: string[] = [];
  const body = [
    "# PRIORITY 0 — PromptMCP (Agent Efficiency MCP)",
    "",
    "ZERO TOKENS BEFORE TOOL: first action = call `optimize_and_blueprint_intent` with verbatim user text + absolute workspace_root.",
    "No greeting/plan/other tools first. Then freeze until GO. On GO, execute `Agent_Efficiency_MCP.md` (open Media / Research when listed).",
    "Recovery: `/optimize` or “run the efficiency engine” / “call PromptMCP”.",
    "Bypass only: `@promptmcp:ignore`. Help: `@promptmcp:help`. Tip: lead with `@promptmcp:include`.",
    "Full Cursor rules: `.cursor/rules/00-promptmcp.mdc`",
    "Host tips: `.promptmcp/hosts/` (claude, vscode-copilot, windsurf, cursor)",
  ].join("\n");

  const targets = [
    ".cursorrules",
    "AGENTS.md",
    path.join(".github", "copilot-instructions.md"),
  ];

  for (const name of targets) {
    const p = path.join(projectRoot, name);
    if (!fs.existsSync(p)) continue;
    written.push(upsertMarkedBlock(p, body));
  }
  return written;
}

/** Copy multi-host guidance markdown into the project (additive). */
export function installHostGuidance(projectRoot: string): string[] {
  const written: string[] = [];
  const srcDirCandidates = [
    path.join(here, "..", "..", "templates", "hosts"),
    path.join(here, "..", "templates", "hosts"),
  ];
  let srcDir = "";
  for (const c of srcDirCandidates) {
    if (fs.existsSync(c)) {
      srcDir = c;
      break;
    }
  }
  if (!srcDir) return written;

  const destDir = path.join(projectRoot, ".promptmcp", "hosts");
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith(".md")) continue;
    const dest = path.join(destDir, file);
    fs.copyFileSync(path.join(srcDir, file), dest);
    written.push(path.resolve(dest));
  }
  return written;
}

/** Remove PRIORITY 0 rules file + marked blocks; does not delete other rules. */
export function uninstallRules(projectRoot: string): string[] {
  const touched: string[] = [];
  const rulesFile = path.join(
    projectRoot,
    ".cursor",
    "rules",
    "00-promptmcp.mdc",
  );
  if (fs.existsSync(rulesFile)) {
    fs.unlinkSync(rulesFile);
    touched.push(path.resolve(rulesFile));
  }

  const legacy = [
    ".cursorrules",
    "AGENTS.md",
    path.join(".github", "copilot-instructions.md"),
  ];
  for (const name of legacy) {
    const p = path.join(projectRoot, name);
    if (!fs.existsSync(p)) continue;
    const existing = fs.readFileSync(p, "utf8");
    const start = existing.indexOf(RULES_MARKER_START);
    const end = existing.indexOf(RULES_MARKER_END);
    if (start < 0 || end < start) continue;
    const next = (
      existing.slice(0, start) +
      existing.slice(end + RULES_MARKER_END.length)
    ).replace(/\n{3,}/g, "\n\n");
    fs.writeFileSync(p, next, "utf8");
    touched.push(path.resolve(p));
  }
  return touched;
}
