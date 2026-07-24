/**
 * Resolve which rewrite model to call from env.
 *
 * Priority:
 * 1. REWRITE_MODEL (works for every provider)
 * 2. Provider-specific MODEL env
 * 3. Provider default
 *
 * Friendly aliases expand to API model ids. Exact API ids pass through.
 * Combined specs like `flash high` or `pro:max` set model + effort via parseModelSpec.
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
  // DeepSeek V4 (chat/reasoner retired 2026-07-24)
  flash: "deepseek-v4-flash",
  "v4-flash": "deepseek-v4-flash",
  "deepseek-flash": "deepseek-v4-flash",
  "deepseek-v4-flash": "deepseek-v4-flash",
  pro: "deepseek-v4-pro",
  "v4-pro": "deepseek-v4-pro",
  "deepseek-pro": "deepseek-v4-pro",
  "deepseek-v4-pro": "deepseek-v4-pro",
  // Legacy names → flash (API may reject after retirement; prefer v4 ids)
  chat: "deepseek-v4-flash",
  "deepseek-chat": "deepseek-v4-flash",
  reasoner: "deepseek-v4-flash",
  "deepseek-reasoner": "deepseek-v4-flash",

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
  "o4-mini": "o4-mini",
  o4: "o4-mini",
  "5.4": "gpt-5.4",
  "gpt-5.4": "gpt-5.4",
  "5.4-medium": "gpt-5.4",
  "5.5": "gpt-5.5",
  "gpt-5.5": "gpt-5.5",
  "5.6": "gpt-5.6",
  "gpt-5.6": "gpt-5.6",
  sol: "gpt-5.6",
  "5.6-sol": "gpt-5.6",
  "gpt-5.6-sol": "gpt-5.6",
  "gpt56sol": "gpt-5.6",

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
  sonnet: "claude-sonnet-4-5",
  opus: "claude-opus-4-5",

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

const EFFORT_TRAILING =
  /^(low|minimal|min|none|off|medium|mid|med|high|max|maximum|xhigh|x-high)$/i;

export type ModelSpec = {
  /** Model token before alias expansion */
  modelRaw: string;
  effort?: string;
  thinking?: "enabled" | "disabled";
};

/** Split `flash high`, `pro:max`, `sonnet 4` (+ optional effort). */
export function parseModelSpec(raw: string): ModelSpec {
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return { modelRaw: "" };

  const sep = trimmed.match(
    /^(.+?)[:/](low|minimal|min|none|off|medium|mid|med|high|max|maximum|xhigh|x-high)$/i,
  );
  if (sep) {
    const effort = sep[2]!.toLowerCase();
    return {
      modelRaw: sep[1]!.trim(),
      effort,
      thinking:
        ["none", "off", "minimal", "min"].includes(effort)
          ? "disabled"
          : "enabled",
    };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && EFFORT_TRAILING.test(parts[parts.length - 1]!)) {
    const effort = parts.pop()!.toLowerCase();
    return {
      modelRaw: parts.join(" "),
      effort,
      thinking:
        ["none", "off", "minimal", "min"].includes(effort)
          ? "disabled"
          : "enabled",
    };
  }

  return { modelRaw: trimmed };
}

/** Normalize user input for alias lookup: "Sonnet 4" → "sonnet-4" */
export function normalizeModelKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[+/]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/_/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Short names that depend on the active provider */
const PROVIDER_SHORT: Partial<
  Record<ProviderModelKind, Record<string, string>>
> = {
  deepseek: {
    flash: "deepseek-v4-flash",
    pro: "deepseek-v4-pro",
    chat: "deepseek-v4-flash",
    reasoner: "deepseek-v4-flash",
  },
  gemini: {
    flash: "gemini-2.5-flash",
    pro: "gemini-2.5-pro",
    mini: "gemini-2.5-flash-lite",
  },
  openai: {
    flash: "gpt-4.1-mini",
    mini: "gpt-4.1-mini",
    pro: "gpt-4.1",
  },
  anthropic: {
    flash: "claude-haiku-4-5",
    pro: "claude-opus-4-5",
    sonnet: "claude-sonnet-4-5",
    opus: "claude-opus-4-5",
    haiku: "claude-haiku-4-5",
  },
  xai: {
    flash: "grok-3-mini",
    mini: "grok-3-mini",
    pro: "grok-3",
  },
};

function fuzzyAliasLookup(
  key: string,
  kind?: ProviderModelKind,
): string | undefined {
  if (kind && PROVIDER_SHORT[kind]?.[key]) {
    return PROVIDER_SHORT[kind]![key];
  }
  if (ALIASES[key]) return ALIASES[key];

  const stripped = key
    .replace(/^(deepseek|openai|gpt|claude|anthropic|gemini|google|xai|grok)-+/, "")
    .replace(/-model$/, "");
  if (kind && stripped && PROVIDER_SHORT[kind]?.[stripped]) {
    return PROVIDER_SHORT[kind]![stripped];
  }
  if (stripped && ALIASES[stripped]) return ALIASES[stripped];

  // Prefer longest alias key contained in input (or vice versa)
  let best: { alias: string; id: string; len: number } | undefined;
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (alias.length < 2) continue;
    if (key === alias || key.includes(alias) || alias.includes(key)) {
      const len = alias.length;
      if (!best || len > best.len) best = { alias, id, len };
    }
  }
  // Avoid ultra-short accidental hits unless exact-ish
  if (best && (best.len >= 3 || key === best.alias)) return best.id;
  return undefined;
}

export function expandModelAlias(
  raw: string,
  kind?: ProviderModelKind,
): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const key = normalizeModelKey(trimmed);
  return fuzzyAliasLookup(key, kind) ?? trimmed;
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
  // If env still has "flash high", expand model part only
  const spec = parseModelSpec(chosen);
  return expandModelAlias(spec.modelRaw || chosen, kind);
}
