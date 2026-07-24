import type { WorkspaceContext } from "../context.js";
import { fetchWithRetry, readErrorBody, rewriteTimeoutMs } from "../http.js";
import { resolveRewriteModel } from "./model.js";
import { resolveRewriteRequestOptions } from "./rewrite-options.js";
import {
  CENTRAL_COMPRESSION_PROMPT,
  buildUserPayload,
  type RewriteProvider,
} from "./types.js";
interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
}

/** Anthropic Messages API (BYOK) — vision via image content blocks. */
export class AnthropicProvider implements RewriteProvider {
  readonly name = "anthropic";
  readonly supportsVision = true;

  async generate(
    rawPrompt: string,
    context: WorkspaceContext,
    options?: {
      systemPrompt?: string;
      images?: import("../vision.js").VisionImage[];
    },
  ) {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is missing. Add it to .env or MCP server env.",
      );
    }

    const model = resolveRewriteModel("anthropic");
    const base =
      process.env.ANTHROPIC_API_BASE?.trim() || "https://api.anthropic.com";
    const url = `${base.replace(/\/$/, "")}/v1/messages`;

    const text = buildUserPayload(rawPrompt, context);
    const content: Array<Record<string, unknown>> = [
      { type: "text", text },
    ];
    for (const img of options?.images ?? []) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mime,
          data: img.base64,
        },
      });
      // Keep path hint near image for citations
      content.push({
        type: "text",
        text: `(Attached media path: ${img.path})`,
      });
    }

    const knobs = resolveRewriteRequestOptions();
    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: knobs.maxTokens ?? 4096,
          temperature: knobs.temperature ?? 0.1,
          system: options?.systemPrompt ?? CENTRAL_COMPRESSION_PROMPT,
          messages: [{ role: "user", content }],
        }),
      },
      rewriteTimeoutMs(),
    );
    if (!response.ok) {
      await readErrorBody(response, "Anthropic API");
    }

    const bodyText = await response.text();
    let data: AnthropicResponse;
    try {
      data = JSON.parse(bodyText) as AnthropicResponse;
    } catch {
      throw new Error("Anthropic API returned non-JSON response.");
    }

    if (data.error?.message) {
      throw new Error(`Anthropic API error: ${data.error.message}`);
    }

    const out = data.content
      ?.filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!out) {
      throw new Error("Anthropic API returned no text content.");
    }

    return { content: out, model };
  }
}
