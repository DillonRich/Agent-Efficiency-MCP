import type { WorkspaceContext } from "../context.js";
import { resolveRewriteModel } from "./model.js";
import {
  CENTRAL_COMPRESSION_PROMPT,
  buildUserPayload,
  postChatCompletions,
  type RewriteProvider,
} from "./types.js";

/**
 * Google Gemini via OpenAI-compatible Chat Completions.
 * https://ai.google.dev/gemini-api/docs/openai
 */
export class GeminiProvider implements RewriteProvider {
  readonly name = "gemini";
  readonly supportsVision = true;

  async generate(
    rawPrompt: string,
    context: WorkspaceContext,
    options?: {
      systemPrompt?: string;
      images?: import("../vision.js").VisionImage[];
    },
  ) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is missing. Add it to .env or MCP server env.",
      );
    }

    const model = resolveRewriteModel("gemini");
    const base =
      process.env.GEMINI_API_BASE?.trim() ||
      "https://generativelanguage.googleapis.com/v1beta/openai";
    const url = `${base.replace(/\/$/, "")}/chat/completions`;

    return postChatCompletions({
      url,
      apiKey,
      model,
      system: options?.systemPrompt ?? CENTRAL_COMPRESSION_PROMPT,
      user: buildUserPayload(rawPrompt, context),
      images: options?.images,
      label: "Gemini API",
    });
  }
}
