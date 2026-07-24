/** Map configure CLI flags → MCP env vars (BYOK). */

export function buildConfigureEnv(opts: {
  provider?: string;
  apiKey?: string;
  model?: string;
  env?: Record<string, string>;
}): Record<string, string> {
  const out: Record<string, string> = { ...(opts.env || {}) };
  const provider = (opts.provider || "").trim().toLowerCase();
  if (provider) out.REWRITE_PROVIDER = provider === "grok" ? "xai" : provider;

  if (opts.model?.trim()) {
    out.REWRITE_MODEL = opts.model.trim();
  }

  const key = opts.apiKey?.trim();
  if (key) {
    const p = out.REWRITE_PROVIDER || "deepseek";
    const keyVar: Record<string, string> = {
      deepseek: "DEEPSEEK_API_KEY",
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      gemini: "GEMINI_API_KEY",
      xai: "XAI_API_KEY",
      grok: "XAI_API_KEY",
      local: "LOCAL_LLM_API_KEY",
      openai_compat: "REWRITE_API_KEY",
      auto: "DEEPSEEK_API_KEY",
    };
    out[keyVar[p] || "DEEPSEEK_API_KEY"] = key;

    if (opts.model?.trim()) {
      const modelVar: Record<string, string> = {
        deepseek: "DEEPSEEK_MODEL",
        openai: "OPENAI_MODEL",
        anthropic: "ANTHROPIC_MODEL",
        gemini: "GEMINI_MODEL",
        xai: "XAI_MODEL",
        grok: "XAI_MODEL",
        local: "LOCAL_LLM_MODEL",
        openai_compat: "REWRITE_API_MODEL",
      };
      const mv = modelVar[p];
      if (mv) out[mv] = opts.model.trim();
    }
  }

  return out;
}
