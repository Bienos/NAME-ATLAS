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
