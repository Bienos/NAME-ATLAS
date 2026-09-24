import { describe, expect, it } from "vitest";
import { canonicalKey } from "@name-atlas/resolver";
import { canonicalSlug, pageSlug, surnamePath } from "./slug.js";

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

describe("pageSlug", () => {
  it("undoes the percent-encoding Next applies to a page's segment", () => {
    // What the page component is handed at `/pl/nazwisko/w%C3%B3jcik`.
    expect(pageSlug("w%C3%B3jcik")).toBe("wójcik");
    for (const display of ["WIŚNIEWSKA", "ŁUCZAK", "ŻUK", "KOWALSKA-NOWAK", "O'NEIL", "NOWAK"]) {
      const slug = canonicalSlug(display);
      expect(pageSlug(encodeURIComponent(slug))).toBe(slug);
    }
  });

  it("decodes once, so an encoded percent sign is still refused", () => {
    // Next decodes `/pl/nazwisko/a%2520b` to `a%20b` and hands the page
    // `a%2520b`. The lookup must see `a%20b`, which is not a canonical slug,
    // and never `a b`.
    expect(pageSlug("a%2520b")).toBe("a%20b");
    expect(canonicalSlug("a%20b")).not.toBe("a%20b");
  });

  it("takes a malformed escape as given instead of throwing", () => {
    expect(pageSlug("100%")).toBe("100%");
    expect(pageSlug("%E0%A4%A")).toBe("%E0%A4%A");
  });
});
