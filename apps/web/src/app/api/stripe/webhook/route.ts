import { createLogger } from "@name-atlas/logging";
import { checkoutRuntime } from "../../../../lib/checkout-runtime.js";
import { handleStripeWebhook } from "../../../../lib/checkout-routes.js";

/**
 * `POST /api/stripe/webhook` — Stripe's signed events (TASK-111). The only
 * place a purchase is recorded. Checkout off: 404. The handler is in
 * `lib/checkout-routes.ts`; a Next route module may export only its handlers.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const runtime = checkoutRuntime();
  if (runtime === null) return new Response("Not found", { status: 404 });
  return handleStripeWebhook(request, {
    purchases: runtime.purchases,
    webhookSecret: runtime.webhookSecret,
    log: createLogger({ service: "web", base: { route: "/api/stripe/webhook" } }),
  });
}
