/** Token usage + rough USD estimate for PROMPTMCP_META. */

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export function emptyUsage(): TokenUsage {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

export function addUsage(a: TokenUsage, b?: TokenUsage | null): TokenUsage {
  if (!b) return a;
  return {
    promptTokens: a.promptTokens + (b.promptTokens || 0),
    completionTokens: a.completionTokens + (b.completionTokens || 0),
    totalTokens: a.totalTokens + (b.totalTokens || 0),
  };
}

export function parseOpenAiUsage(raw: unknown): TokenUsage | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const u = raw as Record<string, unknown>;
  const prompt = Number(u.prompt_tokens ?? u.input_tokens ?? 0);
  const completion = Number(u.completion_tokens ?? u.output_tokens ?? 0);
  const total = Number(u.total_tokens ?? prompt + completion);
  if (!Number.isFinite(prompt) && !Number.isFinite(completion)) return undefined;
  if (prompt <= 0 && completion <= 0) return undefined;
  return {
    promptTokens: Math.max(0, prompt || 0),
    completionTokens: Math.max(0, completion || 0),
    totalTokens: Math.max(0, total || prompt + completion),
  };
}

/**
 * Rough list $/MTok. Override with REWRITE_PRICE_INPUT_PER_MTOK /
 * REWRITE_PRICE_OUTPUT_PER_MTOK. Labeled estimate — not a bill.
 */
function pricesForModel(model: string): { inPerM: number; outPerM: number } {
  const envIn = Number(process.env.REWRITE_PRICE_INPUT_PER_MTOK);
  const envOut = Number(process.env.REWRITE_PRICE_OUTPUT_PER_MTOK);
  if (Number.isFinite(envIn) && Number.isFinite(envOut)) {
    return { inPerM: envIn, outPerM: envOut };
  }

  const m = model.toLowerCase();
  if (m.includes("deepseek") && m.includes("pro")) {
    return { inPerM: 0.55, outPerM: 2.19 };
  }
  if (m.includes("deepseek") || m.includes("flash")) {
    // DeepSeek V4 Flash ballpark (USD / million tokens)
    return { inPerM: 0.14, outPerM: 0.28 };
  }
  if (m.includes("gpt-4o-mini") || m.includes("4.1-mini")) {
    return { inPerM: 0.15, outPerM: 0.6 };
  }
  if (m.includes("claude") && m.includes("haiku")) {
    return { inPerM: 0.8, outPerM: 4 };
  }
  if (m.includes("claude")) {
    return { inPerM: 3, outPerM: 15 };
  }
  if (m.includes("gemini") && m.includes("flash")) {
    return { inPerM: 0.15, outPerM: 0.6 };
  }
  // Generic cheap default
  return { inPerM: 0.5, outPerM: 1.5 };
}

/** Returns USD string like "0.00042" or undefined if no usage. */
export function estimateRewriteUsd(
  model: string,
  usage: TokenUsage | undefined,
): string | undefined {
  if (!usage || (usage.promptTokens <= 0 && usage.completionTokens <= 0)) {
    return undefined;
  }
  const { inPerM, outPerM } = pricesForModel(model);
  const usd =
    (usage.promptTokens / 1_000_000) * inPerM +
    (usage.completionTokens / 1_000_000) * outPerM;
  if (!Number.isFinite(usd) || usd < 0) return undefined;
  if (usd < 0.000001) return "<0.000001";
  if (usd < 0.01) return usd.toFixed(6);
  return usd.toFixed(4);
}
