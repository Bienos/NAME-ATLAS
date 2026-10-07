import { babyCardRoute } from "../../../../../lib/baby-names-share-route.js";

/**
 * `/pl/imiona-dla-dziecka/karta/{card}?imie={imię}&sex=boys|girls`: one sex's
 * share card as an image (TASK-152). Gated like the page: a 404 unless the
 * flag and accounts are on and the reader has a session; the paid card a 404
 * without the entitlement. `private, no-store`.
 */

export const dynamic = "force-dynamic";

export function GET(
  request: Request,
  { params }: { params: Promise<{ card: string }> },
): Promise<Response> {
  return babyCardRoute(request, params, "pl");
}
