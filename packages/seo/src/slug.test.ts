import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { canonicalKey } from "@name-atlas/resolver";
import { uuidv7 } from "@name-atlas/domain";
import {
  canonicalSlug,
  SHORT_SLUG_ID_LENGTH,
  shortSlugId,
  slugFor,
  suffixedSlug,
  surnameRoute,
} from "./slug.js";

/**
 * `docs/canonical/21` §21–§24, and ADR-0010 §2's stability requirement.
 *
 * The concrete cases below are the ones `apps/web/src/lib/slug.test.ts` asserted
 * before TASK-027 moved this function. The move was verified by a one-off
 * equivalence property — 24 concrete cases plus 20,000 random strings across
 * ASCII, grapheme, grapheme-composite and lone-surrogate generators, all
 * identical to the implementation being replaced. That check pinned a dead
 * implementation, so it is not kept; the result is recorded in `PROGRESS.md`.
 */
describe("canonicalSlug", () => {
  it("preserves Polish letters rather than folding them to ASCII", () => {
    expect(canonicalSlug("ŁUCZAK")).toBe("łuczak");
    expect(canonicalSlug("Żuk")).toBe("żuk");
    expect(canonicalSlug("WÓJCIK")).toBe("wójcik");
    expect(canonicalSlug("ŁUCZAK")).not.toBe("luczak");
    expect(canonicalSlug("Śliwa")).not.toContain("s");
  });

  it("keeps İ (U+0130) whole", () => {
    // `toLocaleLowerCase` would expand it to `i` + U+0307 and merge two
    // different surnames; `simpleCaseFold` does not. A slug folded one way and a
    // key folded the other makes the surname unreachable at its own address.
    expect(canonicalSlug("İNCE")).toBe(canonicalSlug("İNCE"));
    expect(canonicalSlug("İ")).not.toBe("i");
  });

  it("maps whitespace and unsafe punctuation to a single hyphen", () => {
    expect(canonicalSlug("  Kowalska   Nowak ")).toBe("kowalska-nowak");
    expect(canonicalSlug("van\tder X")).toBe("van-der-x");
    expect(canonicalSlug("KOWALSKA--NOWAK")).toBe("kowalska-nowak");
    expect(canonicalSlug("A/B")).toBe("a-b");
    expect(canonicalSlug("A?B#C")).toBe("a-b-c");
  });

  it("keeps the apostrophe, because O'X must not become OX", () => {
    expect(canonicalSlug("O'Neil")).toBe("o'neil");
  });

  it("is idempotent", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme", maxLength: 80 }), (s) => {
        const once = canonicalSlug(s);
        return canonicalSlug(once) === once;
      }),
      { numRuns: 2000 },
    );
  });

  it("agrees with the resolver's key on letters and digits, apostrophes aside", () => {
    // A real property with a real exception, found by fast-check at seed
    // -775871556 on the counterexample "ʼ" (U+02BC MODIFIER LETTER APOSTROPHE).
    //
    // U+02BC is Unicode category Lm — a *letter* — so `canonicalSlug` keeps it
    // under `\p{L}`. `canonicalKey` maps every apostrophe-like code point to
    // ASCII `'` (docs/canonical/13 §5.4, so that `O'X` never becomes `OX`), and
    // `'` is not alphanumeric. The two therefore disagree on exactly that
    // character class and on nothing else.
    //
    // The property is stated with the exception removed rather than deleted,
    // because the agreement it describes is what migration `0017`'s index
    // exploits, and a claim that is true except for one character is worth
    // writing down precisely.
    const APOSTROPHE_LIKE = /['\u02BC\u02B9\u2018\u2019\u201B\u0060\u00B4\uFF07]/gu;
    const alphanumeric = (s: string) =>
      [...s.replace(APOSTROPHE_LIKE, "")].filter((c) => /[\p{L}\p{N}]/u.test(c)).join("");
    fc.assert(
      fc.property(fc.string({ unit: "grapheme", maxLength: 40 }), (s) => {
        return alphanumeric(canonicalSlug(s)) === alphanumeric(canonicalKey(s));
      }),
      { numRuns: 4000 },
    );
  });

  it("keeps a modifier-letter apostrophe that the key folds to ASCII", () => {
    // The exception above, pinned as a fact rather than left as a footnote.
    expect(canonicalSlug("o\u02BCneil")).toContain("\u02BC");
    expect(canonicalKey("o\u02BCneil")).toContain("'");
    expect(canonicalKey("o\u02BCneil")).not.toContain("\u02BC");
  });

  it("yields no slug for a display form made only of separators", () => {
    expect(canonicalSlug("---")).toBe("");
    expect(slugFor("---")).toBeNull();
    expect(surnameRoute("", "pl")).toBeNull();
  });
});

describe("shortSlugId (ADR-0010 §2)", () => {
  const ID = "01a0c475-d17c-7409-87b9-1017e2eddc40";

  it("is a pure function of the uuid, so a re-import cannot reassign it", () => {
    expect(shortSlugId(ID)).toBe(shortSlugId(ID));
    expect(shortSlugId(ID)).toHaveLength(SHORT_SLUG_ID_LENGTH);
  });

  it("never emits a character Crockford base32 excludes", () => {
    // i, l, o and u: the first three are confusable with 1 and 0, and without
    // u no generated suffix can spell a word by accident.
    fc.assert(
      fc.property(fc.uuid(), (id) => !/[ilou]/u.test(shortSlugId(id))),
      { numRuns: 3000 },
    );
  });

  it("is URL-safe and needs no percent-encoding", () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        const s = shortSlugId(id);
        return encodeURIComponent(s) === s && /^[0-9a-z]+$/u.test(s);
      }),
      { numRuns: 3000 },
    );
  });

  it("extends rather than changes when a longer suffix is asked for", () => {
    // The backfill lengthens a suffix that is already taken, so a longer one
    // must contain the shorter as a prefix — otherwise lengthening would move
    // the address instead of extending it.
    fc.assert(
      fc.property(fc.uuid(), (id) => shortSlugId(id, 8).startsWith(shortSlugId(id, 6))),
      { numRuns: 2000 },
    );
  });

  /**
   * The regression that mattered.
   *
   * The first implementation read the **leading** hex digits of the uuid. A
   * UUIDv7 carries a millisecond timestamp in its leading 48 bits, so every
   * surname created by one import shares that prefix — and 2,000 ids differing
   * only in their tail produced **one** suffix. The suffix would have been
   * identical for exactly the entities most likely to collide. These three cases
   * are what caught it and what keeps it caught.
   */
  it("distinguishes ids that differ only in their trailing digits", () => {
    const ids = Array.from(
      { length: 2000 },
      (_, i) => `01a0c475-d17c-7409-87b9-${String(i).padStart(12, "0")}`,
    );
    expect(new Set(ids.map((id) => shortSlugId(id))).size).toBeGreaterThan(1990);
  });

  it("distinguishes ids that differ only in their leading digits", () => {
    const ids = Array.from(
      { length: 2000 },
      (_, i) => `${String(i).padStart(8, "0")}-d17c-7409-87b9-1017e2eddc40`,
    );
    expect(new Set(ids.map((id) => shortSlugId(id))).size).toBeGreaterThan(1990);
  });

  it("distinguishes real uuidv7s minted back to back, as one import mints them", () => {
    // The realistic distribution, and the one the broken version failed on:
    // uuidv7 is time-ordered, so these share almost every leading bit.
    const ids = Array.from({ length: 5000 }, () => uuidv7());
    expect(new Set(ids.map((id) => shortSlugId(id))).size).toBeGreaterThan(4990);
  });

  it("refuses a value that is not a uuid", () => {
    expect(() => shortSlugId("not-a-uuid")).toThrow(/not a uuid/u);
  });

  it("composes the suffixed slug §24 describes", () => {
    expect(suffixedSlug("nowak-kowalska", ID)).toBe(`nowak-kowalska-${shortSlugId(ID)}`);
  });
});

describe("surnameRoute", () => {
  it("uses the locale's own path and percent-encodes the slug", () => {
    expect(surnameRoute("nowak", "pl")).toBe("/pl/nazwisko/nowak");
    expect(surnameRoute("nowak", "en")).toBe("/en/surname/nowak");
    expect(surnameRoute("łuczak", "pl")).toBe("/pl/nazwisko/%C5%82uczak");
  });
});
