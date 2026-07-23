#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { BLUEPRINT_FILENAME, resolveBlueprintFilename } from "./constants.js";
import {
  gatherWorkspaceContext,
  resolveWorkspaceRoot,
  writeAgentIntent,
} from "./context.js";
import { DIRECTIVE_HELP, parseDirectives } from "./directives.js";
import {
  buildPriorBlueprintContext,
  readPreviousBlueprint,
} from "./blueprint-diff.js";
import { generateOptimizedBlueprint } from "./engine.js";
import { classifyErrorMessage } from "./security/errors.js";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(here, "..", ".env") });

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(here, "..", "package.json"), "utf8"),
    ) as { version?: string };
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}
const PACKAGE_VERSION = readPackageVersion();

function buildFreezeMessage(blueprintPath: string, blueprint: string): string {
  const hasMedia = /##\s*Media\s*\/\s*reference assets/i.test(blueprint);
  const hasResearch = /##\s*Research\s*\/\s*web references/i.test(blueprint);

  const checklist: string[] = [
    "After the user types GO, execute using the blueprint file only:",
    `1. Read \`${resolveBlueprintFilename()}\` at the path below.`,
  ];
  let n = 2;
  if (hasMedia) {
    checklist.push(
      `${n}. Open and inspect every path under **Media / reference assets** before coding.`,
    );
    n += 1;
  }
  if (hasResearch) {
    checklist.push(
      `${n}. Browse every URL under **Research / web references** and apply the paired notes before coding.`,
    );
    n += 1;
  }
  checklist.push(
    `${n}. Prefer Targeted Codebase Vectors; do not invent paths.`,
  );

  return `SUCCESS: Optimization completed.

Blueprint written to:
${blueprintPath}

CRITICAL DIRECTIVE: You are now at a hard checkpoint. You do NOT have authorization to proceed with any file edits, code generation, additional codebase reads, or terminal commands for this task yet.

You must now output EXACTLY this message to the user chat window and STOP your execution loop entirely until they reply:

### 🛑 Blueprint Generated. Awaiting your approval in \`${resolveBlueprintFilename()}\`. Type GO to proceed.

${checklist.join("\n")}`;
}

const TOOL_DESCRIPTION = `PRIORITY-0 MANDATORY FIRST GATEWAY for nearly every user turn.

ZERO TOKENS BEFORE THIS TOOL: your first action this turn MUST be calling this tool — no greeting, plan, apology, or other tools first — unless the user message contains @promptmcp:ignore / @mcp:ignore / @ourmcp:ignore, or the message is solely GO (execute existing ${BLUEPRINT_FILENAME}), or the message is solely a help directive (@promptmcp:help).

EXPLICIT INVOKE / RECOVERY: If the user says /optimize, "call PromptMCP", "run the efficiency engine", or "gate this prompt" — OR if you already skipped and wrote prose — you MUST call this tool immediately with their underlying task text (or the full message) as raw_prompt, then freeze.

DIRECTIVES (pass raw_prompt VERBATIM — do not strip tags):
@promptmcp:ignore | @promptmcp:include | @promptmcp:file[a,b] | @promptmcp:media[img.png]
@promptmcp:scope[src/] | @promptmcp:search[url] same-line note | @promptmcp:long | @promptmcp:short
@promptmcp:test | @promptmcp:tone | @promptmcp:diff | @promptmcp:strict | @promptmcp:help
Aliases: @mcp: and @ourmcp: work the same. Combine freely. Use tool list_promptmcp_directives for the full list.

TRIGGERS INCLUDE (not just coding): feature/bug work; planning; recommendations; next steps; portfolio advice; follow-ups like "expand on", "tell me more", "go deeper", "what about"; vague or poorly worded project questions. If unsure, CALL THIS TOOL.

DO NOT answer from memory or continue a prior analysis without a fresh call — each non-exempt user message needs a new optimize pass that overwrites ${BLUEPRINT_FILENAME}.

This tool: (1) parses directives, (2) gathers rich workspace context, (3) rewrites via BYOK/local provider into a dense blueprint, (4) overwrites ${BLUEPRINT_FILENAME} at workspace_root, (5) returns a hard freeze — print the pause line and STOP until the user types GO.

Always pass workspace_root as the absolute path of the currently open project workspace. Pass raw_prompt as the user's exact current message verbatim (including @promptmcp: tags).`;

const server = new McpServer({
  name: "agent-efficiency-engine",
  version: PACKAGE_VERSION,
});

server.registerPrompt(
  "optimize",
  {
    title: "Optimize prompt (PromptMCP)",
    description:
      "Explicit fallback when the host model skips auto-gate. Use when the user types /optimize or asks to run PromptMCP. Then call optimize_and_blueprint_intent and freeze.",
    argsSchema: {
      task: z
        .string()
        .optional()
        .describe("Optional task text; default to the latest user message."),
    },
  },
  async ({ task }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            `Run PromptMCP now. Call tool optimize_and_blueprint_intent with raw_prompt set to ` +
            (task?.trim()
              ? `the following task:\n\n${task}`
              : "the user's latest message verbatim") +
            `, and workspace_root set to this workspace absolute path. Then print the freeze line and STOP until GO.`,
        },
      },
    ],
  }),
);

server.registerTool(
  "list_promptmcp_directives",
  {
    title: "List PromptMCP directives",
    description:
      "Return the @promptmcp: / @mcp: / @ourmcp: directive cheat-sheet. Safe to call anytime; does not freeze.",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text" as const, text: DIRECTIVE_HELP }],
  }),
);

server.registerTool(
  "optimize_and_blueprint_intent",
  {
    title: "Optimize & Blueprint Intent",
    description: TOOL_DESCRIPTION,
    inputSchema: {
      raw_prompt: z
        .string()
        .describe(
          "The exact, raw text the user typed (verbatim), including any @promptmcp: / @mcp: / @ourmcp: directives.",
        ),
      workspace_root: z
        .string()
        .describe(
          `Absolute filesystem path to the currently open project workspace root (required so ${BLUEPRINT_FILENAME} is written in the correct project).`,
        ),
    },
  },
  async ({ raw_prompt, workspace_root }) => {
    try {
      const directives = parseDirectives(raw_prompt);

      if (directives.ignore) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                "PromptMCP: ignore directive detected. Do not optimize. Answer the user normally " +
                "without freezing. (Host should have skipped this tool call.)",
            },
          ],
        };
      }

      if (
        directives.help &&
        !directives.cleanedPrompt.trim() &&
        directives.files.length === 0 &&
        directives.media.length === 0 &&
        directives.searches.length === 0
      ) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                DIRECTIVE_HELP +
                "\n\nNo freeze — this was help-only. You may answer the user with the cheat-sheet above.",
            },
          ],
        };
      }

      const root = resolveWorkspaceRoot(workspace_root);
      const context = gatherWorkspaceContext(root, {
        forcedFiles: directives.files,
        forcedMedia: directives.media,
        scopes: directives.scopes,
        rawPrompt: raw_prompt,
      });
      const previous = readPreviousBlueprint(root);
      if (previous) {
        context.priorBlueprint = buildPriorBlueprintContext(previous);
      }
      const result = await generateOptimizedBlueprint(raw_prompt, context);

      if (result.ignored || result.helpOnly) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                (result.blueprint || "No blueprint.") +
                (result.warnings.length
                  ? `\n\nWarnings:\n- ${result.warnings.join("\n- ")}`
                  : ""),
            },
          ],
        };
      }

      const dryRun = Boolean(result.skipWrite);
      let writtenPath = join(root, resolveBlueprintFilename());
      if (!dryRun) {
        writtenPath = writeAgentIntent(root, result.blueprint);
      }

      const warningBlock =
        result.warnings.length > 0
          ? `\n\nEngine warnings:\n- ${result.warnings.join("\n- ")}`
          : "";

      const freeze = dryRun
        ? `DRY_RUN: Blueprint generated but NOT written.\nWould write to:\n${writtenPath}\n\nProvider: ${result.provider}\nModel: ${result.model}${warningBlock}\n\n${result.blueprint}`
        : `${buildFreezeMessage(writtenPath, result.blueprint)}\n\n` +
          `Provider: ${result.provider}\n` +
          `Model: ${result.model}` +
          warningBlock;

      return {
        content: [
          {
            type: "text" as const,
            text: freeze,
          },
        ],
      };
    } catch (err) {
      const message = classifyErrorMessage(err);
      console.error("[agent-efficiency] optimize_and_blueprint_intent failed:", message);

      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text:
              `⚠️ **Agent Efficiency Engine Error**\n\n${message}\n\n` +
              `CRITICAL: Do not proceed with coding. Report this error to the user and wait for instructions.\n` +
              `Tip: run \`agent-efficiency-mcp doctor\` to check keys / install.`,
          },
        ],
      };
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `Agent Efficiency Engine (agent-efficiency-engine) v${PACKAGE_VERSION} running over stdio.`,
  );
}

main().catch((error) => {
  console.error("Fatal Agent Efficiency Engine server error:", error);
  process.exit(1);
});
