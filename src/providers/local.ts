import type { WorkspaceContext } from "../context.js";
import { resolveRewriteModel } from "./model.js";
import {
  CENTRAL_COMPRESSION_PROMPT,
  buildUserPayload,
  postChatCompletions,
  type RewriteProvider,
} from "./types.js";

/**
 * Fully local / LAN private LLM via OpenAI-compatible `/v1/chat/completions`.
 *
 * Works with Ollama, LM Studio, llama.cpp server, vLLM, LocalAI, Open WebUI, etc.
 * Point REWRITE_API_BASE / LOCAL_LLM_BASE at this machine or a mini-PC on your LAN.
 *
 * Env:
 * - LOCAL_LLM_BASE or REWRITE_API_BASE (default http://127.0.0.1:11434/v1)
 * - LOCAL_LLM_MODEL or REWRITE_API_MODEL or REWRITE_MODEL (required)
 * - LOCAL_LLM_API_KEY or REWRITE_API_KEY (optional; default "local")
 */
export class LocalProvider implements RewriteProvider {
  readonly name = "local";
  /** Opt-in: many local vision models accept OpenAI image_url parts */
  readonly supportsVision = true;

  async generate(
    rawPrompt: string,
    context: WorkspaceContext,
    options?: {
      systemPrompt?: string;
      images?: import("../vision.js").VisionImage[];
    },
  ) {
    const base =
      process.env.LOCAL_LLM_BASE?.trim() ||
      process.env.REWRITE_API_BASE?.trim() ||
      "http://127.0.0.1:11434/v1";

    const apiKey =
      process.env.LOCAL_LLM_API_KEY?.trim() ||
      process.env.REWRITE_API_KEY?.trim() ||
      "local";

    const model = resolveRewriteModel("local");
    const url = `${base.replace(/\/$/, "")}/chat/completions`;

    return postChatCompletions({
      url,
      apiKey,
      model,
      system: options?.systemPrompt ?? CENTRAL_COMPRESSION_PROMPT,
      user: buildUserPayload(rawPrompt, context),
      images: options?.images,
      label: "Local LLM API",
    });
  }
}
