import { describe, expect, it } from "vitest";
import { canonicalKey } from "@name-atlas/resolver";
import { canonicalSlug, surnamePath } from "./slug.js";

/** TASK-024 AC-1 — ADR-0009 / docs/canonical/21 §21–§23. Pure. */
describe("canonicalSlug", () => {
  it("preserves Polish letters and lowercases them", () => {
    expect(canonicalSlug("ŁUCZAK")).toBe("łuczak");
    expect(canonicalSlug("Żuk")).toBe("żuk");
    expect(canonicalSlug("WÓJCIK")).toBe("wójcik");
  });

  it("never ASCII-folds", () => {
    expect(canonicalSlug("ŁUCZAK")).not.toBe("luczak");
    expect(canonicalSlug("Śliwa")).not.toContain("s");
  });

  it("turns whitespace into a single hyphen and trims", () => {
    expect(canonicalSlug("  Kowalska   Nowak ")).toBe("kowalska-nowak");
    expect(canonicalSlug("van\tder X")).toBe("van-der-x");
  });

  it("keeps a hyphenated surname hyphenated, once", () => {
    expect(canonicalSlug("KOWALSKA-NOWAK")).toBe("kowalska-nowak");
    expect(canonicalSlug("KOWALSKA--NOWAK")).toBe("kowalska-nowak");
  });

  it("keeps the apostrophe, so O'X does not become OX", () => {
    expect(canonicalSlug("O'Neil")).toBe("o'neil");
  });

  it("maps URL-unsafe punctuation to a hyphen", () => {
    expect(canonicalSlug("A/B")).toBe("a-b");
    expect(canonicalSlug("A?B#C")).toBe("a-b-c");
  });

  it("is idempotent", () => {
    for (const s of ["ŁUCZAK", "Kowalska Nowak", "O'Neil", "van der X"]) {
      expect(canonicalSlug(canonicalSlug(s))).toBe(canonicalSlug(s));
    }
  });

  it("normalises to NFC first, so a decomposed input yields the same slug", () => {
    expect(canonicalSlug("Żuk")).toBe(canonicalSlug("Żuk"));
  });

  it("folds case exactly as the resolver does, so a slug and a key never disagree", () => {
    // `toLocaleLowerCase` expands İ (U+0130) into i + U+0307; `simpleCaseFold`
    // keeps it whole, because an expansion merges two different surnames
    // (ADR-0005). A slug folded one way and a key folded the other can never
    // match, and the surname is unreachable at its own address. Caught by
    // review 2026-09-21.
    const alphanumeric = (v: string): string => v.replace(/[^\p{L}\p{M}\p{N}]/gu, "");
    for (const display of ["İNCE", "ŁUCZAK", "WÓJCIK", "WEIẞ", "A/GADIR"]) {
      expect(alphanumeric(canonicalSlug(display))).toBe(alphanumeric(canonicalKey(display)));
    }
  });

  it("returns the empty string when every character maps to a separator", () => {
    for (const display of ["---", "...", "/", "   "]) {
      expect(canonicalSlug(display)).toBe("");
    }
  });
});

describe("surnamePath", () => {
  it("builds the locale-prefixed canonical path, percent-encoded", () => {
    expect(surnamePath("KOWALCZYK", "pl")).toBe("/pl/nazwisko/kowalczyk");
    expect(surnamePath("ŁUCZAK", "pl")).toBe("/pl/nazwisko/%C5%82uczak");
    expect(surnamePath("KOWALCZYK", "en")).toBe("/en/surname/kowalczyk");
  });

  it("returns null rather than an address with an empty segment", () => {
    // `/pl/nazwisko/` is not a surname's address; it is no address at all.
    for (const display of ["---", "/", "   "]) {
      expect(surnamePath(display, "pl")).toBeNull();
    }
  });
});
