import type { WorkspaceContext } from "../context.js";
import { resolveRewriteModel } from "./model.js";
import {
  CENTRAL_COMPRESSION_PROMPT,
  buildUserPayload,
  postChatCompletions,
  type RewriteProvider,
} from "./types.js";

export class DeepSeekProvider implements RewriteProvider {
  readonly name = "deepseek";
  readonly supportsVision = false;

  async generate(
    rawPrompt: string,
    context: WorkspaceContext,
    options?: {
      systemPrompt?: string;
      images?: import("../vision.js").VisionImage[];
    },
  ) {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "DEEPSEEK_API_KEY is missing. Add it to .env or MCP server env.",
      );
    }

    const model = resolveRewriteModel("deepseek");
    const base =
      process.env.DEEPSEEK_API_BASE?.trim() || "https://api.deepseek.com";
    const url = `${base.replace(/\/$/, "")}/chat/completions`;

    return postChatCompletions({
      url,
      apiKey,
      model,
      system: options?.systemPrompt ?? CENTRAL_COMPRESSION_PROMPT,
      user: buildUserPayload(rawPrompt, context),
      label: "DeepSeek API",
    });
  }
}
