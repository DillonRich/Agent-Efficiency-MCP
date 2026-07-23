#!/usr/bin/env node
/**
 * Agent Efficiency Engine MCP CLI
 *   agent-efficiency-mcp init [--project <dir>] [--global-only] [--env KEY=VAL ...] [--launch node|npx]
 *   agent-efficiency-mcp serve   (stdio MCP — same as node dist/server.js)
 *   agent-efficiency-mcp doctor [--project <dir>]
 *   agent-efficiency-mcp uninstall [--project <dir>] [--keep-rules]
 *   agent-efficiency-mcp version
 *   agent-efficiency-mcp help
 *   (alias: promptmcp)
 */
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { BLUEPRINT_FILENAME } from "./constants.js";
import { starterBlueprintStub, writeAgentIntent } from "./context.js";
import { formatDoctorReport, runDoctor } from "./doctor.js";
import {
  mergeMcpConfig,
  removeMcpConfig,
  resolveHostTargets,
  resolveLaunchMode,
  type LaunchMode,
} from "./install/mcp-hosts.js";
import {
  installCursorRulesFile,
  installHostGuidance,
  mergeLegacyRuleFiles,
  uninstallRules,
} from "./install/rules.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "..");
const serverJs = path.join(packageRoot, "dist", "server.js");
const cliJs = path.join(packageRoot, "dist", "cli.js");

loadEnv({ path: path.join(packageRoot, ".env") });

function packageVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
    ) as { version?: string };
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function printHelp(): void {
  console.log(`Agent Efficiency Engine MCP v${packageVersion()}

Usage:
  npx agent-efficiency-mcp init [options]   Install MCP + merge rules + blueprint
  agent-efficiency-mcp serve               Run MCP server over stdio
  agent-efficiency-mcp doctor [options]    Check install / keys / rules
  agent-efficiency-mcp uninstall [options] Remove MCP entry (+ rules unless --keep-rules)
  agent-efficiency-mcp version             Print version
  agent-efficiency-mcp help                Show this help
  (alias: promptmcp)

Init / uninstall options:
  --project <dir>     Target project root (default: cwd)
  --global-only       Only write/remove global IDE configs
  --skip-hosts        Skip MCP JSON registration
  --skip-rules        Skip rule merge
  --skip-blueprint    Skip creating ${BLUEPRINT_FILENAME}
  --keep-rules        Uninstall: leave PRIORITY 0 rules in place
  --launch node|npx   How hosts start the server (default: node)
                      npx = resilient after moves (needs npm package)
  --env KEY=VALUE     Extra env for MCP server entry (repeatable)

If the host model skips the gate: type /optimize or "run the efficiency engine".

After init, restart your IDE / reload MCP so the server connects.
`);
}

function parseArgs(argv: string[]): {
  cmd: string;
  project: string;
  globalOnly: boolean;
  skipHosts: boolean;
  skipRules: boolean;
  skipBlueprint: boolean;
  keepRules: boolean;
  launch: LaunchMode;
  env: Record<string, string>;
} {
  const args = argv.slice(2);
  const cmd = (args[0] || "help").toLowerCase();
  let project = process.cwd();
  let globalOnly = false;
  let skipHosts = false;
  let skipRules = false;
  let skipBlueprint = false;
  let keepRules = false;
  let launch = resolveLaunchMode();
  const env: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === "--project" && args[i + 1]) {
      project = path.resolve(args[++i]);
    } else if (a === "--global-only") {
      globalOnly = true;
    } else if (a === "--skip-hosts") {
      skipHosts = true;
    } else if (a === "--skip-rules") {
      skipRules = true;
    } else if (a === "--skip-blueprint") {
      skipBlueprint = true;
    } else if (a === "--keep-rules") {
      keepRules = true;
    } else if (a === "--launch" && args[i + 1]) {
      launch = resolveLaunchMode(args[++i]);
    } else if (a === "--env" && args[i + 1]) {
      const kv = args[++i];
      const eq = kv.indexOf("=");
      if (eq > 0) env[kv.slice(0, eq)] = kv.slice(eq + 1);
    }
  }

  return {
    cmd,
    project,
    globalOnly,
    skipHosts,
    skipRules,
    skipBlueprint,
    keepRules,
    launch,
    env,
  };
}

async function runInit(opts: ReturnType<typeof parseArgs>): Promise<void> {
  console.log(`Agent Efficiency Engine — init (v${packageVersion()})\n`);

  if (!fs.existsSync(serverJs)) {
    console.error(
      `Missing ${serverJs}\nRun: npm install && npm run build  (inside the package)`,
    );
    process.exit(1);
  }

  const projectRoot = path.resolve(opts.project);
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    console.error(`Project directory not found: ${projectRoot}`);
    process.exit(1);
  }

  console.log(`Package root:  ${packageRoot}`);
  console.log(`Server entry:  ${path.resolve(serverJs)}`);
  console.log(`CLI entry:     ${path.resolve(cliJs)}`);
  console.log(`Launch mode:   ${opts.launch}`);
  console.log(`Project root:  ${projectRoot}`);
  console.log("");

  const touched: string[] = [];

  if (!opts.skipHosts) {
    console.log("Registering MCP server (merge, keep existing servers)…");
    const targets = resolveHostTargets(projectRoot).filter((t) => {
      if (opts.globalOnly) {
        return !t.id.includes("project") && t.id !== "vscode-project";
      }
      return true;
    });

    for (const t of targets) {
      const onlyIf =
        t.id !== "cursor-global" &&
        t.id !== "cursor-project" &&
        t.id !== "vscode-project";
      const result = mergeMcpConfig(t, path.resolve(serverJs), opts.env, {
        write: true,
        onlyIfHostDirExists: onlyIf,
        launch: opts.launch,
        cliJsAbs: path.resolve(cliJs),
      });
      if (result.status === "skipped") {
        console.log(`  [skip] ${t.label} — host not detected`);
        continue;
      }
      console.log(`  [ok]   ${t.label}`);
      console.log(`         ${result.path}`);
      touched.push(result.path);
    }
    console.log("");
  }

  if (!opts.skipRules) {
    console.log("Merging PRIORITY 0 rules (does not delete your other rules)…");
    const rulesPath = installCursorRulesFile(projectRoot);
    console.log(`  [ok]   Cursor rules file`);
    console.log(`         ${rulesPath}`);
    touched.push(rulesPath);

    const legacy = mergeLegacyRuleFiles(projectRoot);
    for (const p of legacy) {
      console.log(`  [ok]   Upserted PromptMCP block into existing file`);
      console.log(`         ${p}`);
      touched.push(p);
    }
    if (legacy.length === 0) {
      console.log(
        "  [info] No existing .cursorrules / AGENTS.md / copilot-instructions to merge (optional)",
      );
    }

    const hosts = installHostGuidance(projectRoot);
    for (const p of hosts) {
      console.log(`  [ok]   Host guidance`);
      console.log(`         ${p}`);
      touched.push(p);
    }
    console.log("");
  }

  if (!opts.skipBlueprint) {
    console.log(`Creating blueprint HUD (${BLUEPRINT_FILENAME})…`);
    const blueprintPath = path.join(projectRoot, BLUEPRINT_FILENAME);
    if (fs.existsSync(blueprintPath)) {
      console.log(`  [keep] Already exists — not overwriting`);
      console.log(`         ${path.resolve(blueprintPath)}`);
    } else {
      const written = writeAgentIntent(
        projectRoot,
        starterBlueprintStub(),
        BLUEPRINT_FILENAME,
      );
      console.log(`  [ok]   Created blueprint file`);
      console.log(`         ${written}`);
      touched.push(written);
    }
    console.log("");
    console.log("────────────────────────────────────────────");
    console.log("BLUEPRINT FILE (find this path if needed):");
    console.log(path.resolve(projectRoot, BLUEPRINT_FILENAME));
    console.log("────────────────────────────────────────────");
    console.log("");
  }

  console.log("Done. Next steps:");
  console.log("  1. Restart Cursor / VS Code / Windsurf / Claude (or reload MCP)");
  console.log("  2. Confirm server `agent-efficiency-engine` is connected");
  console.log(
    "  3. Put your API key in the package `.env` or MCP env block",
  );
  console.log(
    `  4. Send a task prompt → review ${BLUEPRINT_FILENAME} → type GO`,
  );
  console.log(
    '  5. If the model skips the gate: /optimize or "run the efficiency engine"',
  );
  console.log(`  6. Health check: agent-efficiency-mcp doctor --project "${projectRoot}"`);
  console.log("");
  if (touched.length) {
    console.log("Paths touched:");
    for (const p of touched) console.log(`  - ${p}`);
  }
}

async function runDoctorCmd(opts: ReturnType<typeof parseArgs>): Promise<void> {
  const report = runDoctor({
    packageRoot,
    projectRoot: path.resolve(opts.project),
  });
  console.log(formatDoctorReport(report));
  process.exit(report.ok ? 0 : 1);
}

async function runUninstall(opts: ReturnType<typeof parseArgs>): Promise<void> {
  console.log(`Agent Efficiency Engine — uninstall (v${packageVersion()})\n`);
  const projectRoot = path.resolve(opts.project);
  const touched: string[] = [];

  const targets = resolveHostTargets(projectRoot).filter((t) => {
    if (opts.globalOnly) {
      return !t.id.includes("project") && t.id !== "vscode-project";
    }
    return true;
  });

  console.log("Removing MCP server entries (other servers kept)…");
  for (const t of targets) {
    const result = removeMcpConfig(t);
    if (result.status === "removed") {
      console.log(`  [ok]   Removed from ${t.label}`);
      console.log(`         ${result.path}`);
      touched.push(result.path);
    }
  }

  if (!opts.keepRules) {
    console.log("\nRemoving PRIORITY 0 rules / marked blocks…");
    const removed = uninstallRules(projectRoot);
    for (const p of removed) {
      console.log(`  [ok]   ${p}`);
      touched.push(p);
    }
    if (removed.length === 0) {
      console.log("  [info] No PromptMCP rules blocks found");
    }
  } else {
    console.log("\nKeeping rules (--keep-rules)");
  }

  console.log(
    `\nBlueprint file ${BLUEPRINT_FILENAME} left in place (delete manually if desired).`,
  );
  console.log("Restart your IDE / reload MCP after uninstall.\n");
  if (touched.length) {
    console.log("Paths touched:");
    for (const p of touched) console.log(`  - ${p}`);
  }
}

async function runServe(): Promise<void> {
  if (!fs.existsSync(serverJs)) {
    console.error(`Missing ${serverJs}. Run npm run build first.`);
    process.exit(1);
  }
  const child = spawn(process.execPath, [serverJs], {
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  if (opts.cmd === "init") {
    await runInit(opts);
    return;
  }
  if (opts.cmd === "serve" || opts.cmd === "start") {
    await runServe();
    return;
  }
  if (opts.cmd === "doctor") {
    await runDoctorCmd(opts);
    return;
  }
  if (opts.cmd === "uninstall" || opts.cmd === "remove") {
    await runUninstall(opts);
    return;
  }
  if (opts.cmd === "version" || opts.cmd === "-v" || opts.cmd === "--version") {
    console.log(packageVersion());
    return;
  }
  printHelp();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
