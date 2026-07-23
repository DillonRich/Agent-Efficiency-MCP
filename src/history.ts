/**
 * Optional non-destructive blueprint history under .promptmcp/history/
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveBlueprintFilename } from "./constants.js";

function historyEnabled(): boolean {
  const v = (process.env.PROMPT_MCP_KEEP_HISTORY || "1").toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}

function historyLimit(): number {
  const n = Number(process.env.PROMPT_MCP_HISTORY_LIMIT || "20");
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 20;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/** Archive existing blueprint before overwrite. Returns archive path or null. */
export function archiveBlueprintIfPresent(
  workspaceRoot: string,
  filename?: string,
): string | null {
  if (!historyEnabled()) return null;

  const name = filename || resolveBlueprintFilename();
  const current = path.join(workspaceRoot, name);
  if (!fs.existsSync(current) || !fs.statSync(current).isFile()) return null;

  const body = fs.readFileSync(current, "utf8");
  // Skip archiving the init stub
  if (/Waiting for first optimization/i.test(body) && body.length < 800) {
    return null;
  }

  const dir = path.join(workspaceRoot, ".promptmcp", "history");
  fs.mkdirSync(dir, { recursive: true });
  const base = name.replace(/\.md$/i, "");
  const dest = path.join(dir, `${base}.${stamp()}.md`);
  fs.copyFileSync(current, dest);
  pruneHistory(dir, base);
  return path.resolve(dest);
}

function pruneHistory(dir: string, base: string): void {
  const limit = historyLimit();
  const prefix = `${base}.`;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".md"))
    .map((f) => ({
      f,
      mtime: fs.statSync(path.join(dir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const extra of files.slice(limit)) {
    try {
      fs.unlinkSync(path.join(dir, extra.f));
    } catch {
      /* ignore */
    }
  }
}
