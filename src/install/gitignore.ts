import * as fs from "node:fs";
import * as path from "node:path";

const BLOCK_START = "# >>> agent-efficiency-mcp (secrets in MCP env)";
const BLOCK_END = "# <<< agent-efficiency-mcp";

const IGNORE_LINES = [".cursor/mcp.json", ".vscode/mcp.json"];

/**
 * Ensure project .gitignore excludes MCP configs that may hold BYOK keys.
 * Idempotent — updates or inserts a marked block.
 */
export function ensureMcpSecretsGitignore(projectRoot: string): {
  path: string;
  status: "created" | "updated" | "unchanged";
} {
  const giPath = path.join(projectRoot, ".gitignore");
  const block = [BLOCK_START, ...IGNORE_LINES, BLOCK_END].join("\n");

  if (!fs.existsSync(giPath)) {
    fs.writeFileSync(giPath, block + "\n", "utf8");
    return { path: path.resolve(giPath), status: "created" };
  }

  const raw = fs.readFileSync(giPath, "utf8");
  const start = raw.indexOf(BLOCK_START);
  const end = raw.indexOf(BLOCK_END);

  if (start >= 0 && end > start) {
    const before = raw.slice(0, start);
    const after = raw.slice(end + BLOCK_END.length).replace(/^\r?\n/, "");
    const next = `${before}${block}\n${after}`.replace(/\n{3,}/g, "\n\n");
    if (next === raw) {
      return { path: path.resolve(giPath), status: "unchanged" };
    }
    fs.writeFileSync(giPath, next.endsWith("\n") ? next : next + "\n", "utf8");
    return { path: path.resolve(giPath), status: "updated" };
  }

  // Already ignoring both paths individually — still add block for clarity once
  const hasCursor = /(^|\/)\.cursor\/mcp\.json$/m.test(raw);
  const hasVscode = /(^|\/)\.vscode\/mcp\.json$/m.test(raw);
  if (hasCursor && hasVscode) {
    return { path: path.resolve(giPath), status: "unchanged" };
  }

  const next = raw.endsWith("\n") ? `${raw}\n${block}\n` : `${raw}\n\n${block}\n`;
  fs.writeFileSync(giPath, next, "utf8");
  return { path: path.resolve(giPath), status: "updated" };
}
