/**
 * Live stdio MCP contract against dist/server.js (requires build).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverJs = join(root, "dist", "server.js");

describe("MCP stdio contract", () => {
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;
  let workspace: string;

  before(async () => {
    if (!existsSync(serverJs)) {
      throw new Error("dist/server.js missing — run npm run build first");
    }
    workspace = mkdtempSync(join(tmpdir(), "aee-mcp-"));
    mkdirSync(join(workspace, "src"), { recursive: true });
    writeFileSync(join(workspace, "src", "app.ts"), "export const n = 1;\n");
    writeFileSync(join(workspace, "package.json"), '{"name":"mcp-demo"}\n');

    transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverJs],
      cwd: root,
      stderr: "pipe",
      env: {
        REWRITE_PROVIDER: "mock",
        PROMPT_MCP_DRY_RUN: "1",
        PROMPT_MCP_FETCH_URLS: "0",
        PROMPT_MCP_VISION: "0",
        // Prevent accidental live provider use if dotenv loads keys
        DEEPSEEK_API_KEY: "",
        OPENAI_API_KEY: "",
        ANTHROPIC_API_KEY: "",
      },
    });
    client = new Client({ name: "aee-contract", version: "0.0.0" });
    await client.connect(transport);
  });

  after(async () => {
    try {
      await client?.close();
    } catch {
      /* ignore */
    }
    try {
      await transport?.close();
    } catch {
      /* ignore */
    }
    if (workspace) rmSync(workspace, { recursive: true, force: true });
  });

  it("lists optimize tool and directive helper", async () => {
    assert.ok(client);
    const tools = await client!.listTools();
    const names = tools.tools.map((t) => t.name);
    assert.ok(names.includes("optimize_and_blueprint_intent"));
    assert.ok(names.includes("list_promptmcp_directives"));
  });

  it("list_promptmcp_directives returns cheat-sheet without freeze", async () => {
    const res = await client!.callTool({
      name: "list_promptmcp_directives",
      arguments: {},
    });
    const text = JSON.stringify(res);
    assert.match(text, /@promptmcp:ignore|ignore/i);
    assert.ok(!/Type GO to proceed/i.test(text));
  });

  it("ignore path does not freeze", async () => {
    const res = await client!.callTool({
      name: "optimize_and_blueprint_intent",
      arguments: {
        raw_prompt: "@promptmcp:ignore what is 2+2",
        workspace_root: workspace,
      },
    });
    const text = JSON.stringify(res);
    assert.match(text, /ignore directive/i);
    assert.ok(!/Type GO to proceed/i.test(text));
  });

  it("help-only path does not freeze", async () => {
    const res = await client!.callTool({
      name: "optimize_and_blueprint_intent",
      arguments: {
        raw_prompt: "@promptmcp:help",
        workspace_root: workspace,
      },
    });
    const text = JSON.stringify(res);
    assert.match(text, /No freeze/i);
  });

  it("optimize dry-run returns blueprint content via mock", async () => {
    const res = await client!.callTool({
      name: "optimize_and_blueprint_intent",
      arguments: {
        raw_prompt: "Add a tiny helper that validates email input",
        workspace_root: workspace,
      },
    });
    const text = JSON.stringify(res);
    assert.match(text, /DRY_RUN|Absolute Objective|Blueprint/i);
    // dry-run mode should not claim hard freeze authorization the same way,
    // but must still produce useful blueprint text
    assert.match(text, /Absolute Objective|Current Task Blueprint/i);
  });

  it("exposes optimize prompt for recovery path", async () => {
    const prompts = await client!.listPrompts();
    const names = prompts.prompts.map((p) => p.name);
    assert.ok(names.includes("optimize"), `prompts=${names.join(",")}`);
    const got = await client!.getPrompt({
      name: "optimize",
      arguments: { task: "harden login validation" },
    });
    const blob = JSON.stringify(got);
    assert.match(blob, /optimize_and_blueprint_intent/);
    assert.match(blob, /harden login validation|freeze|GO/i);
  });
});

describe("MCP stdio write + freeze", () => {
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;
  let workspace: string;

  before(async () => {
    if (!existsSync(serverJs)) {
      throw new Error("dist/server.js missing — run npm run build first");
    }
    workspace = mkdtempSync(join(tmpdir(), "aee-mcpw-"));
    mkdirSync(join(workspace, "src"), { recursive: true });
    writeFileSync(join(workspace, "src", "app.ts"), "export const n = 1;\n");

    transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverJs],
      cwd: root,
      stderr: "pipe",
      env: {
        REWRITE_PROVIDER: "mock",
        PROMPT_MCP_DRY_RUN: "0",
        PROMPT_MCP_FETCH_URLS: "0",
        PROMPT_MCP_VISION: "0",
        PROMPT_MCP_KEEP_HISTORY: "1",
        DEEPSEEK_API_KEY: "",
        OPENAI_API_KEY: "",
        ANTHROPIC_API_KEY: "",
      },
    });
    client = new Client({ name: "aee-write", version: "0.0.0" });
    await client.connect(transport);
  });

  after(async () => {
    try {
      await client?.close();
    } catch {
      /* ignore */
    }
    try {
      await transport?.close();
    } catch {
      /* ignore */
    }
    if (workspace) rmSync(workspace, { recursive: true, force: true });
  });

  it("writes blueprint and returns hard freeze line", async () => {
    const res = await client!.callTool({
      name: "optimize_and_blueprint_intent",
      arguments: {
        raw_prompt: "Tighten error messages in the login helper",
        workspace_root: workspace,
      },
    });
    const text = JSON.stringify(res);
    assert.match(text, /Type GO to proceed/);
    assert.match(text, /hard checkpoint/i);
    assert.ok(
      existsSync(join(workspace, "Agent_Efficiency_MCP.md")),
      "blueprint file should exist on disk",
    );
  });
});
