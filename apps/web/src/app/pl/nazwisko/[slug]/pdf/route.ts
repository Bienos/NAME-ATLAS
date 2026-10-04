import { accountsRuntime } from "../../../../../lib/accounts-runtime.js";
import { downloadGate } from "../../../../../lib/download-gate.js";
import { surnamePdfResponse } from "../../../../../lib/share-pdf.js";

/**
 * `/pl/nazwisko/{slug}/pdf`: every card of the surname in one PDF (TASK-107).
 * With accounts on, the file goes to a reader with a session (TASK-064).
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const gate = await downloadGate(accountsRuntime(), request.headers.get("cookie"));
  return surnamePdfResponse(slug, "pl", request.headers.get("host"), gate);
}
