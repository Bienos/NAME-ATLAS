import { describe, expect, it } from "vitest";
import type { BirthNameFacts, BirthSexFigures } from "@name-atlas/truth";
import {
  babyCardFileName,
  babyCardOf,
  babyCardPath,
  babyFreeCardFacts,
  babyPagePath,
  babyPaidCardFacts,
  babySharePath,
  formatShare,
  isBabyCard,
  parseBabyShareQuery,
} from "./baby-names-share-facts.js";
import { isBabyNamesPath } from "./baby-names-config.js";
import { DOT_GRID_MAX } from "./baby-names-page.js";
import {
  NO_STOCK,
  ZOFIA_STOCK,
  countOf,
  girlsHistory,
  list,
  year,
  zofia,
  zofiaGirls,
} from "./baby-names-share-test-fixtures.js";

/** TASK-152 AC-1 and AC-2: what the cards say, from the page's facts alone. */

const base = { stock: ZOFIA_STOCK, lang: "pl" as const, host: null };

/** The site's Polish thousands separator is a no-break space. */
const n = (text: string): string => text.replace(/(\d) (\d)/gu, "$1\u00a0$2");

function withGirls(girls: Partial<BirthSexFigures>, history = false): BirthNameFacts {
  const facts = zofia(history);
  return {
    ...facts,
    sexes: facts.sexes.map((s) => (s.sex === "FEMALE" ? { ...s, ...girls } : s)),
  };
}

describe("the free card's facts (AC-1)", () => {
  it("carry only the free view's figures for ZOFIA, girls, formatted by the site's formatters", () => {
    const facts = babyFreeCardFacts({ ...base, facts: zofia(false), sex: "FEMALE" });
    expect(facts).not.toBeNull();
    expect(facts).toMatchObject({
      card: "free",
      name: "ZOFIA",
      sex: "FEMALE",
      year: 2025,
      eyebrow: "IMIĘ DLA DZIEWCZYNKI · ROK 2025",
      squareEyebrow: "DZIEWCZYNKA · 2025",
      count: n("4 415"),
      countLine: "dziewczynek dostało to imię w 2025 r.",
      rank: { figure: "Nr 1", of: "z 939 imion na liście", ofShort: "z 939 imion" },
      oneIn: {
        figure: "1 na 27",
        noun: "dziewczynek z listy",
        dots: 27,
        caption: "Z każdych 27 dziewczynek z listy za 2025 r. jedna dostała imię ZOFIA.",
      },
      direction: {
        word: "Bez większej zmiany",
        shares: "4,0% → 3,7% · 2020→2025",
        years: "2020 → 2025",
      },
      register: {
        line: n("Dziś 321 456 kobiet w Polsce ma to imię"),
        rank: n("12. miejsce z 28 781"),
      },
      source: "PESEL · dane.gov.pl, zbiór 219 · lista 2025, rejestr 20 stycznia 2026 r.",
      sourceSquare: "PESEL · dane.gov.pl, zbiór 219 · lista 2025",
      privacy: "Nic o Twoim dziecku, tylko o imieniu",
      host: "name-atlas.pl",
    });
    // The count is formatted with the site's no-break space, as the page writes it.
    expect(facts?.count).toBe("4 415");
    // Nothing of the paid view: no history figure reaches the free card.
    expect(JSON.stringify(facts)).not.toContain("9 012");
    expect(JSON.stringify(facts)).not.toContain("2017");
  });

  it("is in English on the English card, with the request's host", () => {
    const facts = babyFreeCardFacts({
      ...base,
      lang: "en",
      host: "staging.name-atlas.pl",
      facts: zofia(false),
      sex: "FEMALE",
    });
    expect(facts).toMatchObject({
      eyebrow: "A GIRL'S NAME · 2025",
      count: "4,415",
      countLine: "girls were given this name in 2025",
      rank: { figure: "No. 1", of: "of 939 names on the list" },
      oneIn: { figure: "1 in 27", noun: "girls on the list" },
      direction: { word: "Steady", shares: "4.0% → 3.7% · 2020→2025" },
      register: {
        line: "Today 321,456 women in Poland have this name",
        rank: "place 12 of 28,781",
      },
      source: "PESEL · dane.gov.pl, dataset 219 · list 2025, register 20 January 2026",
      host: "staging.name-atlas.pl",
    });
  });

  it("has no card for a sex the name has no count for on its latest list, and none when not READY", () => {
    expect(babyFreeCardFacts({ ...base, facts: zofia(false), sex: "MALE" })).toBeNull();
    const blocked: BirthNameFacts = { ...zofia(false), state: "RIGHTS_BLOCKED", sexes: [] };
    expect(babyFreeCardFacts({ ...base, facts: blocked, sex: "FEMALE" })).toBeNull();
    const noList = withGirls({ latest: null });
    expect(babyFreeCardFacts({ ...base, facts: noList, sex: "FEMALE" })).toBeNull();
  });

  it("reads 'poniżej progu' for an earlier share the claim does not carry, never 0", () => {
    const girls = zofiaGirls(false);
    const facts = withGirls({
      trend: { ...girls.trend!, earlier_share_per_million: null, direction: "RISING" },
    });
    const card = babyFreeCardFacts({ ...base, facts, sex: "FEMALE" });
    expect(card?.direction).toEqual({
      word: "Rośnie",
      shares: "poniżej progu → 3,7% · 2020→2025",
      years: "2020 → 2025",
    });
    expect(JSON.stringify(card)).not.toMatch(/\b0,0%|\b0%|"0"/u);
  });

  it("never writes a share as 0,0%: a share below a tenth of a percent takes more decimals", () => {
    expect(formatShare(275, "pl")).toBe("0,03%");
    expect(formatShare(275, "en")).toBe("0.03%");
    expect(formatShare(8, "pl")).toBe("0,001%");
    expect(formatShare(36856, "pl")).toBe("3,7%");
    const girls = zofiaGirls(false);
    const facts = withGirls({
      trend: { ...girls.trend!, latest_share_per_million: 275, earlier_share_per_million: null },
    });
    expect(babyFreeCardFacts({ ...base, facts, sex: "FEMALE" })?.direction?.shares).toBe(
      "poniżej progu → 0,03% · 2020→2025",
    );
  });

  it("leaves out the direction, the rank, the register and the shares when their facts are absent", () => {
    const girls = zofiaGirls(false);
    const latest = { ...girls.latest!, rank: null };
    const facts = withGirls({ latest, trend: null });
    const card = babyFreeCardFacts({ ...base, stock: NO_STOCK, facts, sex: "FEMALE" });
    expect(card?.rank).toBeNull();
    expect(card?.direction).toBeNull();
    expect(card?.register).toBeNull();
    expect(card?.source).toBe("PESEL · dane.gov.pl, zbiór 219 · lista 2025");
    const noShares = withGirls({ trend: { ...girls.trend!, latest_share_per_million: null } });
    expect(babyFreeCardFacts({ ...base, facts: noShares, sex: "FEMALE" })?.direction).toEqual({
      word: "Bez większej zmiany",
      shares: null,
      years: "2020 → 2025",
    });
  });

  it("draws the dot grid by the page's rule: N dots up to DOT_GRID_MAX, none above, no tile without a share", () => {
    const at = (count: number) =>
      babyFreeCardFacts({
        ...base,
        facts: withGirls({ latest: year(2025, count, 1) }),
        sex: "FEMALE",
      })?.oneIn;
    // 1 997 of 119 788 is 1 in 60; 1 964 is 1 in 61.
    expect(at(1997)).toMatchObject({ figure: "1 na 60", dots: DOT_GRID_MAX });
    expect(at(1964)).toMatchObject({ figure: "1 na 61", dots: null });
    const latest = {
      ...year(2025, 4415, 1),
      count: { ...countOf(2025, "FEMALE", 4415, "x"), one_in: null, share_per_million: null },
    };
    expect(
      babyFreeCardFacts({ ...base, facts: withGirls({ latest }), sex: "FEMALE" })?.oneIn,
    ).toBeNull();
  });

  it("names the register's men for a boys' card and omits the rank when the register has none", () => {
    const boysLatest = { ...year(2025, 1000, 5), list: list(2025, "MALE") };
    const facts: BirthNameFacts = {
      ...zofia(false),
      sexes: zofia(false).sexes.map((s) => (s.sex === "MALE" ? { ...s, latest: boysLatest } : s)),
    };
    const card = babyFreeCardFacts({ ...base, facts, sex: "MALE" });
    expect(card?.register).toEqual({ line: "Dziś 77 mężczyzn w Polsce ma to imię", rank: null });
    expect(card?.eyebrow).toBe("IMIĘ DLA CHŁOPCA · ROK 2025");
    expect(card?.countLine).toBe("chłopców dostało to imię w 2025 r.");
  });
});

describe("the paid card's facts (AC-2)", () => {
  it("draw one bar a year from the history, the peak amber, an absent year a cut-off tick and never a zero bar", () => {
    const facts = babyPaidCardFacts({ ...base, facts: zofia(true), sex: "FEMALE" });
    expect(facts).not.toBeNull();
    expect(facts?.bars).toHaveLength(26);
    expect(facts?.bars[0]).toEqual({ year: 2000, kind: "bar", height: 2913 / 9012, role: "first" });
    expect(facts?.bars[1]).toEqual({ year: 2001, kind: "cutoff", height: 0, role: "year" });
    expect(facts?.bars[17]).toEqual({ year: 2017, kind: "bar", height: 1, role: "peak" });
    expect(facts?.bars[25]).toMatchObject({ year: 2025, kind: "bar", role: "latest" });
    for (const bar of facts?.bars ?? []) {
      if (bar.kind === "bar") expect(bar.height, String(bar.year)).toBeGreaterThan(0);
    }
    expect(facts?.bars.filter((b) => b.role === "peak")).toHaveLength(1);
    expect(facts).toMatchObject({
      card: "paid",
      eyebrow: "ROK PO ROKU · 2000–2025",
      nameEyebrow: "IMIĘ DLA DZIEWCZYNKI",
      times: { figure: "×1,5", wording: "częściej niż w 2000 r." },
      callouts: [
        { figure: n("2 913"), line: "2000 · 14. miejsce", peak: false },
        { figure: n("9 012"), line: "2017 · najwięcej · 1. miejsce", peak: true },
        { figure: n("4 415"), line: "2025 · 1. miejsce", peak: false },
      ],
      ladderHeading: "MIEJSCE NA LIŚCIE",
      ladder: [
        { year: 2000, rank: "14.", latest: false },
        { year: 2005, rank: "10.", latest: false },
        { year: 2010, rank: "5.", latest: false },
        { year: 2015, rank: "2.", latest: false },
        { year: 2020, rank: "2.", latest: false },
        { year: 2025, rank: "1.", latest: true },
      ],
      topYears: "Numer 1 w 2016, 2017, 2018, 2023, 2024 i 2025 r.",
      register: n("Dziś 321 456 kobiet w Polsce ma to imię."),
      source: "PESEL · dane.gov.pl, zbiór 219 · listy 2000–2025, rejestr 20 stycznia 2026 r.",
    });
  });

  it("gives a gap for a year with no stored list, '—' on a rung without a rank claim, and no × without both counts", () => {
    const history = girlsHistory().map((y) =>
      y.birth_year === 2003
        ? { ...y, list: null, count: null, rank: null }
        : y.birth_year === 2005
          ? { ...y, rank: null }
          : y.birth_year === 2000
            ? { ...y, count: null, rank: null }
            : y,
    );
    const facts = babyPaidCardFacts({
      ...base,
      facts: withGirls({ history }, true),
      sex: "FEMALE",
    });
    expect(facts?.bars[3]).toEqual({ year: 2003, kind: "gap", height: 0, role: "year" });
    expect(facts?.bars[0]).toMatchObject({ year: 2000, kind: "cutoff" });
    expect(facts?.bars[2]).toMatchObject({ year: 2002, role: "first" });
    expect(facts?.times).toBeNull();
    expect(facts?.ladder[0]).toEqual({ year: 2000, rank: null, latest: false });
    expect(facts?.ladder[1]).toEqual({ year: 2005, rank: null, latest: false });
    expect(facts?.callouts[0]).toEqual({
      figure: n("3 100"),
      line: "2002 · 13. miejsce",
      peak: false,
    });
  });

  it("says 'rzadziej' when the latest count is below 2000's, and omits the register and the top years when absent", () => {
    const history = girlsHistory().map((y) =>
      y.birth_year === 2000
        ? { ...y, count: countOf(2000, "FEMALE", 8830, "21457") }
        : { ...y, rank: y.rank === null ? null : { ...y.rank, rank: 3 } },
    );
    const facts = babyPaidCardFacts({
      ...base,
      stock: NO_STOCK,
      facts: withGirls({ history }, true),
      sex: "FEMALE",
    });
    expect(facts?.times).toEqual({ figure: "×2,0", wording: "rzadziej niż w 2000 r." });
    expect(facts?.topYears).toBeNull();
    expect(facts?.register).toBeNull();
    expect(facts?.source).toBe("PESEL · dane.gov.pl, zbiór 219 · listy 2000–2025");
  });

  it("has no paid card for a sex on no list since 2000, nor without the history", () => {
    expect(babyPaidCardFacts({ ...base, facts: zofia(true), sex: "MALE" })).toBeNull();
    expect(babyPaidCardFacts({ ...base, facts: zofia(false), sex: "FEMALE" })).toBeNull();
  });

  it("is in English on the English card", () => {
    const facts = babyPaidCardFacts({ ...base, lang: "en", facts: zofia(true), sex: "FEMALE" });
    expect(facts).toMatchObject({
      eyebrow: "YEAR BY YEAR · 2000–2025",
      times: { figure: "×1.5", wording: "more often than in 2000" },
      callouts: [
        { figure: "2,913", line: "2000 · place 14", peak: false },
        { figure: "9,012", line: "2017 · most · place 1", peak: true },
        { figure: "4,415", line: "2025 · place 1", peak: false },
      ],
      ladder: [
        { year: 2000, rank: "14", latest: false },
        { year: 2005, rank: "10", latest: false },
        { year: 2010, rank: "5", latest: false },
        { year: 2015, rank: "2", latest: false },
        { year: 2020, rank: "2", latest: false },
        { year: 2025, rank: "1", latest: true },
      ],
      topYears: "Number 1 in 2016, 2017, 2018, 2023, 2024 and 2025.",
      register: "Today 321,456 women in Poland have this name.",
    });
  });
});

describe("the cards' addresses and names (AC-3, AC-4)", () => {
  it("live under the page, with the page's query fields", () => {
    expect(babyCardPath("pl", "story", "ZOFIA", "FEMALE")).toBe(
      "/pl/imiona-dla-dziecka/karta/story?imie=ZOFIA&sex=girls",
    );
    expect(babyCardPath("en", "paid", "ZOFIA", "MALE")).toBe(
      "/en/baby-names/card/paid?name=ZOFIA&sex=boys",
    );
    expect(babySharePath("pl", "ZOFIA", "FEMALE")).toBe(
      "/pl/imiona-dla-dziecka/udostepnij?imie=ZOFIA&sex=girls",
    );
    expect(babySharePath("en", "ZOFIA", "FEMALE", { card: "paid", format: "square" })).toBe(
      "/en/baby-names/share?name=ZOFIA&sex=girls&card=paid&format=square",
    );
    expect(babyPagePath("pl", "ZOFIA", "FEMALE")).toBe(
      "/pl/imiona-dla-dziecka?imie=ZOFIA&sex=girls#sex-girls",
    );
    expect(babyCardFileName("ŁUCJA", "FEMALE", "square")).toBe("lucja-girls-square.png");
    expect(babyCardOf("basic", "square")).toBe("square");
    expect(babyCardOf("paid", "square")).toBe("paid");
    expect(isBabyCard("story") && isBabyCard("square") && isBabyCard("paid")).toBe(true);
    expect(isBabyCard("summary")).toBe(false);
  });

  it("read the sheet's query with the page's fields and safe defaults", () => {
    expect(
      parseBabyShareQuery("pl", { imie: " Zofia ", sex: "girls", card: "paid", format: "square" }),
    ).toEqual({
      typed: "Zofia",
      sex: "FEMALE",
      card: "paid",
      format: "square",
    });
    expect(parseBabyShareQuery("en", { name: ["Jakub"], sex: "boys" })).toEqual({
      typed: "Jakub",
      sex: "MALE",
      card: "basic",
      format: "story",
    });
    expect(
      parseBabyShareQuery("pl", { imie: "Zofia", sex: "both", card: "x", format: "y" }),
    ).toEqual({
      typed: "Zofia",
      sex: null,
      card: "basic",
      format: "story",
    });
  });

  it("are the middleware's: everything under either page is a baby-names path", () => {
    for (const path of [
      "/pl/imiona-dla-dziecka",
      "/pl/imiona-dla-dziecka/lista",
      "/pl/imiona-dla-dziecka/udostepnij",
      "/pl/imiona-dla-dziecka/karta/story",
      "/en/baby-names",
      "/en/baby-names/list",
      "/en/baby-names/share",
      "/en/baby-names/card/paid",
    ]) {
      expect(isBabyNamesPath(path), path).toBe(true);
    }
    for (const path of [
      "/pl",
      "/pl/imiona-dla-dzieckax",
      "/en/baby-namesake",
      "/pl/nazwisko/zofia",
    ]) {
      expect(isBabyNamesPath(path), path).toBe(false);
    }
  });
});
