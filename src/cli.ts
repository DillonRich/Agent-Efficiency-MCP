#!/usr/bin/env node
/**
 * Agent Efficiency Engine MCP CLI
 *   agent-efficiency-mcp init [--project <dir>] [--global-only] [--env KEY=VAL ...] [--launch node|npx]
 *   agent-efficiency-mcp configure [--project <dir>] [--provider ...] [--api-key ...] [--model ...] [--env KEY=VAL ...]
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
import { buildConfigureEnv } from "./configure-env.js";
import { ensureMcpSecretsGitignore } from "./install/gitignore.js";
import {
  filterHostTargets,
  mergeMcpConfig,
  patchMcpServerEnv,
  removeEmptyMcpConfigFile,
  removeMcpConfig,
  removeOrphanVscodeMcp,
  resolveHostsMode,
  resolveHostTargets,
  resolveLaunchMode,
  type HostsMode,
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
  npx agent-efficiency-mcp init [options]        Install MCP + merge rules + blueprint
  npx agent-efficiency-mcp configure [options]   Set API key / provider / model in MCP env
  agent-efficiency-mcp serve                     Run MCP server over stdio
  agent-efficiency-mcp doctor [options]          Check install / keys / rules
  agent-efficiency-mcp uninstall [options]       Remove MCP entry (+ rules unless --keep-rules)
  agent-efficiency-mcp version                   Print version
  agent-efficiency-mcp help                      Show this help
  (alias: promptmcp)

Init / configure / uninstall options:
  --project <dir>     Target project root (default: cwd)
  --global-only       Only write/remove global IDE configs
  --skip-hosts        Skip MCP JSON registration (init)
  --skip-rules        Skip rule merge (init)
  --skip-blueprint    Skip creating ${BLUEPRINT_FILENAME} (init)
  --keep-rules        Uninstall: leave PRIORITY 0 rules in place
  --launch node|npx   How hosts start the server (default: node)
                      npx = resilient after moves (needs npm package)
  --env KEY=VALUE     Extra env for MCP server entry (repeatable)
  --hosts auto|cursor|vscode|all
                      Which IDE MCP configs to touch (default: auto = Cursor only;
                      use all if you want VS Code + other hosts too)
  --provider <name>   configure: deepseek|openai|anthropic|gemini|xai|local|auto
                      (case/spacing flexible: "Deep Seek", DeepSeek, DEEPSEEK)
  --api-key <key>     configure: sets the matching *_API_KEY for --provider
  --model <id>        configure: rewrite-model alias or exact API id
                      (e.g. flash, pro, "sonnet 4", gpt-4.1-mini; optional "flash high")
  --effort <level>    configure: none|low|medium|high|max (thinking / reasoning_effort)
  --thinking on|off   configure: force thinking enabled/disabled (DeepSeek V4+)
  --max-tokens <n>    configure: REWRITE_MAX_TOKENS for the rewrite API call
  --temperature <n>   configure: REWRITE_TEMPERATURE (default 0.1)
  --also-global       init: also register ~/.cursor/mcp.json; configure: also write keys there
                      (default: project .cursor/mcp.json only)
  --purge             uninstall: delete blueprint .md(s), entire .promptmcp/, empty mcp husks

Keys are stored in the MCP server env block (mcp.json) — we never create or edit your app's .env.
configure also adds .cursor/mcp.json to .gitignore so keys are less likely to be committed.

Typical consumer flow:
  npx agent-efficiency-mcp@latest init --project .
  npx agent-efficiency-mcp@latest configure --project . --provider "<PROVIDER>" --api-key "<YOUR_KEY>" --model "<MODEL>"
  (reload MCP) then send a task → review ${BLUEPRINT_FILENAME} → type GO

If the host model skips the gate: type /optimize or "run the efficiency engine".
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
  provider?: string;
  apiKey?: string;
  model?: string;
  effort?: string;
  thinking?: string;
  maxTokens?: string;
  temperature?: string;
  alsoGlobal: boolean;
  purge: boolean;
  hosts: HostsMode;
} {
  const args = argv.slice(2);
  const cmd = (args[0] || "help").toLowerCase();
  let project = process.cwd();
  let globalOnly = false;
  let skipHosts = false;
  let skipRules = false;
  let skipBlueprint = false;
  let keepRules = false;
  let alsoGlobal = false;
  let purge = false;
  let hosts = resolveHostsMode();
  let launchExplicit: string | undefined;
  let provider: string | undefined;
  let apiKey: string | undefined;
  let model: string | undefined;
  let effort: string | undefined;
  let thinking: string | undefined;
  let maxTokens: string | undefined;
  let temperature: string | undefined;
  const env: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === "--project" && args[i + 1]) {
      project = path.resolve(args[++i]);
    } else if (a === "--global-only") {
      globalOnly = true;
    } else if (a === "--also-global") {
      alsoGlobal = true;
    } else if (a === "--purge") {
      purge = true;
    } else if (a === "--skip-hosts") {
      skipHosts = true;
    } else if (a === "--skip-rules") {
      skipRules = true;
    } else if (a === "--skip-blueprint") {
      skipBlueprint = true;
    } else if (a === "--keep-rules") {
      keepRules = true;
    } else if (a === "--launch" && args[i + 1]) {
      launchExplicit = args[++i];
    } else if ((a === "--hosts" || a === "--host") && args[i + 1]) {
      hosts = resolveHostsMode(args[++i]);
    } else if (a === "--provider" && args[i + 1]) {
      provider = args[++i];
    } else if ((a === "--api-key" || a === "--apikey") && args[i + 1]) {
      apiKey = args[++i];
    } else if (a === "--model" && args[i + 1]) {
      model = args[++i];
    } else if ((a === "--effort" || a === "--reasoning-effort") && args[i + 1]) {
      effort = args[++i];
    } else if (a === "--thinking" && args[i + 1]) {
      thinking = args[++i];
    } else if ((a === "--max-tokens" || a === "--max_tokens") && args[i + 1]) {
      maxTokens = args[++i];
    } else if (a === "--temperature" && args[i + 1]) {
      temperature = args[++i];
    } else if (a === "--env" && args[i + 1]) {
      const kv = args[++i];
      const eq = kv.indexOf("=");
      if (eq > 0) env[kv.slice(0, eq)] = kv.slice(eq + 1);
    }
  }

  const launch = resolveLaunchMode(launchExplicit, packageRoot);

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
    provider,
    apiKey,
    model,
    effort,
    thinking,
    maxTokens,
    temperature,
    alsoGlobal,
    purge,
    hosts,
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
    console.log(
      `Registering MCP server (hosts=${opts.hosts}; merge, keep existing servers)…`,
    );
    const targets = filterHostTargets(
      resolveHostTargets(projectRoot),
      projectRoot,
      opts.hosts,
      { globalOnly: opts.globalOnly, alsoGlobal: opts.alsoGlobal },
    );

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
    if (opts.hosts === "auto" || opts.hosts === "cursor") {
      const orphans = removeOrphanVscodeMcp(projectRoot);
      for (const p of orphans) {
        console.log(`  [ok]   Removed leftover VS Code MCP clutter`);
        console.log(`         ${p}`);
        touched.push(p);
      }
    }
    const gi = ensureMcpSecretsGitignore(projectRoot);
    console.log(
      `  [${gi.status === "unchanged" ? "ok" : gi.status}] .gitignore (MCP configs may hold keys later)`,
    );
    console.log(`         ${gi.path}`);
    touched.push(gi.path);
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

    const hosts = installHostGuidance(projectRoot, opts.hosts);
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
  console.log(
    "  1. Set your BYOK rewrite key (MCP env only — no app .env):",
  );
  console.log(
    `     npx agent-efficiency-mcp configure --project "${projectRoot}" --provider "<PROVIDER>" --api-key "<YOUR_KEY>" --model "<MODEL>"`,
  );
  console.log(
    '     Optional: --effort none|low|medium|high|max  --thinking on|off  --max-tokens 8192  --also-global',
  );
  console.log(
    "     Names are flexible: Deep Seek ≈ deepseek, flash ≈ deepseek-v4-flash (thinking off by default).",
  );
  console.log(
    '     Examples: --provider "Deep Seek" --model flash   or   --model "pro:max"',
  );
  console.log("  2. Reload MCP / restart the IDE");
  console.log("  3. Confirm server `agent-efficiency-engine` is connected");
  console.log(
    `  4. Send a prompt → review ${BLUEPRINT_FILENAME} → type GO`,
  );
  console.log(
    '  5. If the model skips the gate: /optimize or "run the efficiency engine"',
  );
  console.log(
    `  6. Health check: agent-efficiency-mcp doctor --project "${projectRoot}"`,
  );
  console.log("");
  if (touched.length) {
    console.log("Paths touched:");
    for (const p of touched) console.log(`  - ${p}`);
  }
}

async function runConfigure(opts: ReturnType<typeof parseArgs>): Promise<void> {
  console.log(`Agent Efficiency Engine — configure (v${packageVersion()})\n`);
  const projectRoot = path.resolve(opts.project);
  const env = buildConfigureEnv({
    provider: opts.provider,
    apiKey: opts.apiKey,
    model: opts.model,
    effort: opts.effort,
    thinking: opts.thinking,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
    env: opts.env,
  });

  if (Object.keys(env).length === 0) {
    console.error(
      "Nothing to set. Example:\n" +
        `  npx agent-efficiency-mcp configure --project "${projectRoot}" --provider "<PROVIDER>" --api-key "<YOUR_KEY>" --model "<MODEL>"\n` +
        "Or pass raw vars: --env DEEPSEEK_API_KEY=... --env REWRITE_PROVIDER=deepseek",
    );
    process.exit(1);
  }

  const targets = filterHostTargets(
    resolveHostTargets(projectRoot),
    projectRoot,
    opts.hosts,
    {
      globalOnly: opts.globalOnly,
      alsoGlobal: opts.alsoGlobal,
      configure: true,
    },
  );

  const redacted = Object.fromEntries(
    Object.entries(env).map(([k, v]) =>
      /KEY|TOKEN|SECRET/i.test(k) ? [k, v.slice(0, 4) + "…"] : [k, v],
    ),
  );
  console.log(
    "Applying MCP env (mcp.json server env — never touches your app .env):",
  );
  for (const [k, v] of Object.entries(redacted)) {
    console.log(`  ${k}=${v}`);
  }
  console.log("");

  let updated = 0;
  for (const t of targets) {
    // Only patch configs that already exist (init creates them).
    if (!fs.existsSync(t.configPath)) continue;
    const result = patchMcpServerEnv(t, env);
    if (result.status === "updated") {
      console.log(`  [ok]   ${t.label}`);
      console.log(`         ${result.path}`);
      updated += 1;
    } else if (result.status === "absent") {
      /* quiet */
    }
  }

  if (updated === 0) {
    console.error(
      "No MCP configs found to update. Run init first:\n" +
        `  npx agent-efficiency-mcp init --project "${projectRoot}"`,
    );
    process.exit(1);
  }

  const gi = ensureMcpSecretsGitignore(projectRoot);
  console.log(
    `\n  [${gi.status === "unchanged" ? "ok" : gi.status}] .gitignore — keep MCP env keys out of git`,
  );
  console.log(`         ${gi.path}`);
  console.log(
    "  Note: keys live in mcp.json env (required for MCP). Do not commit that file.",
  );

  console.log("");
  console.log("Done. Reload MCP / restart the IDE, then run:");
  console.log(`  npx agent-efficiency-mcp doctor --project "${projectRoot}"`);
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

  // Removing the MCP server entry also removes its env block (API keys) from that JSON.
  console.log(
    "\nNote: MCP server entry removed → PromptMCP env keys in that mcp.json are gone.",
  );
  console.log(
    "We never edit your app .env; no .env lines to scrub.",
  );

  if (opts.purge) {
    console.log("\n--purge: removing PromptMCP project files…");
    // Known root markdown artifacts we create (never wipe arbitrary *.md).
    const rootMarkdown = [
      path.join(projectRoot, BLUEPRINT_FILENAME),
      path.join(projectRoot, "Agent_Efficiency_MCP.smoke.md"),
    ];
    for (const p of rootMarkdown) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        fs.unlinkSync(p);
        console.log(`  [ok]   Deleted ${p}`);
        touched.push(path.resolve(p));
      }
    }

    // Entire data dir: hosts/*.md, history/, etc.
    const promptmcpDir = path.join(projectRoot, ".promptmcp");
    if (fs.existsSync(promptmcpDir)) {
      fs.rmSync(promptmcpDir, { recursive: true, force: true });
      console.log(`  [ok]   Deleted ${promptmcpDir}`);
      touched.push(path.resolve(promptmcpDir));
    }

    // Empty mcp.json husks left after removing our only server entry
    for (const t of targets) {
      if (removeEmptyMcpConfigFile(t.configPath)) {
        console.log(`  [ok]   Deleted empty ${t.configPath}`);
        touched.push(path.resolve(t.configPath));
      }
    }

    // Drop empty IDE dirs we may have created (rules/, .cursor/, .vscode/)
    for (const rel of [".cursor/rules", ".cursor", ".vscode"]) {
      const dir = path.join(projectRoot, ...rel.split("/"));
      if (!fs.existsSync(dir)) continue;
      try {
        if (fs.readdirSync(dir).length === 0) {
          fs.rmdirSync(dir);
          console.log(`  [ok]   Deleted empty ${dir}`);
          touched.push(path.resolve(dir));
        }
      } catch {
        /* ignore */
      }
    }
  } else {
    console.log(
      `\nBlueprint ${BLUEPRINT_FILENAME} and .promptmcp/ left in place (use --purge to delete).`,
    );
  }

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
  if (opts.cmd === "configure" || opts.cmd === "config" || opts.cmd === "env") {
    await runConfigure(opts);
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
