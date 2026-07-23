/**
 * Offline demo GIF: install → messy prompt → freeze → GO.
 * Pure Node GIF89a writer (no native deps). Output: docs/assets/demo.gif
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "docs", "assets", "demo.gif");

const W = 640;
const H = 360;
const DELAY = 120; // centiseconds

// 5x7 bitmap font (A-Z, 0-9, space, and a few symbols)
const FONT = {
  " ": [0, 0, 0, 0, 0],
  "-": [0, 0, 0x1f, 0, 0],
  ".": [0, 0, 0, 0, 0x4],
  "/": [0x2, 0x4, 0x8, 0x10, 0x20],
  ":": [0, 0x4, 0, 0x4, 0],
  ">": [0x8, 0x4, 0x2, 0x4, 0x8],
  "@": [0xe, 0x11, 0x15, 0x15, 0xe],
  "[": [0xe, 0x8, 0x8, 0x8, 0xe],
  "]": [0xe, 0x2, 0x2, 0x2, 0xe],
  "_": [0, 0, 0, 0, 0x1f],
  "0": [0xe, 0x11, 0x13, 0x15, 0xe],
  "1": [0x4, 0xc, 0x4, 0x4, 0xe],
  "2": [0xe, 0x1, 0xe, 0x10, 0x1f],
  "3": [0x1e, 0x1, 0xe, 0x1, 0x1e],
  "4": [0x12, 0x12, 0x1f, 0x2, 0x2],
  "5": [0x1f, 0x10, 0x1e, 0x1, 0x1e],
  "6": [0xe, 0x10, 0x1e, 0x11, 0xe],
  "7": [0x1f, 0x1, 0x2, 0x4, 0x8],
  "8": [0xe, 0x11, 0xe, 0x11, 0xe],
  "9": [0xe, 0x11, 0xf, 0x1, 0xe],
  A: [0xe, 0x11, 0x1f, 0x11, 0x11],
  B: [0x1e, 0x11, 0x1e, 0x11, 0x1e],
  C: [0xe, 0x11, 0x10, 0x11, 0xe],
  D: [0x1e, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x1e, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x1e, 0x10, 0x10],
  G: [0xe, 0x10, 0x13, 0x11, 0xe],
  H: [0x11, 0x11, 0x1f, 0x11, 0x11],
  I: [0xe, 0x4, 0x4, 0x4, 0xe],
  J: [0x1, 0x1, 0x1, 0x11, 0xe],
  K: [0x11, 0x12, 0x1c, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11],
  O: [0xe, 0x11, 0x11, 0x11, 0xe],
  P: [0x1e, 0x11, 0x1e, 0x10, 0x10],
  Q: [0xe, 0x11, 0x15, 0x12, 0xd],
  R: [0x1e, 0x11, 0x1e, 0x12, 0x11],
  S: [0xf, 0x10, 0xe, 0x1, 0x1e],
  T: [0x1f, 0x4, 0x4, 0x4, 0x4],
  U: [0x11, 0x11, 0x11, 0x11, 0xe],
  V: [0x11, 0x11, 0x11, 0xa, 0x4],
  W: [0x11, 0x11, 0x15, 0x1b, 0x11],
  X: [0x11, 0xa, 0x4, 0xa, 0x11],
  Y: [0x11, 0xa, 0x4, 0x4, 0x4],
  Z: [0x1f, 0x2, 0x4, 0x8, 0x1f],
};

const PAL = [
  [18, 22, 28], // bg
  [232, 236, 242], // text
  [62, 180, 137], // accent green
  [240, 180, 70], // amber
  [90, 110, 140], // muted
];

function idx(r, g, b) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < PAL.length; i++) {
    const d =
      (r - PAL[i][0]) ** 2 + (g - PAL[i][1]) ** 2 + (b - PAL[i][2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function makeFrame(draw) {
  const px = new Uint8Array(W * H);
  px.fill(0);
  const api = {
    fill(x, y, w, h, c) {
      for (let yy = y; yy < y + h && yy < H; yy++) {
        if (yy < 0) continue;
        for (let xx = x; xx < x + w && xx < W; xx++) {
          if (xx < 0) continue;
          px[yy * W + xx] = c;
        }
      }
    },
    text(x, y, str, c = 1, scale = 2) {
      let cx = x;
      for (const ch of str.toUpperCase()) {
        const glyph = FONT[ch] || FONT[" "];
        for (let col = 0; col < 5; col++) {
          const bits = glyph[col] || 0;
          for (let row = 0; row < 7; row++) {
            if (bits & (1 << row)) {
              api.fill(cx + col * scale, y + row * scale, scale, scale, c);
            }
          }
        }
        cx += 6 * scale;
      }
    },
    lines(x, y, arr, c = 1, scale = 2, gap = 18) {
      arr.forEach((line, i) => api.text(x, y + i * gap, line, c, scale));
    },
  };
  draw(api);
  return px;
}

function lzwEncode(indexStream, minCodeSize) {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoi + 1;
  const dict = new Map();
  const resetDict = () => {
    dict.clear();
    for (let i = 0; i < clear; i++) dict.set(String.fromCharCode(i), i);
    codeSize = minCodeSize + 1;
    nextCode = eoi + 1;
  };
  resetDict();

  const out = [];
  let buf = 0;
  let bufBits = 0;
  const writeCode = (code) => {
    buf |= code << bufBits;
    bufBits += codeSize;
    while (bufBits >= 8) {
      out.push(buf & 0xff);
      buf >>= 8;
      bufBits -= 8;
    }
  };

  writeCode(clear);
  let w = String.fromCharCode(indexStream[0]);
  for (let i = 1; i < indexStream.length; i++) {
    const k = String.fromCharCode(indexStream[i]);
    const wk = w + k;
    if (dict.has(wk)) {
      w = wk;
    } else {
      writeCode(dict.get(w));
      if (nextCode < 4096) {
        dict.set(wk, nextCode++);
        if (nextCode === 1 << codeSize && codeSize < 12) codeSize++;
      } else {
        writeCode(clear);
        resetDict();
      }
      w = k;
    }
  }
  writeCode(dict.get(w));
  writeCode(eoi);
  if (bufBits > 0) out.push(buf & 0xff);
  return Uint8Array.from(out);
}

function packSubBlocks(data) {
  const chunks = [];
  for (let i = 0; i < data.length; i += 255) {
    const slice = data.subarray(i, Math.min(i + 255, data.length));
    chunks.push(Uint8Array.of(slice.length), slice);
  }
  chunks.push(Uint8Array.of(0));
  return Buffer.concat(chunks);
}

function buildGif(frames) {
  const parts = [];
  parts.push(Buffer.from("GIF89a"));
  const hdr = Buffer.alloc(7);
  hdr.writeUInt16LE(W, 0);
  hdr.writeUInt16LE(H, 2);
  hdr[4] = 0x80 | 0x70 | (Math.ceil(Math.log2(PAL.length)) - 1); // GCT
  hdr[5] = 0;
  hdr[6] = 0;
  parts.push(hdr);
  const gct = Buffer.alloc(PAL.length * 3);
  for (let i = 0; i < PAL.length; i++) {
    gct[i * 3] = PAL[i][0];
    gct[i * 3 + 1] = PAL[i][1];
    gct[i * 3 + 2] = PAL[i][2];
  }
  // pad to power of 2
  const gctSize = 1 << (1 + (hdr[4] & 0x07));
  const gctPad = Buffer.alloc(Math.max(0, gctSize * 3 - gct.length));
  parts.push(gct, gctPad);

  // Netscape loop
  parts.push(Buffer.from([0x21, 0xff, 0x0b]));
  parts.push(Buffer.from("NETSCAPE2.0"));
  parts.push(Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]));

  const minCode = 2; // palette size small
  for (const frame of frames) {
    const gce = Buffer.alloc(8);
    gce[0] = 0x21;
    gce[1] = 0xf9;
    gce[2] = 0x04;
    gce[3] = 0x00;
    gce.writeUInt16LE(frame.delay, 4);
    gce[6] = 0;
    gce[7] = 0;
    parts.push(gce);

    const img = Buffer.alloc(10);
    img[0] = 0x2c;
    img.writeUInt16LE(0, 1);
    img.writeUInt16LE(0, 3);
    img.writeUInt16LE(W, 5);
    img.writeUInt16LE(H, 7);
    img[9] = 0;
    parts.push(img);

    const encoded = lzwEncode(frame.pixels, minCode);
    parts.push(Buffer.from([minCode]));
    parts.push(packSubBlocks(encoded));
  }
  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}

const scenes = [
  {
    delay: DELAY,
    draw: (g) => {
      g.fill(0, 0, W, 40, 2);
      g.text(16, 12, "AGENT EFFICIENCY MCP", 0, 2);
      g.text(24, 70, "1. NPX INIT", 2, 3);
      g.lines(24, 120, [
        "> NPX AGENT-EFFICIENCY-MCP INIT",
        "> --PROJECT ./DEMO-APP",
        "",
        "WROTE AGENT_EFFICIENCY_MCP.MD",
        "RULES + MCP REGISTERED",
      ], 1, 2);
    },
  },
  {
    delay: DELAY,
    draw: (g) => {
      g.fill(0, 0, W, 40, 2);
      g.text(16, 12, "AGENT EFFICIENCY MCP", 0, 2);
      g.text(24, 70, "2. MESSY PROMPT", 3, 3);
      g.lines(24, 120, [
        "@PROMPTMCP:INCLUDE",
        "@PROMPTMCP:FILE[SRC/APP.TS]",
        "HEY MAKE LOGIN NICER AND",
        "LOOK AT STRIPE CHECKOUT",
      ], 1, 2);
    },
  },
  {
    delay: DELAY,
    draw: (g) => {
      g.fill(0, 0, W, 40, 2);
      g.text(16, 12, "AGENT EFFICIENCY MCP", 0, 2);
      g.text(24, 70, "3. FREEZE", 3, 3);
      g.lines(24, 120, [
        "TOOL: OPTIMIZE_AND_BLUEPRINT",
        "BLUEPRINT WRITTEN",
        "",
        "AWAITING APPROVAL",
        "TYPE GO TO PROCEED",
      ], 1, 2);
      g.fill(24, 280, 200, 28, 3);
      g.text(36, 286, "HARD CHECKPOINT", 0, 2);
    },
  },
  {
    delay: DELAY,
    draw: (g) => {
      g.fill(0, 0, W, 40, 2);
      g.text(16, 12, "AGENT EFFICIENCY MCP", 0, 2);
      g.text(24, 70, "4. REVIEW HUD", 2, 3);
      g.lines(24, 120, [
        "ABSOLUTE OBJECTIVE:",
        "POLISH LOGIN UI + HOOK",
        "STRIPE CHECKOUT PATHS",
        "",
        "VECTORS: SRC/APP.TS",
        "NON-GOALS: FULL REDESIGN",
      ], 1, 2);
    },
  },
  {
    delay: DELAY + 40,
    draw: (g) => {
      g.fill(0, 0, W, 40, 2);
      g.text(16, 12, "AGENT EFFICIENCY MCP", 0, 2);
      g.text(24, 70, "5. GO", 2, 3);
      g.lines(24, 120, [
        "USER: GO",
        "",
        "AGENT EXECUTES BLUEPRINT",
        "OPENS MEDIA / RESEARCH",
        "EDITS TARGETED VECTORS",
        "",
        "CONTROLLED. APPROVED.",
      ], 1, 2);
    },
  },
];

const frames = scenes.map((s) => ({
  delay: s.delay,
  pixels: makeFrame(s.draw),
}));

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buildGif(frames));
console.log(`Wrote ${outPath} (${frames.length} frames, ${W}x${H})`);
