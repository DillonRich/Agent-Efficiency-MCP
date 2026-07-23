import type { WorkspaceContext } from "../context.js";
import { fetchWithRetry, readErrorBody, rewriteTimeoutMs } from "../http.js";
import type { VisionImage } from "../vision.js";
import { visionDataUrl } from "../vision.js";

export interface OptimizeResult {
  blueprint: string;
  warnings: string[];
  model: string;
  provider: string;
  /** When true, server should not write Agent_Efficiency_MCP.md or freeze */
  skipWrite?: boolean;
  /** Soft notice when ignore reached the tool */
  ignored?: boolean;
  helpOnly?: boolean;
  /** Path to archived previous blueprint, if any */
  historyPath?: string;
  archetype?: string;
}

export interface GenerateOptions {
  systemPrompt?: string;
  /** Multimodal images for vision-capable providers */
  images?: VisionImage[];
}

export interface RewriteProvider {
  readonly name: string;
  /** Providers that cannot consume images should ignore options.images */
  readonly supportsVision?: boolean;
  generate(
    rawPrompt: string,
    context: WorkspaceContext,
    options?: GenerateOptions,
  ): Promise<{ content: string; model: string }>;
}

/**
 * Central compression prompt — shaped like a professional agent task brief
 * (goal, constraints, non-goals, targeted files, acceptance, verification).
 * References: agent task anatomy + token-efficient context engineering.
 */
export const CENTRAL_COMPRESSION_PROMPT = `You are the absolute optimization engine for the Agent Efficiency Engine (PromptMCP). Transform chaotic human text into a dense, one-shot architectural brief for an IDE coding agent.

CRITICAL BEHAVIOR:
1. STRIP ALL FILLER: Remove pleasantries, hedging, and aesthetic adjectives ("clean", "elegant", "beautiful").
2. YOU ARE NOT A CODER: Do NOT write application source code, loops, classes, or fenced code blocks. Organize intent only.
3. CONSTRAIN CONTEXT: Use ONLY provided workspace paths. Never invent files or folders.
4. ONE JOB: Absolute Objective = one primary outcome for THIS GO cycle. Extra wants become Non-goals / deferred.
5. TOKEN EFFICIENCY FOR THE DOWNSTREAM AGENT:
   - Prefer targeted path pointers over "explore the codebase".
   - Cap codebase vectors at ~6 high-signal paths (plus any Forced paths).
   - Prefer "mirror pattern in \`path\`" over long architectural essays.
   - Every Requirement bullet must constrain behavior or scope.
6. DEFINE DONE: Verification Checkpoints must be observable (tests, typecheck, build, UI behavior) — not vibes.
7. VISION: If images are attached, extract real UI constraints into Requirements and Media sections.

Format your output EXACTLY using this layout (keep the emoji headers):

<!-- PROMPTMCP_META: (engine will replace this line with factual metrics) -->
# 🎯 Current Task Blueprint: [ACTIVE]

## 1. Absolute Objective
[Exactly ONE imperative sentence: the outcome for this GO cycle.]

## 2. Technical Requirements & Boundary Rules
- [Constraint: must / must-not / edge case / typing / security]
- [Constraint: …]
- Non-goals: [explicitly out of scope for this GO — prevent tours and refactors]
- [Optional CONFLICT: … if the user prompt contradicts itself — pick the safer slice]

## 3. Targeted Codebase Vectors
- \`[exact path from context]\` -> edit OR read-only reference (mirror pattern here).
(Only known/forced paths. Prefer entry points over dumping whole trees.)

## 4. Verification Checkpoints
- [ ] [Concrete check — e.g. npm run typecheck passes / specific behavior observable]
- [ ] [Second concrete check tied to the objective]

---
👉 **Awaiting Your Approval:**
If this blueprint accurately maps your intention, reply with **"GO"** in the chat window.
If you want adjustments, modify this markdown file directly or type your adjustments in the chat before executing.

Do NOT invent "minutes saved", "hours saved", or other time-saved estimates. The engine stamps factual metrics.`;

export function buildUserPayload(
  rawPrompt: string,
  context: WorkspaceContext,
): string {
  const forcedFilesBlock =
    context.forcedFiles.length > 0
      ? `\nForced User Files (MUST cite in Targeted Codebase Vectors):\n${context.forcedFiles.join("\n")}\n`
      : "";
  const forcedMediaBlock =
    context.forcedMedia.length > 0
      ? `\nForced Media (MUST cite under Media / reference assets):\n${context.forcedMedia.join("\n")}\n`
      : "";

  return `User Prompt:
${rawPrompt}
${forcedFilesBlock}${forcedMediaBlock}
Local Workspace Root:
${context.workspaceRoot}

Stack / language hints:
${context.stackHints}

Package / manifest summary:
${context.packageSummary}

Workspace structure:
${context.fileTree}

Recent Git File Modifications (${context.gitChangedCount}):
${context.gitDiff}

Recent commits:
${context.gitLog}

Project doc snippets:
${context.docSnippets}

Forced file contents (read from disk; use as ground truth):
${context.forcedFileSnippets}

${context.priorBlueprint ? `${context.priorBlueprint}\n\n` : ""}Known Path Tokens (you may ONLY cite paths from this list or clear relatives of them):
${context.knownPaths.join("\n")}`;
}

export interface ChatCompletionsResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: { message?: string };
}

type OpenAiContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export async function postChatCompletions(options: {
  url: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  images?: VisionImage[];
  temperature?: number;
  label?: string;
}): Promise<{ content: string; model: string }> {
  const label = options.label || "Rewrite API";
  let userContent: OpenAiContent = options.user;
  if (options.images && options.images.length > 0) {
    userContent = [
      { type: "text", text: options.user },
      ...options.images.map((img) => ({
        type: "image_url" as const,
        image_url: { url: visionDataUrl(img) },
      })),
    ];
  }

  const response = await fetchWithRetry(
    options.url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: userContent },
        ],
        temperature: options.temperature ?? 0.1,
        stream: false,
      }),
    },
    rewriteTimeoutMs(),
  );

  if (!response.ok) {
    await readErrorBody(response, label);
  }

  const bodyText = await response.text();
  let data: ChatCompletionsResponse;
  try {
    data = JSON.parse(bodyText) as ChatCompletionsResponse;
  } catch {
    throw new Error(`${label} returned non-JSON response.`);
  }

  if (data.error?.message) {
    throw new Error(`${label} error: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(`${label} returned no message content.`);
  }

  return { content, model: options.model };
}
