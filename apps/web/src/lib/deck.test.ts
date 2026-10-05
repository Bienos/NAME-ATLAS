import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import { safeNext } from "./account-paths.js";
import { deckCards, deckFinish, studioCards } from "./deck.js";
import type { DeckCard } from "./deck.js";
import { DECK_PARAM, deckRequested, searchTarget } from "./deck-target.js";
import { Result } from "./result-view.js";
import { metadataFor } from "./surname-page.js";
import { SurnameDeck, fileStem } from "./deck-client.js";
import {
  SHARE_CARDS,
  isShareCard,
  shareCardFor,
  shareCardPath,
  shareFacts,
  sheetFacts,
  summaryFacts,
} from "./share-facts.js";
import type { ShareFacts } from "./share-facts.js";
import { shareCardResponse } from "./share-route.js";
import { Recap } from "./share-card.js";
import { UI } from "./messages.js";
import { comparePagePath } from "./site-links.js";

/** A module's source, for what only a browser could otherwise show. */
const source = (file: string): string =>
  readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");

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
  schema_version: "1.12",
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
  // SYNTHETIC: two real localities of the TERYT excerpt (TASK-039) stand in for
  // the section's shape; nothing here asserts that a locality named KOWALSKI exists.
  localities: {
    state: "READY",
    reference_date: "2026-01-01",
    places: [
      {
        place: { id: id(21), name: "Jemna", kind: "VILLAGE", teryt_simc: "0855434" },
        gmina: "Stoszowice",
        powiat: "ząbkowicki",
        voivodeship: "DOLNOŚLĄSKIE",
      },
      {
        place: { id: id(22), name: "Szklary", kind: "VILLAGE", teryt_simc: "0856623" },
        gmina: "Ząbkowice Śląskie",
        powiat: "ząbkowicki",
        voivodeship: "DOLNOŚLĄSKIE",
      },
    ],
    total: 3,
    confidence: {
      status: "VERIFIED",
      methodology_code: "official_name_exact_key@locality_match@1",
    },
    citation: {
      id: "cit-teryt",
      title: "TERYT",
      publisher: "GUS",
      publication_date: "2026-01-01",
      source_type: "OFFICIAL_DATASET",
      locator: "TERYT SIMC, wersja urzędowa, STAN_NA 2026-01-01",
      url: "https://eteryt.stat.gov.pl/eTeryt/rejestr_teryt/udostepnianie_danych/baza_teryt/uzytkownicy_indywidualni/pobieranie/pliki_pelne.aspx?contrast=default",
      attribution: null,
      terms: null,
      retrieved_at: "2026-09-30T01:26:29Z",
      source_page_url: "https://api.stat.gov.pl/Home/TerytApi?lang=en",
    },
    reason_code: null,
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
  // TASK-073: the first three KOWALSKI in Wikidata's answer captured on
  // 2026-10-03 (`fixtures/wikidata-bearers`), without their descriptions.
  bearers: {
    state: "READY",
    searched_on: "2026-10-03",
    total: 325,
    with_death_date: 159,
    people: [
      {
        wikidata_id: "Q558544",
        name: "Daniel Kowalski",
        description_pl: null,
        description_en: null,
        born: 1975,
        died: null,
        article_url: "https://pl.wikipedia.org/wiki/Daniel_Kowalski",
        wikidata_url: "https://www.wikidata.org/wiki/Q558544",
      },
      {
        wikidata_id: "Q17558303",
        name: "Stanisław Kowalski",
        description_pl: null,
        description_en: null,
        born: 1910,
        died: 2022,
        article_url: null,
        wikidata_url: "https://www.wikidata.org/wiki/Q17558303",
      },
      {
        wikidata_id: "Q86862",
        name: "Kerstin Kowalski",
        description_pl: null,
        description_en: null,
        born: 1976,
        died: null,
        article_url: null,
        wikidata_url: "https://www.wikidata.org/wiki/Q86862",
      },
    ],
    more: 322,
    confidence: { status: "VERIFIED", methodology_code: "wikidata_query_scope@wikidata_scope@1" },
    citation: {
      id: "cit-wikidata",
      title: "Wikidata",
      publisher: null,
      publication_date: null,
      source_type: "OTHER",
      locator: "Kowalski",
      url: "https://query.wikidata.org/",
      attribution: null,
      terms: "CC0",
      retrieved_at: "2026-10-03T12:05:00Z",
      source_page_url: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    },
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
  localities: {
    state: "NOT_LOADED",
    reference_date: null,
    places: [],
    total: null,
    confidence: null,
    citation: null,
    reason_code: "TERYT_NOT_LOADED",
    surface: SURFACE,
  },
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
  bearers: {
    state: "NOT_SEARCHED",
    searched_on: null,
    total: null,
    with_death_date: null,
    people: [],
    more: null,
    confidence: null,
    citation: null,
    reason_code: "BEARERS_NOT_SEARCHED",
    surface: { surface: "FREE", decision: "CONDITIONAL", reason_code: "COMMERCIAL_USE_UNRESOLVED" },
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
      "places",
      "bearers",
      "end",
    ]);
  });

  it("gives only the surname and the summary when only the count is ready", () => {
    expect(deckCards(COUNT_ONLY, "pl", LINKS).map((c) => c.key)).toEqual(["hello", "end"]);
    expect(deckCards(COUNT_ONLY, "en", LINKS).map((c) => c.key)).toEqual(["hello", "end"]);
  });

  it("gives no deck to a surname that did not resolve", () => {
    const unresolved = surnameResultResponseSchema.parse({
      schema_version: "1.12",
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
      bearers: null,
      neighbours: null,
      other_form: null,
      localities: null,
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
    expect(sources).toHaveLength(12);
    for (const source of sources.slice(0, -1)) expect(source).toMatch(/\b(19|20)\d\d\b/u);
  });

  it("lists the localities the page lists, with the line that a shared name is a coincidence", () => {
    const card = deckCards(FULL, "pl", LINKS).find((c) => c.key === "places");
    const html = faces(card === undefined ? [] : [card]);
    const page = text(renderToStaticMarkup(createElement(Result, { response: FULL, lang: "pl" })));
    for (const name of ["Jemna", "Szklary", "gm. Stoszowice, pow. ząbkowicki, woj. DOLNOŚLĄSKIE"]) {
      expect(html).toContain(name);
      expect(page).toContain(name);
    }
    expect(text(html)).toContain("i jeszcze 1");
    expect(page).toContain("i jeszcze 1");
    // The warning line, on the card itself, so a screenshot keeps it (ADR-0025 §2.7).
    expect(text(html)).toContain("Zbieżność nazw w rejestrze.");
    for (const lang of ["pl", "en"] as const) {
      const body = text(
        faces(deckCards(FULL, lang, LINKS).filter((c) => c.key === "places")),
      ).toLowerCase();
      for (const wrong of ["pochodzi", "comes from", "originat", "mieszka", "lives in"]) {
        expect(body, `${lang}: ${wrong}`).not.toContain(wrong);
      }
    }
  });

  it("has no localities card for a surname that matches no locality", () => {
    const none = surnameResultResponseSchema.parse({
      ...FULL_INPUT,
      localities: { ...FULL_INPUT.localities, places: [], total: 0 },
    });
    expect(deckCards(none, "pl", LINKS).map((c) => c.key)).not.toContain("places");
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

/** Every string a share card would print, in order. */
function shareText(facts: ShareFacts): string {
  const out: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value !== null && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk([
    facts.surname,
    facts.warning,
    facts.figure,
    facts.figureNote,
    facts.visual,
    facts.explanation,
  ]);
  return out.join(" ").replace(/[ \t\r\n]+/gu, " ");
}

describe("TASK-056 AC-1: a share card for each answer, with the page's own figures", () => {
  const FIGURE = /[\u2212+]?\d(?:[\d\u00a0,]*\d)?(?:[.,]\d+)?%?/gu;

  it("draws every card when every section is ready, in both languages", () => {
    for (const lang of ["pl", "en"] as const) {
      expect(SHARE_CARDS.filter((card) => shareFacts(FULL, card, lang) === null)).toEqual([]);
    }
  });

  for (const lang of ["pl", "en"] as const) {
    it(`prints only figures the page prints (${lang})`, () => {
      const page = text(renderToStaticMarkup(createElement(Result, { response: FULL, lang })));
      for (const card of SHARE_CARDS) {
        const facts = shareFacts(FULL, card, lang);
        if (facts === null) throw new Error(card);
        // Years of a period or an edition are labels, not figures, and are on the page as dates.
        const figures = [...new Set(shareText(facts).match(FIGURE) ?? [])];
        const missing = figures.filter((figure) => !page.includes(figure));
        expect(missing, `${lang}.${card}`).toEqual([]);
      }
    });
  }
});

describe("TASK-056 AC-2/AC-3: no card without an answer; every card explains and cites", () => {
  it("draws only the summary when only the count is ready", () => {
    expect(SHARE_CARDS.filter((card) => shareFacts(COUNT_ONLY, card, "pl") !== null)).toEqual([
      "summary",
    ]);
  });

  it("gives every card an explanation, and a source with a year", () => {
    for (const card of SHARE_CARDS) {
      const facts = shareFacts(FULL, card, "pl");
      expect(facts?.explanation.trim(), card).not.toBe("");
      expect(facts?.source, card).toMatch(/\b(1[0-9]|20)\d\d\b/u);
    }
  });

  it("states the coverage warning on the map card when coverage is low", () => {
    const where = shareFacts(FULL, "where", "pl");
    expect(where?.warning).toContain("22,5%");
    expect(where?.visual?.kind).toBe("map");
  });

  it("calls the other form a form, never a relative", () => {
    const other = shareFacts(FULL, "other", "en");
    expect(other?.explanation).toContain("It says nothing about kinship");
    expect(other?.surname).toBe("KOWALSKI · KOWALSKA");
  });

  it("leads with the surname's main list, as the deck does", () => {
    expect(shareFacts(kowalskaShape(), "rarity", "pl")?.figure).toBe("1 na 320");
    expect(shareFacts(kowalskaShape(), "change", "pl")?.figure).toBe("−3,7%");
  });
});

describe("TASK-056: the deck links each card to its image", () => {
  it("maps cards without an image of their own to one that has", () => {
    expect(shareCardFor("hello")).toBe("summary");
    expect(shareCardFor("catalogue")).toBe("print");
    expect(shareCardFor("end")).toBe("summary");
    expect(shareCardFor("rarity")).toBe("rarity");
    expect(isShareCard("hello")).toBe(false);
  });

  it("addresses the image beside the page, in the page's language", () => {
    expect(shareCardPath("/pl/nazwisko/kowalski", "rarity", "pl")).toBe(
      "/pl/nazwisko/kowalski/karta/rarity",
    );
    expect(shareCardPath("/en/surname/kowalski", "where", "en")).toBe(
      "/en/surname/kowalski/card/where",
    );
  });

  it("gives every deck card a share address in the studio, and the count-only deck the summary", () => {
    expect(deckCards(FULL, "pl", LINKS).every((card) => card.share !== null)).toBe(true);
    expect(deckCards(COUNT_ONLY, "pl", LINKS).map((card) => card.share)).toEqual([
      "/pl/nazwisko/kowalski/udostepnij?card=summary",
      "/pl/nazwisko/kowalski/udostepnij?card=summary",
    ]);
    // Each card's own image where it has one (TASK-093 follow-up: through the studio).
    const rarity = deckCards(FULL, "pl", LINKS).find((card) => card.key === "rarity");
    expect(rarity?.share).toBe("/pl/nazwisko/kowalski/udostepnij?card=rarity");
    const catalogue = deckCards(FULL, "pl", LINKS).find((card) => card.key === "catalogue");
    expect(catalogue?.share).toBe("/pl/nazwisko/kowalski/udostepnij?card=print");
  });

  it("names the downloaded file in ASCII, which every browser keeps", () => {
    expect(fileStem("DĄBROWSKI")).toBe("dabrowski");
    expect(fileStem("ŁUCZAK")).toBe("luczak");
    expect(fileStem("NOWAK-ŻÓŁĆ")).toBe("nowak-zolc");
    expect(fileStem("NGUYỄN")).toBe("nguyen");
    expect(fileStem("Ж")).toBe("name-atlas");
  });

  it("answers 404 for a card that does not exist, before it reads anything", async () => {
    const response = await shareCardResponse("kowalski", "horoscope", "pl", null);
    expect(response.status).toBe(404);
  });
});

/** FULL with the map's coverage above its threshold, so the summary may show the map. */
const COVERED: SurnameResultResponse = surnameResultResponseSchema.parse({
  ...FULL_INPUT,
  distribution: {
    ...FULL_INPUT.distribution,
    entries: [
      {
        ...FULL_INPUT.distribution.entries[0],
        coverage_state: "READY",
        regions: [
          {
            place_id: "01a0c057-0000-7000-8000-000000000014",
            terc_code: "14",
            display_name: "MAZOWIECKIE",
            count: 36_000,
            share_of_covered: 0.6,
          },
          {
            place_id: "01a0c057-0000-7000-8000-000000000012",
            terc_code: "12",
            display_name: "MAŁOPOLSKIE",
            count: 24_000,
            share_of_covered: 0.4,
          },
        ],
        covered_count: 60_000,
        coverage_ratio: 0.901,
      },
    ],
  },
});

describe("TASK-060 AC-1: the summary card's figures are the page's own", () => {
  // A figure: digits, grouped by a no-break space (Polish) or a comma
  // (English), with a decimal part, a sign or a per cent sign where it has one.
  const FIGURE = /[\u2212+]?\d(?:[\d\u00a0,]*\d)?(?:[.,]\d+)?%?/gu;

  for (const lang of ["pl", "en"] as const) {
    it(`holds in ${lang === "pl" ? "Polish" : "English"}`, () => {
      const page = text(renderToStaticMarkup(createElement(Result, { response: COVERED, lang })));
      const summary = summaryFacts(COVERED, lang);
      expect(summary).not.toBeNull();
      if (summary === null) return;
      const { counts, rarity, where, change, print } = summary;
      expect(counts.length).toBeGreaterThan(0);
      expect(rarity).not.toBeNull();
      expect(where).not.toBeNull();
      expect(change).not.toBeNull();
      expect(print).not.toBeNull();
      const shown = [
        ...counts.map((c) => c.value),
        rarity?.figure ?? "",
        rarity?.rank ?? "",
        where?.share ?? "",
        change?.figure ?? "",
        change?.span ?? "",
        print?.pages ?? "",
      ];
      const figures = [...new Set(shown.flatMap((x) => x.match(FIGURE) ?? []))];
      expect(figures.length).toBeGreaterThan(8);
      expect(figures.filter((figure) => !page.includes(figure))).toEqual([]);
    });
  }

  it("leaves the map out where the coverage is low, as the page withholds its figures", () => {
    for (const lang of ["pl", "en"] as const) {
      expect(summaryFacts(FULL, lang)?.where).toBeNull();
      expect(summaryFacts(COVERED, lang)?.where?.region).not.toBe("");
    }
  });

  it("leads with the surname's main list, names the list on every figure that has one", () => {
    const s = summaryFacts(kowalskaShape(), "pl");
    expect(s?.counts.map((c) => c.list)).toEqual(["kobiety", "mężczyźni"]);
    expect(s?.rarity?.figure).toBe("1 na 320");
    expect(s?.rarity?.list).toBe("kobiety");
    expect(s?.change?.figure).toBe("\u22123,7%");
    expect(s?.change?.list).toBe("kobiety");
    expect(s?.where?.list).not.toBe("");
  });

  it("keeps the meaning's own source out of the figures' sources, and on the story card's line", () => {
    const s = summaryFacts(FULL, "pl");
    expect(s?.meaning).not.toBeNull();
    const own = s?.meaning?.source ?? "";
    expect(own).not.toBe("");
    expect(s?.sources.join(" ")).not.toContain(own);
    const facts = shareFacts(FULL, "summary", "pl");
    expect(facts?.source).toContain(own);
    for (const source of s?.sources ?? []) expect(facts?.source).toContain(source);
  });

  it("names the list beside the rarity on the deck's last card too", () => {
    const end = deckCards(FULL, "pl", LINKS).at(-1);
    const html = faces(end === undefined ? [] : [end]);
    expect(html).toMatch(/Rzadkość · (mężczyźni|kobiety)/u);
  });
});

describe("TASK-060 AC-2: a section that is not ready leaves its slot out", () => {
  it("has only the counts, and a name for them, when only the count is ready", () => {
    for (const lang of ["pl", "en"] as const) {
      const s = summaryFacts(COUNT_ONLY, lang);
      expect(s).not.toBeNull();
      expect(s?.counts.length).toBeGreaterThan(0);
      expect(s?.rarity).toBeNull();
      expect(s?.where).toBeNull();
      expect(s?.change).toBeNull();
      expect(s?.print).toBeNull();
      expect(s?.meaning).toBeNull();
      expect(s?.sources.every((x) => x.startsWith("PESEL"))).toBe(true);
    }
  });

  it("is nothing for a surname that did not resolve", () => {
    const unresolved = surnameResultResponseSchema.parse({
      schema_version: "1.12",
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
      bearers: null,
      neighbours: null,
      other_form: null,
      localities: null,
    });
    expect(summaryFacts(unresolved, "pl")).toBeNull();
    expect(shareFacts(unresolved, "summary", "pl")).toBeNull();
  });
});

describe("TASK-060 AC-1 + TASK-059: the story card's chip draws a change's sign in the interface face", () => {
  it("sets a growing surname's plus in Instrument Sans, never in Fraunces", () => {
    const base = summaryFacts(FULL, "pl");
    expect(base?.change).not.toBeNull();
    if (base === null || base.change === null) return;
    const grown = { ...base, change: { ...base.change, figure: "+0,9%" } };
    const html = renderToStaticMarkup(createElement(Recap, { summary: grown }));
    expect(html).toMatch(/font-family:Instrument Sans[^>]*>\+<\/div>/u);
    expect(html).toContain(">0,9%</div>");
    expect(html).not.toContain(">+0,9%<");
  });

  it("draws every slot of a full summary, and only those that have facts", () => {
    const full = summaryFacts(COVERED, "pl");
    expect(full).not.toBeNull();
    if (full === null) return;
    const all = text(renderToStaticMarkup(createElement(Recap, { summary: full })));
    const parts = [
      full.counts[0]?.value,
      full.rarity?.figure,
      full.where?.region,
      full.print?.pages,
      full.meaning?.gloss,
    ];
    expect(parts.every((x) => x !== undefined && x !== "")).toBe(true);
    for (const part of parts) expect(all).toContain(part);
    const bare = summaryFacts(COUNT_ONLY, "pl");
    if (bare === null) throw new Error("count-only summary expected");
    const some = renderToStaticMarkup(createElement(Recap, { summary: bare }));
    expect(some).toContain(bare.counts[0]?.value);
    expect(some).not.toContain("<svg");
    expect(some).not.toContain("Instrument Sans");
  });
});

describe("TASK-093 AC-1: the deck's last card leads out of the deck, to the share studio", () => {
  it("has one primary link to the studio's summary, then only the full page and another surname", () => {
    for (const [lang, path, studio] of [
      ["pl", "/pl/nazwisko/kowalski", "/pl/nazwisko/kowalski/udostepnij?card=summary"],
      ["en", "/en/surname/kowalski", "/en/surname/kowalski/share?card=summary"],
    ] as const) {
      const cards = deckCards(FULL, lang, { path, shareUrl: `https://atlas.test${path}` });
      const end = cards[cards.length - 1];
      expect(end?.key).toBe("end");
      const html = faces(end === undefined ? [] : [end]);
      expect(html).toContain(`class="dk-finish" href="${studio}"`);
      expect(html).toContain(UI[lang].deckFinish);
      expect(html).toContain(`href="${path}"`);
      expect(html).toContain('href="#surname"');
      // Moved to the studio (TASK-093 §3.1): the page's link, the comparison and the offer.
      expect(html).not.toContain(lang === "pl" ? "/pl/oferta" : "/en/offer");
      expect(html).not.toContain(comparePagePath(lang));
      expect(html).not.toContain('class="share"');
      expect(deckFinish(FULL, lang, path)).toBe(studio);
    }
  });

  it("offers the studio only the cards the surname has, the summary first", () => {
    const all = studioCards(FULL, "pl");
    expect(all[0]).toBe("summary");
    expect(new Set(all).size).toBe(all.length);
    for (const card of all) expect(shareFacts(FULL, card, "pl")).not.toBeNull();
    for (const card of SHARE_CARDS.filter((c) => !all.includes(c))) {
      expect(shareFacts(FULL, card, "pl")).toBeNull();
    }
    const few = studioCards(COUNT_ONLY, "pl");
    expect(few.length).toBeLessThan(all.length);
    for (const card of few) expect(shareFacts(COUNT_ONLY, card, "pl")).not.toBeNull();
  });

  it("makes the deck's next control on the last card a link to the studio", () => {
    expect(source("deck-client.tsx")).toMatch(
      /at === last && finish !== null \? \(\s*<a className="deck-nav deck-finish" href=\{finish\.href\}/u,
    );
    expect(source("deck-client.tsx")).toMatch(
      /if \(at === last && finish !== null\) location\?\.assign\(finish\.href\);/u,
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
          share: "s",
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

describe("TASK-093 follow-up: the deck's share button leads to the studio", () => {
  it("is a link to the card's studio, not a fetch of the image", () => {
    const client = source("deck-client.tsx");
    expect(client).toMatch(/<a className="deck-share" href=\{current\.share\}>/u);
    expect(client).not.toContain("shareOrSave");
    expect(client).not.toContain("deck-gate");
  });

  it("gives every share address a studio address the sign-in will return to", () => {
    for (const card of deckCards(FULL, "pl", LINKS)) {
      if (card.share !== null) expect(safeNext(card.share), card.key).toBe(card.share);
    }
  });
});

describe("TASK-073: the known people's card", () => {
  it("lists the first three with their years, the count and the date, and says a surname is not a family", () => {
    const card = deckCards(FULL, "pl", LINKS).find((c) => c.key === "bearers");
    expect(card?.title).toBe(UI.pl.deckBearers);
    const face = text(faces(card === undefined ? [] : [card]));
    expect(face).toContain("Daniel Kowalski");
    expect(face).toContain("ur. 1975");
    expect(face).toContain("1910–2022");
    expect(face).toContain("Wikidata · 325");
    expect(face).toContain(UI.pl.bearersCaveat);
  });

  it("links each person to Wikipedia when there is an article, and always to Wikidata", () => {
    const card = deckCards(FULL, "pl", LINKS).find((c) => c.key === "bearers");
    const html = faces(card === undefined ? [] : [card]);
    expect(html).toContain('href="https://pl.wikipedia.org/wiki/Daniel_Kowalski"');
    expect(html.match(/href="https:\/\/[a-z]+\.wikipedia\.org/gu)).toHaveLength(1);
    expect(html).toContain('href="https://www.wikidata.org/wiki/Q17558303"');
    expect(html.match(/target="_blank"/gu)).toHaveLength(4);
  });

  it("is left out when Wikidata names nobody, or has not been asked", () => {
    const none = surnameResultResponseSchema.parse({
      ...FULL_INPUT,
      bearers: {
        ...(FULL_INPUT as { bearers: Record<string, unknown> }).bearers,
        total: 0,
        with_death_date: 0,
        people: [],
        more: 0,
      },
    });
    expect(deckCards(none, "pl", LINKS).map((c) => c.key)).not.toContain("bearers");
    expect(deckCards(COUNT_ONLY, "pl", LINKS).map((c) => c.key)).not.toContain("bearers");
  });

  it("shares the summary, having no image of its own", () => {
    const card = deckCards(FULL, "pl", LINKS).find((c) => c.key === "bearers");
    expect(card?.share).toMatch(/\/udostepnij\?card=summary$/u);
  });
});

describe("TASK-118: the one-page sheet says only what the cards say", () => {
  it("holds every card the studio offers, each with the card's own facts", () => {
    for (const lang of ["pl", "en"] as const) {
      const sheet = sheetFacts(FULL, lang);
      expect(Object.keys(sheet?.cards ?? {}).sort()).toEqual([...studioCards(FULL, lang)].sort());
      for (const card of studioCards(FULL, lang)) {
        expect(sheet?.cards[card], `${lang}.${card}`).toEqual(shareFacts(FULL, card, lang));
      }
    }
  });

  it("takes the counts and their sources from the summary card", () => {
    const summary = summaryFacts(FULL, "pl");
    const sheet = sheetFacts(FULL, "pl");
    expect(sheet?.surname).toBe("KOWALSKI");
    expect(sheet?.counts).toEqual(summary?.counts);
    expect(sheet?.sources).toEqual(summary?.sources);
    expect(sheet?.sources.join(" ")).toMatch(/\b20\d\d\b/u);
  });

  it("has only the counts when only the count is ready, and nothing for no answer", () => {
    const few = sheetFacts(COUNT_ONLY, "pl");
    expect(Object.keys(few?.cards ?? {})).toEqual(["summary"]);
    expect(few?.counts.length).toBeGreaterThan(0);
    const unresolved = surnameResultResponseSchema.parse({
      schema_version: "1.12",
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
      bearers: null,
      neighbours: null,
      other_form: null,
      localities: null,
    });
    expect(sheetFacts(unresolved, "pl")).toBeNull();
  });
});
