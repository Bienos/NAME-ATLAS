import { describe, expect, it } from "vitest";
import { damerauLevenshtein, hasAdjacentTransposition } from "./distance.js";

/**
 * TASK-015 stage 9. Every string below is a real surname spelling or a single
 * mechanical edit of one; nothing is invented to make an assertion convenient.
 */

describe("damerauLevenshtein", () => {
  it("is zero for identical strings and symmetric", () => {
    expect(damerauLevenshtein("kowalski", "kowalski")).toBe(0);
    expect(damerauLevenshtein("nowak", "nowka")).toBe(damerauLevenshtein("nowka", "nowak"));
  });

  it("counts an adjacent transposition as one edit, not two", () => {
    // The whole reason this function exists rather than plain Levenshtein.
    expect(damerauLevenshtein("cichwoski", "cichowski")).toBe(1);
    expect(damerauLevenshtein("kowaslki", "kowalski")).toBe(1);
    expect(damerauLevenshtein("wójick", "wójcik")).toBe(1);
  });

  it("counts one insertion, deletion and substitution as one edit each", () => {
    expect(damerauLevenshtein("cichoski", "cichowski")).toBe(1);
    expect(damerauLevenshtein("kowalskii", "kowalski")).toBe(1);
    expect(damerauLevenshtein("kowalsxi", "kowalski")).toBe(1);
  });

  it("handles an empty string as the length of the other", () => {
    expect(damerauLevenshtein("", "nowak")).toBe(5);
    expect(damerauLevenshtein("nowak", "")).toBe(5);
    expect(damerauLevenshtein("", "")).toBe(0);
  });

  it("is the unrestricted variant, so a transposition beside another edit stays cheap", () => {
    // Optimal string alignment would charge 3 for this; Damerau's original
    // charges 2, and real typing produces exactly this shape.
    expect(damerauLevenshtein("ca", "abc")).toBe(2);
  });

  it("counts by code point, so a surname outside the BMP is not double-charged", () => {
    // "𝔎owalski" differs from "kowalski" in one character, not two code units.
    expect(damerauLevenshtein("\u{1D50E}owalski", "kowalski")).toBe(1);
  });

  it("treats a diacritic as one character, never as a free match", () => {
    // Identity-bearing: ŁUCZAK and LUCZAK are different surnames
    // (ARCHITECTURE.md §10 invariant 8), and the distance says so.
    expect(damerauLevenshtein("łuczak", "luczak")).toBe(1);
  });
});

describe("hasAdjacentTransposition", () => {
  it("detects exactly one adjacent swap", () => {
    expect(hasAdjacentTransposition("cichwoski", "cichowski")).toBe(true);
    expect(hasAdjacentTransposition("kowaslki", "kowalski")).toBe(true);
  });

  it("rejects a substitution, a deletion and an identical string", () => {
    expect(hasAdjacentTransposition("kowalsxi", "kowalski")).toBe(false);
    expect(hasAdjacentTransposition("cichoski", "cichowski")).toBe(false);
    expect(hasAdjacentTransposition("kowalski", "kowalski")).toBe(false);
  });

  it("rejects a non-adjacent swap, which is two edits and not a typing slip", () => {
    expect(hasAdjacentTransposition("iowalskn", "nowalski")).toBe(false);
  });

  it("rejects two separate adjacent swaps", () => {
    expect(hasAdjacentTransposition("ocwalksi", "kowalski")).toBe(false);
  });
});
