import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fetchWithRetry } from "../src/http.js";
import { enrichDirectives, buildEnrichmentPayload } from "../src/enrich.js";
import { parseDirectives } from "../src/directives.js";
import { _resetAuthCircuitForTests } from "../src/security/auth-circuit.js";
import { sanitizeProviderError, classifyErrorMessage } from "../src/security/errors.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  _resetAuthCircuitForTests();
  delete process.env.PROMPT_MCP_HTTP_RETRIES;
  delete process.env.PROMPT_MCP_FETCH_URLS;
});

describe("fetchWithRetry", () => {
  it("retries 503 then succeeds", async () => {
    process.env.PROMPT_MCP_HTTP_RETRIES = "3";
    _resetAuthCircuitForTests();
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls < 3) {
        return new Response("busy", { status: 503 });
      }
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

    const res = await fetchWithRetry("https://example.com/api", {}, 2_000);
    assert.equal(res.status, 200);
    assert.equal(calls, 3);
  });

  it("does not retry 401 and records auth failure", async () => {
    process.env.PROMPT_MCP_HTTP_RETRIES = "3";
    _resetAuthCircuitForTests();
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response("nope", { status: 401 });
    }) as typeof fetch;

    const res = await fetchWithRetry("https://example.com/api", {}, 2_000);
    assert.equal(res.status, 401);
    assert.equal(calls, 1);
  });

  it("retries transient network errors", async () => {
    process.env.PROMPT_MCP_HTTP_RETRIES = "2";
    _resetAuthCircuitForTests();
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls < 2) throw new Error("ECONNRESET");
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

    const res = await fetchWithRetry("https://example.com/api", {}, 2_000);
    assert.equal(res.status, 200);
    assert.equal(calls, 2);
  });
});

describe("enrichDirectives", () => {
  it("blocks localhost research URLs and resolves media", async () => {
    process.env.PROMPT_MCP_FETCH_URLS = "1";
    const root = mkdtempSync(join(tmpdir(), "aee-enrich-"));
    try {
      mkdirSync(join(root, "assets"), { recursive: true });
      writeFileSync(join(root, "assets", "a.png"), "x");
      const d = parseDirectives(
        "@promptmcp:media[assets/a.png] @promptmcp:search[http://127.0.0.1/secret] note\nwork",
      );
      const en = await enrichDirectives(d, root);
      assert.equal(en.media.length, 1);
      assert.equal(en.media[0].exists, true);
      assert.equal(en.searches.length, 1);
      assert.equal(en.searches[0].fetchOk, false);
      assert.ok(en.warnings.some((w) => /blocked|unsafe|localhost|private/i.test(w)));
      const payload = buildEnrichmentPayload(en);
      assert.match(payload, /assets\/a\.png/);
      assert.match(payload, /127\.0\.0\.1/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stops redirect loops after hop cap", async () => {
    process.env.PROMPT_MCP_FETCH_URLS = "1";
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response("", {
        status: 302,
        headers: { location: "https://example.com/loop" },
      });
    }) as typeof fetch;

    const root = mkdtempSync(join(tmpdir(), "aee-redir-"));
    try {
      const d = parseDirectives(
        "@promptmcp:search[https://example.com/start] docs\ntask",
      );
      const en = await enrichDirectives(d, root);
      assert.equal(en.searches[0].fetchOk, false);
      assert.ok(calls <= 5, `expected hop cap, got ${calls} fetches`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("error surfaces", () => {
  it("redacts secrets and classifies timeouts", () => {
    const msg = sanitizeProviderError(
      401,
      'invalid key sk-abcdefghijklmnopqrstuvwxyz123456',
      "OpenAI",
    );
    assert.match(msg, /auth failed/);
    assert.ok(!/sk-abcdefghijklmnopqrstuvwxyz/.test(msg));

    const t = classifyErrorMessage(new Error("AbortError: timeout"));
    assert.match(t, /timed out/i);
  });
});
