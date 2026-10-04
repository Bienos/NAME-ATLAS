import { accountsRuntime } from "../../../../../../lib/accounts-runtime.js";
import { downloadGate } from "../../../../../../lib/download-gate.js";
import { shareCardResponse } from "../../../../../../lib/share-route.js";

/**
 * `/en/surname/{slug}/card/{card}`: one answer as a story-size image (TASK-056).
 * With accounts on, the image goes to a reader with a session (TASK-064).
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; card: string }> },
): Promise<Response> {
  const { slug, card } = await params;
  const gate = await downloadGate(accountsRuntime(), request.headers.get("cookie"));
  return shareCardResponse(
    slug,
    card,
    "en",
    request.headers.get("host"),
    gate,
    new URL(request.url).searchParams.get("layer"),
  );
}
