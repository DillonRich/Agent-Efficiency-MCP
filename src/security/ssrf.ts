/**
 * Block SSRF-ish targets for URL enrichment (private / link-local / metadata).
 */
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

function isPrivateOrReservedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
    if (lower.startsWith("fe80")) return true; // link-local
    return false;
  }
  return false;
}

/**
 * Returns true if URL is http(s) and host looks publicly routable.
 * Does not do DNS resolution (avoids TOCTOU); hostname/IP string checks only.
 */
export function isSafePublicHttpUrl(raw: string): {
  ok: boolean;
  url?: string;
  reason?: string;
} {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid URL" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: `unsupported protocol ${url.protocol}` };
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) return { ok: false, reason: "empty host" };

  if (BLOCKED_HOSTS.has(host)) {
    return { ok: false, reason: "blocked host" };
  }
  if (host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "local/internal TLD" };
  }
  if (host === "0.0.0.0") {
    return { ok: false, reason: "blocked host" };
  }

  if (isIP(host) && isPrivateOrReservedIp(host)) {
    return { ok: false, reason: "private or reserved IP" };
  }

  // Hex/decimal IP tricks are rare; block obvious .localhost
  if (host.endsWith(".localhost")) {
    return { ok: false, reason: "blocked host" };
  }

  return { ok: true, url: url.toString() };
}
