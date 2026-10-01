import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import { deckCards } from "./deck.js";
import type { DeckCard } from "./deck.js";
import { DECK_PARAM, deckRequested, searchTarget } from "./deck-target.js";
import { Result } from "./result-view.js";
import { metadataFor } from "./surname-page.js";
import { SurnameDeck } from "./deck-client.js";

/**
 * TASK-055 AC-3 and AC-4, against rendered markup: the deck has a card for each
 * ready section and none for the rest, and every figure on a card is one the
 * page prints. The response is synthetic but legal: it is parsed by the
 * contract first. Figures are KOWALSKI's on the 2026 lists where they exist.
 */

const SURFACE = { surface: "FREE", decision: "ALLOWED", reason_code: "RIGHTS_PERMIT_FREE_SURFACE" };
const CONFIDENCE = { status: "VERIFIED", methodology_code: "rule@1" };
const CITATION = {
  id: "cit-1",
  title: "Nazwiska występujące w rejestrze PESEL",
  publisher: "Ministerstwo Cyfryzacji",
  publication_date: "2026-01-20",
  source_type: "OFFICIAL_DATASET",
  locator: "resource:1148808",
  url: "https://api.dane.gov.pl/resources/1148808/csv",
  attribution: "Dane pochodzą z rejestru PESEL, Ministerstwo Cyfryzacji, dane.gov.pl (CC0 1.0)",
  terms: "CC0 1.0",
  retrieved_at: "2026-09-18T17:40:00Z",
  source_page_url: null,
};
const id = (n: number) => `01a0b9e3-34f3-7633-a239-2b8596dfc0${String(n).padStart(2, "0")}`;
const who = (n: number, display_name: string) => ({ id: id(n), display_name, script: "Latn" });

const MALE = "pesel_2026_national_male";

const FULL_INPUT = {
  schema_version: "1.10",
  status: "RESOLVED",
  surname: who(1, "KOWALSKI"),
  population: {
    state: "READY",
    observations: [
      {
        value: {
          status: "KNOWN",
          value: 66_589,
          unit: "PEOPLE",
          scope_label_code: "PESEL_CURRENT_SURNAME",
        },
        snapshot_date: "2026-01-20",
        country_code: "PL",
        source_population_scope: "Wykaz nazwisk osób żyjących",
        coverage_notes: null,
        comparability_group: MALE,
        confidence: CONFIDENCE,
        citation: CITATION,
      },
    ],
    reason_code: null,
    surface: SURFACE,
  },
  rarity: {
    state: "READY",
    entries: [
      {
        primary: { metric: "ONE_IN_X", value: 299 },
        supporting: [{ metric: "RANK", value: 2 }],
        methodology_code: "PESEL_PUBLISHED_UNIVERSE_SUM_V1",
        universe_label_code: "PESEL_PUBLISHED_UNIVERSE",
        numerator: 66_589,
        denominator: 19_900_000,
        share: 0.003346181,
        scope_label_code: "PESEL_CURRENT_SURNAME",
        snapshot_date: "2026-01-20",
        country_code: "PL",
        comparability_group: MALE,
        confidence: CONFIDENCE,
        citation: CITATION,
      },
    ],
    reason_code: null,
    surface: SURFACE,
  },
  neighbours: {
    state: "READY",
    lists: [
      {
        comparability_group: MALE,
        snapshot_date: "2026-01-20",
        entries: [
          { surname: who(2, "NOWAK"), rank: 1, count: 98_387, is_self: false },
          { surname: who(1, "KOWALSKI"), rank: 2, count: 66_589, is_self: true },
          { surname: who(3, "WIŚNIEWSKI"), rank: 3, count: 53_079, is_self: false },
          { surname: who(4, "WÓJCIK"), rank: 4, count: 47_734, is_self: false },
        ],
      },
    ],
    reason_code: null,
    surface: SURFACE,
  },
  other_form: {
    surname: who(5, "KOWALSKA"),
    rule_code: "ADJECTIVAL_SKI_CKI_DZKI",
    comparability_group: "pesel_2026_national_female",
    snapshot_date: "2026-01-20",
    rank: 2,
    count: 67_308,
    surface: SURFACE,
  },
  distribution: {
    state: "READY",
    entries: [
      {
        coverage_state: "LOW_COVERAGE",
        regions: [
          {
            place_id: "01a0c057-0000-7000-8000-000000000014",
            terc_code: "14",
            display_name: "MAZOWIECKIE",
            count: 9_000,
            share_of_covered: 0.6,
          },
          {
            place_id: "01a0c057-0000-7000-8000-000000000012",
            terc_code: "12",
            display_name: "MAŁOPOLSKIE",
            count: 6_000,
            share_of_covered: 0.4,
          },
        ],
        covered_count: 15_000,
        national_count: 66_589,
        coverage_ratio: 0.225262,
        coverage_basis: "covered_count / national_count",
        low_coverage_threshold: 0.3,
        universe_label_code: "PESEL_REGISTERED_VOIVODESHIP_COVERED_SET",
        scope_label_code: "PESEL_CURRENT_SURNAME",
        snapshot_date: "2026-01-20",
        country_code: "PL",
        comparability_group: "pesel_2026_regional_male",
        confidence: CONFIDENCE,
        citation: CITATION,
      },
    ],
    reason_code: null,
    surface: SURFACE,
  },
  change: {
    state: "READY",
    entries: [
      {
        list: "MALE",
        points: [
          {
            status: "KNOWN",
            data_date: "2019-06-30",
            note_code: null,
            source_url: null,
            count: 70_000,
            list_total: 1_000_000,
            one_in_x: 14,
            share: 0.07,
          },
          {
            status: "KNOWN",
            data_date: "2026-01-20",
            note_code: null,
            source_url: null,
            count: 66_589,
            list_total: 1_100_000,
            one_in_x: 17,
            share: 0.060535455,
          },
        ],
        gaps: [],
        summary: {
          known_points: 2,
          first: { data_date: "2019-06-30", count: 70_000, list_total: 1_000_000 },
          last: { data_date: "2026-01-20", count: 66_589, list_total: 1_100_000 },
          count_change_percent: -4.9,
          list_change_percent: 10,
        },
        methodology_code: "distribution_shift@1",
        scope_label_code: "PESEL_CURRENT_SURNAME",
        country_code: "PL",
        confidence: CONFIDENCE,
        citation: CITATION,
      },
    ],
    reason_code: null,
    surface: SURFACE,
  },
  suggestions: null,
  meaning: {
    state: "AVAILABLE",
    interpretations: [
      {
        root_form: "kowal",
        root_language: "polski",
        literal_gloss: "od kowal 'rzemieślnik obrabiający żelazo'",
        formation_type: "OCCUPATIONAL",
        work: { title: "Nazwiska Polaków", author_or_publisher: "Rymut", year: 1999 },
        locator: "t. 1, s. 470",
      },
    ],
    confidence: "LIKELY",
    methodology_code: "onomastic@1",
    reason_code: null,
    surface: SURFACE,
  },
  archive: {
    state: "READY",
    query: '"KOWALSKI"',
    searched_on: "2026-10-01",
    catalogue_records: 3_120,
    catalogue_by_category: [
      { label: "Czasopisma", count: 894 },
      { label: "Rękopisy", count: 16 },
    ],
    pages: 120_571,
    pages_by_period: [
      { from_year: 1850, to_year: 1899, count: 13_090 },
      { from_year: 1919, to_year: 1939, count: 70_818 },
    ],
    pages_by_place: [{ label: "Warszawa", count: 61_608 }],
    examples: [
      {
        title: "Rocznik Kolejowy",
        date: "1931-01-01",
        page_number: 795,
        excerpt: "Kowalski Antoni 60",
        url: "https://polona.pl/item-view/a7ed43f7-ac1d-4e75-ba51-52bef4f09c67?page=794",
      },
    ],
    confidence: { status: "VERIFIED", methodology_code: "archive_search_scope@1" },
    citation: {
      id: "cit-polona",
      title: "Polona",
      publisher: "Biblioteka Narodowa",
      publication_date: null,
      source_type: "DIGITAL_LIBRARY",
      locator: '"KOWALSKI"',
      url: "https://polona.pl/api/search-service/search/simple?query=%22KOWALSKI%22",
      attribution: "Polona, Biblioteka Narodowa",
      terms: null,
      retrieved_at: "2026-10-01T08:18:47Z",
      source_page_url: "https://polona.pl/",
    },
    reason_code: null,
    surface: SURFACE,
  },
};

const FULL: SurnameResultResponse = surnameResultResponseSchema.parse(FULL_INPUT);

/** Only the count: every other section unavailable, as most surnames are today. */
const COUNT_ONLY: SurnameResultResponse = surnameResultResponseSchema.parse({
  ...FULL_INPUT,
  rarity: {
    state: "UNAVAILABLE",
    entries: [],
    reason_code: "NO_COMPLETE_UNIVERSE",
    surface: SURFACE,
  },
  neighbours: {
    state: "UNAVAILABLE",
    lists: [],
    reason_code: "NO_COMPLETE_UNIVERSE",
    surface: SURFACE,
  },
  other_form: null,
  distribution: {
    state: "UNAVAILABLE",
    entries: [],
    reason_code: "NO_COMPLETE_REGIONAL_UNIVERSE",
    surface: SURFACE,
  },
  change: { state: "UNAVAILABLE", entries: [], reason_code: "NO_CHANGE_DERIVED", surface: SURFACE },
  meaning: {
    state: "NO_SOURCED_MEANING",
    interpretations: [],
    confidence: null,
    methodology_code: null,
    reason_code: "NO_ADMISSIBLE_ONOMASTIC_SOURCE",
    surface: SURFACE,
  },
  archive: {
    state: "NOT_SEARCHED",
    query: null,
    searched_on: null,
    catalogue_records: null,
    catalogue_by_category: [],
    pages: null,
    pages_by_period: [],
    pages_by_place: [],
    examples: [],
    confidence: null,
    citation: null,
    reason_code: "ARCHIVE_NOT_SEARCHED",
    surface: SURFACE,
  },
});

const LINKS = { path: "/pl/nazwisko/kowalski", shareUrl: null };

function faces(cards: readonly DeckCard[]): string {
  return renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      cards.map((c) => createElement("article", { key: c.key }, c.face)),
    ),
  );
}

function text(markup: string): string {
  return (
    markup
      .replace(/<[^>]+>/gu, " ")
      .replace(/&quot;/gu, '"')
      .replace(/&#x27;/gu, "'")
      .replace(/&amp;/gu, "&")
      // Spaces only: a no-break space inside a figure is part of the figure.
      .replace(/[ \t\r\n]+/gu, " ")
  );
}

describe("TASK-055 AC-3: one card per ready section, none for the rest", () => {
  it("gives every card in ADR-0025's order when every section is ready", () => {
    expect(deckCards(FULL, "pl", LINKS).map((c) => c.key)).toEqual([
      "hello",
      "rarity",
      "neighbours",
      "where",
      "change",
      "other",
      "meaning",
      "print",
      "catalogue",
      "end",
    ]);
  });

  it("gives only the surname and the summary when only the count is ready", () => {
    expect(deckCards(COUNT_ONLY, "pl", LINKS).map((c) => c.key)).toEqual(["hello", "end"]);
    expect(deckCards(COUNT_ONLY, "en", LINKS).map((c) => c.key)).toEqual(["hello", "end"]);
  });

  it("gives no deck to a surname that did not resolve", () => {
    const unresolved = surnameResultResponseSchema.parse({
      schema_version: "1.10",
      status: "UNRESOLVED",
      surname: null,
      population: null,
      rarity: null,
      distribution: null,
      suggestions: {
        state: "UNAVAILABLE",
        outcome: null,
        decision_mode: null,
        reason_code: "INPUT_TOO_SHORT",
        suggestions: [],
      },
      meaning: null,
      change: null,
      archive: null,
      neighbours: null,
      other_form: null,
    });
    expect(deckCards(unresolved, "pl", LINKS)).toEqual([]);
  });

  it("names every card in both languages", () => {
    for (const lang of ["pl", "en"] as const) {
      for (const card of deckCards(FULL, lang, LINKS)) {
        expect(card.title.trim(), `${lang}.${card.key}`).not.toBe("");
      }
    }
  });
});

describe("TASK-055 AC-3: every figure on a card is one the page prints", () => {
  // A figure: digits, grouped by a no-break space (Polish) or a comma
  // (English), with a decimal part, a sign or a per cent sign where it has one.
  const FIGURE = /[\u2212+]?\d(?:[\d\u00a0,]*\d)?(?:[.,]\d+)?%?/gu;

  for (const lang of ["pl", "en"] as const) {
    it(`holds in ${lang === "pl" ? "Polish" : "English"}`, () => {
      const page = text(renderToStaticMarkup(createElement(Result, { response: FULL, lang })));
      const deck = text(faces(deckCards(FULL, lang, LINKS)));
      const figures = [...new Set(deck.match(FIGURE) ?? [])];
      expect(figures.length).toBeGreaterThan(20);
      const missing = figures.filter((figure) => !page.includes(figure));
      expect(missing).toEqual([]);
    });
  }

  it("prints the neighbours and the other form on the page, where the deck shows them", () => {
    const page = text(renderToStaticMarkup(createElement(Result, { response: FULL, lang: "pl" })));
    expect(page).toContain("Sąsiedzi na liście");
    for (const name of ["NOWAK", "WIŚNIEWSKI", "WÓJCIK"]) expect(page).toContain(name);
    expect(page).toContain("Druga forma gramatyczna");
    expect(page).toContain(
      "KOWALSKA (kobiety): 67\u00a0308 osób, miejsce 2 na liście nazwisk na dzień 20 stycznia 2026 r.",
    );
    expect(page).toContain("Nie mówi nic o pokrewieństwie");
    expect(page).toContain("Rekordy katalogu według rodzaju");
  });

  it("puts a source and a date at the foot of every card but the summary", () => {
    const html = faces(deckCards(FULL, "pl", LINKS));
    const sources = [...html.matchAll(/<p class="dk-source">(.*?)<\/p>/gu)].map((m) =>
      text(m[1] ?? ""),
    );
    expect(sources).toHaveLength(10);
    for (const source of sources.slice(0, -1)) expect(source).toMatch(/\b(19|20)\d\d\b/u);
  });

  it("states the coverage warning before the map's figures, as the page does", () => {
    const where = deckCards(FULL, "pl", LINKS).find((c) => c.key === "where");
    const html = faces(where === undefined ? [] : [where]);
    const warning = html.indexOf('class="dk-warning"');
    expect(warning).toBeGreaterThan(-1);
    expect(warning).toBeLessThan(html.indexOf("MAZOWIECKIE"));
  });

  it("calls the other form a form, never a relative", () => {
    const other = deckCards(FULL, "en", LINKS).find((c) => c.key === "other");
    const body = text(faces(other === undefined ? [] : [other]));
    expect(body).toContain("It says nothing about kinship");
    expect(body).not.toMatch(/\b(wife|husband|sister|brother|related|family)\b/iu);
  });
});

/**
 * KOWALSKA's shape, with the figures production served on 2026-10-01: 3 men
 * and 67,308 women, about 1 in 7,065,846 men (#247 412) and 1 in 320 women
 * (#2). The list totals of the change entries are synthetic.
 */
function kowalskaShape(): SurnameResultResponse {
  const input = structuredClone(FULL_INPUT) as typeof FULL_INPUT & Record<string, unknown>;
  const [obs] = input.population.observations;
  const [rar] = input.rarity.entries;
  const [chg] = input.change.entries;
  if (obs === undefined || rar === undefined || chg === undefined) throw new Error("fixture");
  const observation = (n: number, group: string) => ({
    ...obs,
    value: { ...obs.value, value: n },
    comparability_group: group,
  });
  const rarityOf = (x: number, rank: number, n: number, group: string) => ({
    ...rar,
    primary: { metric: "ONE_IN_X", value: x },
    supporting: [{ metric: "RANK", value: rank }],
    numerator: n,
    comparability_group: group,
  });
  const point = (date: string, count: number, total: number) => ({
    status: "KNOWN",
    data_date: date,
    note_code: null,
    source_url: null,
    count,
    list_total: total,
    one_in_x: Math.floor(total / count + 0.5),
    share: Number((count / total).toFixed(9)),
  });
  const changeOf = (list: "MALE" | "FEMALE", a: number, b: number, pct: number) => ({
    ...chg,
    list,
    points: [point("2019-06-30", a, 20_000_000), point("2026-01-20", b, 21_000_000)],
    summary: {
      known_points: 2,
      first: { data_date: "2019-06-30", count: a, list_total: 20_000_000 },
      last: { data_date: "2026-01-20", count: b, list_total: 21_000_000 },
      count_change_percent: pct,
      list_change_percent: 5,
    },
  });
  return surnameResultResponseSchema.parse({
    ...input,
    surname: who(5, "KOWALSKA"),
    population: {
      ...input.population,
      observations: [
        observation(3, "pesel_2026_national_male"),
        observation(67_308, "pesel_2026_national_female"),
      ],
    },
    rarity: {
      ...input.rarity,
      entries: [
        rarityOf(7_065_846, 247_412, 3, "pesel_2026_national_male"),
        rarityOf(320, 2, 67_308, "pesel_2026_national_female"),
      ],
    },
    neighbours: {
      ...input.neighbours,
      lists: [
        {
          comparability_group: "pesel_2026_national_female",
          snapshot_date: "2026-01-20",
          entries: [
            { surname: who(2, "NOWAK"), rank: 1, count: 99_738, is_self: false },
            { surname: who(5, "KOWALSKA"), rank: 2, count: 67_308, is_self: true },
          ],
        },
        {
          comparability_group: "pesel_2026_national_male",
          snapshot_date: "2026-01-20",
          entries: [
            { surname: who(5, "KOWALSKA"), rank: 247_412, count: 3, is_self: true },
            { surname: who(6, "AA"), rank: 301_370, count: 2, is_self: false },
          ],
        },
      ],
    },
    other_form: { ...input.other_form, surname: who(1, "KOWALSKI"), comparability_group: MALE },
    change: {
      ...input.change,
      entries: [changeOf("MALE", 2, 3, 50), changeOf("FEMALE", 69_920, 67_308, -3.7)],
    },
  });
}

describe("TASK-055: every card leads with the list the surname mostly lives on", () => {
  const cards = deckCards(kowalskaShape(), "pl", LINKS);
  const face = (key: string) => {
    const card = cards.find((c) => c.key === key);
    return faces(card === undefined ? [] : [card]);
  };

  it("leads rarity with the women's 1 in 320, not the men's 1 in 7 million", () => {
    const html = face("rarity");
    expect(html.indexOf("1 na 320")).toBeGreaterThan(-1);
    expect(html.indexOf("1 na 320")).toBeLessThan(html.indexOf("1 na 7\u00a0065\u00a0846"));
    expect(text(html)).toContain("#2 miejsce na liście nazwisk");
  });

  it("opens the neighbours on the women's list", () => {
    const html = face("neighbours");
    const first = /<input[^>]*id="dk-nb-0"[^>]*>/u.exec(html)?.[0] ?? "";
    expect(first).toContain('checked=""');
    expect(html.indexOf("NOWAK")).toBeLessThan(html.indexOf("AA<"));
  });

  it("leads change with the women's −3,7%, not the men's 2 to 3", () => {
    const body = text(face("change"));
    expect(body.indexOf("−3,7%")).toBeGreaterThan(-1);
    expect(body.indexOf("−3,7%")).toBeLessThan(body.indexOf("+50,0%"));
  });

  it("keeps the contract's order on the page", () => {
    const page = text(
      renderToStaticMarkup(createElement(Result, { response: kowalskaShape(), lang: "pl" })),
    );
    expect(page.indexOf("około 1 na 7\u00a0065\u00a0846")).toBeLessThan(
      page.indexOf("około 1 na 320"),
    );
  });
});

describe("TASK-055: the deck is drawn by script only", () => {
  it("renders nothing on the server, so the page alone is what a reader without script gets", () => {
    const html = renderToStaticMarkup(
      createElement(SurnameDeck, {
        cards: deckCards(FULL, "pl", LINKS),
        surname: "KOWALSKI",
        initiallyOpen: true,
        lang: "pl",
        labels: {
          open: "o",
          close: "c",
          label: "l",
          cards: "k",
          of: "z",
          prev: "p",
          next: "n",
          hintKeys: "h",
          hintTouch: "t",
        },
      }),
    );
    expect(html).toBe("");
  });
});

describe("TASK-055 AC-4: the search opens the deck; the canonical URL does not carry it", () => {
  it("adds view=cards to a search redirect, after the intent", () => {
    expect(searchTarget("/pl/nazwisko/kowalski", "default")).toBe(
      "/pl/nazwisko/kowalski?view=cards",
    );
    expect(searchTarget("/en/surname/kowalski", "map")).toBe(
      "/en/surname/kowalski?intent=map&view=cards",
    );
  });

  it("opens only for view=cards", () => {
    expect(deckRequested("cards")).toBe(true);
    expect(deckRequested(["cards", "page"])).toBe(true);
    for (const other of [undefined, "", "page", "CARDS"]) expect(deckRequested(other)).toBe(false);
  });

  it("never puts the deck's parameter in the canonical URL", () => {
    const metadata = metadataFor(
      {
        kind: "RESULT",
        response: FULL,
        display: "KOWALSKI",
        slug: "kowalski",
        otherLangPath: null,
        gates: { seoSurfaceAllowed: false, privacyPublic: true },
      },
      "pl",
      "kowalski",
    );
    const canonical = String(metadata.alternates?.canonical ?? "");
    expect(canonical).toBe("/pl/nazwisko/kowalski");
    expect(canonical).not.toContain(DECK_PARAM);
  });
});
