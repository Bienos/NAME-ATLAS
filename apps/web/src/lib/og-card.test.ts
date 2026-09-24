import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FONT_FILES, graphemeCount, surnameSize } from "./og-card.js";

/** The share card's surname sizing (Visual System v1 §6.3). */
describe("graphemeCount", () => {
  it("counts a Polish letter once, precomposed or combining", () => {
    expect(graphemeCount("ŁUCZAK")).toBe(6);
    expect(graphemeCount("ĹUCZAK")).toBe(6);
  });
});

describe("surnameSize", () => {
  it("keeps a short surname at full size", () => {
    expect(surnameSize("Nowak")).toBe(144);
    expect(surnameSize("NOWAK")).toBe(144);
  });

  it("steps down as the surname gets longer", () => {
    const sizes = ["NOWAK", "WIŚNIEWSKA", "KOWALCZYK-ŁUCZAK", "BRZĘCZYSZCZYKIEWICZOWA"].map(
      surnameSize,
    );
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]!);
  });

  it("sets upper case smaller than the same name in mixed case", () => {
    expect(surnameSize("KOWALCZYK-ŁUCZAK")).toBeLessThan(surnameSize("Kowalczyk-Łuczak"));
  });

  it("never goes below 56px, however long the name", () => {
    expect(surnameSize("X".repeat(80))).toBe(56);
  });
});

describe("the share card's fonts", () => {
  it("are all committed, as TrueType, so a deployed card never falls back to Geist", () => {
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../assets/fonts");
    for (const font of FONT_FILES) {
      const bytes = readFileSync(path.join(dir, font.file));
      // sfnt version 1.0: a TrueType font, which next/og reads (WOFF2 it does not).
      expect(bytes.readUInt32BE(0)).toBe(0x00010000);
    }
  });
});
