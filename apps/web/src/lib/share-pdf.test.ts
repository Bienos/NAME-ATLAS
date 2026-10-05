import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { PDF_PAGE, pdfFileName, sheetPdf, surnamePdfResponse } from "./share-pdf.js";
import { surnamePdfPath } from "./share-facts.js";
import { SHEET_SCALE, SHEET_SIZE } from "./share-sheet.js";

/** TASK-107, TASK-118: the surname's sheet as a one-page PDF, behind the card's download gate. */

/** A 1 × 1 PNG, enough for pdf-lib to embed. */
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

describe("the surname's PDF (TASK-107, TASK-118)", () => {
  it("puts the sheet on one A4 page, with a title and language", async () => {
    const bytes = await sheetPdf(PNG, { title: "KOWALSKI — Name Atlas", lang: "pl" });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: PDF_PAGE.width, height: PDF_PAGE.height });
    expect(doc.getTitle()).toBe("KOWALSKI — Name Atlas");
  });

  it("draws the sheet in A4's proportions, at 300 dpi", () => {
    // A4 is 210 × 297 mm: 595.28 × 841.89 pt.
    expect(PDF_PAGE.height / PDF_PAGE.width).toBeCloseTo(297 / 210, 3);
    expect(SHEET_SIZE.height / SHEET_SIZE.width).toBeCloseTo(297 / 210, 3);
    expect(Math.round((SHEET_SIZE.width * SHEET_SCALE) / (210 / 25.4))).toBe(300);
  });

  it("names the file after the surname and sits beside the page", () => {
    expect(pdfFileName("ŻMUDA-TRZEBIATOWSKI")).toBe("zmuda-trzebiatowski-name-atlas.pdf");
    expect(surnamePdfPath("/pl/nazwisko/kowalski")).toBe("/pl/nazwisko/kowalski/pdf");
  });

  it("asks a reader without a session to sign in, and reads nothing (TASK-064)", async () => {
    const refused = await surnamePdfResponse("kowalski", "pl", "atlas.test", "sign-in");
    expect(refused.status).toBe(401);
    expect(refused.headers.get("Cache-Control")).toBe("no-store");
    const unavailable = await surnamePdfResponse("kowalski", "pl", "atlas.test", "unavailable");
    expect(unavailable.status).toBe(503);
  });
});
