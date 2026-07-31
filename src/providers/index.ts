import { AnthropicProvider } from "./anthropic.js";
import { DeepSeekProvider } from "./deepseek.js";
import { GeminiProvider } from "./gemini.js";
import { LocalProvider } from "./local.js";
import { MockProvider } from "./mock.js";
import { OpenAIProvider } from "./openai.js";
import { OpenAICompatProvider } from "./openai-compat.js";
import { XaiProvider } from "./xai.js";
import type { RewriteProvider } from "./types.js";

export type ProviderName =
  | "auto"
  | "deepseek"
  | "openai"
  | "anthropic"
  | "gemini"
  | "xai"
  | "local"
  | "openai_compat"
  | "mock";

const KNOWN: Exclude<ProviderName, "auto">[] = [
  "deepseek",
  "openai",
  "anthropic",
  "gemini",
  "xai",
  "local",
  "openai_compat",
  "mock",
];

/** Map common aliases → canonical provider id (case/spacing insensitive). */
export function normalizeProviderName(raw: string): string {
  const n = raw
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");

  // Collapsed forms: "Deep Seek" → deep_seek → deepseek
  const compact = n.replace(/_/g, "");

  if (
    n === "grok" ||
    n === "x_ai" ||
    n === "xai" ||
    compact === "xai" ||
    compact === "grok"
  ) {
    return "xai";
  }
  if (
    n === "google" ||
    n === "google_ai" ||
    n === "googleai" ||
    n === "gemini" ||
    compact === "google" ||
    compact === "gemini"
  ) {
    return "gemini";
  }
  if (
    compact === "deepseek" ||
    n === "deep_seek" ||
    n === "deepseek_ai" ||
    compact === "deepseekai"
  ) {
    return "deepseek";
  }
  if (compact === "openai" || n === "open_ai") return "openai";
  if (
    compact === "anthropic" ||
    n === "claude" ||
    compact === "claude" ||
    n === "anthropic_claude"
  ) {
    return "anthropic";
  }
  if (
    n === "ollama" ||
    n === "lmstudio" ||
    n === "lm_studio" ||
    n === "vllm" ||
    n === "llamacpp" ||
    n === "llama_cpp" ||
    n === "localai" ||
    n === "private" ||
    n === "local"
  ) {
    return "local";
  }
  if (
    n === "openai_compatible" ||
    n === "openai_compat" ||
    n === "compat" ||
    n === "openrouter"
  ) {
    return "openai_compat";
  }
  if (n === "ci" || n === "offline" || n === "fixture" || n === "mock") {
    return "mock";
  }
  if (n === "auto") return "auto";
  return compact || n;
}

function detectProvider(): Exclude<ProviderName, "auto"> {
  if (process.env.DEEPSEEK_API_KEY?.trim()) return "deepseek";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  if (process.env.XAI_API_KEY?.trim() || process.env.GROK_API_KEY?.trim()) {
    return "xai";
  }
  if (
    process.env.LOCAL_LLM_BASE?.trim() ||
    process.env.LOCAL_LLM_MODEL?.trim()
  ) {
    return "local";
  }
  if (
    process.env.REWRITE_API_BASE?.trim() &&
    (process.env.REWRITE_API_MODEL?.trim() ||
      process.env.REWRITE_MODEL?.trim() ||
      process.env.LOCAL_LLM_MODEL?.trim())
  ) {
    // Key optional for many local servers; prefer local if base looks LAN/loopback
    const base = process.env.REWRITE_API_BASE.trim().toLowerCase();
    if (
      base.includes("127.0.0.1") ||
      base.includes("localhost") ||
      /^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(base)
    ) {
      return "local";
    }
    if (process.env.REWRITE_API_KEY?.trim()) return "openai_compat";
    return "local";
  }
  throw new Error(
    "No rewrite provider configured for this MCP process. " +
      "Put DEEPSEEK_API_KEY (or another vendor key) in the Cursor MCP server env " +
      "via: npx agent-efficiency-mcp configure --project <dir> --provider \"Deep Seek\" --api-key <KEY> --model flash " +
      "(writes both project and global mcp.json when our server is registered). " +
      "Then reload MCP. Package .env is only for local clone development — not required for npx consumers.",
  );
}

export function resolveProvider(name?: string): RewriteProvider {
  const raw = name || process.env.REWRITE_PROVIDER || "auto";
  const normalized = normalizeProviderName(raw);
  const selected = (
    normalized === "auto" ? detectProvider() : normalized
  ) as Exclude<ProviderName, "auto">;

  switch (selected) {
    case "mock":
      return new MockProvider();
    case "openai_compat":
      return new OpenAICompatProvider();
    case "local":
      return new LocalProvider();
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "gemini":
      return new GeminiProvider();
    case "xai":
      return new XaiProvider();
    case "deepseek":
      return new DeepSeekProvider();
    default:
      throw new Error(
        `Unknown REWRITE_PROVIDER "${raw}". Use: ${["auto", ...KNOWN].join(" | ")} ` +
          `(aliases: grok, google, ollama, lmstudio, vllm, openrouter, mock).`,
      );
  }
}

export * from "./types.js";
export { DeepSeekProvider } from "./deepseek.js";
export { OpenAIProvider } from "./openai.js";
export { AnthropicProvider } from "./anthropic.js";
export { GeminiProvider } from "./gemini.js";
export { XaiProvider } from "./xai.js";
export { LocalProvider } from "./local.js";
export { OpenAICompatProvider } from "./openai-compat.js";
export { MockProvider } from "./mock.js";
