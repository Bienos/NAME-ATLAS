import { describe, expect, it } from "vitest";
import { formatInteger } from "./messages.js";
import {
  babyCompareFigures,
  babyCompareModel,
  babyComparePath,
  parseBabyCompareQuery,
} from "./baby-names-compare-facts.js";
import { JULIA_STOCK, julia } from "./baby-names-compare-test-fixtures.js";
import {
  NO_STOCK,
  ZOFIA_STOCK,
  year,
  zofia,
  zofiaGirls,
} from "./baby-names-share-test-fixtures.js";

/**
 * TASK-156 AC-1: the comparison's view model from two names' page facts,
 * pure. ZOFIA's girls' fixtures are TASK-152's; JULIA's
 * (`baby-names-compare-test-fixtures.ts`) are built from the same helpers.
 */

const n = (v: number, lang: "pl" | "en" = "pl") => formatInteger(v, lang);

function model(lang: "pl" | "en" = "pl") {
  const a = babyCompareFigures(zofia(true), "FEMALE");
  const b = babyCompareFigures(julia(), "FEMALE");
  if (a === null || b === null) throw new Error("fixtures");
  return babyCompareModel({
    lang,
    sex: "FEMALE",
    a: { name: "ZOFIA", figures: a, stock: ZOFIA_STOCK },
    b: { name: "JULIA", figures: b, stock: JULIA_STOCK },
  });
}

describe("the query and the address", () => {
  it("reads a, b and the sex; the sex is null when the query does not say", () => {
    expect(parseBabyCompareQuery({ a: " Zofia ", b: ["Julia", "x"], sex: "girls" })).toEqual({
      a: "Zofia",
      b: "Julia",
      sex: "FEMALE",
    });
    expect(parseBabyCompareQuery({ sex: "cats" })).toEqual({ a: "", b: "", sex: null });
  });

  it("writes the address with the names given, so the swap link carries a and the sex alone", () => {
    expect(babyComparePath("pl", { a: "ZOFIA", b: "JULIA", sex: "FEMALE" })).toBe(
      "/pl/imiona-dla-dziecka/porownaj?a=ZOFIA&b=JULIA&sex=girls",
    );
    expect(babyComparePath("en", { a: "ZOFIA", sex: "MALE" }, "bnc-b")).toBe(
      "/en/baby-names/compare?a=ZOFIA&sex=boys#bnc-b",
    );
    expect(babyComparePath("pl", { a: "", b: "", sex: "FEMALE" })).toBe(
      "/pl/imiona-dla-dziecka/porownaj?sex=girls",
    );
  });
});

describe("which figures a comparison can use", () => {
  it("takes a sex with the history and a count on at least one list; refuses the other sex, no history, no list", () => {
    expect(babyCompareFigures(zofia(true), "FEMALE")?.latest.birth_year).toBe(2025);
    // ZOFIA is on no boys' list in any year: not compared as a boy.
    expect(babyCompareFigures(zofia(true), "MALE")).toBeNull();
    // Without the history (the FREE surface) there is nothing to compare over the years.
    expect(babyCompareFigures(zofia(false), "FEMALE")).toBeNull();
    expect(
      babyCompareFigures(
        { given_name: zofia(true).given_name, state: "NOT_ON_ANY_LIST", sexes: [] },
        "FEMALE",
      ),
    ).toBeNull();
    expect(babyCompareFigures({ ...zofia(true), state: "RIGHTS_BLOCKED" }, "FEMALE")).toBeNull();
  });
});

describe("the model (AC-1)", () => {
  it("sets the two names side by side: the latest count, share, rank, direction with both shares, years at no. 1, register", () => {
    const m = model();
    expect(m.latestYear).toBe(2025);
    expect(m.years).toEqual([2000, 2005, 2010, 2015, 2020, 2025]);
    expect(m.a).toMatchObject({
      name: "ZOFIA",
      head: "2025 · 1. z 939",
      latestCount: n(4415),
      share: "3,7%",
      direction: { word: "bez większej zmiany", years: "2020 → 2025", shares: "4,0% → 3,7%" },
      topYears: "2016, 2017, 2018, 2023, 2024, 2025",
      register: {
        count: `${n(321456)} kobiet`,
        rank: `12. z ${n(28781)}`,
        asOf: "20 stycznia 2026 r.",
      },
    });
    expect(m.b).toMatchObject({
      name: "JULIA",
      head: "2025 · 6. z 939",
      latestCount: n(3207),
      share: "2,7%",
      // Below the 2020 list's cut-off in the claim: "poniżej progu", never 0.
      direction: { word: "spada", shares: "poniżej progu → 2,7%" },
      register: { count: `${n(200123)} kobiet`, rank: `20. z ${n(28781)}` },
    });
    expect(m.b.topYears).toBe("2003, 2004, 2005, 2006, 2007, 2008, 2009, 2011, 2012, 2017, 2020");
  });

  it("gives every year newest first, with each name's count and rank, and the sources once a year", () => {
    const m = model();
    expect(m.rows).toHaveLength(26);
    expect(m.rows[0]).toMatchObject({
      year: 2025,
      a: { kind: "count", count: 4415, text: n(4415), rank: "1" },
      b: { kind: "count", count: 3207, text: n(3207), rank: "6" },
    });
    expect(m.rows[0]?.citations.map((c) => c.locator)).toEqual(["resource:1159538"]);
    expect(m.rows[25]?.year).toBe(2000);
  });

  it("reads an absent year as the cut-off, never 0, and a missing rank claim as —", () => {
    const m = model();
    const y2001 = m.rows.find((r) => r.year === 2001);
    expect(y2001?.a).toEqual({ year: 2001, kind: "cutoff", count: null, text: "< 5", rank: null });
    expect(y2001?.b.kind).toBe("count");
    const y2010 = m.rows.find((r) => r.year === 2010);
    expect(y2010?.b).toMatchObject({ kind: "count", text: n(15445), rank: null });
    expect(m.rows.every((r) => r.a.count !== 0 && r.b.count !== 0)).toBe(true);
    expect(JSON.stringify(m)).not.toMatch(/"text":"0"/u);
  });

  it("reads a year with no stored list as —, and a name on no register list as none", () => {
    const a = babyCompareFigures(zofia(true), "FEMALE");
    const b = babyCompareFigures(julia(), "FEMALE");
    if (a === null || b === null) throw new Error("fixtures");
    const gap = a.history.map((y) =>
      y.birth_year === 2005 ? { ...y, list: null, count: null, rank: null } : y,
    );
    const m = babyCompareModel({
      lang: "en",
      sex: "FEMALE",
      a: { name: "ZOFIA", figures: { ...a, history: gap }, stock: NO_STOCK },
      b: { name: "JULIA", figures: b, stock: JULIA_STOCK },
    });
    expect(m.rows.find((r) => r.year === 2005)?.a).toEqual({
      year: 2005,
      kind: "none",
      count: null,
      text: "—",
      rank: null,
    });
    expect(m.a.register).toBeNull();
    expect(m.a.head).toBe("2025 · no. 1 of 939");
    expect(m.a.direction?.word).toBe("steady");
    expect(m.b.direction?.shares).toBe("below the cut-off → 2.7%");
  });

  it("a name below the latest list's cut-off heads its column with the cut-off and no rank", () => {
    const a = babyCompareFigures(zofia(true), "FEMALE");
    const b = babyCompareFigures(julia(), "FEMALE");
    if (a === null || b === null) throw new Error("fixtures");
    const below = { ...zofiaGirls(true), latest: year(2025, null, null), trend: null };
    const figures = babyCompareFigures({ ...zofia(true), sexes: [below] }, "FEMALE");
    if (figures === null) throw new Error("fixtures");
    const m = babyCompareModel({
      lang: "pl",
      sex: "FEMALE",
      a: { name: "ZOFIA", figures, stock: ZOFIA_STOCK },
      b: { name: "JULIA", figures: b, stock: JULIA_STOCK },
    });
    expect(m.a.head).toBe("2025 · poniżej progu");
    expect(m.a.latestCount).toBe("< 2");
    expect(m.a.share).toBeNull();
    expect(m.a.direction).toBeNull();
  });
});
