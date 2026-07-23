/** Shared HTTP helpers with timeouts + retries (production safety). */

import {
  assertAuthCircuitClosed,
  noteAuthFailure,
  noteAuthSuccess,
} from "./security/auth-circuit.js";
import { sanitizeProviderError } from "./security/errors.js";

export function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 45_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

export function rewriteTimeoutMs(): number {
  const n = Number(process.env.PROMPT_MCP_HTTP_TIMEOUT_MS || "45000");
  return Number.isFinite(n) && n > 0 ? n : 45_000;
}

export function enrichTimeoutMs(): number {
  const n = Number(process.env.PROMPT_MCP_ENRICH_TIMEOUT_MS || "4000");
  return Number.isFinite(n) && n > 0 ? n : 4_000;
}

function maxRetries(): number {
  const n = Number(process.env.PROMPT_MCP_HTTP_RETRIES || "2");
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 5) : 2;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function retryableStatus(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

/**
 * Fetch with timeout + exponential backoff on 429/5xx and transient network errors.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  timeoutMs = 45_000,
): Promise<Response> {
  assertAuthCircuitClosed("Rewrite API");
  const retries = maxRetries();
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs);
      if (res.status === 401 || res.status === 403) {
        noteAuthFailure();
        return res; // do not retry auth failures
      }
      if (res.ok) noteAuthSuccess();
      if (!retryableStatus(res.status) || attempt === retries) {
        return res;
      }
      const backoff = Math.min(8000, 400 * 2 ** attempt);
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 15_000)
        : backoff;
      await sleep(wait);
    } catch (err) {
      lastErr = err;
      if (attempt === retries) throw err;
      await sleep(Math.min(8000, 400 * 2 ** attempt));
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("HTTP request failed after retries");
}

export async function readErrorBody(res: Response, label: string): Promise<never> {
  const bodyText = await res.text().catch(() => "");
  throw new Error(sanitizeProviderError(res.status, bodyText, label));
}
