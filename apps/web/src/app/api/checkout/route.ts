import { createLogger } from "@name-atlas/logging";
import { checkoutRuntime } from "../../../lib/checkout-runtime.js";
import { handleCheckoutPost } from "../../../lib/checkout-routes.js";

/**
 * `POST /api/checkout` — the account page's buy form (TASK-111): a hosted
 * Stripe Checkout Session in test mode. Checkout off: 404, as if the route did
 * not exist. The handler is in `lib/checkout-routes.ts`; a Next route module
 * may export only its handlers.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const runtime = checkoutRuntime();
  if (runtime === null) return new Response("Not found", { status: 404 });
  return handleCheckoutPost(request, {
    accounts: runtime.accounts,
    secretKey: runtime.secretKey,
    automaticTax: runtime.automaticTax,
    origin: runtime.origin,
    secure: runtime.secure,
    log: createLogger({ service: "web", base: { route: "/api/checkout" } }),
  });
}
