import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { StoredReportVersion } from "@name-atlas/truth";
import { resolved } from "./couple-fixture.js";
import { ReportDossier, toReportPreview } from "./report-view.js";
import type { ReportPreview } from "./report-view.js";

/**
 * TASK-120 AC-2 to AC-5: the dossier renders a stored version's validated
 * response and its frozen gaps, and nothing it was not given. SYNTHETIC: the
 * response is the couple fixture's, parsed by the contract.
 */

const ID = "01920000-0000-7000-8000-000000000001";
const SECTIONS = [
  "ORIGIN",
  "DISTRIBUTION",
  "TIMELINE",
  "ARCHIVES",
  "VARIANTS",
  "PLACES",
  "MIGRATION",
  "SOURCES",
  "LIMITATIONS",
] as const;

function stored(overrides: { response?: unknown; payload?: unknown } = {}): StoredReportVersion {
  const response =
    overrides.response ??
    resolved({ id: "00000000-0000-4000-8000-000000000001", display: "KOWALCZYK", meaning: true });
  return {
    report_version_id: ID,
    report_type: "NAME_ATLAS",
    version_number: 2,
    report_schema_version: "report@0",
    eligibility_state: "INSUFFICIENT_MEANINGFUL_CONTENT",
    generated_at: "2026-10-05T11:00:00Z",
    payload: overrides.payload ?? {
      response,
      coverage: {
        display_name: "KOWALCZYK",
        dimensions: [
          { dimension: "POPULATION", availability: "STRONG", reason_code: null },
          { dimension: "ARCHIVES", availability: "NOT_RETRIEVED", reason_code: "NOT_SEARCHED" },
        ],
      },
      eligibility: {
        state: "INSUFFICIENT_MEANINGFUL_CONTENT",
        reason_codes: ["ALL_SHOWN_FREE", "COVERAGE_BELOW_STANDARD"],
      },
    },
    sections: SECTIONS.map((section_type, i) => ({
      section_type,
      sequence_number: i + 1,
      title_payload: { message_key: `report.section.${section_type.toLowerCase()}` },
      body_payload: section_type === "SOURCES" ? { citation_ids: ["cit-1"] } : {},
      section_confidence_summary: {},
      claims:
        section_type === "ORIGIN" || section_type === "DISTRIBUTION"
          ? [{ claim_id: `00000000-0000-4000-8000-00000000000${i + 1}`, presentation_role: "HERO" }]
          : [],
    })),
  };
}

/**
 * TASK-124: a full-name report, PIOTR and KOWALCZYK. GENUINE first-name
 * figures: PIOTR's claims as derived from the full 2026-01-20 lists (TASK-122's
 * out-of-band run). The citations are SYNTHETIC in their ids and dates only.
 */
const citation = (id: string, resource: string) => ({
  id,
  title: "Lista imion występujących w rejestrze PESEL",
  publisher: "Ministerstwo Cyfryzacji",
  publication_date: "2026-01-20",
  source_type: "OFFICIAL_DATASET",
  locator: `resource:${resource}`,
  url: `https://api.dane.gov.pl/resources/${resource}/file`,
  attribution: null,
  terms: "CC0 1.0",
  retrieved_at: "2026-10-05T10:00:00Z",
  source_page_url: "https://dane.gov.pl/pl/dataset/1667",
});
const confidence = { status: "VERIFIED", methodology_code: "given_name_population@1" };
const PIOTR = {
  given_name: { id: "00000000-0000-4000-8000-0000000000aa", display_name: "PIOTR" },
  state: "READY",
  lists: [
    {
      comparability_group: "pesel_given_names_2026_first_female",
      snapshot_date: "2026-01-20",
      count: { claim_id: "c-f", count: 3, confidence, citation: citation("gn-f", "1159670") },
      rank: {
        claim_id: "r-f",
        rank: 14831,
        universe_size: 28781,
        ties_policy: "COMPETITION",
        confidence,
        citation: citation("gn-rf", "1159670"),
      },
    },
    {
      comparability_group: "pesel_given_names_2026_first_male",
      snapshot_date: "2026-01-20",
      count: { claim_id: "c-m", count: 682516, confidence, citation: citation("gn-m", "1159669") },
      rank: null,
    },
  ],
};

function fullName(given: unknown = PIOTR): StoredReportVersion {
  const base = stored();
  return {
    ...base,
    report_type: "FULL_NAME",
    report_schema_version: "full_name_report@0",
    payload: { ...(base.payload as object), given_name: given },
    sections: [
      {
        section_type: "GIVEN_NAME",
        sequence_number: 1,
        title_payload: { message_key: "report.section.given_name" },
        body_payload: {},
        section_confidence_summary: {},
        claims: [
          { claim_id: "00000000-0000-4000-8000-0000000000c1", presentation_role: "HERO" },
          { claim_id: "00000000-0000-4000-8000-0000000000c2", presentation_role: "HERO" },
          { claim_id: "00000000-0000-4000-8000-0000000000c3", presentation_role: "SUPPORT" },
        ],
      },
      ...base.sections.map((s) => ({
        ...s,
        sequence_number: s.sequence_number + 1,
        body_payload:
          s.section_type === "SOURCES"
            ? { citation_ids: ["gn-f", "gn-rf", "gn-m", "cit-1"] }
            : s.section_type === "LIMITATIONS"
              ? {
                  given_name: [
                    { topic: "MEANING", reason_code: "NO_ADMISSIBLE_SOURCE" },
                    { topic: "FULL_NAME_COUNT", reason_code: "NO_SOURCE_PAIRS_NAMES" },
                    {
                      topic: "RANK",
                      comparability_group: "pesel_given_names_2026_first_male",
                      reason_code: "NO_ACTIVE_CLAIM",
                    },
                  ],
                }
              : s.body_payload,
      })),
    ],
  };
}

function preview(s: StoredReportVersion = stored()): ReportPreview {
  const p = toReportPreview(s);
  if (p === null) throw new Error("not a report");
  return p;
}

const html = (p: ReportPreview, lang: "pl" | "en" = "pl") =>
  renderToStaticMarkup(createElement(ReportDossier, { preview: p, lang }));

describe("the report dossier (TASK-120)", () => {
  it("opens on a cover: the surname, version and date, internal test, and the verdict in words (AC-2)", () => {
    const page = html(preview());
    expect(page).toContain("KOWALCZYK");
    expect(page).toContain("Raport · wersja 2 · 5 października 2026 r.");
    expect(page).toContain("Test wewnętrzny — ten raport nie jest sprzedawany.");
    expect(page).toContain(
      "Nie kwalifikuje się do płatnego raportu, bo wszystko, co jest, widać już za darmo; o nazwisku jest za mało danych.",
    );
    expect(page).not.toContain("ALL_SHOWN_FREE");
  });

  it("lists the nine chapters, numbered, with what each holds (AC-2)", () => {
    const page = html(preview());
    for (const [i, title] of [
      "Pochodzenie nazwiska",
      "Liczebność i rozmieszczenie",
      "Zmiana w czasie",
      "Archiwa",
      "Dawne formy",
      "Dawne miejsca",
      "Migracje",
      "Źródła",
      "Czego nie wiemy",
    ].entries()) {
      expect(page).toContain(`<span class="report-num">${i + 1}</span> ${title}`);
    }
    expect(page).toContain("1 twierdzenie");
    expect(page).toContain("brak źródła");
    expect(page).toContain("1 źródło");
  });

  it("renders the frozen facts with footnotes into the bibliography (AC-3)", () => {
    const page = html(preview());
    expect(page).toContain("kowal");
    expect(page).toContain("Ocena: Prawdopodobne");
    expect(page).toContain('href="#zrodlo-1"');
    expect(page).toContain('id="zrodlo-1"');
    expect(page).toContain("Nazwiska występujące w rejestrze PESEL");
    expect(page).toContain("Ministerstwo Cyfryzacji, zasób 1148808, 2026-01-20");
    expect(page).toContain("00000000-0000-4000-8000-000000000001");
  });

  it("says what is missing instead of showing nothing or zero (AC-4)", () => {
    const page = html(preview());
    expect(page).toContain(
      "Jeszcze nie przeszukano: Name Atlas nie ma źródła dawnych form nazwiska.",
    );
    expect(page).toContain("Archiwa: jeszcze nie przeszukano");
    expect(page).not.toMatch(/>0</);
  });

  it("shows no figure from a response frozen under an earlier contract (AC-5)", () => {
    const old = {
      ...resolved({ id: "00000000-0000-4000-8000-000000000001", display: "KOWALCZYK" }),
      schema_version: "1.11",
    };
    const page = html(preview(stored({ response: old })));
    expect(page).toContain("KOWALCZYK");
    expect(page).toContain("zamrożona według wcześniejszej umowy danych");
    expect(page).not.toContain("Nazwiska występujące w rejestrze PESEL");
  });

  it("refuses a payload that is not a report's", () => {
    expect(toReportPreview(stored({ payload: { response: {} } }))).toBeNull();
    expect(toReportPreview(stored({ payload: "not a report" }))).toBeNull();
  });

  it("speaks English on the English page", () => {
    const page = html(preview(), "en");
    expect(page).toContain("Report · version 2 · 5 October 2026");
    expect(page).toContain("Internal test — this report is not for sale.");
    expect(page).toContain("Contents");
    expect(page).toContain("What we don&#x27;t know");
  });
});

describe("the full-name report's dossier (TASK-124)", () => {
  it("opens on the full name and puts the first name's chapter first", () => {
    const page = html(preview(fullName()));
    expect(page).toContain("Raport imienia i nazwiska · wersja 2 · 5 października 2026 r.");
    expect(page).toContain('<h1 class="report-title">PIOTR KOWALCZYK</h1>');
    expect(page).toContain('<span class="report-num">1</span> Imię');
    expect(page).toContain('<span class="report-num">10</span> Czego nie wiemy');
    expect(page).toContain("3 twierdzenia");
    // The surname's eligibility is not this report's verdict.
    expect(page).not.toContain("Nie kwalifikuje się do płatnego raportu");
    expect(page).toContain("Dlaczego sama część o nazwisku nie byłaby oferowana");
  });

  it("shows each list's count and rank apart, cited, and a missing rank as missing", () => {
    const page = html(preview(fullName()));
    expect(page).toContain("682\u00a0516");
    expect(page).toContain("14\u00a0831 z 28\u00a0781");
    expect(page).toContain("kobiety");
    expect(page).toContain("mężczyźni");
    expect(page).toContain("<td>brak</td>");
    expect(page).toContain("list nie sumujemy");
    expect(page).toContain('href="#zrodlo-1"');
    expect(page).toContain("Lista imion występujących w rejestrze PESEL");
    expect(page).toContain("zasób 1159669");
    expect(page).not.toContain("682\u00a0519");
  });

  it("says the meaning and a count of the two names together are not known", () => {
    const page = html(preview(fullName()));
    expect(page).toContain("Znaczenie imienia: żadne dzieło, które wolno nam cytować");
    expect(page).toContain("żadne źródło nie łączy imion z nazwiskami");
    expect(page).toContain("Miejsce na liście (mężczyźni): brak zatwierdzonego twierdzenia.");
    const en = html(preview(fullName()), "en");
    expect(en).toContain("Full-name report · version 2");
    expect(en).toContain("14,831 of 28,781");
    expect(en).toContain("no source pairs first names with surnames");
  });

  it("says why a name has no counts instead of showing zero", () => {
    const page = html(
      preview(fullName({ given_name: PIOTR.given_name, state: "UNAVAILABLE", lists: [] })),
    );
    expect(page).toContain("Brak zatwierdzonych danych.");
    expect(page).not.toMatch(/>0</);
  });

  it("refuses a full-name report whose first-name facts do not check", () => {
    expect(toReportPreview(fullName({ ...PIOTR, state: "READY", lists: [] }))).toBeNull();
    expect(
      toReportPreview(fullName({ ...PIOTR, lists: [{ ...PIOTR.lists[1], count: { count: -1 } }] })),
    ).toBeNull();
    expect(toReportPreview(fullName(null))).toBeNull();
  });
});

/**
 * TASK-147: MAŁGORZATA's origin and meaning, as the two committed files state
 * them (`sources/given-name-meanings/`), and her GENUINE count on the
 * 2026-01-20 women's list. The citations are SYNTHETIC in their ids and dates.
 */
const work = (id: string, title: string, author: string, year: number, locator: string) => ({
  id,
  title,
  publisher: author,
  publication_date: `${year}-01-01`,
  source_type: "DICTIONARY",
  locator,
  url: null,
  attribution: null,
  terms: "PUBLIC_DOMAIN_ART36",
  retrieved_at: "2026-10-06T10:00:00Z",
  source_page_url: null,
});
const YONGE_LOCATOR =
  "Glossary of Christian Names (pp. xviii–cxliii), s.v. Malgorzata, which refers to p. 121";
const BURYAN_LOCATOR = "s. 6 (skan ZBC oai:zbc.uz.zgora.pl:82526, str. PDF 8)";
const MALGORZATA = {
  given_name: { id: "00000000-0000-4000-8000-0000000000bb", display_name: "MAŁGORZATA" },
  state: "READY",
  lists: [
    {
      comparability_group: "pesel_given_names_2026_first_female",
      snapshot_date: "2026-01-20",
      count: { claim_id: "c-f", count: 572067, confidence, citation: citation("gn-f", "1159670") },
      rank: null,
    },
  ],
  meaning: {
    state: "READY",
    claim_id: "m-1",
    confidence: {
      status: "LIKELY",
      methodology_code: "onomastic_origin_agreement_rule@given_name_origin_confidence@1",
    },
    works: [
      {
        work: {
          title: "History of Christian Names",
          author_or_publisher: "Charlotte M. Yonge",
          year: 1884,
        },
        printed_form: "Malgorzata",
        origin: { code: "grc", as_printed: "Gr." },
        literal_gloss: "pearl",
        translation: { language: "pl", text: "perła", by: "Name Atlas" },
        locator: YONGE_LOCATOR,
        quotation: "Malgorzata, f. Pol. Gr. pearl, 121",
        citation: work(
          "w-y",
          "History of Christian Names",
          "Charlotte M. Yonge",
          1884,
          YONGE_LOCATOR,
        ),
      },
      {
        work: {
          title: "Skąd pochodzi twoje imię i nazwisko",
          author_or_publisher: "ks. Józef Buryan",
          year: 1933,
        },
        printed_form: "Małgorzata",
        origin: { code: "grc", as_printed: "z greckich" },
        literal_gloss: null,
        translation: null,
        locator: BURYAN_LOCATOR,
        quotation: "Z greckich przyjęły się: […] Adolf, Małgorzata, Teodor i dalsze.",
        citation: work(
          "w-b",
          "Skąd pochodzi twoje imię i nazwisko",
          "ks. Józef Buryan",
          1933,
          BURYAN_LOCATOR,
        ),
      },
    ],
  },
};
function withMeaning(given: unknown = MALGORZATA): StoredReportVersion {
  const base = fullName(given);
  return {
    ...base,
    report_schema_version: "full_name_report@1",
    sections: base.sections.map((s) =>
      s.section_type === "LIMITATIONS"
        ? {
            ...s,
            body_payload: {
              given_name: [{ topic: "FULL_NAME_COUNT", reason_code: "NO_SOURCE_PAIRS_NAMES" }],
            },
          }
        : s.section_type === "SOURCES"
          ? { ...s, body_payload: { citation_ids: ["gn-f", "w-y", "w-b", "cit-1"] } }
          : s,
    ),
  };
}

describe("the first name's origin and meaning (TASK-147)", () => {
  it("quotes each work with its page, and Name Atlas's translation marked as ours (AC-4)", () => {
    const page = html(preview(withMeaning()));
    expect(page).toContain("<h3>Pochodzenie i znaczenie</h3>");
    expect(page).toContain("greckie („Gr.”)");
    expect(page).toContain("greckie („z greckich”)");
    expect(page).toContain("„pearl”<br/>przekład Name Atlas: „perła”");
    expect(page).toContain("Przekład na polski jest nasz (Name Atlas)");
    expect(page).toContain(
      `Charlotte M. Yonge, History of Christian Names (1884), ${YONGE_LOCATOR}`,
    );
    expect(page).toContain("„Malgorzata, f. Pol. Gr. pearl, 121”");
    expect(page).toContain("Ocena: Prawdopodobne");
    expect(page).not.toContain("Znaczenie imienia: żadne dzieło");
  });

  it("cites both works in the bibliography, after the list they follow", () => {
    const page = html(preview(withMeaning()));
    const bibliography = page.slice(page.indexOf('<ol class="report-bib">'));
    expect(bibliography.indexOf("Lista imion")).toBeLessThan(
      bibliography.indexOf("History of Christian Names"),
    );
    expect(bibliography.indexOf("History of Christian Names")).toBeLessThan(
      bibliography.indexOf("Skąd pochodzi twoje imię i nazwisko"),
    );
  });

  it("shows the English meaning verbatim on the English page, without the translation", () => {
    const en = html(preview(withMeaning()), "en");
    expect(en).toContain("<h3>Origin and meaning</h3>");
    expect(en).toContain("Greek (“Gr.”)");
    expect(en).toContain("<td>“pearl”</td>");
    expect(en).not.toContain("perła");
    expect(en).toContain("Assessment: Likely");
  });

  it("renders a version frozen under full_name_report@0, with no meaning, as no source (AC-5)", () => {
    const old = preview(fullName());
    expect(old.givenName?.meaning).toEqual({ state: "NO_SOURCE" });
    const page = html(old);
    expect(page).toContain("<h3>Pochodzenie i znaczenie</h3>");
    expect(page).toContain("Znaczenie imienia: żadne dzieło, które wolno nam cytować");
  });

  it("refuses a meaning that does not check", () => {
    const broken = (patch: object) =>
      withMeaning({ ...MALGORZATA, meaning: { ...MALGORZATA.meaning, ...patch } });
    expect(toReportPreview(broken({ works: [] }))).toBeNull();
    expect(toReportPreview(broken({ state: "MAYBE" }))).toBeNull();
    expect(
      toReportPreview(
        broken({ works: [{ ...MALGORZATA.meaning.works[0], translation: { language: "pl" } }] }),
      ),
    ).toBeNull();
  });
});

/**
 * TASK-155: PIOTR as a first name given to children. GENUINE counts and ranks:
 * the boys' lists of 2020 and 2025 (`fixtures/pesel-given-name-births/`, the
 * full files of resources 28020 and 1159536), and their sums and cut-offs. The
 * history is shortened to three years, the citations' ids and dates and the
 * trend claim are SYNTHETIC; the trend's shares are the two years' own, and
 * its change_percent is the rule's threshold (TASK-139), as derived.
 */
const birthCitation = (id: string, resource: string, year: string) => ({
  id,
  title: "Imiona nadawane dzieciom w Polsce",
  publisher: "Ministerstwo Cyfryzacji",
  publication_date: year,
  source_type: "OFFICIAL_DATASET",
  locator: `resource:${resource}`,
  url: `https://api.dane.gov.pl/resources/${resource}/file`,
  attribution: null,
  terms: "CC0 1.0",
  retrieved_at: "2026-10-06T10:00:00Z",
  source_page_url: "https://dane.gov.pl/pl/dataset/219",
});
const boysList = (year: number, people_sum: number) => ({
  list_id: `list-m-${year}`,
  birth_year: year,
  sex: "MALE",
  publication_threshold: 2,
  people_sum,
});
const BOYS_2020 = {
  birth_year: 2020,
  list: boysList(2020, 186590),
  count: {
    claim_id: "bc-2020",
    count: 2839,
    share_per_million: 15215,
    one_in: 66,
    citation: birthCitation("b-2020", "28020", "2020"),
  },
  rank: {
    claim_id: "br-2020",
    rank: 23,
    universe_size: 799,
    citation: birthCitation("b-2020-r", "28020", "2020"),
  },
};
const BOYS_2025 = {
  birth_year: 2025,
  list: boysList(2025, 126404),
  count: {
    claim_id: "bc-2025",
    count: 1146,
    share_per_million: 9066,
    one_in: 110,
    citation: birthCitation("b-2025", "1159536", "2025"),
  },
  rank: {
    claim_id: "br-2025",
    rank: 29,
    universe_size: 965,
    citation: birthCitation("b-2025-r", "1159536", "2025"),
  },
};
const girlsYear = (year: number) => ({
  birth_year: year,
  list: { ...boysList(year, 1), list_id: `list-f-${year}`, sex: "FEMALE" },
  count: null,
  rank: null,
});
const BIRTHS = {
  given_name: PIOTR.given_name,
  state: "READY",
  sexes: [
    {
      sex: "MALE",
      latest: BOYS_2025,
      trend: {
        claim_id: "bt-2025",
        direction: "FALLING",
        latest_year: 2025,
        earlier_year: 2020,
        window_years: 5,
        change_percent: 10,
        latest_share_per_million: 9066,
        earlier_share_per_million: 15215,
        citations: [BOYS_2025.count.citation, BOYS_2020.count.citation],
      },
      history: [BOYS_2020, { birth_year: 2021, list: null, count: null, rank: null }, BOYS_2025],
    },
    {
      sex: "FEMALE",
      latest: girlsYear(2025),
      trend: null,
      history: [girlsYear(2020), girlsYear(2025)],
    },
  ],
};

function withBirths(births: unknown = BIRTHS): StoredReportVersion {
  const base = fullName({ ...PIOTR, meaning: { state: "NO_SOURCE" }, births });
  return {
    ...base,
    report_schema_version: "full_name_report@2",
    sections: base.sections.map((s) =>
      s.section_type === "SOURCES"
        ? {
            ...s,
            body_payload: { citation_ids: ["gn-f", "gn-rf", "gn-m", "b-2020", "b-2025", "cit-1"] },
          }
        : s,
    ),
  };
}

describe("the name given to children (TASK-155)", () => {
  it("shows each boys' year, oldest first, a year without a list, and the trend in words", () => {
    const page = html(preview(withBirths()));
    expect(page).toContain("<h3>Imię nadawane dzieciom</h3>");
    expect(page).toContain("<h4>Chłopcy</h4>");
    expect(page.indexOf("<td>2020</td>")).toBeLessThan(page.indexOf("<td>2025</td>"));
    expect(page).toContain("2\u00a0839");
    expect(page).toContain("23 z 799");
    expect(page).toContain("1\u00a0146");
    expect(page).toContain("29 z 965");
    expect(page).toContain("<td>brak listy z tego roku</td>");
    expect(page).toContain("Udział wśród dzieci: 2020 r. 1,5%, 2025 r. 0,9% — spada.");
    expect(page).toContain("udział zmienił się o ponad 10%");
    // The chapter's order: the register's lists, the children's lists, then the meaning.
    expect(page.indexOf("Imię nadawane dzieciom")).toBeLessThan(
      page.indexOf("<h3>Pochodzenie i znaczenie</h3>"),
    );
  });

  it("says the girls' lists never had the name, never zero", () => {
    const page = html(preview(withBirths()));
    expect(page).toContain(
      "Dziewczynki: imienia nie ma na żadnej z list z lat 2020–2025; nadano je mniej razy, niż wynosi próg listy.",
    );
    expect(page).not.toContain("<h4>Dziewczynki</h4>");
  });

  it("reads a year below the cut-off as below it, with the list's threshold", () => {
    const below = {
      ...BIRTHS,
      sexes: [
        {
          ...BIRTHS.sexes[0],
          history: [BOYS_2020, { ...BOYS_2025, count: null, rank: null }],
          latest: { ...BOYS_2025, count: null, rank: null },
          trend: null,
        },
      ],
    };
    const page = html(preview(withBirths(below)));
    expect(page).toContain("<td>poniżej progu listy (mniej niż 2)</td>");
    expect(html(preview(withBirths(below)), "en")).toContain(
      "<td>below the list&#x27;s cut-off (fewer than 2)</td>",
    );
  });

  it("lists each year's file once in the bibliography, the count's and the rank's citations alike", () => {
    const page = html(preview(withBirths()));
    const bibliography = page.slice(page.indexOf('<ol class="report-bib">'));
    expect(bibliography.match(/<li /g)).toHaveLength(6);
    expect(bibliography).toContain("Imiona nadawane dzieciom w Polsce");
    // The 2020 row: the count's mark [4], and no second mark for its rank.
    const row2020 = page.slice(page.indexOf("<td>2020</td>"), page.indexOf("<td>2021</td>"));
    expect(row2020.match(/href="#zrodlo-4"/g)).toHaveLength(1);
    // The trend cites both years' files.
    const trend = page.slice(page.indexOf("Udział wśród dzieci"));
    expect(trend).toContain('href="#zrodlo-5"');
    expect(trend).toContain('href="#zrodlo-4"');
  });

  it("speaks English on the English page", () => {
    const en = html(preview(withBirths()), "en");
    expect(en).toContain("<h3>Given to children</h3>");
    expect(en).toContain("<h4>Boys</h4>");
    expect(en).toContain("Share among children: 2020 1.5%, 2025 0.9% — falling.");
    expect(en).toContain("Girls: the name is on none of the lists of 2020–2025");
  });

  it("says when the name is on no list, and shows nothing for a version frozen before @2", () => {
    const none = { given_name: PIOTR.given_name, state: "NOT_ON_ANY_LIST", sexes: [] };
    expect(html(preview(withBirths(none)))).toContain(
      "Imię u dzieci: nie ma go na żadnej liście imion nadanych dzieciom od 2000 r.",
    );
    const old = preview(withMeaning());
    expect(old.givenName?.births).toBeNull();
    expect(html(old)).not.toContain("Imię nadawane dzieciom");
  });

  it("refuses figures that do not check", () => {
    const [sex] = BIRTHS.sexes;
    if (sex === undefined) throw new Error("no boys' figures");
    const broken = (patch: object) => toReportPreview(withBirths({ ...BIRTHS, ...patch }));
    expect(broken({ state: "MAYBE" })).toBeNull();
    expect(broken({ given_name: { id: "someone-else", display_name: "PAWEŁ" } })).toBeNull();
    expect(broken({ sexes: [] })).toBeNull();
    // A count with no list to stand on.
    expect(broken({ sexes: [{ ...sex, history: [{ ...BOYS_2020, list: null }] }] })).toBeNull();
    // A boys' figure on a girls' list.
    expect(
      broken({ sexes: [{ ...sex, history: [{ ...BOYS_2020, list: girlsYear(2020).list }] }] }),
    ).toBeNull();
    expect(broken({ sexes: [{ ...sex, trend: { ...sex.trend, direction: "UP" } }] })).toBeNull();
    expect(broken({ sexes: [{ ...sex, trend: { ...sex.trend, citations: [] } }] })).toBeNull();
  });
});
