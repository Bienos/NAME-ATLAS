import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MAP_BANDS, TOKENS, TYPE_FAMILIES } from "./design-tokens.js";
import { FONT_FILES } from "./og-card.js";
import { MAP_CLASS_COUNT } from "./voivodeship-map-scale.js";

/**
 * TASK-034: `design-tokens.ts` is the one set of tokens. The stylesheet cannot
 * import it, so these tests hold `globals.css` to it. Each test names the
 * drift it catches.
 */

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS = readFileSync(path.join(SRC, "app", "globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//gu,
  "",
);

/** Every source file of the app, tests excluded. */
function sourceFiles(dir: string = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.tsx?$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name) ? [file] : [];
  });
}

/** The custom properties of the stylesheet's `:root` block, by name. */
function rootTokens(): Record<string, string> {
  const start = CSS.indexOf(":root {");
  const block = CSS.slice(start, CSS.indexOf("}", start));
  return Object.fromEntries(
    [...block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gu)].map((match) => [
      match[1],
      (match[2] ?? "").trim(),
    ]),
  );
}

describe("one set of design tokens (TASK-034)", () => {
  it("globals.css declares one :root block, with exactly the token set — no name or value differs", () => {
    expect(CSS.split(":root {").length - 1).toBe(1);
    expect(rootTokens()).toEqual({ ...TOKENS });
  });

  it("styles each map band once on the map and once on the compare bars, and no other", () => {
    const expected = MAP_BANDS.map((band, index) => [String(index), band]);
    const onMap = [...CSS.matchAll(/\.vmap-b(\d+)\s*\{\s*fill:\s*var\(--([a-z0-9-]+)\);\s*\}/gu)];
    const onBars = [
      ...CSS.matchAll(
        /\.rb-fill\[data-band="(\d+)"\]\s*\{\s*background:\s*var\(--([a-z0-9-]+)\);\s*\}/gu,
      ),
    ];
    expect(onMap.map((match) => [match[1], match[2]])).toEqual(expected);
    expect(onBars.map((match) => [match[1], match[2]])).toEqual(expected);
    expect(CSS.match(/\.vmap-b\d+/gu)?.length).toBe(MAP_BANDS.length);
    expect(CSS.match(/data-band="\d+"/gu)?.length).toBe(MAP_BANDS.length);
    expect(MAP_CLASS_COUNT).toBe(MAP_BANDS.length);
  });

  it("no TypeScript in the web app writes a colour by hand", () => {
    const hex = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/u;
    const offenders = sourceFiles()
      .filter((file) => path.basename(file) !== "design-tokens.ts")
      .filter((file) => hex.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC, file));
    expect(offenders).toEqual([]);
  });

  it("the share card loads its fonts under the three type families", () => {
    expect(new Set(FONT_FILES.map((font) => font.name))).toEqual(
      new Set(Object.values(TYPE_FAMILIES)),
    );
  });

  it("the page sets the same three families with next/font", () => {
    const layout = readFileSync(path.join(SRC, "app", "layout.tsx"), "utf8");
    const imported = /import \{([^}]*)\} from "next\/font\/google"/u.exec(layout)?.[1] ?? "";
    // next/font/google names each family with its spaces as underscores.
    expect(new Set(imported.split(",").map((name) => name.trim().replaceAll("_", " ")))).toEqual(
      new Set(Object.values(TYPE_FAMILIES)),
    );
  });
});
