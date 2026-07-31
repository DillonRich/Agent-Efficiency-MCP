import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDirectives, isHelpOnly } from "../src/directives.js";
import { validateAndSanitizeBlueprint } from "../src/validate.js";
import { resolveUnderWorkspace } from "../src/security/paths.js";
import { isSafePublicHttpUrl } from "../src/security/ssrf.js";
import { sanitizeProviderError } from "../src/security/errors.js";
import {
  buildServerEntry,
  patchMcpServerEnv,
  removeMcpConfig,
  resolveLaunchMode,
  type HostTarget,
} from "../src/install/mcp-hosts.js";
import { buildConfigureEnv } from "../src/configure-env.js";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("directives", () => {
  it("parses composable tags and strips them", () => {
    const d = parseDirectives(
      `@promptmcp:include @mcp:long @promptmcp:file[src/a.ts, b.ts]
@promptmcp:media[ui/hero.png]
@promptmcp:scope[src/, scripts/]
@promptmcp:search[https://example.com/docs] auth section
build the checkout`,
    );
    assert.equal(d.include, true);
    assert.equal(d.long, true);
    assert.deepEqual(d.files, ["src/a.ts", "b.ts"]);
    assert.deepEqual(d.media, ["ui/hero.png"]);
    assert.deepEqual(d.scopes, ["src/", "scripts/"]);
    assert.equal(d.searches.length, 1);
    assert.equal(d.searches[0].target, "https://example.com/docs");
    assert.match(d.cleanedPrompt, /build the checkout/);
    assert.ok(!/@promptmcp:/.test(d.cleanedPrompt));
  });

  it("detects help-only", () => {
    const d = parseDirectives("@promptmcp:help");
    assert.equal(isHelpOnly(d), true);
  });

  it("flags long+short conflict", () => {
    const d = parseDirectives("@promptmcp:long @promptmcp:short x");
    assert.ok(d.warnings.some((w) => /long|short/i.test(w)));
  });
});

describe("validate", () => {
  const base = `# 🎯 Current Task Blueprint: [ACTIVE]

## 1. Absolute Objective
Do the thing.

## 2. Technical Requirements & Boundary Rules
- Be correct

## 3. Targeted Codebase Vectors
- \`src/server.ts\` -> edit
- \`evil/server.ts\` -> invent

## 4. Verification Checkpoints
- [ ] works

---
👉 **Awaiting Your Approval:**
GO
`;

  it("keeps known paths and strips invented basename collisions", () => {
    const r = validateAndSanitizeBlueprint(base, ["src/server.ts", "package.json"]);
    assert.equal(r.ok, true);
    assert.match(r.blueprint, /src\/server\.ts/);
    assert.ok(!r.blueprint.includes("evil/server.ts"));
  });
});

describe("paths", () => {
  it("confines paths under workspace", () => {
    const root = mkdtempSync(join(tmpdir(), "aem-path-"));
    try {
      mkdirSync(join(root, "src"));
      writeFileSync(join(root, "src", "a.ts"), "x");
      const ok = resolveUnderWorkspace(root, "src/a.ts");
      assert.equal(ok.outside, false);
      assert.equal(ok.exists, true);
      const esc = resolveUnderWorkspace(root, "../outside.txt");
      assert.equal(esc.outside, true);
      assert.equal(esc.exists, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("ssrf", () => {
  it("allows public https", () => {
    assert.equal(isSafePublicHttpUrl("https://example.com/docs").ok, true);
  });
  it("blocks localhost and private IPs", () => {
    assert.equal(isSafePublicHttpUrl("http://127.0.0.1/x").ok, false);
    assert.equal(isSafePublicHttpUrl("http://192.168.1.1/").ok, false);
    assert.equal(isSafePublicHttpUrl("http://localhost/meta").ok, false);
    assert.equal(isSafePublicHttpUrl("http://169.254.169.254/latest").ok, false);
  });
});

describe("errors", () => {
  it("redacts secrets and classifies 429", () => {
    const msg = sanitizeProviderError(
      429,
      'rate limit key=sk-abcdefghijklmnopqrstuvwxyz',
    );
    assert.match(msg, /rate limited/i);
    assert.ok(!msg.includes("sk-abcdefghijklmnopqrstuvwxyz"));
  });
});

describe("mcp launch", () => {
  it("builds npx and node entries", () => {
    assert.equal(resolveLaunchMode("npx"), "npx");
    const npx = buildServerEntry("/x/server.js", { A: "1" }, { launch: "npx" });
    assert.ok(String(npx.command).includes("npx"));
    const node = buildServerEntry("/x/server.js", {}, {
      launch: "node",
      cliJsAbs: "/x/cli.js",
    });
    assert.equal(node.command, "node");
    assert.deepEqual(node.args, ["/x/cli.js", "serve"]);
  });

  it("removes only our MCP server key", () => {
    const dir = mkdtempSync(join(tmpdir(), "aem-mcp-"));
    try {
      const configPath = join(dir, "mcp.json");
      writeFileSync(
        configPath,
        JSON.stringify(
          {
            mcpServers: {
              "agent-efficiency-engine": { command: "node", args: ["x"] },
              other: { command: "npx", args: ["y"] },
            },
          },
          null,
          2,
        ),
      );
      const target: HostTarget = {
        id: "test",
        label: "test",
        configPath,
        rootKey: "mcpServers",
      };
      const r = removeMcpConfig(target);
      assert.equal(r.status, "removed");
      const parsed = JSON.parse(readFileSync(configPath, "utf8")) as {
        mcpServers: Record<string, unknown>;
      };
      assert.equal("agent-efficiency-engine" in parsed.mcpServers, false);
      assert.ok(parsed.mcpServers.other);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("patches MCP env for configure without rewriting command", () => {
    const dir = mkdtempSync(join(tmpdir(), "aee-patch-"));
    try {
      const configPath = join(dir, "mcp.json");
      writeFileSync(
        configPath,
        JSON.stringify(
          {
            mcpServers: {
              "agent-efficiency-engine": {
                command: "npx",
                args: ["-y", "agent-efficiency-mcp", "serve"],
              },
            },
          },
          null,
          2,
        ),
      );
      const target: HostTarget = {
        id: "test",
        label: "test",
        configPath,
        rootKey: "mcpServers",
      };
      const r = patchMcpServerEnv(target, {
        DEEPSEEK_API_KEY: "sk-test",
        REWRITE_PROVIDER: "deepseek",
      });
      assert.equal(r.status, "updated");
      const parsed = JSON.parse(readFileSync(configPath, "utf8")) as {
        mcpServers: {
          "agent-efficiency-engine": {
            command: string;
            env: Record<string, string>;
          };
        };
      };
      assert.equal(
        parsed.mcpServers["agent-efficiency-engine"].command,
        "npx",
      );
      assert.equal(
        parsed.mcpServers["agent-efficiency-engine"].env.DEEPSEEK_API_KEY,
        "sk-test",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("maps configure flags to provider env vars", () => {
    const env = buildConfigureEnv({
      provider: "Deep Seek",
      apiKey: "sk-abc",
      model: "flash high",
    });
    assert.equal(env.REWRITE_PROVIDER, "deepseek");
    assert.equal(env.DEEPSEEK_API_KEY, "sk-abc");
    assert.equal(env.REWRITE_MODEL, "deepseek-v4-flash");
    assert.equal(env.DEEPSEEK_MODEL, "deepseek-v4-flash");
    assert.equal(env.REWRITE_REASONING_EFFORT, "high");
    assert.equal(env.REWRITE_THINKING, "enabled");
  });
});

import { normalizeProviderName } from "../src/providers/index.js";
import {
  expandModelAlias,
  parseModelSpec,
} from "../src/providers/model.js";
import {
  extractPathLikeTokens,
  looksLikeFilesystemPath,
} from "../src/directives.js";

describe("provider + model aliases", () => {
  it("normalizes messy provider names", () => {
    assert.equal(normalizeProviderName("DeepSeek"), "deepseek");
    assert.equal(normalizeProviderName("Deep Seek"), "deepseek");
    assert.equal(normalizeProviderName("DEEPSEEK"), "deepseek");
    assert.equal(normalizeProviderName("Open AI"), "openai");
    assert.equal(normalizeProviderName("claude"), "anthropic");
  });

  it("expands model aliases and effort specs", () => {
    assert.equal(expandModelAlias("flash"), "deepseek-v4-flash");
    assert.equal(expandModelAlias("pro"), "deepseek-v4-pro");
    assert.equal(expandModelAlias("GPT 5.6 Sol"), "gpt-5.6");
    const spec = parseModelSpec("pro:max");
    assert.equal(expandModelAlias(spec.modelRaw), "deepseek-v4-pro");
    assert.equal(spec.effort, "max");
  });
});

describe("implicit path extraction", () => {
  it("keeps real paths and drops English a/b phrases", () => {
    assert.equal(looksLikeFilesystemPath("src/scanner.py"), true);
    assert.equal(looksLikeFilesystemPath("README.md"), false); // no slash
    assert.equal(looksLikeFilesystemPath("start/end"), false);
    assert.equal(looksLikeFilesystemPath("P0/P1"), false);
    assert.equal(looksLikeFilesystemPath("model/scanner"), false);
    assert.equal(looksLikeFilesystemPath("Rust/Tauri"), false);
    const tokens = extractPathLikeTokens(
      "Wire cache in src/engine.py and ignore start/end plus P0/P1 labels",
    );
    assert.ok(tokens.some((t) => t.includes("src/engine.py")));
    assert.ok(!tokens.some((t) => /start\/end|P0\/P1/i.test(t)));
  });
});

import { classifyPromptArchetype } from "../src/quality/archetype.js";
import { ensureBoundaryBullets } from "../src/quality/boundaries.js";
import {
  resolveContextBudget,
  skeletonizeSource,
} from "../src/quality/budget.js";
import { scoreBlueprintQuality } from "../src/quality/score.js";
import {
  _resetAuthCircuitForTests,
  assertAuthCircuitClosed,
  noteAuthFailure,
} from "../src/security/auth-circuit.js";

describe("archetype + quality", () => {
  it("classifies vague / overconstrained / contradictory", () => {
    assert.equal(
      classifyPromptArchetype("What should we do next").primary,
      "vague",
    );
    const over = classifyPromptArchetype(
      "You must always never have to need to should do enterprise and also keep it simple with must constraints everywhere today",
    );
    assert.ok(over.tags.includes("overconstrained") || over.primary === "overconstrained");
    const contra = classifyPromptArchetype(
      "Always keep it short. Never simplify. No tests but add tests for everything.",
    );
    assert.ok(contra.tags.includes("contradictory"));
  });

  it("scores dense blueprint high and tour language low on R9", () => {
    const good = `# 🎯 Current Task Blueprint: [ACTIVE]
## 1. Absolute Objective
Implement retries in src/http.ts.
## 2. Technical Requirements & Boundary Rules
- Retry 429/5xx.
- Non-goals: do not redesign providers.
## 3. Targeted Codebase Vectors
- \`src/http.ts\` -> edit
## 4. Verification Checkpoints
- [ ] npm test passes
---
👉 **Awaiting Your Approval:**
GO
`;
    const s = scoreBlueprintQuality({
      blueprint: good,
      knownPaths: ["src/http.ts"],
      rawPrompt: "please make elegant retries somehow thanks",
    });
    assert.ok(s.composite >= 80, `composite ${s.composite}`);
    assert.equal(s.r9_no_tour, true);

    const tour = good.replace(
      "Non-goals: do not redesign providers.",
      "Explore the whole codebase and figure out improvements.",
    );
    const bad = scoreBlueprintQuality({
      blueprint: tour,
      knownPaths: ["src/http.ts"],
      rawPrompt: "explore the whole codebase",
    });
    assert.equal(bad.r9_no_tour, false);
  });

  it("injects non-goals for vague archetypes", () => {
    const arch = classifyPromptArchetype("What should we do next");
    const bp = `# 🎯 Current Task Blueprint: [ACTIVE]
## 1. Absolute Objective
Ship the next concrete improvement from git signals.
## 2. Technical Requirements & Boundary Rules
- Prefer files in recent git diff.
## 3. Targeted Codebase Vectors
- \`src/engine.ts\` -> edit
## 4. Verification Checkpoints
- [ ] npm run typecheck passes
---
GO
`;
    const out = ensureBoundaryBullets(bp, arch);
    assert.equal(out.injected, true);
    assert.match(out.text, /Non-goals/i);
  });

  it("picks lean vs rich context budgets", () => {
    assert.equal(
      resolveContextBudget("Add input validation to the login form").mode,
      "lean",
    );
    assert.equal(resolveContextBudget("What should we do next").mode, "rich");
    const sk = skeletonizeSource(
      "import x from 'y';\nexport function foo() {}\nconst noise = 1;\n".repeat(
        80,
      ),
      500,
    );
    assert.match(sk, /skeleton/i);
    assert.match(sk, /export function foo/);
  });

  it("opens auth circuit after repeated 401s", () => {
    _resetAuthCircuitForTests();
    process.env.PROMPT_MCP_AUTH_FAIL_THRESHOLD = "3";
    process.env.PROMPT_MCP_AUTH_COOLDOWN_MS = "60000";
    noteAuthFailure();
    noteAuthFailure();
    assert.doesNotThrow(() => assertAuthCircuitClosed("test"));
    noteAuthFailure();
    assert.throws(() => assertAuthCircuitClosed("test"), /circuit open/i);
    _resetAuthCircuitForTests();
  });
});
