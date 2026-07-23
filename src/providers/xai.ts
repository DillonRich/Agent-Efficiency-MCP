import type { WorkspaceContext } from "../context.js";
import { resolveRewriteModel } from "./model.js";
import {
  CENTRAL_COMPRESSION_PROMPT,
  buildUserPayload,
  postChatCompletions,
  type RewriteProvider,
} from "./types.js";

/**
 * xAI Grok via OpenAI-compatible Chat Completions.
 * https://docs.x.ai/docs/api-reference
 */
export class XaiProvider implements RewriteProvider {
  readonly name = "xai";
  readonly supportsVision = true;

  async generate(
    rawPrompt: string,
    context: WorkspaceContext,
    options?: {
      systemPrompt?: string;
      images?: import("../vision.js").VisionImage[];
    },
  ) {
    const apiKey =
      process.env.XAI_API_KEY?.trim() || process.env.GROK_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "XAI_API_KEY (or GROK_API_KEY) is missing. Add it to .env or MCP server env.",
      );
    }

    const model = resolveRewriteModel("xai");
    const base =
      process.env.XAI_API_BASE?.trim() ||
      process.env.GROK_API_BASE?.trim() ||
      "https://api.x.ai/v1";
    const url = `${base.replace(/\/$/, "")}/chat/completions`;

    return postChatCompletions({
      url,
      apiKey,
      model,
      system: options?.systemPrompt ?? CENTRAL_COMPRESSION_PROMPT,
      user: buildUserPayload(rawPrompt, context),
      images: options?.images,
      label: "xAI API",
    });
  }
}
