import type { WorkspaceContext } from "../context.js";
import { resolveRewriteModel } from "./model.js";
import {
  CENTRAL_COMPRESSION_PROMPT,
  buildUserPayload,
  postChatCompletions,
  type RewriteProvider,
} from "./types.js";

/**
 * Any OpenAI-compatible Chat Completions host:
 * OpenRouter, Together, Fireworks, Azure AI, Groq, Mistral cloud,
 * HF Inference (OpenAI router), etc.
 *
 * For localhost / LAN privacy boxes prefer REWRITE_PROVIDER=local.
 *
 * Env:
 * - REWRITE_API_BASE (e.g. https://openrouter.ai/api/v1)
 * - REWRITE_API_KEY (required for most cloud hosts)
 * - REWRITE_API_MODEL or REWRITE_MODEL
 */
export class OpenAICompatProvider implements RewriteProvider {
  readonly name = "openai_compat";
  readonly supportsVision = true;

  async generate(
    rawPrompt: string,
    context: WorkspaceContext,
    options?: {
      systemPrompt?: string;
      images?: import("../vision.js").VisionImage[];
    },
  ) {
    const base = process.env.REWRITE_API_BASE?.trim();
    if (!base) {
      throw new Error(
        "openai_compat requires REWRITE_API_BASE. For local Ollama/LM Studio use REWRITE_PROVIDER=local.",
      );
    }

    const apiKey = process.env.REWRITE_API_KEY?.trim() || "compat";
    const model = resolveRewriteModel("openai_compat");
    const url = `${base.replace(/\/$/, "")}/chat/completions`;

    return postChatCompletions({
      url,
      apiKey,
      model,
      system: options?.systemPrompt ?? CENTRAL_COMPRESSION_PROMPT,
      user: buildUserPayload(rawPrompt, context),
      images: options?.images,
      label: "OpenAI-compat API",
    });
  }
}
