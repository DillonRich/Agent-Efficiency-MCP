/**
 * Load workspace media as multimodal image parts for vision-capable rewriters.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveUnderWorkspace } from "./security/paths.js";

export interface VisionImage {
  path: string;
  mime: string;
  base64: string;
  bytes: number;
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function visionEnabled(): boolean {
  const v = (process.env.PROMPT_MCP_VISION || "1").toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}

function maxImages(): number {
  const n = Number(process.env.PROMPT_MCP_VISION_MAX || "3");
  return Number.isFinite(n) && n > 0 ? Math.min(n, 8) : 3;
}

function maxBytes(): number {
  const n = Number(process.env.PROMPT_MCP_VISION_MAX_BYTES || String(4 * 1024 * 1024));
  return Number.isFinite(n) && n > 0 ? n : 4 * 1024 * 1024;
}

export function loadVisionImages(
  workspaceRoot: string,
  mediaPaths: string[],
): { images: VisionImage[]; warnings: string[] } {
  const warnings: string[] = [];
  if (!visionEnabled()) {
    return { images: [], warnings: ["Vision disabled (PROMPT_MCP_VISION=0)."] };
  }
  if (mediaPaths.length === 0) return { images: [], warnings: [] };

  const images: VisionImage[] = [];
  const limit = maxImages();
  const byteCap = maxBytes();

  for (const raw of mediaPaths) {
    if (images.length >= limit) {
      warnings.push(
        `Vision image cap (${limit}) reached; remaining media listed by path only.`,
      );
      break;
    }
    const resolved = resolveUnderWorkspace(workspaceRoot, raw);
    if (resolved.outside) {
      warnings.push(`Vision skipped (outside workspace): ${raw}`);
      continue;
    }
    if (!resolved.exists || !fs.statSync(resolved.abs).isFile()) {
      warnings.push(`Vision skipped (missing file): ${resolved.relative}`);
      continue;
    }
    const ext = path.extname(resolved.abs).toLowerCase();
    const mime = MIME[ext];
    if (!mime) {
      warnings.push(
        `Vision skipped (unsupported type ${ext || "unknown"}): ${resolved.relative}`,
      );
      continue;
    }
    const st = fs.statSync(resolved.abs);
    if (st.size > byteCap) {
      warnings.push(
        `Vision skipped (file > ${byteCap} bytes): ${resolved.relative}`,
      );
      continue;
    }
    try {
      const buf = fs.readFileSync(resolved.abs);
      images.push({
        path: resolved.relative,
        mime,
        base64: buf.toString("base64"),
        bytes: buf.length,
      });
    } catch {
      warnings.push(`Vision skipped (read error): ${resolved.relative}`);
    }
  }

  return { images, warnings };
}

export function visionDataUrl(img: VisionImage): string {
  return `data:${img.mime};base64,${img.base64}`;
}
