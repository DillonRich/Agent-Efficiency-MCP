/**
 * Circuit-break repeated auth failures so we don't hammer a bad key.
 */
let authFailCount = 0;
let circuitOpenUntil = 0;

const THRESHOLD = Number(process.env.PROMPT_MCP_AUTH_FAIL_THRESHOLD || "3");
const COOLDOWN_MS = Number(process.env.PROMPT_MCP_AUTH_COOLDOWN_MS || "120000");

export function noteAuthFailure(): void {
  authFailCount += 1;
  if (authFailCount >= (Number.isFinite(THRESHOLD) ? THRESHOLD : 3)) {
    circuitOpenUntil = Date.now() + (Number.isFinite(COOLDOWN_MS) ? COOLDOWN_MS : 120_000);
  }
}

export function noteAuthSuccess(): void {
  authFailCount = 0;
  circuitOpenUntil = 0;
}

export function assertAuthCircuitClosed(label = "Rewrite API"): void {
  if (Date.now() < circuitOpenUntil) {
    const secs = Math.ceil((circuitOpenUntil - Date.now()) / 1000);
    throw new Error(
      `${label} auth circuit open after repeated 401/403 failures. ` +
        `Fix your API key (package .env or MCP env), then wait ~${secs}s or restart the MCP. ` +
        `Tip: run \`agent-efficiency-mcp doctor\`.`,
    );
  }
}

/** Test helper */
export function _resetAuthCircuitForTests(): void {
  authFailCount = 0;
  circuitOpenUntil = 0;
}
