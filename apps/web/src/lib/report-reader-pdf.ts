import { composeReaderReport } from "@name-atlas/truth";
import type { ComposeReaderReportOutcome } from "@name-atlas/truth";
import { db } from "./db.js";
import type { GateVerdict } from "./download-gate.js";
import type { Lang } from "./messages.js";
import { renderReportPdf, reportPdfFileName } from "./report-pdf.js";
import {
  readerReportPdfHref,
  reportFree,
  reportInsidePath,
  reportInsideQueryKey,
} from "./report-teaser-text.js";
import { toReportPreview } from "./report-view.js";
import { pageSlug } from "./slug.js";
import { answerSlugForMetadata, canonicalPathFor } from "./surname-page.js";
import type { PageAnswer } from "./surname-page.js";

/**
 * A signed-in reader's own full-name report as a PDF (TASK-176, D-052):
 * `/pl/nazwisko/{slug}/pelny-raport/pdf?imie={imię}` and
 * `/en/surname/{slug}/full-report/pdf?name={name}`, the button under the
 * sample on the page of what the report holds.
 *
 * While the report is free, a reader with a session gets the report for the
 * typed first name and this surname, composed on the FREE surface and never
 * stored (`composeReaderReport`), through the preview's parser and the same
 * PDF as the sample, without its marks. Anything the page itself explains (no
 * session, accounts off, a name not on the lists or held for review, the free
 * report ended) sends the reader back to the page with the name, which says
 * it. The file is the reader's: private, never cached, never indexed.
 */

const PRIVATE_PDF = {
  "Content-Type": "application/pdf",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

/** The longest first name the page's field takes. */
const MAX_TYPED = 60;

export interface ReaderPdfDeps {
  readonly answer: (slug: string, lang: Lang) => Promise<PageAnswer>;
  readonly compose: (input: {
    readonly givenName: string;
    readonly surname: string;
  }) => Promise<ComposeReaderReportOutcome>;
}

export const RUNNING_READER_PDF_DEPS: ReaderPdfDeps = {
  answer: answerSlugForMetadata,
  compose: (input) => composeReaderReport(db(), input),
};

const seeOther = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });

const unavailable = () =>
  new Response("Unavailable", {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "60" },
  });

export async function readerReportPdfResponse(
  lang: Lang,
  rawSlug: string,
  url: URL,
  gate: GateVerdict,
  deps: ReaderPdfDeps = RUNNING_READER_PDF_DEPS,
  free: boolean = reportFree(),
): Promise<Response> {
  const slug = pageSlug(rawSlug);
  const answer = await deps.answer(slug, lang);
  const base = lang === "en" ? "/en/surname" : "/pl/nazwisko";
  const typed = url.searchParams.get(reportInsideQueryKey(lang))?.trim() ?? "";
  if (answer.kind === "MOVED") {
    const moved = `${base}/${encodeURIComponent(answer.current_slug)}`;
    return new Response(null, {
      status: 308,
      headers: { Location: readerReportPdfHref(moved, lang, typed) },
    });
  }
  if (answer.kind === "UNAVAILABLE") return unavailable();
  if (answer.kind !== "RESULT") return new Response("Not found", { status: 404 });

  const path = canonicalPathFor(answer, lang, slug);
  const inside = reportInsidePath(path, lang);
  if (typed === "") return seeOther(inside);
  const back = `${inside}?${reportInsideQueryKey(lang)}=${encodeURIComponent(typed)}`;
  if (!free || typed.length > MAX_TYPED) return seeOther(back);
  if (gate === "unavailable") return unavailable();
  if (gate !== "open") return seeOther(back);

  let composed: ComposeReaderReportOutcome;
  try {
    composed = await deps.compose({ givenName: typed, surname: answer.display });
  } catch {
    return unavailable();
  }
  if (composed.kind === "GIVEN_NAME_NOT_FOUND" || composed.kind === "GIVEN_NAME_UNREVIEWED") {
    return seeOther(back);
  }
  if (composed.kind === "NOT_RESOLVED") return new Response("Not found", { status: 404 });
  if (composed.kind !== "COMPOSED") return unavailable();

  const preview = toReportPreview(composed.version);
  // The surname the address names, and no other.
  if (preview === null || preview.response?.surname?.id !== answer.response.surname?.id) {
    return unavailable();
  }
  const bytes = await renderReportPdf(preview, lang);
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      ...PRIVATE_PDF,
      "Content-Disposition": `attachment; filename="${reportPdfFileName(preview.displayName, lang)}"`,
    },
  });
}
