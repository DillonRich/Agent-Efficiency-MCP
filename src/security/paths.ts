/**
 * Workspace path confinement — prevent .. / absolute escapes.
 */
import * as fs from "node:fs";
import * as path from "node:path";

export interface ResolvedWorkspacePath {
  /** Path relative to workspace (posix slashes), or original if outside */
  relative: string;
  abs: string;
  exists: boolean;
  /** True when path resolves outside workspace_root */
  outside: boolean;
}

export function resolveUnderWorkspace(
  workspaceRoot: string,
  raw: string,
): ResolvedWorkspacePath {
  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  if (!cleaned) {
    return {
      relative: "",
      abs: workspaceRoot,
      exists: false,
      outside: true,
    };
  }

  const root = path.resolve(workspaceRoot);
  const abs = path.isAbsolute(cleaned)
    ? path.normalize(cleaned)
    : path.normalize(path.join(root, cleaned));

  const relative = path.relative(root, abs).replace(/\\/g, "/");
  const outside =
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    relative === "";

  if (outside && relative !== ".") {
    // relative === "" can mean abs === root; treat root itself as outside for files
    const isRoot = path.resolve(abs) === root;
    if (!isRoot) {
      return {
        relative: cleaned.replace(/\\/g, "/"),
        abs,
        exists: false,
        outside: true,
      };
    }
  }

  const relOut =
    relative === "" || relative === "."
      ? cleaned.replace(/\\/g, "/")
      : relative;

  return {
    relative: relOut,
    abs,
    exists: fs.existsSync(abs),
    outside: false,
  };
}

export function isPathInsideWorkspace(
  workspaceRoot: string,
  candidateAbs: string,
): boolean {
  const root = path.resolve(workspaceRoot);
  const abs = path.resolve(candidateAbs);
  const rel = path.relative(root, abs);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
