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

function hasAnyProviderKey(): boolean {
  return Boolean(
    process.env.DEEPSEEK_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.XAI_API_KEY?.trim() ||
      process.env.GROK_API_KEY?.trim() ||
      process.env.REWRITE_API_KEY?.trim() ||
      process.env.LOCAL_LLM_BASE?.trim() ||
      process.env.LOCAL_LLM_MODEL?.trim(),
  );
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
    findings.push({ level: "ok", message: `Built artifacts present (${serverJs})` });
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
      message: `No package .env at ${envPath} — keys may still be in MCP env`,
    });
  }

  if (hasAnyProviderKey()) {
    findings.push({
      level: "ok",
      message: `Provider credentials detected (REWRITE_PROVIDER=${process.env.REWRITE_PROVIDER || "auto"})`,
    });
  } else {
    findings.push({
      level: "fail",
      message:
        "No provider key/local endpoint in process env. Run: agent-efficiency-mcp configure --project <dir> --provider deepseek --api-key … (writes MCP env; never touches your app .env).",
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
      "Soft gate note: hosts can skip tools — recover with /optimize or \"run the efficiency engine\". Log turns in fixtures/dogfood/gate-log.csv; summarize with npm run dogfood-summary.",
  });
  findings.push({
    level: "ok",
    message:
      "Docs: docs/TROUBLESHOOTING.md · uninstall: agent-efficiency-mcp uninstall --project <dir>",
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
