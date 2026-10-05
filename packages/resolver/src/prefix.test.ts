import { describe, expect, it } from "vitest";
import {
  orderPrefixMatches,
  OTHER_SPELLING_RATIO,
  outranksTypedSpelling,
  PREFIX_CAP,
} from "./prefix.js";
import type { PrefixMatch } from "./prefix.js";

/**
 * The pure half of the prefix order (TASK-125). No database: the query hands
 * this each kind of match already most common first.
 *
 * Counts are each surname's larger national count on the 2026-01-20 register,
 * as `GET /api/v1/surname-results` on name-atlas.pl returned them on 2026-10-05.
 */

function m(display_name: string, count: number | null): PrefixMatch {
  return { surname_id: display_name, display_name, count };
}

const names = (matches: readonly PrefixMatch[]) => matches.map((x) => x.display_name);

describe("outranksTypedSpelling", () => {
  it("needs the other spelling to be at least the ratio times as common", () => {
    expect(OTHER_SPELLING_RATIO).toBe(5);
    expect(outranksTypedSpelling(500, 100)).toBe(true);
    expect(outranksTypedSpelling(499, 100)).toBe(false);
    expect(outranksTypedSpelling(100, 100)).toBe(false);
    expect(outranksTypedSpelling(100, 500)).toBe(false);
  });

  it("treats an absent count as unknown, never as zero", () => {
    expect(outranksTypedSpelling(1, null)).toBe(true);
    expect(outranksTypedSpelling(null, 1)).toBe(false);
    expect(outranksTypedSpelling(null, null)).toBe(false);
  });
});

describe("orderPrefixMatches", () => {
  it("puts WIŚNIEWSKA and WIŚNIEWSKI before the ASCII spellings for `wisniew`", () => {
    const typed = [m("WISNIEWSKI", 105), m("WISNIEWSKA", 86)];
    const folded = [m("WIŚNIEWSKA", 54_177), m("WIŚNIEWSKI", 53_079)];
    expect(names(orderPrefixMatches(typed, folded, PREFIX_CAP))).toEqual([
      "WIŚNIEWSKA",
      "WIŚNIEWSKI",
      "WISNIEWSKI",
      "WISNIEWSKA",
    ]);
  });

  it("puts DĄBROWA before DABROWA for `dabrowa`", () => {
    const typed = [m("DABROWA", 7)];
    const folded = [m("DĄBROWA", 1_211)];
    expect(names(orderPrefixMatches(typed, folded, PREFIX_CAP))).toEqual(["DĄBROWA", "DABROWA"]);
  });

  it("puts ŻMUDA, seven times as common, before ZMUDA", () => {
    const typed = [m("ZMUDA", 689)];
    const folded = [m("ŻMUDA", 4_828)];
    expect(names(orderPrefixMatches(typed, folded, PREFIX_CAP))).toEqual(["ŻMUDA", "ZMUDA"]);
  });

  it("keeps the ASCII spelling first where it is the more common one", () => {
    const typed = [m("ZMUDA TRZEBIATOWSKI", 248)];
    const folded = [m("ŻMUDA TRZEBIATOWSKI", 88)];
    expect(names(orderPrefixMatches(typed, folded, PREFIX_CAP))).toEqual([
      "ZMUDA TRZEBIATOWSKI",
      "ŻMUDA TRZEBIATOWSKI",
    ]);
  });

  it("keeps a spelling typed with diacritics ahead of its rarer ASCII form", () => {
    const typed = [m("WIŚNIEWSKA", 54_177), m("WIŚNIEWSKI", 53_079)];
    const folded = [m("WISNIEWSKI", 105)];
    expect(names(orderPrefixMatches(typed, folded, PREFIX_CAP))).toEqual([
      "WIŚNIEWSKA",
      "WIŚNIEWSKI",
      "WISNIEWSKI",
    ]);
  });

  it("keeps the typed spelling first when the other is less than the ratio times as common", () => {
    const typed = [m("TYPED", 100)];
    expect(names(orderPrefixMatches(typed, [m("FOLDED", 499)], PREFIX_CAP))).toEqual([
      "TYPED",
      "FOLDED",
    ]);
    expect(names(orderPrefixMatches(typed, [m("FOLDED", 500)], PREFIX_CAP))).toEqual([
      "FOLDED",
      "TYPED",
    ]);
  });

  it("puts a surname with no count after every surname with one", () => {
    const typed = [m("TYPED", null)];
    const folded = [m("FOLDED", 2), m("UNCOUNTED", null)];
    expect(names(orderPrefixMatches(typed, folded, PREFIX_CAP))).toEqual([
      "FOLDED",
      "TYPED",
      "UNCOUNTED",
    ]);
  });

  it("keeps each kind's own order and never returns more than the limit", () => {
    const typed = [m("T1", 30), m("T2", 20), m("T3", 10)];
    const folded = [m("F1", 120), m("F2", 60), m("F3", 1)];
    expect(names(orderPrefixMatches(typed, folded, 4))).toEqual(["T1", "F1", "T2", "F2"]);
    expect(orderPrefixMatches([], [], PREFIX_CAP)).toEqual([]);
  });
});
