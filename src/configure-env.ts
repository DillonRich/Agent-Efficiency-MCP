/** Map configure CLI flags → MCP env vars (BYOK). */

import { normalizeProviderName } from "./providers/index.js";
import {
  expandModelAlias,
  parseModelSpec,
  type ProviderModelKind,
} from "./providers/model.js";
import {
  effortImpliesThinking,
  isFlashClassModel,
  normalizeEffort,
} from "./providers/rewrite-options.js";

function asModelKind(p: string | undefined): ProviderModelKind | undefined {
  const known: ProviderModelKind[] = [
    "deepseek",
    "openai",
    "anthropic",
    "gemini",
    "xai",
    "local",
    "openai_compat",
  ];
  if (p && (known as string[]).includes(p)) return p as ProviderModelKind;
  return undefined;
}

export function buildConfigureEnv(opts: {
  provider?: string;
  apiKey?: string;
  model?: string;
  effort?: string;
  thinking?: string;
  maxTokens?: string;
  temperature?: string;
  env?: Record<string, string>;
}): Record<string, string> {
  const out: Record<string, string> = { ...(opts.env || {}) };

  if (opts.provider?.trim()) {
    out.REWRITE_PROVIDER = normalizeProviderName(opts.provider);
  }

  let modelToken = opts.model?.trim();
  let effort = normalizeEffort(opts.effort);
  let thinking = opts.thinking?.trim().toLowerCase();

  if (modelToken) {
    const spec = parseModelSpec(modelToken);
    modelToken = spec.modelRaw;
    if (!effort && spec.effort) effort = normalizeEffort(spec.effort);
    if (!thinking && spec.thinking) thinking = spec.thinking;
  }

  const kind = asModelKind(out.REWRITE_PROVIDER);

  if (modelToken) {
    const expanded = expandModelAlias(modelToken, kind);
    out.REWRITE_MODEL = expanded;
  }

  if (effort) {
    out.REWRITE_REASONING_EFFORT = effort;
    const implied = effortImpliesThinking(effort);
    if (implied && !thinking) thinking = implied;
  }

  // Flash-class: default thinking off unless user set effort/thinking
  if (
    !thinking &&
    !effort &&
    isFlashClassModel(out.REWRITE_MODEL || modelToken)
  ) {
    thinking = "disabled";
  }

  if (thinking) {
    if (["1", "true", "on", "yes", "enabled", "enable"].includes(thinking)) {
      out.REWRITE_THINKING = "enabled";
    } else if (
      ["0", "false", "off", "no", "disabled", "disable", "none"].includes(
        thinking,
      )
    ) {
      out.REWRITE_THINKING = "disabled";
    } else {
      out.REWRITE_THINKING = thinking;
    }
  }

  if (opts.maxTokens?.trim()) {
    out.REWRITE_MAX_TOKENS = opts.maxTokens.trim();
  }
  if (opts.temperature?.trim()) {
    out.REWRITE_TEMPERATURE = opts.temperature.trim();
  }

  const key = opts.apiKey?.trim();
  if (key) {
    const p = out.REWRITE_PROVIDER || "auto";
    const keyVar: Record<string, string> = {
      deepseek: "DEEPSEEK_API_KEY",
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      gemini: "GEMINI_API_KEY",
      xai: "XAI_API_KEY",
      local: "LOCAL_LLM_API_KEY",
      openai_compat: "REWRITE_API_KEY",
      auto: "DEEPSEEK_API_KEY",
      mock: "DEEPSEEK_API_KEY",
    };
    out[keyVar[p] || "DEEPSEEK_API_KEY"] = key;

    if (modelToken) {
      const modelVar: Record<string, string> = {
        deepseek: "DEEPSEEK_MODEL",
        openai: "OPENAI_MODEL",
        anthropic: "ANTHROPIC_MODEL",
        gemini: "GEMINI_MODEL",
        xai: "XAI_MODEL",
        local: "LOCAL_LLM_MODEL",
        openai_compat: "REWRITE_API_MODEL",
        auto: "DEEPSEEK_MODEL",
      };
      const mv = modelVar[p];
      if (mv) out[mv] = out.REWRITE_MODEL || expandModelAlias(modelToken, kind);
    }
  }

  return out;
}
