import { describe, expect, it } from "vitest";
import { ListFactsInputError } from "./histogram.js";
import { buildListRows, compareCodePoints } from "./rows.js";

/** The keyed rows: exact identity and the selection order of ADR-0018 §2.1. */

describe("compareCodePoints", () => {
  it("orders by code point, where the UTF-16 order of `<` differs", () => {
    const fullwidth = "ａ"; // U+FF41 FULLWIDTH LATIN SMALL LETTER A
    const astral = "\u{1d41a}"; // U+1D41A MATHEMATICAL BOLD SMALL A, a surrogate pair
    expect(astral < fullwidth).toBe(true);
    expect(compareCodePoints(fullwidth, astral)).toBeLessThan(0);
    expect(compareCodePoints(astral, fullwidth)).toBeGreaterThan(0);
  });

  it("puts a prefix first and compares equal strings as equal", () => {
    expect(compareCodePoints("nowak", "nowakowski")).toBeLessThan(0);
    expect(compareCodePoints("nowak", "nowak")).toBe(0);
  });
});

describe("buildListRows", () => {
  it("keys each row with canonical_key_v2 and keeps the published string as read", () => {
    expect(buildListRows([{ surname: "ŻMUDA–TRZEBIATOWSKI", count: 2 }])).toEqual([
      { key: "żmuda-trzebiatowski", published: "ŻMUDA–TRZEBIATOWSKI", count: 2 },
    ]);
  });

  it("orders by count descending, a tie by key in code-point order, not the Polish alphabet", () => {
    const rows = buildListRows([
      { surname: "ĄB", count: 30 },
      { surname: "NOWAK", count: 50 },
      { surname: "BA", count: 30 },
      { surname: "AB", count: 30 },
    ]);
    // ą is U+0105, after b (U+0062): code-point order, whatever the alphabet says.
    expect(rows.map((r) => r.key)).toEqual(["nowak", "ab", "ba", "ąb"]);
  });

  it("keeps Ł and L apart: identity is exact, never a Polish fold", () => {
    const rows = buildListRows([
      { surname: "ŁUCZAK", count: 3 },
      { surname: "LUCZAK", count: 3 },
    ]);
    expect(rows.map((r) => r.key)).toEqual(["luczak", "łuczak"]);
  });

  it("refuses a list on which two rows share a key", () => {
    expect(() =>
      buildListRows([
        { surname: "NOWAK", count: 3 },
        { surname: "Nowak", count: 2 },
      ]),
    ).toThrow(ListFactsInputError);
    expect(() =>
      buildListRows([
        { surname: "A-B", count: 3 },
        { surname: "A–B", count: 2 },
      ]),
    ).toThrow(ListFactsInputError);
  });
});
