import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { MCP_SERVER_KEY } from "../constants.js";

export type McpRootKey = "mcpServers" | "servers";
export type LaunchMode = "node" | "npx";

export interface HostTarget {
  id: string;
  label: string;
  /** Absolute path to config file */
  configPath: string;
  rootKey: McpRootKey;
  /** VS Code often wants type: stdio */
  vscodeStyle?: boolean;
}

function home(...parts: string[]): string {
  return path.join(os.homedir(), ...parts);
}

function appData(...parts: string[]): string {
  if (process.platform === "win32") {
    const base = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(base, ...parts);
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", ...parts);
  }
  return path.join(os.homedir(), ".config", ...parts);
}

/** Which IDE MCP configs init/configure should touch */
export type HostsMode = "auto" | "cursor" | "vscode" | "all";

export function resolveHostsMode(raw?: string): HostsMode {
  const v = (raw || process.env.PROMPT_MCP_HOSTS || "auto").trim().toLowerCase();
  if (v === "cursor" || v === "vscode" || v === "all" || v === "auto") return v;
  return "auto";
}

/**
 * auto: Cursor always; VS Code only if `.vscode/` already exists; other hosts if product dir exists.
 * cursor / vscode: that family only. all: every target (exotic still gated by onlyIfHostDirExists).
 */
export function filterHostTargets(
  targets: HostTarget[],
  projectRoot: string,
  mode: HostsMode,
  options?: { globalOnly?: boolean; alsoGlobal?: boolean; configure?: boolean },
): HostTarget[] {
  return targets.filter((t) => {
    if (options?.globalOnly) {
      return t.id === "cursor-global";
    }
    if (options?.configure) {
      // Patch project configs for selected hosts; global only with --also-global
      if (t.id === "cursor-global") return Boolean(options.alsoGlobal);
      if (mode === "cursor") return t.id === "cursor-project";
      if (mode === "vscode") return t.id === "vscode-project";
      if (mode === "all") {
        return t.id === "cursor-project" || t.id === "vscode-project";
      }
      // auto configure: cursor project always; vscode only if file/dir already present
      if (t.id === "cursor-project") return true;
      if (t.id === "vscode-project") {
        return (
          fs.existsSync(t.configPath) ||
          fs.existsSync(path.join(projectRoot, ".vscode"))
        );
      }
      return false;
    }

    if (mode === "cursor") return t.id.startsWith("cursor");
    if (mode === "vscode") return t.id === "vscode-project";
    if (mode === "all") return true;

    // auto init
    if (t.id.startsWith("cursor")) return true;
    if (t.id === "vscode-project") {
      return (
        fs.existsSync(path.join(projectRoot, ".vscode")) ||
        Boolean(process.env.VSCODE_PID) ||
        process.env.TERM_PROGRAM === "vscode"
      );
    }
    return true; // exotic: gated later by onlyIfHostDirExists
  });
}

/** Global + project host config targets for major MCP clients */
export function resolveHostTargets(projectRoot: string): HostTarget[] {
  const targets: HostTarget[] = [
    {
      id: "cursor-global",
      label: "Cursor (global)",
      configPath: home(".cursor", "mcp.json"),
      rootKey: "mcpServers",
    },
    {
      id: "cursor-project",
      label: "Cursor (project)",
      configPath: path.join(projectRoot, ".cursor", "mcp.json"),
      rootKey: "mcpServers",
    },
    {
      id: "vscode-project",
      label: "VS Code / Copilot (project)",
      configPath: path.join(projectRoot, ".vscode", "mcp.json"),
      rootKey: "servers",
      vscodeStyle: true,
    },
    {
      id: "windsurf-global",
      label: "Windsurf (global)",
      configPath: home(".codeium", "windsurf", "mcp_config.json"),
      rootKey: "mcpServers",
    },
    {
      id: "windsurf-alt",
      label: "Windsurf (alt path)",
      configPath: home(".windsurf", "mcp.json"),
      rootKey: "mcpServers",
    },
    {
      id: "claude-desktop",
      label: "Claude Desktop",
      configPath: appData("Claude", "claude_desktop_config.json"),
      rootKey: "mcpServers",
    },
    {
      id: "claude-code",
      label: "Claude Code (user settings)",
      configPath: home(".claude", "settings.json"),
      rootKey: "mcpServers",
    },
    {
      id: "cline",
      label: "Cline / Roo (project)",
      configPath: path.join(projectRoot, ".cline", "mcp_settings.json"),
      rootKey: "mcpServers",
    },
    {
      id: "continue",
      label: "Continue.dev (project hint)",
      configPath: path.join(projectRoot, ".continue", "mcpServers", "promptmcp.json"),
      rootKey: "mcpServers",
    },
  ];
  return targets;
}

export function resolveLaunchMode(explicit?: string): LaunchMode {
  const raw = (
    explicit ||
    process.env.PROMPT_MCP_LAUNCH ||
    "node"
  ).toLowerCase();
  return raw === "npx" ? "npx" : "node";
}

/**
 * Build MCP server entry.
 * - node: absolute path to package CLI `serve` (local clone / pinned install)
 * - npx: `npx -y agent-efficiency-mcp serve` (survives moves; needs npm publish)
 */
export function buildServerEntry(
  serverJsAbs: string,
  env: Record<string, string>,
  options?: { vscodeStyle?: boolean; launch?: LaunchMode; cliJsAbs?: string },
): Record<string, unknown> {
  const launch = options?.launch ?? "node";
  let entry: Record<string, unknown>;

  if (launch === "npx") {
    entry = {
      command: process.platform === "win32" ? "npx.cmd" : "npx",
      args: ["-y", "agent-efficiency-mcp", "serve"],
    };
  } else {
    const cli = options?.cliJsAbs || serverJsAbs;
    // Prefer CLI serve so env loading + future flags stay consistent
    const useCli = cli.endsWith("cli.js") || cli.endsWith("cli.ts");
    entry = useCli
      ? { command: "node", args: [cli, "serve"] }
      : { command: "node", args: [serverJsAbs] };
  }

  if (Object.keys(env).length) entry.env = env;
  if (options?.vscodeStyle) entry.type = "stdio";
  return entry;
}

function readJsonObject(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* corrupt — backup below */
  }
  return {};
}

/**
 * Merge PromptMCP server into a host config without removing other servers.
 * Returns absolute path written, or null if skipped.
 */
export function mergeMcpConfig(
  target: HostTarget,
  serverJsAbs: string,
  env: Record<string, string>,
  options: {
    write: boolean;
    onlyIfHostDirExists?: boolean;
    launch?: LaunchMode;
    cliJsAbs?: string;
  },
): { path: string; status: "written" | "skipped" | "backed_up_corrupt" } {
  const dir = path.dirname(target.configPath);

  // Skip exotic hosts if their parent product dir never existed (avoid littering)
  if (options.onlyIfHostDirExists) {
    const skipIds = new Set([
      "windsurf-global",
      "windsurf-alt",
      "claude-desktop",
      "claude-code",
      "cline",
      "continue",
    ]);
    if (skipIds.has(target.id)) {
      const probe =
        target.id === "claude-desktop"
          ? path.dirname(target.configPath)
          : target.id.startsWith("windsurf")
            ? path.dirname(target.configPath)
            : target.id === "claude-code"
              ? home(".claude")
              : path.dirname(target.configPath);
      if (!fs.existsSync(probe) && !fs.existsSync(target.configPath)) {
        return { path: target.configPath, status: "skipped" };
      }
    }
  }

  let data = readJsonObject(target.configPath);
  let backedUp = false;
  if (fs.existsSync(target.configPath) && Object.keys(data).length === 0) {
    try {
      const bak = `${target.configPath}.promptmcp-bak`;
      fs.copyFileSync(target.configPath, bak);
      backedUp = true;
    } catch {
      /* ignore */
    }
  }

  const rootKey = target.rootKey;
  const root = (data[rootKey] as Record<string, unknown> | undefined) ?? {};
  if (typeof root !== "object" || Array.isArray(root)) {
    data[rootKey] = {};
  }
  const servers = {
    ...((data[rootKey] as Record<string, unknown>) || {}),
  };
  const entry = buildServerEntry(serverJsAbs, env, {
    vscodeStyle: target.vscodeStyle,
    launch: options.launch,
    cliJsAbs: options.cliJsAbs,
  });
  servers[MCP_SERVER_KEY] = entry;
  data[rootKey] = servers;

  // Continue.dev quirk: sometimes a single-server file
  if (target.id === "continue") {
    data = {
      mcpServers: {
        [MCP_SERVER_KEY]: buildServerEntry(serverJsAbs, env, {
          launch: options.launch,
          cliJsAbs: options.cliJsAbs,
        }),
      },
    };
  }

  if (options.write) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      target.configPath,
      JSON.stringify(data, null, 2) + "\n",
      "utf8",
    );
  }

  return {
    path: path.resolve(target.configPath),
    status: backedUp ? "backed_up_corrupt" : "written",
  };
}

/**
 * Merge env vars into an existing agent-efficiency-engine MCP entry (keeps command/args).
 */
export function patchMcpServerEnv(
  target: HostTarget,
  env: Record<string, string>,
): { path: string; status: "updated" | "absent" | "unchanged" } {
  if (!fs.existsSync(target.configPath)) {
    return { path: target.configPath, status: "absent" };
  }
  if (Object.keys(env).length === 0) {
    return { path: path.resolve(target.configPath), status: "unchanged" };
  }

  const data = readJsonObject(target.configPath);
  const rootKey = target.rootKey;
  const servers = data[rootKey];
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    return { path: path.resolve(target.configPath), status: "absent" };
  }
  const map = { ...(servers as Record<string, unknown>) };
  const existing = map[MCP_SERVER_KEY];
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
    return { path: path.resolve(target.configPath), status: "absent" };
  }

  const entry = { ...(existing as Record<string, unknown>) };
  const prevEnv =
    entry.env && typeof entry.env === "object" && !Array.isArray(entry.env)
      ? { ...(entry.env as Record<string, string>) }
      : {};
  entry.env = { ...prevEnv, ...env };
  map[MCP_SERVER_KEY] = entry;
  data[rootKey] = map;
  fs.mkdirSync(path.dirname(target.configPath), { recursive: true });
  fs.writeFileSync(
    target.configPath,
    JSON.stringify(data, null, 2) + "\n",
    "utf8",
  );
  return { path: path.resolve(target.configPath), status: "updated" };
}

/** Remove only our MCP server key; leave other servers intact. */
export function removeMcpConfig(
  target: HostTarget,
): { path: string; status: "removed" | "absent" | "skipped" } {
  if (!fs.existsSync(target.configPath)) {
    return { path: target.configPath, status: "absent" };
  }
  const data = readJsonObject(target.configPath);
  const rootKey = target.rootKey;
  const servers = data[rootKey];
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    return { path: path.resolve(target.configPath), status: "absent" };
  }
  const map = { ...(servers as Record<string, unknown>) };
  if (!(MCP_SERVER_KEY in map)) {
    return { path: path.resolve(target.configPath), status: "absent" };
  }
  delete map[MCP_SERVER_KEY];
  data[rootKey] = map;
  fs.writeFileSync(
    target.configPath,
    JSON.stringify(data, null, 2) + "\n",
    "utf8",
  );
  return { path: path.resolve(target.configPath), status: "removed" };
}

/**
 * If a host mcp.json has no servers left (and no other top-level keys besides
 * the empty servers map), delete the file so uninstall --purge leaves no husk.
 */
export function removeEmptyMcpConfigFile(configPath: string): boolean {
  if (!fs.existsSync(configPath)) return false;
  try {
    const data = readJsonObject(configPath);
    const keys = Object.keys(data);
    if (keys.length === 0) {
      fs.unlinkSync(configPath);
      return true;
    }
    if (keys.length === 1) {
      const only = data[keys[0]!];
      if (
        only &&
        typeof only === "object" &&
        !Array.isArray(only) &&
        Object.keys(only as object).length === 0
      ) {
        fs.unlinkSync(configPath);
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}
