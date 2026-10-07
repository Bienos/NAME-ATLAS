import type { Lang } from "./messages.js";
import { renderReportPdf, reportPdfFileName } from "./report-pdf.js";
import { SAMPLE_REPORT } from "./report-sample.js";
import { toReportPreview } from "./report-view.js";

/**
 * The invented sample report as a PDF (TASK-171): `/pl/przykladowy-raport.pdf`
 * and `/en/sample-report.pdf`, linked from the full report's announcement.
 * Public and cached: it holds no reader's data and the same bytes for everyone.
 * Never indexed: its figures are invented, and every page says so.
 */

export { SAMPLE_REPORT_PATHS } from "./report-teaser-text.js";

export const SAMPLE_REPORT_HEADERS = {
  "Content-Type": "application/pdf",
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

const rendered = new Map<Lang, Promise<Uint8Array>>();

/** The sample's bytes, rendered once per process and language. */
function samplePdf(lang: Lang): Promise<Uint8Array> {
  let pdf = rendered.get(lang);
  if (pdf === undefined) {
    // Through JSON, as a stored version's payload arrives from the database.
    const preview = toReportPreview(JSON.parse(JSON.stringify(SAMPLE_REPORT)));
    if (preview === null) throw new Error("the sample report does not parse");
    pdf = renderReportPdf(preview, lang, { sample: true });
    // A failed render is not kept: the next request tries again.
    pdf.catch(() => rendered.delete(lang));
    rendered.set(lang, pdf);
  }
  return pdf;
}

export async function sampleReportResponse(lang: Lang): Promise<Response> {
  const bytes = await samplePdf(lang);
  const name = reportPdfFileName(lang === "en" ? "sample" : "przykładowy", lang);
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: { ...SAMPLE_REPORT_HEADERS, "Content-Disposition": `inline; filename="${name}"` },
  });
}
