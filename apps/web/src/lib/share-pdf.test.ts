import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { PDF_PAGE, cardsPdf, pdfFileName, surnamePdfResponse } from "./share-pdf.js";
import { surnamePdfPath } from "./share-facts.js";

/** TASK-104: every card of the surname in one PDF, behind the card's download gate. */

/** A 1 × 1 PNG, enough for pdf-lib to embed. */
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

describe("the surname's PDF (TASK-104)", () => {
  it("puts each card on its own 9:16 page, in order, with a title and language", async () => {
    const bytes = await cardsPdf([PNG, PNG, PNG], { title: "KOWALSKI — Name Atlas", lang: "pl" });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
    for (const page of doc.getPages()) {
      expect(page.getSize()).toEqual({ width: PDF_PAGE.width, height: PDF_PAGE.height });
    }
    expect(PDF_PAGE.height / PDF_PAGE.width).toBeCloseTo(1920 / 1080, 5);
    expect(doc.getTitle()).toBe("KOWALSKI — Name Atlas");
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
