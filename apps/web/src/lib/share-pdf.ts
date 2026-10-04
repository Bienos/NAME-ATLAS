import { PDFDocument } from "pdf-lib";
import { answerSlug, requestOrigin } from "./surname-page.js";
import { pageSlug } from "./slug.js";
import { shareFacts, surnamePdfPath } from "./share-facts.js";
import { renderShareCard } from "./share-card.js";
import { studioCards } from "./deck.js";
import { fileStem } from "./share-actions.js";
import { CACHE, PRIVATE, gateRefusal } from "./share-route.js";
import type { GateVerdict } from "./download-gate.js";
import type { Lang } from "./messages.js";

/**
 * The surname's PDF (TASK-107): `/pl/nazwisko/{slug}/pdf` and
 * `/en/surname/{slug}/pdf`. Every card the studio offers, summary first, one
 * per page, each the same validated image as its share card with its source
 * and date. Nothing is drawn that the cards do not already show. The download
 * gate is the card's (TASK-064): with accounts on, a reader needs a session.
 */

/** A 9:16 page, 1080 × 1920 px drawn at 192 dpi. */
export const PDF_PAGE = { width: 405, height: 720 } as const;

/** The download's file name: `kowalski-name-atlas.pdf`. */
export function pdfFileName(surname: string): string {
  return `${fileStem(surname)}-name-atlas.pdf`;
}

/** One PDF from the card images, in order, each filling its page. */
export async function cardsPdf(
  images: readonly Uint8Array[],
  meta: { readonly title: string; readonly lang: Lang },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(meta.title);
  doc.setLanguage(meta.lang);
  doc.setAuthor("Name Atlas");
  doc.setCreator("Name Atlas");
  doc.setProducer("Name Atlas");
  for (const bytes of images) {
    const image = await doc.embedPng(bytes);
    const page = doc.addPage([PDF_PAGE.width, PDF_PAGE.height]);
    page.drawImage(image, { x: 0, y: 0, width: PDF_PAGE.width, height: PDF_PAGE.height });
  }
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
  const images: Uint8Array[] = [];
  for (const card of studioCards(answer.response, lang)) {
    const facts = shareFacts(answer.response, card, lang);
    if (facts === null) continue;
    const png = await renderShareCard(facts, host);
    images.push(new Uint8Array(await png.arrayBuffer()));
  }
  if (images.length === 0) return new Response("Not found", { status: 404 });
  const pdf = await cardsPdf(images, { title: `${answer.display} — Name Atlas`, lang });
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
