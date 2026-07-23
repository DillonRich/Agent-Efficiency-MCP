/**
 * Resolve which rewrite model to call from env.
 *
 * Priority:
 * 1. REWRITE_MODEL (works for every provider)
 * 2. Provider-specific MODEL env
 * 3. Provider default
 *
 * Friendly aliases expand to API model ids. Exact API ids pass through.
 */

export type ProviderModelKind =
  | "deepseek"
  | "openai"
  | "anthropic"
  | "gemini"
  | "xai"
  | "local"
  | "openai_compat";

const PROVIDER_ENV: Record<ProviderModelKind, string | undefined> = {
  deepseek: "DEEPSEEK_MODEL",
  openai: "OPENAI_MODEL",
  anthropic: "ANTHROPIC_MODEL",
  gemini: "GEMINI_MODEL",
  xai: "XAI_MODEL",
  local: "LOCAL_LLM_MODEL",
  openai_compat: "REWRITE_API_MODEL",
};

/** Secondary env keys checked after the primary provider key */
const PROVIDER_ENV_FALLBACK: Partial<Record<ProviderModelKind, string[]>> = {
  xai: ["GROK_MODEL"],
  local: ["REWRITE_API_MODEL"],
};

const DEFAULTS: Record<ProviderModelKind, string> = {
  deepseek: "deepseek-v4-flash",
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-20250514",
  gemini: "gemini-2.5-flash",
  xai: "grok-3-mini",
  local: "",
  openai_compat: "",
};

/** Normalized key → canonical API model id */
const ALIASES: Record<string, string> = {
  // DeepSeek
  flash: "deepseek-v4-flash",
  "v4-flash": "deepseek-v4-flash",
  "deepseek-flash": "deepseek-v4-flash",
  chat: "deepseek-chat",
  "deepseek-chat": "deepseek-chat",
  reasoner: "deepseek-reasoner",
  "deepseek-reasoner": "deepseek-reasoner",

  // OpenAI
  mini: "gpt-4.1-mini",
  "4.1-mini": "gpt-4.1-mini",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "4.1": "gpt-4.1",
  "gpt-4.1": "gpt-4.1",
  "4o-mini": "gpt-4o-mini",
  "gpt-4o-mini": "gpt-4o-mini",
  "4o": "gpt-4o",
  "gpt-4o": "gpt-4o",
  "o3-mini": "o3-mini",
  o3: "o3",

  // Anthropic
  "sonnet-4": "claude-sonnet-4-20250514",
  sonnet4: "claude-sonnet-4-20250514",
  "claude-sonnet-4": "claude-sonnet-4-20250514",
  "claude-sonnet-4-20250514": "claude-sonnet-4-20250514",
  "opus-4": "claude-opus-4-20250514",
  opus4: "claude-opus-4-20250514",
  "claude-opus-4": "claude-opus-4-20250514",
  "claude-opus-4-20250514": "claude-opus-4-20250514",
  "opus-4.8": "claude-opus-4-5",
  "opus-4-8": "claude-opus-4-5",
  opus48: "claude-opus-4-5",
  "opus-4-5": "claude-opus-4-5",
  "opus-4.5": "claude-opus-4-5",
  "claude-opus-4.5": "claude-opus-4-5",
  "claude-opus-4-5": "claude-opus-4-5",
  "sonnet-4.5": "claude-sonnet-4-5",
  "sonnet-4-5": "claude-sonnet-4-5",
  "claude-sonnet-4.5": "claude-sonnet-4-5",
  "claude-sonnet-4-5": "claude-sonnet-4-5",
  haiku: "claude-haiku-4-5",
  "haiku-4.5": "claude-haiku-4-5",
  "claude-haiku-4-5": "claude-haiku-4-5",

  // Gemini
  "gemini-flash": "gemini-2.5-flash",
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-pro": "gemini-2.5-pro",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-2.0-flash": "gemini-2.0-flash",
  "gemini-flash-lite": "gemini-2.5-flash-lite",

  // xAI Grok
  grok: "grok-3-mini",
  "grok-mini": "grok-3-mini",
  "grok-3-mini": "grok-3-mini",
  "grok-3": "grok-3",
  "grok-2": "grok-2",
  "grok-2-latest": "grok-2-latest",
};

/** Normalize user input for alias lookup: "Sonnet 4" → "sonnet-4" */
export function normalizeModelKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

export function expandModelAlias(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const key = normalizeModelKey(trimmed);
  return ALIASES[key] ?? trimmed;
}

function readProviderModel(kind: ProviderModelKind): string | undefined {
  const primary = PROVIDER_ENV[kind];
  if (primary) {
    const v = process.env[primary]?.trim();
    if (v) return v;
  }
  for (const key of PROVIDER_ENV_FALLBACK[kind] ?? []) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

/**
 * Pick the model id for a provider from env + aliases.
 * local / openai_compat require an explicit model — no silent default.
 */
export function resolveRewriteModel(kind: ProviderModelKind): string {
  const fromUniversal = process.env.REWRITE_MODEL?.trim();
  const fromProvider = readProviderModel(kind);
  const fallback = DEFAULTS[kind];

  const chosen = fromUniversal || fromProvider || fallback;
  if (!chosen) {
    const hint =
      PROVIDER_ENV[kind] ||
      "REWRITE_MODEL / REWRITE_API_MODEL / LOCAL_LLM_MODEL";
    throw new Error(
      `No model configured for ${kind}. Set REWRITE_MODEL or ${hint}.`,
    );
  }
  return expandModelAlias(chosen);
}
