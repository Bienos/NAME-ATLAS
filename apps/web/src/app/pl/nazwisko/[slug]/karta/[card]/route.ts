import { shareCardResponse } from "../../../../../../lib/share-route.js";

/** `/pl/nazwisko/{slug}/karta/{card}`: one answer as a story-size image (TASK-056). */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; card: string }> },
): Promise<Response> {
  const { slug, card } = await params;
  return shareCardResponse(slug, card, "pl", request.headers.get("host"));
}
