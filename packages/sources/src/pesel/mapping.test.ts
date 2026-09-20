import { describe, expect, it } from "vitest";
import { CANONICAL_KEY_VERSION, NORMALIZATION_VERSION, canonicalKey } from "@name-atlas/resolver";
import { mapPeselRow, mapPeselRows } from "./mapping.js";
import { PeselImportError } from "./errors.js";
import type { PeselSourceRow } from "../schema.js";

/**
 * TASK-004 §11 unit items 2, 3 and 4.
 *
 * Every expectation about a key is asserted against `canonicalKey` itself,
 * never against a hard-coded string: a copied expectation would keep passing
 * if the importer quietly grew a second normalisation.
 *
 * The edge-case strings below are REAL rows of the official resources, taken
 * from the committed fixtures (`docs/sources/pesel.md` "Unicode notes"). The
 * counts attached to them here are the real ones from those fixture lines.
 */
function row(surname: string, count: number): PeselSourceRow {
  return { surname, count };
}

describe("mapping one PESEL row", () => {
  it("derives the canonical key from the shared resolver function", () => {
    const mapped = mapPeselRow(row("KOWALSKI", 66589), 3);
    expect(mapped.canonicalKey).toBe(canonicalKey("KOWALSKI"));
    expect(mapped.searchKey).toBe(mapped.canonicalKey);
    expect(mapped.canonicalKeyVersion).toBe(CANONICAL_KEY_VERSION);
    expect(mapped.normalizationVersion).toBe(NORMALIZATION_VERSION);
  });

  it("keeps the source count exactly", () => {
    expect(mapPeselRow(row("AA", 2), 18).count).toBe(2);
    expect(mapPeselRow(row("NOWAK", 98387), 2).count).toBe(98387);
  });

  it("preserves a real trailing space in the surname", () => {
    // "SCHIED ,2" is a genuine data-quality artefact in the female resource.
    const mapped = mapPeselRow(row("SCHIED ", 2), 24);
    expect(mapped.raw).toBe("SCHIED ");
    expect(mapped.display).toBe("SCHIED ");
    expect(mapped.display.endsWith(" ")).toBe(true);
    // The key collapses it, which is exactly why display and key are separate.
    expect(mapped.canonicalKey).toBe(canonicalKey("SCHIED"));
  });

  it("preserves a standalone combining mark with no precomposed form", () => {
    // "DOG̈AN" — G followed by U+0308 COMBINING DIAERESIS. Must not be
    // repaired, re-mapped or dropped.
    const surname = `DOG${String.fromCodePoint(0x0308)}AN`;
    const mapped = mapPeselRow(row(surname, 5), 20);
    expect(mapped.display).toBe(surname.normalize("NFC"));
    expect([...mapped.display].length).toBe(6);
    expect(mapped.display).toContain(String.fromCodePoint(0x0308));
  });

  it("preserves an embedded forward slash", () => {
    // "A/GADIR" and "W/SILASSIE" are real values, not delimiter confusion.
    expect(mapPeselRow(row("W/SILASSIE", 3), 21).display).toBe("W/SILASSIE");
    expect(mapPeselRow(row("A/GADIR", 2), 17).display).toBe("A/GADIR");
  });

  it("preserves apostrophes and hyphens", () => {
    // Synthetic strings: the committed fixtures contain no such row, and
    // TASK-004 §12 rule 4 forbids adding a new genuine fixture.
    expect(mapPeselRow(row("O'BRIEN", 2), 2).display).toBe("O'BRIEN");
    expect(mapPeselRow(row("NOWAK-KOWALSKI", 2), 2).display).toBe("NOWAK-KOWALSKI");
  });

  it("preserves non-Latin and Latin-extended scripts", () => {
    expect(mapPeselRow(row("NGUYỄN", 3730), 22).display).toBe("NGUYỄN".normalize("NFC"));
    expect(mapPeselRow(row("MÜLLER", 1462), 23).display).toBe("MÜLLER".normalize("NFC"));
    expect(mapPeselRow(row("MÜLLER", 1462), 23).script).toBe("Latn");
    // Synthetic Cyrillic string, to show the script is detected, not assumed.
    expect(mapPeselRow(row("ИВАНОВ", 2), 2).script).toBe("Cyrl");
  });

  it("treats Polish diacritics as identity-bearing", () => {
    // AC-04 / ARCHITECTURE.md §10 invariant 8. Nothing folds a diacritic.
    const withDiacritic = mapPeselRow(row("Łuczak", 2), 2);
    const without = mapPeselRow(row("Luczak", 2), 3);
    expect(withDiacritic.canonicalKey).not.toBe(without.canonicalKey);
    expect(withDiacritic.display).toBe("Łuczak");
  });

  it("maps case-only variants onto one canonical key", () => {
    const upper = mapPeselRow(row("NOWAK", 2), 2);
    const mixed = mapPeselRow(row("Nowak", 2), 3);
    expect(upper.canonicalKey).toBe(mixed.canonicalKey);
    // The display forms stay different: identity is shared, spelling is not.
    expect(upper.display).not.toBe(mixed.display);
  });
});

describe("mapping a whole file", () => {
  it("numbers data rows from 2, because line 1 is the header", () => {
    const mapped = mapPeselRows([row("NOWAK", 98387), row("KOWALSKI", 66589)]);
    expect(mapped.map((entry) => entry.line)).toEqual([2, 3]);
  });

  it("preserves source order", () => {
    const mapped = mapPeselRows([row("NOWAK", 98387), row("AA", 2), row("MAZUR", 34576)]);
    expect(mapped.map((entry) => entry.raw)).toEqual(["NOWAK", "AA", "MAZUR"]);
  });

  it("is deterministic: the same rows always map to the same fields", () => {
    const rows = [row("WIŚNIEWSKI", 53079), row("SCHIED ", 2), row("NGUYỄN", 3730)];
    expect(mapPeselRows(rows)).toEqual(mapPeselRows(rows));
  });

  it("fails closed when one file contains the same canonical key twice", () => {
    // AC-19: schema drift, not data to reconcile. Two rows differing only in
    // case share a key, so within ONE resource that is a violation.
    let raised: unknown;
    try {
      mapPeselRows([row("NOWAK", 98387), row("Nowak", 12)]);
    } catch (error: unknown) {
      raised = error;
    }
    expect(raised).toBeInstanceOf(PeselImportError);
    expect((raised as PeselImportError).reasonCode).toBe("duplicate_canonical_key");
    expect((raised as PeselImportError).line).toBe(3);
    expect((raised as PeselImportError).message).toContain("line 2");
  });

  it("allows the same key in two different files", () => {
    // The male/female overlap. Each file maps cleanly on its own; reuse of one
    // surname across the two is the importer's job, not the mapper's.
    expect(mapPeselRows([row("NOWAK", 98387)])[0]?.canonicalKey).toBe(
      mapPeselRows([row("NOWAK", 99738)])[0]?.canonicalKey,
    );
  });
});
