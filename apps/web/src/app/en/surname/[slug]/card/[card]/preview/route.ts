import { sharePreviewResponse } from "../../../../../../../lib/share-route.js";

/**
 * `/en/surname/{slug}/card/{card}/preview`: the card's marked, half-size preview
 * (TASK-093). Public whatever the download gate says (ADR-0034 §2.2).
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; card: string }> },
): Promise<Response> {
  const { slug, card } = await params;
  return sharePreviewResponse(slug, card, "en", request.headers.get("host"));
}
