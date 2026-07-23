import type { WorkspaceContext } from "../context.js";
import { resolveRewriteModel } from "./model.js";
import {
  CENTRAL_COMPRESSION_PROMPT,
  buildUserPayload,
  postChatCompletions,
  type RewriteProvider,
} from "./types.js";

/** OpenAI Chat Completions (BYOK) — vision via image_url parts. */
export class OpenAIProvider implements RewriteProvider {
  readonly name = "openai";
  readonly supportsVision = true;

  async generate(
    rawPrompt: string,
    context: WorkspaceContext,
    options?: {
      systemPrompt?: string;
      images?: import("../vision.js").VisionImage[];
    },
  ) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is missing. Add it to .env or MCP server env.",
      );
    }

    const model = resolveRewriteModel("openai");
    const base =
      process.env.OPENAI_API_BASE?.trim() || "https://api.openai.com/v1";
    const url = `${base.replace(/\/$/, "")}/chat/completions`;

    return postChatCompletions({
      url,
      apiKey,
      model,
      system: options?.systemPrompt ?? CENTRAL_COMPRESSION_PROMPT,
      user: buildUserPayload(rawPrompt, context),
      images: options?.images,
      label: "OpenAI API",
    });
  }
}
