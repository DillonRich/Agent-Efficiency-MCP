/**
 * Optional rewrite request knobs from env (set via `configure` / MCP env).
 * These are sent on the provider API call — they do affect quality/cost/latency.
 */

export type ThinkingMode = "enabled" | "disabled";

export interface RewriteRequestOptions {
  temperature?: number;
  maxTokens?: number;
  thinking?: { type: ThinkingMode };
  /** DeepSeek: high|max · OpenAI o-series: low|medium|high */
  reasoningEffort?: string;
}

const EFFORT_ALIASES: Record<string, string> = {
  low: "low",
  minimal: "low",
  min: "low",
  none: "none",
  off: "none",
  disable: "none",
  disabled: "none",
  medium: "medium",
  mid: "medium",
  med: "medium",
  high: "high",
  max: "max",
  maximum: "max",
  xhigh: "max",
  "x-high": "max",
};

export function normalizeEffort(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const key = raw.trim().toLowerCase().replace(/\s+/g, "-");
  return EFFORT_ALIASES[key] ?? key;
}

export function effortImpliesThinking(
  effort: string | undefined,
): ThinkingMode | undefined {
  if (!effort) return undefined;
  if (effort === "none" || effort === "off" || effort === "disabled") {
    return "disabled";
  }
  return "enabled";
}

function parseThinking(raw: string | undefined): ThinkingMode | undefined {
  if (!raw?.trim()) return undefined;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "on", "yes", "enabled", "enable"].includes(v)) {
    return "enabled";
  }
  if (["0", "false", "off", "no", "disabled", "disable", "none"].includes(v)) {
    return "disabled";
  }
  return undefined;
}

/** Cheap / flash-tier models — default thinking off unless effort asks for it. */
export function isFlashClassModel(model: string | undefined): boolean {
  if (!model?.trim()) return false;
  const m = model.trim().toLowerCase();
  if (m.includes("flash")) return true;
  if (m.includes("haiku")) return true;
  if (m.includes("gpt-4.1-mini") || m.includes("gpt-4o-mini")) return true;
  if (m.includes("grok-3-mini") || m.includes("grok-4-mini")) return true;
  return false;
}

function resolveConfiguredModelId(): string | undefined {
  return (
    process.env.REWRITE_MODEL?.trim() ||
    process.env.DEEPSEEK_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    process.env.ANTHROPIC_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    process.env.XAI_MODEL?.trim() ||
    process.env.LOCAL_LLM_MODEL?.trim() ||
    process.env.REWRITE_API_MODEL?.trim()
  );
}

/** Read knobs from process.env (MCP server env / package .env). */
export function resolveRewriteRequestOptions(): RewriteRequestOptions {
  const out: RewriteRequestOptions = {};

  const tempRaw = process.env.REWRITE_TEMPERATURE?.trim();
  if (tempRaw) {
    const n = Number(tempRaw);
    if (Number.isFinite(n)) out.temperature = n;
  }

  const maxRaw =
    process.env.REWRITE_MAX_TOKENS?.trim() ||
    process.env.REWRITE_MAX_OUTPUT_TOKENS?.trim();
  if (maxRaw) {
    const n = Number(maxRaw);
    if (Number.isFinite(n) && n > 0) out.maxTokens = Math.floor(n);
  }

  const effort = normalizeEffort(
    process.env.REWRITE_REASONING_EFFORT?.trim() ||
      process.env.REWRITE_EFFORT?.trim(),
  );
  let thinking =
    parseThinking(process.env.REWRITE_THINKING?.trim()) ||
    effortImpliesThinking(effort);

  // Flash-class defaults to thinking off (cheaper/faster) unless effort enables it
  if (!thinking && isFlashClassModel(resolveConfiguredModelId())) {
    thinking = "disabled";
  }

  if (thinking) out.thinking = { type: thinking };
  if (effort && effort !== "none") {
    // DeepSeek accepts high|max; map medium→high for that family at call site if needed
    out.reasoningEffort =
      effort === "medium" || effort === "low" ? effort : effort;
  }

  return out;
}
