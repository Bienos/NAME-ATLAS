/**
 * Builds `src/lib/display-metrics.ts` — the advance width of every character in
 * the pages' display face, so a surname can be fitted to one line on the server.
 *
 *   pnpm exec tsx apps/web/scripts/build-display-metrics.ts apps/web/assets/fonts/Fraunces-Medium.ttf
 *
 * Input: Fraunces Medium, Google's static instance at `opsz 72, wght 500`
 * (`assets/fonts/Fraunces-Medium.ttf`, committed for the share card; its
 * source URL is in that folder's README). The pages load Fraunces through
 * `next/font/google` with its optical-size axis, so a surname set at 56–96px
 * is drawn at an optical size near 72; the widths differ by a few percent at
 * most, which is what the page's sizing tolerates (it is capped and floored).
 * Its SHA-256 is written into the output (TASK-052, ADR-0021).
 *
 * Only three tables are read: `head` (units per em), `hhea` (how many advances
 * `hmtx` holds) and `cmap` (character → glyph, from the Unicode subtable,
 * format 12 when the font has one, else format 4). A glyph past the last
 * explicit advance takes the last one, which is what the OpenType spec says.
 * Nothing else about the font is interpreted: no kerning, no ligatures. A
 * surname's measured width is therefore an estimate within a few percent,
 * which is what the page's sizing needs (it is capped and floored), and no
 * figure is ever derived from it.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const outFile = "src/lib/display-metrics.ts";
const fontFile = process.argv[2];
if (!fontFile) {
  console.error("usage: build-display-metrics.ts <Fraunces-Medium.ttf>");
  process.exit(1);
}

const bytes = readFileSync(fontFile);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

function tables(): Map<string, number> {
  const count = view.getUint16(4);
  const found = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    const record = 12 + i * 16;
    const tag = String.fromCharCode(...bytes.subarray(record, record + 4));
    found.set(tag, view.getUint32(record + 8));
  }
  return found;
}

const table = tables();
function offsetOf(tag: string): number {
  const offset = table.get(tag);
  if (offset === undefined) throw new Error(`${fontFile} has no '${tag}' table`);
  return offset;
}

const unitsPerEm = view.getUint16(offsetOf("head") + 18);
const numberOfHMetrics = view.getUint16(offsetOf("hhea") + 34);
const hmtx = offsetOf("hmtx");
function advanceOf(glyph: number): number {
  return view.getUint16(hmtx + 4 * Math.min(glyph, numberOfHMetrics - 1));
}

/** Character → glyph from the best Unicode subtable. */
function characterMap(): Map<number, number> {
  const cmap = offsetOf("cmap");
  const count = view.getUint16(cmap + 2);
  let format4: number | null = null;
  let format12: number | null = null;
  for (let i = 0; i < count; i++) {
    const record = cmap + 4 + i * 8;
    const platform = view.getUint16(record);
    const encoding = view.getUint16(record + 2);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    const subtable = cmap + view.getUint32(record + 4);
    const format = view.getUint16(subtable);
    if (format === 12) format12 = subtable;
    if (format === 4) format4 = subtable;
  }
  const map = new Map<number, number>();
  if (format12 !== null) {
    const groups = view.getUint32(format12 + 12);
    for (let g = 0; g < groups; g++) {
      const group = format12 + 16 + g * 12;
      const start = view.getUint32(group);
      const end = view.getUint32(group + 4);
      const glyph = view.getUint32(group + 8);
      for (let c = start; c <= end; c++) map.set(c, glyph + (c - start));
    }
    return map;
  }
  if (format4 === null) throw new Error(`${fontFile} has no Unicode cmap subtable`);
  const segments = view.getUint16(format4 + 6) / 2;
  const ends = format4 + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const ranges = deltas + segments * 2;
  for (let s = 0; s < segments; s++) {
    const end = view.getUint16(ends + s * 2);
    const start = view.getUint16(starts + s * 2);
    const delta = view.getInt16(deltas + s * 2);
    const rangeAt = ranges + s * 2;
    const range = view.getUint16(rangeAt);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph: number;
      if (range === 0) {
        glyph = (c + delta) & 0xffff;
      } else {
        const raw = view.getUint16(rangeAt + range + (c - start) * 2);
        glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
      }
      if (glyph !== 0) map.set(c, glyph);
    }
  }
  return map;
}

const advances = [...characterMap().entries()]
  .map(([codePoint, glyph]) => [codePoint, advanceOf(glyph)] as const)
  .sort((a, b) => a[0] - b[0]);

const lines = advances.map(([codePoint, advance]) => `  ${String(codePoint)}: ${String(advance)},`);
const output = `// GENERATED by apps/web/scripts/build-display-metrics.ts — do not edit by hand.
//
// Source: Fraunces Medium, the static instance at opsz 72, wght 500
// (apps/web/assets/fonts/Fraunces-Medium.ttf; see the script's header).
// Source file SHA-256: ${sha256}

export const DISPLAY_FONT_SHA256 =
  "${sha256}";

/** The display face's units per em. */
export const DISPLAY_UNITS_PER_EM = ${String(unitsPerEm)};

/** Advance width in font units, by Unicode code point, for every character the face maps. */
export const DISPLAY_ADVANCES: Readonly<Record<number, number>> = {
${lines.join("\n")}
};
`;

writeFileSync(path.join(appRoot, outFile), output);
console.log(
  `${outFile}: ${String(advances.length)} characters, ${String(unitsPerEm)} units per em, ${sha256}`,
);
