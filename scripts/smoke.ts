/**
 * Local smoke / regression checks (no Cursor required).
 * - Always: context gather + blueprint validation + model aliases
 * - If a BYOK key is set: live optimize call against this repo
 */
import { config as loadEnv } from "dotenv";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  gatherWorkspaceContext,
  resolveWorkspaceRoot,
  writeAgentIntent,
} from "../src/context.js";
import { generateOptimizedBlueprint } from "../src/engine.js";
import {
  applyDirectivePostProcess,
  isHelpOnly,
  parseDirectives,
} from "../src/directives.js";
import {
  expandModelAlias,
  resolveRewriteModel,
} from "../src/providers/model.js";
import { normalizeProviderName } from "../src/providers/index.js";
import { validateAndSanitizeBlueprint } from "../src/validate.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: join(root, ".env") });

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function testResolveWorkspace(): void {
  const resolved = resolveWorkspaceRoot(root);
  assert(resolved.length > 0, "resolveWorkspaceRoot returned empty");
  console.error("[ok] resolveWorkspaceRoot");
}

function testContextGather(): void {
  const ctx = gatherWorkspaceContext(root);
  assert(ctx.fileTree.includes("package.json"), "expected package.json in file tree");
  assert(ctx.knownPaths.includes("package.json"), "expected package.json in knownPaths");
  assert(ctx.stackHints.length > 0, "expected stack hints");
  assert(typeof ctx.contextBytes === "number" && ctx.contextBytes > 0, "contextBytes");
  assert(ctx.gitLog.length > 0, "gitLog present");
  console.error("[ok] gatherWorkspaceContext (rich)");
}

function testValidation(): void {
  const known = ["package.json", "src/", "src/server.ts"];
  const raw = `# 🎯 Current Task Blueprint: [ACTIVE]

## 1. Absolute Objective
Add a healthcheck route.

## 2. Technical Requirements & Boundary Rules
- Keep TypeScript strict.
- Do not invent files.

## 3. Targeted Codebase Vectors
- \`src/server.ts\` -> Target for editing.
- \`totally/fake/invented.ts\` -> must be stripped.
- \`package.json\` -> reference only.

## 4. Verification Checkpoints
- [ ] Compiles cleanly.
- [ ] Route responds 200.

\`\`\`ts
function evil() {}
\`\`\`

---
👉 **Awaiting Your Approval:**
reply with **"GO"**
`;

  const result = validateAndSanitizeBlueprint(raw, known);
  assert(result.ok, `validation should pass: ${result.errors.join("; ")}`);
  assert(!result.blueprint.includes("invented.ts"), "invented path should be stripped");
  assert(!result.blueprint.includes("function evil"), "code fence should be stripped");
  assert(result.blueprint.includes("src/server.ts"), "known path should remain");
  console.error("[ok] validateAndSanitizeBlueprint");
}

function testWriteIntent(): void {
  const dir = mkdtempSync(join(tmpdir(), "promptmcp-smoke-"));
  try {
    const path = writeAgentIntent(dir, "# test blueprint\n");
    const body = readFileSync(path, "utf8");
    assert(body.includes("test blueprint"), "writeAgentIntent failed");
    console.error("[ok] writeAgentIntent");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function testDirectives(): void {
  const parsed = parseDirectives(`@promptmcp:include @mcp:long @ourmcp:test
@promptmcp:file[src/server.ts, package.json]
@promptmcp:media[mockups/hero.png]
@promptmcp:search[https://stripe.com/docs/checkout] focus on embedded Checkout UX
Please wire a checkout flow that matches our brand.
Also touch src/engine.ts somehow.`);

  assert(parsed.include, "include flag");
  assert(parsed.long, "long flag");
  assert(parsed.test, "test flag");
  assert(parsed.files.includes("src/server.ts"), "explicit file");
  assert(parsed.files.includes("package.json"), "explicit package.json");
  assert(parsed.files.includes("src/engine.ts"), "implicit path from body");
  assert(parsed.media.includes("mockups/hero.png"), "media path");
  assert(parsed.searches.length === 1, "one search");
  assert(
    parsed.searches[0].target === "https://stripe.com/docs/checkout",
    "search url",
  );
  assert(
    /embedded Checkout/i.test(parsed.searches[0].note),
    "search same-line note",
  );
  assert(
    /wire a checkout flow/i.test(parsed.cleanedPrompt),
    "cleaned keeps task prose",
  );
  assert(!/@promptmcp:/.test(parsed.cleanedPrompt), "tags stripped");

  const conflict = parseDirectives("@promptmcp:long @promptmcp:short do thing");
  assert(conflict.long && !conflict.short, "long wins over short");
  assert(conflict.warnings.length >= 1, "conflict warning");

  const help = parseDirectives("@mcp:help");
  assert(isHelpOnly(help), "help-only detection");

  const ignore = parseDirectives("@ourmcp:ignore what is 2+2");
  assert(ignore.ignore, "ignore alias");

  let bp = `# 🎯 Current Task Blueprint: [ACTIVE]

## 1. Absolute Objective
Do the thing.

## 2. Technical Requirements & Boundary Rules
- Be careful.

## 3. Targeted Codebase Vectors
- \`package.json\` -> reference.

## 4. Verification Checkpoints
- [ ] Done.

---
👉 **Awaiting Your Approval:**
reply with **"GO"**
`;
  bp = applyDirectivePostProcess(bp, parsed);
  assert(bp.includes("src/server.ts"), "post-process injects forced file");
  assert(/Media \/ reference assets/i.test(bp), "media section");
  assert(/Research \/ web references/i.test(bp), "research section");
  assert(/Host agent obligations/i.test(bp), "host obligations after GO");
  assert(/## Original Prompt/i.test(bp), "include original section");
  assert(/checkout flow/i.test(bp), "original prompt body present");

  const withEnrich = applyDirectivePostProcess("# 🎯 Current Task Blueprint: [ACTIVE]\n\n## 1. Absolute Objective\nx\n\n## 2. Technical Requirements & Boundary Rules\n- y\n\n## 3. Targeted Codebase Vectors\n- `package.json`\n\n## 4. Verification Checkpoints\n- [ ] z\n\n---\n👉 **Awaiting Your Approval:**\nGO\n", parseDirectives("@promptmcp:media[package.json]\n@promptmcp:search[https://example.com] focus docs\ntask"), {
    media: [
      {
        path: "package.json",
        abs: join(root, "package.json").replace(/\\/g, "/"),
        exists: true,
        bytes: 100,
      },
    ],
    searches: [
      {
        target: "https://example.com",
        note: "focus docs",
        title: "Example Domain",
        snippet: "Example snippet",
        fetchOk: true,
      },
    ],
  });
  assert(/Absolute:/i.test(withEnrich), "media abs path");
  assert(/Example Domain/i.test(withEnrich), "search title enrich");
  assert(/REQUIRED after GO/i.test(withEnrich), "required after GO");

  const ctx = gatherWorkspaceContext(root, {
    forcedFiles: ["package.json", "src/server.ts"],
  });
  assert(ctx.forcedFiles.includes("package.json"), "context forced files");
  assert(ctx.knownPaths.includes("src/server.ts"), "forced in knownPaths");

  console.error("[ok] directives parse / post-process / forced context");
}

function testModelAliases(): void {
  assert(
    expandModelAlias("sonnet 4") === "claude-sonnet-4-20250514",
    "sonnet 4 alias",
  );
  assert(
    expandModelAlias("opus 4.8") === "claude-opus-4-5",
    "opus 4.8 alias",
  );
  assert(expandModelAlias("flash") === "deepseek-v4-flash", "flash alias");
  assert(
    expandModelAlias("gemini-flash") === "gemini-2.5-flash",
    "gemini-flash alias",
  );
  assert(expandModelAlias("grok") === "grok-3-mini", "grok alias");
  assert(
    expandModelAlias("my-custom-endpoint-model") === "my-custom-endpoint-model",
    "unknown ids pass through",
  );

  const prev = process.env.REWRITE_MODEL;
  process.env.REWRITE_MODEL = "opus 4";
  assert(
    resolveRewriteModel("anthropic") === "claude-opus-4-20250514",
    "REWRITE_MODEL overrides anthropic default",
  );
  if (prev === undefined) delete process.env.REWRITE_MODEL;
  else process.env.REWRITE_MODEL = prev;

  console.error("[ok] model aliases / REWRITE_MODEL");
}

function testProviderAliases(): void {
  assert(normalizeProviderName("grok") === "xai", "grok → xai");
  assert(normalizeProviderName("google") === "gemini", "google → gemini");
  assert(normalizeProviderName("ollama") === "local", "ollama → local");
  assert(normalizeProviderName("lmstudio") === "local", "lmstudio → local");
  console.error("[ok] provider aliases");
}

async function testLiveRewrite(): Promise<void> {
  const offline =
    process.argv.includes("--offline") ||
    process.env.PROMPT_MCP_SMOKE_OFFLINE === "1" ||
    process.env.PROMPT_MCP_SMOKE_OFFLINE === "true";
  if (offline) {
    console.error("[skip] live rewrite — offline smoke (publish/CI)");
    return;
  }

  const hasKey =
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.XAI_API_KEY?.trim() ||
    process.env.GROK_API_KEY?.trim() ||
    process.env.LOCAL_LLM_MODEL?.trim() ||
    (process.env.REWRITE_API_BASE?.trim() &&
      (process.env.REWRITE_API_MODEL?.trim() ||
        process.env.REWRITE_MODEL?.trim()));

  if (!hasKey) {
    console.error("[skip] live rewrite — no BYOK provider key set");
    return;
  }

  try {
    const ctx = gatherWorkspaceContext(root);
    const result = await generateOptimizedBlueprint(
      "Hey can you please make a super clean and elegant tiny helper that just logs hello somehow in this project? thanks!!",
      ctx,
    );

    assert(
      result.blueprint.includes("Absolute Objective"),
      "missing Absolute Objective",
    );
    assert(
      !/```/.test(result.blueprint),
      "live blueprint should not retain code fences",
    );
    writeFileSync(
      join(root, "Agent_Efficiency_MCP.smoke.md"),
      result.blueprint,
      "utf8",
    );
    console.error(
      `[ok] live rewrite via ${result.provider}/${result.model} (wrote Agent_Efficiency_MCP.smoke.md)`,
    );
    assert(
      /PROMPTMCP_META/i.test(result.blueprint),
      "factual metrics header present",
    );
    assert(
      !/Estimated Dev Time Saved/i.test(result.blueprint),
      "no hallucinated time-saved metrics",
    );
    if (result.warnings.length) {
      console.error("[warn]", result.warnings.join(" | "));
    }
  } catch (err) {
    // Bad/expired package .env must not block npm publish or local smoke.
    const msg = err instanceof Error ? err.message : String(err);
    if (/auth failed|401|403|No rewrite provider|circuit/i.test(msg)) {
      console.error("[skip] live rewrite — provider auth/config error:", msg);
      return;
    }
    throw err;
  }
}

async function main(): Promise<void> {
  console.error("Agent Efficiency Engine smoke starting...");
  testResolveWorkspace();
  testContextGather();
  testValidation();
  testWriteIntent();
  testDirectives();
  testModelAliases();
  testProviderAliases();
  await testLiveRewrite();
  console.error("Agent Efficiency Engine smoke completed.");
}

main().catch((err) => {
  console.error("[fail]", err);
  process.exit(1);
});
