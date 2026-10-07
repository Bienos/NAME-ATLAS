import { createLogger } from "@name-atlas/logging";
import { COUPLE_NAMES_API_PATH } from "../../../lib/couple-names-config.js";
import { handleCoupleNamesPost } from "../../../lib/couple-names-routes.js";
import {
  coupleNamesRuntime,
  runningCoupleNamesRouteDeps,
} from "../../../lib/couple-names-runtime.js";

/**
 * `POST /api/couple-names` — the couple first-names page's button (TASK-156):
 * writes and stores the pair's reading, then answers 303 back to the page.
 * Page off, or accounts off: 404, as if the route did not exist. The handler
 * is in `lib/couple-names-routes.ts`; a Next route module may export only its
 * handlers.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const runtime = coupleNamesRuntime();
  if (runtime === null) return new Response("Not found", { status: 404 });
  return handleCoupleNamesPost(
    request,
    runningCoupleNamesRouteDeps(
      runtime,
      createLogger({ service: "web", base: { route: COUPLE_NAMES_API_PATH } }),
    ),
  );
}
