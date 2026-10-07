import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import type { ComposeReaderReportOutcome } from "@name-atlas/truth";
import { readerReportPdfResponse } from "./report-reader-pdf.js";
import type { ReaderPdfDeps } from "./report-reader-pdf.js";
import { SAMPLE_REPORT, SAMPLE_RESPONSE } from "./report-sample.js";
import type { PageAnswer } from "./surname-page.js";

/**
 * TASK-173: a signed-in reader's own report as a PDF, while it is free. The
 * composed report here is the invented sample's, in the shape
 * `composeReaderReport` returns: never stored, no id, version 0.
 */

const RESULT: PageAnswer = {
  kind: "RESULT",
  response: SAMPLE_RESPONSE,
  display: "WRZOSOWIECKA",
  slug: "wrzosowiecka",
  otherLangPath: null,
  gates: { seoSurfaceAllowed: false, privacyPublic: true },
};

const COMPOSED: ComposeReaderReportOutcome = {
  kind: "COMPOSED",
  version: {
    ...(JSON.parse(JSON.stringify(SAMPLE_REPORT)) as typeof SAMPLE_REPORT),
    report_version_id: "",
    version_number: 0,
    generated_at: "2026-10-07T18:00:00Z",
  },
};

const deps = (over: Partial<ReaderPdfDeps> = {}) => ({
  answer: vi.fn(async (): Promise<PageAnswer> => RESULT),
  compose: vi.fn(async (): Promise<ComposeReaderReportOutcome> => COMPOSED),
  ...over,
});

const url = (query: string, lang: "pl" | "en" = "pl") =>
  new URL(
    `https://name-atlas.test${lang === "pl" ? "/pl/nazwisko/wrzosowiecka/pelny-raport/pdf" : "/en/surname/wrzosowiecka/full-report/pdf"}${query}`,
  );

const BACK = "/pl/nazwisko/wrzosowiecka/pelny-raport?imie=Wielimira";

describe("a signed-in reader's report as a PDF (TASK-173)", () => {
  it("gives a reader with a session their report, composed for the typed name, private and never indexed", async () => {
    const d = deps();
    const response = await readerReportPdfResponse(
      "pl",
      "wrzosowiecka",
      url("?imie=Wielimira"),
      "open",
      d,
      true,
    );
    expect(response.status).toBe(200);
    expect(d.compose).toHaveBeenCalledWith({ givenName: "Wielimira", surname: "WRZOSOWIECKA" });
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="wielimira-wrzosowiecka-raport.pdf"',
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    const out = process.env["REPORT_PDF_OUT"];
    if (out !== undefined && out !== "") writeFileSync(join(out, "reader-pl.pdf"), bytes);
    const doc = await PDFDocument.load(bytes);
    // A reader's copy: no sample's mark.
    expect(doc.getTitle()).toBe("WIELIMIRA WRZOSOWIECKA · Name Atlas");
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(5);
  }, 30_000);

  it("sends a reader without a session, or with accounts off, back to the page with the name", async () => {
    for (const gate of ["sign-in", "off"] as const) {
      const d = deps();
      const response = await readerReportPdfResponse(
        "pl",
        "wrzosowiecka",
        url("?imie=Wielimira"),
        gate,
        d,
        true,
      );
      expect(response.status, gate).toBe(303);
      expect(response.headers.get("location"), gate).toBe(BACK);
      expect(d.compose, gate).not.toHaveBeenCalled();
    }
  });

  it("gives nothing once the free report has ended, and sends the reader back", async () => {
    const d = deps();
    const response = await readerReportPdfResponse(
      "pl",
      "wrzosowiecka",
      url("?imie=Wielimira"),
      "open",
      d,
      false,
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(BACK);
    expect(d.compose).not.toHaveBeenCalled();
  });

  it("sends a missing, too long, unknown or held name back to the page, which says why", async () => {
    const none = await readerReportPdfResponse("pl", "wrzosowiecka", url(""), "open", deps(), true);
    expect(none.headers.get("location")).toBe("/pl/nazwisko/wrzosowiecka/pelny-raport");
    const long = await readerReportPdfResponse(
      "pl",
      "wrzosowiecka",
      url(`?imie=${"x".repeat(61)}`),
      "open",
      deps(),
      true,
    );
    expect(long.status).toBe(303);
    for (const kind of ["GIVEN_NAME_NOT_FOUND", "GIVEN_NAME_UNREVIEWED"] as const) {
      const outcome = (
        kind === "GIVEN_NAME_NOT_FOUND"
          ? { kind }
          : { kind, form_review: "INITIAL_OR_ABBREVIATION" }
      ) as ComposeReaderReportOutcome;
      const response = await readerReportPdfResponse(
        "pl",
        "wrzosowiecka",
        url("?imie=Wielimira"),
        "open",
        deps({ compose: vi.fn(async () => outcome) }),
        true,
      );
      expect(response.status, kind).toBe(303);
      expect(response.headers.get("location"), kind).toBe(BACK);
    }
  });

  it("answers 503, never an empty file, when it cannot read or the claims moved", async () => {
    const outcomes: (() => Promise<ComposeReaderReportOutcome>)[] = [
      async () => ({ kind: "CLAIMS_CHANGED" }),
      async () => ({ kind: "UNAVAILABLE", reason: "down" }),
      async () => {
        throw new Error("down");
      },
      // A report of another surname than the address names.
      async () => ({
        ...COMPOSED,
        version: {
          ...(COMPOSED as Extract<ComposeReaderReportOutcome, { kind: "COMPOSED" }>).version,
          payload: {
            ...((COMPOSED as Extract<ComposeReaderReportOutcome, { kind: "COMPOSED" }>).version
              .payload as Record<string, unknown>),
            response: {
              ...SAMPLE_RESPONSE,
              surname: { ...SAMPLE_RESPONSE.surname, id: "00000000-0000-4000-8000-0000000000ff" },
            },
          },
        },
      }),
    ];
    for (const compose of outcomes) {
      const response = await readerReportPdfResponse(
        "pl",
        "wrzosowiecka",
        url("?imie=Wielimira"),
        "open",
        deps({ compose: vi.fn(compose) }),
        true,
      );
      expect(response.status).toBe(503);
    }
    const gate = await readerReportPdfResponse(
      "pl",
      "wrzosowiecka",
      url("?imie=Wielimira"),
      "unavailable",
      deps(),
      true,
    );
    expect(gate.status).toBe(503);
  });

  it("follows a moved address, and answers 404 for no surname", async () => {
    const moved = await readerReportPdfResponse(
      "en",
      "old",
      url("?name=Wielimira", "en"),
      "open",
      deps({
        answer: vi.fn(async (): Promise<PageAnswer> => ({ kind: "MOVED", current_slug: "new" })),
      }),
      true,
    );
    expect(moved.status).toBe(308);
    expect(moved.headers.get("location")).toBe("/en/surname/new/full-report/pdf?name=Wielimira");
    const unknown = await readerReportPdfResponse(
      "pl",
      "zzz",
      url("?imie=Wielimira"),
      "open",
      deps({ answer: vi.fn(async (): Promise<PageAnswer> => ({ kind: "UNKNOWN", slug: "zzz" })) }),
      true,
    );
    expect(unknown.status).toBe(404);
    const gone = await readerReportPdfResponse(
      "pl",
      "wrzosowiecka",
      url("?imie=Wielimira"),
      "open",
      deps({
        compose: vi.fn(async (): Promise<ComposeReaderReportOutcome> => ({ kind: "NOT_RESOLVED" })),
      }),
      true,
    );
    expect(gone.status).toBe(404);
  });
});
