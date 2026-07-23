/** Redact provider/API error bodies before they reach the chat UI. */

const SECRETISH =
  /\b(sk-[a-zA-Z0-9_-]{8,}|sk-ant-[a-zA-Z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._\-]+|api[_-]?key["']?\s*[:=]\s*["']?[A-Za-z0-9._\-]{12,})/gi;

export function sanitizeProviderError(
  status: number | undefined,
  bodyText: string,
  label = "Rewrite API",
): string {
  const sliced = (bodyText || "").slice(0, 280).replace(SECRETISH, "[redacted]");
  const cleaned = sliced.replace(/\s+/g, " ").trim();

  if (status === 401 || status === 403) {
    return (
      `${label} auth failed (${status}). Check your API key in .env or MCP env. ` +
      `If this repeats, the auth circuit opens — run \`agent-efficiency-mcp doctor\`.`
    );
  }
  if (status === 429) {
    return `${label} rate limited (429). Wait and retry, or switch provider/model.`;
  }
  if (status && status >= 500) {
    return `${label} server error (${status}). Retry shortly.${cleaned ? ` Detail: ${cleaned}` : ""}`;
  }
  if (status) {
    return `${label} error (${status}).${cleaned ? ` Detail: ${cleaned}` : ""}`;
  }
  return `${label} error.${cleaned ? ` Detail: ${cleaned}` : ""}`;
}

export function classifyErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/abort|timeout|TimeoutError/i.test(message)) {
    return "Request timed out. Increase PROMPT_MCP_HTTP_TIMEOUT_MS or try a faster model.";
  }
  return message.replace(SECRETISH, "[redacted]");
}
