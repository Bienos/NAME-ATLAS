import { PDFDocument } from "pdf-lib";
import { answerSlug, requestOrigin } from "./surname-page.js";
import { pageSlug } from "./slug.js";
import { sheetFacts, surnamePdfPath } from "./share-facts.js";
import { renderSurnameSheet } from "./share-sheet.js";
import { fileStem } from "./share-actions.js";
import { CACHE, PRIVATE, gateRefusal } from "./share-route.js";
import type { GateVerdict } from "./download-gate.js";
import type { Lang } from "./messages.js";

/**
 * The surname's PDF (TASK-107): `/pl/nazwisko/{slug}/pdf` and
 * `/en/surname/{slug}/pdf`. Since TASK-118 it is one A4 page, the surname's
 * sheet (`share-sheet.tsx`): every card the studio offers, each with its
 * source and date, drawn from the same validated facts as the card images.
 * Nothing is drawn that the cards do not already show. The download gate is
 * the card's (TASK-064): with accounts on, a reader needs a session.
 */

/** An A4 page in points; the sheet's 2480 × 3508 px fill it at 300 dpi. */
export const PDF_PAGE = { width: 595.28, height: 841.89 } as const;

/** The download's file name: `kowalski-name-atlas.pdf`. */
export function pdfFileName(surname: string): string {
  return `${fileStem(surname)}-name-atlas.pdf`;
}

/** A one-page PDF from the sheet's image, filling the page. */
export async function sheetPdf(
  image: Uint8Array,
  meta: { readonly title: string; readonly lang: Lang },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(meta.title);
  doc.setLanguage(meta.lang);
  doc.setAuthor("Name Atlas");
  doc.setCreator("Name Atlas");
  doc.setProducer("Name Atlas");
  const png = await doc.embedPng(image);
  const page = doc.addPage([PDF_PAGE.width, PDF_PAGE.height]);
  page.drawImage(png, { x: 0, y: 0, width: PDF_PAGE.width, height: PDF_PAGE.height });
  return doc.save();
}

export async function surnamePdfResponse(
  rawSlug: string,
  lang: Lang,
  hostHeader: string | null,
  gate: GateVerdict = "off",
): Promise<Response> {
  const refused = gateRefusal(gate);
  if (refused !== null) return refused;
  const answer = await answerSlug(pageSlug(rawSlug), null, lang);
  if (answer.kind === "UNAVAILABLE") {
    return new Response("Unavailable", { status: 503, headers: { "Retry-After": "60" } });
  }
  if (answer.kind === "MOVED") {
    const base = lang === "en" ? "/en/surname" : "/pl/nazwisko";
    return new Response(null, {
      status: 308,
      headers: { Location: surnamePdfPath(`${base}/${encodeURIComponent(answer.current_slug)}`) },
    });
  }
  if (answer.kind !== "RESULT") return new Response("Not found", { status: 404 });
  const origin = requestOrigin(hostHeader);
  const host = origin === null ? null : new URL(origin).host;
  const sheet = sheetFacts(answer.response, lang);
  if (sheet === null) return new Response("Not found", { status: 404 });
  const png = await renderSurnameSheet(sheet, host);
  const pdf = await sheetPdf(new Uint8Array(await png.arrayBuffer()), {
    title: `${answer.display} — Name Atlas`,
    lang,
  });
  return new Response(pdf, {
    status: 200,
    headers: {
      ...(gate === "open" ? PRIVATE : CACHE),
      "Content-Type": "application/pdf",
      "X-Robots-Tag": "noindex",
      "Content-Disposition": `attachment; filename="${pdfFileName(answer.display)}"`,
    },
  });
}
