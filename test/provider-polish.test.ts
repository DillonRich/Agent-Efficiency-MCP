import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  normalizeProviderName,
  resolveProvider,
} from "../src/providers/index.js";
import {
  ensureVerificationLanguage,
  stripFillerLanguage,
  tightenObjective,
} from "../src/quality/polish.js";

afterEach(() => {
  delete process.env.REWRITE_PROVIDER;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.LOCAL_LLM_BASE;
});

describe("provider resolve", () => {
  it("normalizes common aliases", () => {
    assert.equal(normalizeProviderName("grok"), "xai");
    assert.equal(normalizeProviderName("google"), "gemini");
    assert.equal(normalizeProviderName("ollama"), "local");
    assert.equal(normalizeProviderName("lmstudio"), "local");
    assert.equal(normalizeProviderName("openrouter"), "openai_compat");
    assert.equal(normalizeProviderName("ci"), "mock");
  });

  it("resolveProvider(mock) works without keys", () => {
    const p = resolveProvider("mock");
    assert.equal(p.name, "mock");
  });

  it("auto prefers deepseek when key present", () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    process.env.REWRITE_PROVIDER = "auto";
    const p = resolveProvider("auto");
    assert.equal(p.name, "deepseek");
  });
});

describe("quality polish", () => {
  const base = `# 🎯 Current Task Blueprint: X

## 1. Absolute Objective
Please make a super elegant beautiful helper somehow. Also rewrite the whole stack. Thanks!!!

## 2. Technical Requirements & Boundary Rules
- Keep it simple.

## 3. Targeted Codebase Vectors
- \`src/server.ts\` -> edit

## 4. Verification Checkpoints
- [ ] Looks good

---
👉 **Awaiting Your Approval:** reply GO
`;

  it("strips filler words", () => {
    const r = stripFillerLanguage(base);
    assert.equal(r.changed, true);
    assert.ok(!/\bplease\b/i.test(r.text));
    assert.ok(!/\belegant\b/i.test(r.text));
  });

  it("tightens long objectives", () => {
    const long = base.replace(
      /Please make[\s\S]*?Thanks!!!/,
      "Do one thing. Then another thing. Then a third thing that is also required. And a fourth for good measure.",
    );
    const r = tightenObjective(long);
    assert.equal(r.changed, true);
    const obj = r.text.match(
      /##\s*1\.\s*Absolute Objective\s*\n+([\s\S]*?)(?=\n##\s*2\.)/i,
    )?.[1];
    assert.ok(obj);
    assert.ok(obj!.trim().length <= 330);
  });

  it("injects verification language when missing", () => {
    const r = ensureVerificationLanguage(base, "typescript node");
    assert.equal(r.injected, true);
    assert.match(r.text, /typecheck|npm test/i);
  });
});
