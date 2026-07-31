/**
 * Health checks for install + runtime readiness.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { BLUEPRINT_FILENAME, MCP_SERVER_KEY } from "./constants.js";
import { resolveHostTargets } from "./install/mcp-hosts.js";

export interface DoctorFinding {
  level: "ok" | "warn" | "fail";
  message: string;
}

export interface DoctorReport {
  findings: DoctorFinding[];
  ok: boolean;
}

const KEY_ENV_NAMES = [
  "DEEPSEEK_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "XAI_API_KEY",
  "GROK_API_KEY",
  "REWRITE_API_KEY",
  "LOCAL_LLM_API_KEY",
  "LOCAL_LLM_BASE",
  "LOCAL_LLM_MODEL",
];

function hasAnyProviderKey(): boolean {
  return KEY_ENV_NAMES.some((k) => Boolean(process.env[k]?.trim()));
}

function readJsonObject(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Inspect MCP mcp.json for our server env keys (consumer path). */
export function mcpConfigHasProviderKey(
  configPath: string,
  rootKey: "mcpServers" | "servers",
): { present: boolean; keyName?: string; redacted?: string } {
  if (!fs.existsSync(configPath)) return { present: false };
  const data = readJsonObject(configPath);
  if (!data) return { present: false };
  const servers = data[rootKey];
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    return { present: false };
  }
  const entry = (servers as Record<string, unknown>)[MCP_SERVER_KEY];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return { present: false };
  }
  const env = (entry as { env?: Record<string, unknown> }).env;
  if (!env || typeof env !== "object") return { present: false };

  for (const name of KEY_ENV_NAMES) {
    const v = env[name];
    if (typeof v === "string" && v.trim()) {
      const t = v.trim();
      // Placeholder leftovers
      if (/^your[_-]?key$/i.test(t) || t === "YOUR_KEY" || t === "sk-YOUR") {
        continue;
      }
      return {
        present: true,
        keyName: name,
        redacted: t.slice(0, 4) + "…",
      };
    }
  }
  return { present: false };
}

function configMentionsServer(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return raw.includes(MCP_SERVER_KEY) || raw.includes("agent-efficiency");
  } catch {
    return false;
  }
}

export function runDoctor(options: {
  packageRoot: string;
  projectRoot: string;
}): DoctorReport {
  const findings: DoctorFinding[] = [];
  const { packageRoot, projectRoot } = options;

  const serverJs = path.join(packageRoot, "dist", "server.js");
  const cliJs = path.join(packageRoot, "dist", "cli.js");
  if (fs.existsSync(serverJs) && fs.existsSync(cliJs)) {
    findings.push({
      level: "ok",
      message: `Built artifacts present (${serverJs})`,
    });
  } else {
    findings.push({
      level: "fail",
      message: `Missing dist build. Run: npm run build  (looked for ${serverJs})`,
    });
  }

  const envPath = path.join(packageRoot, ".env");
  if (fs.existsSync(envPath)) {
    findings.push({ level: "ok", message: `Package .env found at ${envPath}` });
  } else {
    findings.push({
      level: "warn",
      message: `No package .env at ${envPath} — normal for npx; keys should be in MCP mcp.json`,
    });
  }

  const processHasKey = hasAnyProviderKey();
  let mcpKeyHit:
    | { present: true; label: string; keyName: string; redacted: string }
    | undefined;

  for (const t of resolveHostTargets(projectRoot)) {
    if (!configMentionsServer(t.configPath)) continue;
    const hit = mcpConfigHasProviderKey(t.configPath, t.rootKey);
    if (hit.present && hit.keyName && hit.redacted) {
      mcpKeyHit = {
        present: true,
        label: t.label,
        keyName: hit.keyName,
        redacted: hit.redacted,
      };
      break;
    }
  }

  if (processHasKey) {
    findings.push({
      level: "ok",
      message: `Provider credentials in process env (REWRITE_PROVIDER=${process.env.REWRITE_PROVIDER || "auto"})`,
    });
  } else if (mcpKeyHit) {
    findings.push({
      level: "ok",
      message: `Provider key in MCP env (${mcpKeyHit.keyName}=${mcpKeyHit.redacted} via ${mcpKeyHit.label}) — reload MCP if optimize still fails`,
    });
  } else {
    findings.push({
      level: "fail",
      message:
        "No provider key in process env or MCP mcp.json. Run: agent-efficiency-mcp configure --project <dir> --provider \"Deep Seek\" --api-key <KEY> --model flash",
    });
  }

  const rules = path.join(projectRoot, ".cursor", "rules", "00-promptmcp.mdc");
  if (fs.existsSync(rules)) {
    const body = fs.readFileSync(rules, "utf8");
    const always = /alwaysApply:\s*true/i.test(body);
    const zeroToken = /ZERO.?TOKEN|first action this turn MUST/i.test(body);
    findings.push({
      level: always ? "ok" : "warn",
      message: always
        ? `PRIORITY 0 rules present (alwaysApply): ${rules}`
        : `PRIORITY 0 rules found but alwaysApply is not true: ${rules}`,
    });
    if (!zeroToken) {
      findings.push({
        level: "warn",
        message:
          "Rules file looks outdated (missing zero-token-before-tool). Re-run init to refresh 00-promptmcp.mdc.",
      });
    }
  } else {
    findings.push({
      level: "warn",
      message: `No ${rules} — run: agent-efficiency-mcp init --project "${projectRoot}"`,
    });
  }

  const blueprint = path.join(projectRoot, BLUEPRINT_FILENAME);
  if (fs.existsSync(blueprint)) {
    findings.push({ level: "ok", message: `Blueprint file: ${blueprint}` });
  } else {
    findings.push({
      level: "warn",
      message: `No ${BLUEPRINT_FILENAME} yet (created on init or first optimize)`,
    });
  }

  let mcpHits = 0;
  for (const t of resolveHostTargets(projectRoot)) {
    if (configMentionsServer(t.configPath)) {
      mcpHits += 1;
      findings.push({
        level: "ok",
        message: `MCP registered in ${t.label}: ${t.configPath}`,
      });
      const keyCheck = mcpConfigHasProviderKey(t.configPath, t.rootKey);
      if (
        t.id.startsWith("cursor") &&
        configMentionsServer(t.configPath) &&
        !keyCheck.present
      ) {
        findings.push({
          level: "warn",
          message: `${t.label} has our server but no API key in env — run configure (or --also-global if this is the global entry)`,
        });
      }
    }
  }
  if (mcpHits === 0) {
    findings.push({
      level: "warn",
      message:
        "No host MCP config mentions agent-efficiency-engine. Run init, then restart the IDE.",
    });
  }

  findings.push({
    level: "ok",
    message:
      'Soft gate: hosts can skip tools. Recover with /optimize or "run the efficiency engine". Optional: fixtures/dogfood/gate-log.csv',
  });
  findings.push({
    level: "ok",
    message:
      "Docs: docs/INSTALL.md · uninstall: agent-efficiency-mcp uninstall --project <dir> --purge",
  });

  const ok = !findings.some((f) => f.level === "fail");
  return { findings, ok };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = ["Agent Efficiency Engine — doctor", ""];
  for (const f of report.findings) {
    const tag =
      f.level === "ok" ? "[ok]  " : f.level === "warn" ? "[warn]" : "[FAIL]";
    lines.push(`${tag} ${f.message}`);
  }
  lines.push("");
  lines.push(report.ok ? "Overall: READY" : "Overall: NEEDS ATTENTION");
  return lines.join("\n");
}
