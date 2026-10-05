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
    expect(page).toContain("Znaczenie imienia: nie ma jeszcze słownika");
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
