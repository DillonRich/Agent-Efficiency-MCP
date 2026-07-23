/**
 * Enrich forced media paths and research URLs for accurate blueprints.
 * Media: resolve absolute paths + existence (workspace-confined).
 * Search: optional lightweight title/snippet fetch with SSRF guards.
 */
import * as fs from "node:fs";
import type { DirectiveSet, SearchDirective } from "./directives.js";
import { enrichTimeoutMs, fetchWithTimeout } from "./http.js";
import { resolveUnderWorkspace } from "./security/paths.js";
import { isSafePublicHttpUrl } from "./security/ssrf.js";

export interface EnrichedMedia {
  path: string;
  abs: string;
  exists: boolean;
  bytes?: number;
  outside?: boolean;
}

export interface EnrichedSearch {
  target: string;
  note: string;
  title?: string;
  snippet?: string;
  fetchOk: boolean;
}

export interface EnrichmentResult {
  media: EnrichedMedia[];
  searches: EnrichedSearch[];
  warnings: string[];
}

function shouldFetchUrls(): boolean {
  const v = (process.env.PROMPT_MCP_FETCH_URLS || "1").toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}

function normalizeUrl(target: string): string | null {
  const t = target.trim();
  if (!t) return null;
  try {
    if (/^https?:\/\//i.test(t)) return new URL(t).toString();
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(t)) {
      return new URL(`https://${t}`).toString();
    }
  } catch {
    return null;
  }
  return null;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTitleSnippet(
  url: string,
): Promise<{ title?: string; snippet?: string; ok: boolean }> {
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent":
            "AgentEfficiencyMCP/1.4 (+local BYOK enrich; respectful fetch)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "manual",
      },
      enrichTimeoutMs(),
    );

    // Do not follow redirects to private IPs — only accept 2xx on original URL
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { ok: false };
      const abs = new URL(loc, url).toString();
      const safe = isSafePublicHttpUrl(abs);
      if (!safe.ok || !safe.url) return { ok: false };
      return fetchTitleSnippet(safe.url);
    }

    if (!res.ok) return { ok: false };
    const ctype = res.headers.get("content-type") || "";
    if (!/html|text|xml/i.test(ctype) && ctype) {
      return { ok: true, title: `(non-HTML: ${ctype})` };
    }
    const text = (await res.text()).slice(0, 80_000);
    const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? stripTags(titleMatch[1]).slice(0, 200) : undefined;
    const metaDesc = text.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    );
    const ogDesc = text.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    );
    const snippet = metaDesc
      ? stripTags(metaDesc[1]).slice(0, 280)
      : ogDesc
        ? stripTags(ogDesc[1]).slice(0, 280)
        : stripTags(text).slice(0, 280);
    return { ok: true, title, snippet };
  } catch {
    return { ok: false };
  }
}

export async function enrichDirectives(
  directives: DirectiveSet,
  workspaceRoot: string,
): Promise<EnrichmentResult> {
  const warnings: string[] = [];
  const media: EnrichedMedia[] = [];

  for (const rel of directives.media) {
    const resolved = resolveUnderWorkspace(workspaceRoot, rel);
    if (resolved.outside) {
      warnings.push(`Media path outside workspace (ignored): ${rel}`);
      media.push({
        path: rel.replace(/\\/g, "/"),
        abs: resolved.abs.replace(/\\/g, "/"),
        exists: false,
        outside: true,
      });
      continue;
    }
    const exists =
      resolved.exists &&
      fs.existsSync(resolved.abs) &&
      fs.statSync(resolved.abs).isFile();
    let bytes: number | undefined;
    if (exists) {
      try {
        bytes = fs.statSync(resolved.abs).size;
      } catch {
        /* ignore */
      }
    } else {
      warnings.push(`Media not found on disk: ${resolved.relative}`);
    }
    media.push({
      path: resolved.relative,
      abs: resolved.abs.replace(/\\/g, "/"),
      exists,
      bytes,
    });
  }

  const searches: EnrichedSearch[] = [];
  const doFetch = shouldFetchUrls();

  for (const s of directives.searches) {
    const entry: EnrichedSearch = {
      target: s.target,
      note: s.note,
      fetchOk: false,
    };
    if (doFetch) {
      const url = normalizeUrl(s.target);
      if (url) {
        const safe = isSafePublicHttpUrl(url);
        if (!safe.ok || !safe.url) {
          warnings.push(
            `URL enrich blocked (${safe.reason || "unsafe"}): ${s.target}`,
          );
        } else {
          const meta = await fetchTitleSnippet(safe.url);
          entry.fetchOk = meta.ok;
          entry.title = meta.title;
          entry.snippet = meta.snippet;
          if (!meta.ok) {
            warnings.push(
              `Could not enrich URL (timeout/blocked): ${s.target}`,
            );
          }
        }
      } else {
        warnings.push(`Research target is not a fetchable URL: ${s.target}`);
      }
    }
    searches.push(entry);
  }

  return { media, searches, warnings };
}

/** Build rewrite-facing block so the model sees enriched media/search */
export function buildEnrichmentPayload(enrichment: EnrichmentResult): string {
  const parts: string[] = [];
  if (enrichment.media.length) {
    parts.push(
      "Forced Media (MUST list under Media / reference assets; IDE agent opens after GO):",
    );
    for (const m of enrichment.media) {
      if (m.outside) continue;
      parts.push(
        `- path=${m.path} abs=${m.abs} exists=${m.exists}${m.bytes != null ? ` bytes=${m.bytes}` : ""}`,
      );
    }
  }
  if (enrichment.searches.length) {
    parts.push(
      "Forced Research URLs (MUST list under Research / web references; IDE agent browses after GO):",
    );
    for (const s of enrichment.searches) {
      parts.push(
        `- url=${s.target}${s.note ? ` note=${s.note}` : ""}${s.title ? ` title=${s.title}` : ""}${s.snippet ? ` snippet=${s.snippet}` : ""}`,
      );
    }
  }
  return parts.length ? parts.join("\n") : "";
}

export type { SearchDirective };
