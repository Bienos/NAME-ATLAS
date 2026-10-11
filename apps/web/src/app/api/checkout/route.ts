import { createLogger } from "@name-atlas/logging";
import { mayBuy } from "../../../lib/checkout-config.js";
import { checkoutRuntime } from "../../../lib/checkout-runtime.js";
import { handleCheckoutPost } from "../../../lib/checkout-routes.js";

/**
 * `POST /api/checkout` — a buy form (TASK-111, TASK-179): a hosted Stripe
 * Checkout Session. Checkout off, or in test mode an account not on
 * `CHECKOUT_TESTERS` (TASK-154): 404, as if the route did not exist. The
 * handler is in `lib/checkout-routes.ts`; a Next route module may export only
 * its handlers.
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
    mayBuy: (email) => mayBuy(email, runtime),
  });
}
