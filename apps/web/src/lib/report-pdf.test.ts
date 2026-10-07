import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import { FULL_NAME_SECTION_TYPES } from "@name-atlas/truth";
import { renderReportPdf, reportPdfFileName } from "./report-pdf.js";
import { SAMPLE_GIVEN_NAME, SAMPLE_REPORT, SAMPLE_RESPONSE } from "./report-sample.js";
import { toReportPreview } from "./report-view.js";

/**
 * TASK-172: the report as a PDF, and the invented sample it is shown with.
 * Set `REPORT_PDF_OUT` to a directory to keep the rendered files for a look.
 */

const preview = () => {
  // Through JSON, as a stored version's payload comes from the database.
  const p = toReportPreview(JSON.parse(JSON.stringify(SAMPLE_REPORT)));
  if (p === null) throw new Error("the sample is not a report");
  return p;
};

describe("the invented sample report (TASK-172)", () => {
  it("is a full-name report the preview's parser accepts, every chapter filled", () => {
    expect(surnameResultResponseSchema.safeParse(SAMPLE_RESPONSE).success).toBe(true);
    const p = preview();
    expect(p.displayName).toBe("WIELIMIRA WRZOSOWIECKA");
    expect(p.sections.map((s) => s.type)).toEqual([...FULL_NAME_SECTION_TYPES]);
    expect(p.response?.status).toBe("RESOLVED");
    expect(p.givenName?.state).toBe("READY");
    expect(p.givenName?.births?.state).toBe("READY");
    expect(p.givenName?.meaning.state).toBe("READY");
    for (const key of ["population", "rarity", "distribution", "change", "archive"] as const) {
      expect(p.response?.[key]?.state, key).toBe("READY");
    }
    expect(p.response?.meaning?.state).toBe("AVAILABLE");
  });

  it("names no real person, place-list neighbour or publisher", () => {
    const json = JSON.stringify(SAMPLE_REPORT);
    expect(SAMPLE_RESPONSE.bearers?.people).toEqual([]);
    expect(SAMPLE_RESPONSE.neighbours?.lists).toEqual([]);
    expect(json).not.toMatch(/Ministerstwo|dane\.gov\.pl|Polona|PESEL, Ministerstwo|https?:/u);
    // Every source says it is invented.
    const titles = [...json.matchAll(/"title":"([^"]+)"/gu)].map((m) => m[1] ?? "");
    expect(titles.length).toBeGreaterThan(5);
    for (const title of titles) expect(title, title).toMatch(/dane zmyślone/u);
  });

  it("keeps the boys' and girls' figures apart and never writes 0 for an absence", () => {
    const births = SAMPLE_GIVEN_NAME.births;
    expect(births?.state).toBe("READY");
    const boys = births?.sexes.find((s) => s.sex === "MALE");
    expect(boys?.on_any_list).toBe(false);
    expect(boys?.history?.every((y) => y.count === null)).toBe(true);
    const girls = births?.sexes.find((s) => s.sex === "FEMALE");
    expect(girls?.history?.some((y) => y.count?.count === 0)).toBe(false);
  });
});

describe("the report as a PDF (TASK-172)", () => {
  for (const lang of ["pl", "en"] as const) {
    it(`renders the sample in ${lang}: A4 pages, a cover, "in short" and the chapters`, async () => {
      const bytes = await renderReportPdf(preview(), lang, { sample: true });
      const out = process.env["REPORT_PDF_OUT"];
      if (out !== undefined && out !== "") writeFileSync(join(out, `sample-${lang}.pdf`), bytes);
      expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(5);
      for (const page of doc.getPages()) {
        expect(Math.round(page.getWidth())).toBe(595);
        expect(Math.round(page.getHeight())).toBe(842);
      }
      expect(doc.getTitle()).toBe(
        `WIELIMIRA WRZOSOWIECKA · Name Atlas · ${lang === "pl" ? "PRZYKŁAD" : "SAMPLE"}`,
      );
      expect(doc.getAuthor()).toBe("Name Atlas");
    }, 30_000);
  }

  it("titles a real report without the sample's mark", async () => {
    const bytes = await renderReportPdf(preview(), "pl");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getTitle()).toBe("WIELIMIRA WRZOSOWIECKA · Name Atlas");
  }, 30_000);

  it("names the file after the names, without diacritics", () => {
    expect(reportPdfFileName("WIELIMIRA WRZOSOWIECKA", "pl")).toBe(
      "wielimira-wrzosowiecka-raport.pdf",
    );
    expect(reportPdfFileName("ŁUCJA ŻÓŁĆ", "en")).toBe("lucja-zolc-report.pdf");
    expect(reportPdfFileName("", "pl")).toBe("name-atlas-raport.pdf");
  });
});

describe("the sample's address (TASK-172)", () => {
  it("serves the PDF inline, cached and never indexed", async () => {
    const { SAMPLE_REPORT_PATHS, sampleReportResponse } = await import("./report-sample-route.js");
    expect(SAMPLE_REPORT_PATHS).toEqual({
      pl: "/pl/przykladowy-raport.pdf",
      en: "/en/sample-report.pdf",
    });
    const response = await sampleReportResponse("pl");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("cache-control")).toMatch(/^public, /u);
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="przykladowy-raport.pdf"',
    );
    const doc = await PDFDocument.load(new Uint8Array(await response.arrayBuffer()));
    expect(doc.getTitle()).toMatch(/PRZYKŁAD$/u);
  }, 30_000);
});
