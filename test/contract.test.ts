import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseDirectives, buildDirectiveModifiers } from "../src/directives.js";
import { generateOptimizedBlueprint } from "../src/engine.js";
import type { WorkspaceContext } from "../src/context.js";
import { writeAgentIntent } from "../src/context.js";
import { buildFreezeMessage } from "../src/freeze.js";
import { archiveBlueprintIfPresent } from "../src/history.js";
import {
  appendBlueprintDelta,
  buildPriorBlueprintContext,
  readPreviousBlueprint,
} from "../src/blueprint-diff.js";
import { loadVisionImages } from "../src/vision.js";

function baseCtx(root: string): WorkspaceContext {
  return {
    workspaceRoot: root,
    gitDiff: "",
    gitLog: "",
    fileTree: "src/\n  server.ts\n  engine.ts\n",
    packageSummary: '{"name":"demo"}',
    stackHints: "node typescript",
    docSnippets: "",
    forcedFileSnippets: "",
    knownPaths: ["src/server.ts", "src/engine.ts", "package.json"],
    forcedFiles: [],
    forcedMedia: [],
    contextWarnings: [],
    contextBytes: 512,
    gitChangedCount: 0,
    contextBudget: "lean",
  };
}

describe("engine contract (mock)", () => {
  const prevProvider = process.env.REWRITE_PROVIDER;
  const prevDry = process.env.PROMPT_MCP_DRY_RUN;

  before(() => {
    process.env.REWRITE_PROVIDER = "mock";
  });
  after(() => {
    if (prevProvider === undefined) delete process.env.REWRITE_PROVIDER;
    else process.env.REWRITE_PROVIDER = prevProvider;
    if (prevDry === undefined) delete process.env.PROMPT_MCP_DRY_RUN;
    else process.env.PROMPT_MCP_DRY_RUN = prevDry;
  });

  it("honors ignore without writing a blueprint", async () => {
    const root = mkdtempSync(join(tmpdir(), "aee-ignore-"));
    try {
      const r = await generateOptimizedBlueprint(
        "@promptmcp:ignore what is 2+2",
        baseCtx(root),
        "mock",
      );
      assert.equal(r.ignored, true);
      assert.equal(r.skipWrite, true);
      assert.equal(r.blueprint, "");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns helpOnly for bare help directive", async () => {
    const root = mkdtempSync(join(tmpdir(), "aee-help-"));
    try {
      const r = await generateOptimizedBlueprint(
        "@promptmcp:help",
        baseCtx(root),
        "mock",
      );
      assert.equal(r.helpOnly, true);
      assert.equal(r.skipWrite, true);
      assert.match(r.blueprint, /ignore|include|file/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("dry-run skips write flag and still produces blueprint", async () => {
    process.env.PROMPT_MCP_DRY_RUN = "1";
    const root = mkdtempSync(join(tmpdir(), "aee-dry-"));
    try {
      const r = await generateOptimizedBlueprint(
        "Add a login validation helper",
        baseCtx(root),
        "mock",
      );
      assert.equal(r.skipWrite, true);
      assert.ok(r.blueprint.length > 100);
      assert.match(r.blueprint, /Absolute Objective/i);
    } finally {
      delete process.env.PROMPT_MCP_DRY_RUN;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("produces a GO-worthy freeze message with media checklist", () => {
    const bp = `# 🎯 Current Task Blueprint: X

## 1. Absolute Objective
Do the thing.

## Media / reference assets
- \`ui.png\`

## Research / web references
- https://example.com
`;
    const msg = buildFreezeMessage("/tmp/Agent_Efficiency_MCP.md", bp);
    assert.match(msg, /Type GO to proceed/);
    assert.match(msg, /hard checkpoint/i);
    assert.match(msg, /Media \/ reference assets/);
    assert.match(msg, /Research \/ web references/);
  });
});

describe("directives post-process flags", () => {
  it("parses tone/diff/strict and injects strategy lines", () => {
    const d = parseDirectives(
      "@promptmcp:tone @promptmcp:diff @promptmcp:strict please fix carefully",
    );
    assert.equal(d.tone, true);
    assert.equal(d.diff, true);
    assert.equal(d.strict, true);
    const block = buildDirectiveModifiers(d);
    assert.match(block, /TONE MODE/);
    assert.match(block, /DIFF MODE/);
    assert.match(block, /STRICT/);
  });
});

describe("history + blueprint delta", () => {
  it("archives prior blueprint and builds delta context", () => {
    const root = mkdtempSync(join(tmpdir(), "aee-hist-"));
    process.env.PROMPT_MCP_KEEP_HISTORY = "1";
    try {
      const first = `# 🎯 Current Task Blueprint: One

## 1. Absolute Objective
Ship login validation.

## 2. Technical Requirements & Boundary Rules
- Keep existing API.

## 3. Targeted Codebase Vectors
- \`src/server.ts\` -> edit

## 4. Verification Checkpoints
- [ ] npm test
`;
      writeAgentIntent(root, first);
      const archived = archiveBlueprintIfPresent(root);
      assert.ok(archived);
      assert.ok(existsSync(archived!));

      const prev = readPreviousBlueprint(root);
      assert.ok(prev);
      const ctx = buildPriorBlueprintContext(prev!);
      assert.match(ctx, /Prior objective/);

      const second = `# 🎯 Current Task Blueprint: Two

## 1. Absolute Objective
Ship checkout validation.

## 2. Technical Requirements & Boundary Rules
- Keep existing API.

## 3. Targeted Codebase Vectors
- \`src/engine.ts\` -> edit

## 4. Verification Checkpoints
- [ ] npm test
`;
      const delta = appendBlueprintDelta(second, prev);
      assert.equal(delta.added, true);
      assert.match(delta.text, /Delta vs previous/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("skips archiving init stubs", () => {
    const root = mkdtempSync(join(tmpdir(), "aee-stub-"));
    try {
      writeFileSync(
        join(root, "Agent_Efficiency_MCP.md"),
        "# Waiting for first optimization\n\nstub\n",
        "utf8",
      );
      assert.equal(archiveBlueprintIfPresent(root), null);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("vision loader", () => {
  it("loads png under workspace and skips missing paths", () => {
    const root = mkdtempSync(join(tmpdir(), "aee-vis-"));
    try {
      mkdirSync(join(root, "media"), { recursive: true });
      // Minimal 1x1 PNG
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      );
      writeFileSync(join(root, "media", "dot.png"), png);
      const { images, warnings } = loadVisionImages(root, [
        "media/dot.png",
        "missing.png",
      ]);
      assert.equal(images.length, 1);
      assert.equal(images[0].mime, "image/png");
      assert.ok(warnings.some((w) => /missing/i.test(w)));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("install surface", () => {
  it("writes PRIORITY 0 rules, merges AGENTS.md, and doctor sees them", async () => {
    const { installCursorRulesFile, mergeLegacyRuleFiles, uninstallRules } =
      await import("../src/install/rules.js");
    const { runDoctor } = await import("../src/doctor.js");
    const root = mkdtempSync(join(tmpdir(), "aee-inst-"));
    const packageRoot = join(root, "pkg");
    try {
      mkdirSync(join(packageRoot, "dist"), { recursive: true });
      writeFileSync(join(packageRoot, "dist", "server.js"), "// stub\n");
      writeFileSync(join(packageRoot, "dist", "cli.js"), "// stub\n");
      writeFileSync(
        join(packageRoot, ".env"),
        "DEEPSEEK_API_KEY=test-key-not-real\n",
      );
      writeFileSync(join(root, "AGENTS.md"), "# Project agents\n", "utf8");

      const rules = installCursorRulesFile(root);
      assert.ok(existsSync(rules));
      const body = readFileSync(rules, "utf8");
      assert.match(body, /alwaysApply:\s*true/);
      assert.match(body, /ZERO.?TOKEN|first action this turn MUST/i);

      const merged = mergeLegacyRuleFiles(root);
      assert.equal(merged.length, 1);
      assert.match(readFileSync(join(root, "AGENTS.md"), "utf8"), /PRIORITY 0/);

      process.env.DEEPSEEK_API_KEY = "test-key-not-real";
      const report = runDoctor({ packageRoot, projectRoot: root });
      assert.ok(
        report.findings.some((f) => /PRIORITY 0 rules present/i.test(f.message)),
      );

      const removed = uninstallRules(root);
      assert.ok(removed.length >= 1);
      assert.ok(!existsSync(rules));
    } finally {
      delete process.env.DEEPSEEK_API_KEY;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("merges and removes MCP config for cursor-project", async () => {
    const {
      mergeMcpConfig,
      removeMcpConfig,
      resolveHostTargets,
    } = await import("../src/install/mcp-hosts.js");
    const root = mkdtempSync(join(tmpdir(), "aee-mcp-"));
    try {
      mkdirSync(join(root, ".cursor"), { recursive: true });
      writeFileSync(
        join(root, ".cursor", "mcp.json"),
        JSON.stringify({ mcpServers: { other: { command: "echo" } } }, null, 2),
      );
      const target = resolveHostTargets(root).find((t) => t.id === "cursor-project");
      assert.ok(target);
      const serverJs = join(root, "server.js");
      writeFileSync(serverJs, "//x\n");
      const merged = mergeMcpConfig(target!, serverJs, {}, {
        write: true,
        onlyIfHostDirExists: false,
        launch: "node",
        cliJsAbs: join(root, "cli.js"),
      });
      assert.equal(merged.status, "written");
      const json = JSON.parse(readFileSync(merged.path, "utf8"));
      assert.ok(json.mcpServers["agent-efficiency-engine"]);
      assert.ok(json.mcpServers.other);

      const removed = removeMcpConfig(target!);
      assert.equal(removed.status, "removed");
      const after = JSON.parse(readFileSync(merged.path, "utf8"));
      assert.equal(after.mcpServers["agent-efficiency-engine"], undefined);
      assert.ok(after.mcpServers.other);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
