import { accountsRuntime } from "../../../../../../lib/accounts-runtime.js";
import { downloadGate } from "../../../../../../lib/download-gate.js";
import { readerReportPdfResponse } from "../../../../../../lib/report-reader-pdf.js";

/**
 * `/pl/nazwisko/{slug}/pelny-raport/pdf?imie={imię}`: a signed-in reader's own
 * full report as a PDF, free for now (TASK-176, D-052). Private, never indexed.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const gate = await downloadGate(accountsRuntime(), request.headers.get("cookie"));
  return readerReportPdfResponse("pl", slug, new URL(request.url), gate);
}
