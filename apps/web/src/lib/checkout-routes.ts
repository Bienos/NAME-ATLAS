import { randomUUID } from "node:crypto";
import type { Accounts, Purchases } from "@name-atlas/accounts";
import { accountPath } from "./account-paths.js";
import { isSameSiteRequest } from "./account-routes.js";
import type { AccountLog } from "./account-routes.js";
import { tierOffer } from "./checkout-config.js";
import type { Lang } from "./messages.js";
import { cookieValue, sessionCookieName } from "./session-cookie.js";
import { createCheckoutSession, verifyStripeSignature } from "./stripe.js";

/**
 * Test-mode checkout's two routes (TASK-111), as functions over their
 * dependencies, so they are tested without a server, a database or Stripe.
 *
 * `POST /api/checkout` — the account page's buy form. Same-site only; a
 * signed-in reader only; a known tier only. Creates a hosted Checkout Session
 * and answers 303 to it. Records nothing: a purchase exists only once Stripe's
 * webhook says it is paid.
 *
 * `POST /api/stripe/webhook` — Stripe's events. The signature is checked over
 * the raw body before anything is read. `checkout.session.completed` and
 * `checkout.session.async_payment_succeeded` record a purchase when the session
 * is paid (a Przelewy24 payment completes later than its session); everything
 * else is acknowledged and ignored. A live event is never recorded. A database
 * failure answers 500 so that Stripe retries; the record is idempotent.
 *
 * Nothing a reader typed and no address is logged: ids, a tier, a status.
 */

export interface CheckoutRouteDeps {
  readonly accounts: Pick<Accounts, "sessionFromToken">;
  readonly secretKey: string;
  readonly automaticTax: boolean;
  readonly origin: string;
  readonly secure: boolean;
  readonly fetch?: typeof fetch;
  readonly log: AccountLog;
}

export interface WebhookDeps {
  readonly purchases: Pick<Purchases, "record">;
  readonly webhookSecret: string;
  readonly nowSeconds?: () => number;
  readonly log: AccountLog;
}

const NO_STORE = { "cache-control": "no-store" } as const;
const MAX_FORM_BYTES = 1_024;
/** Stripe's events are a few kilobytes; a Checkout Session's is well under this. */
const MAX_EVENT_BYTES = 256 * 1_024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

function see(location: string): Response {
  return new Response(null, { status: 303, headers: { location, ...NO_STORE } });
}

/** The account page with checkout's status word: `success`, `cancelled` or `error`. */
export function checkoutReturnPath(lang: Lang, status: "success" | "cancelled" | "error"): string {
  return `${accountPath(lang, "account")}?checkout=${status}`;
}

export async function handleCheckoutPost(
  request: Request,
  deps: CheckoutRouteDeps,
): Promise<Response> {
  if (!isSameSiteRequest(request)) {
    return new Response("Forbidden", { status: 403, headers: NO_STORE });
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  const type = request.headers.get("content-type") ?? "";
  if (
    (Number.isFinite(length) && length > MAX_FORM_BYTES) ||
    !/^application\/x-www-form-urlencoded/iu.test(type)
  ) {
    return new Response("Bad request", { status: 400, headers: NO_STORE });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("Bad request", { status: 400, headers: NO_STORE });
  }
  const lang: Lang = form.get("lang") === "en" ? "en" : "pl";
  const tierField = form.get("tier");
  const offer = typeof tierField === "string" ? tierOffer(tierField) : null;

  const token = cookieValue(request.headers.get("cookie"), sessionCookieName(deps.secure));
  let session: Awaited<ReturnType<Accounts["sessionFromToken"]>>;
  try {
    session = token === null ? null : await deps.accounts.sessionFromToken(token);
  } catch {
    deps.log.warn("checkout_failed", { reason: "session_lookup" });
    return see(checkoutReturnPath(lang, "error"));
  }
  if (session === null) return see(accountPath(lang, "sign-in"));
  if (offer === null) return see(checkoutReturnPath(lang, "error"));

  try {
    const created = await createCheckoutSession(
      {
        tier: offer.key,
        productName: `Name Atlas — ${offer.name[lang]}`,
        amount: offer.amount,
        taxCode: offer.taxCode,
        userId: session.userId,
        email: session.email,
        lang,
        successUrl: `${deps.origin}${checkoutReturnPath(lang, "success")}`,
        cancelUrl: `${deps.origin}${checkoutReturnPath(lang, "cancelled")}`,
        automaticTax: deps.automaticTax,
      },
      {
        secretKey: deps.secretKey,
        idempotencyKey: randomUUID(),
        ...(deps.fetch === undefined ? {} : { fetch: deps.fetch }),
      },
    );
    deps.log.info("checkout_created", { tier: offer.key, session: created.id });
    return see(created.url);
  } catch (error) {
    deps.log.warn("checkout_failed", {
      reason: "stripe",
      tier: offer.key,
      detail: error instanceof Error ? error.message : "unknown",
    });
    return see(checkoutReturnPath(lang, "error"));
  }
}

interface CheckoutSessionObject {
  readonly id?: unknown;
  readonly mode?: unknown;
  readonly payment_status?: unknown;
  readonly client_reference_id?: unknown;
  readonly amount_total?: unknown;
  readonly currency?: unknown;
  readonly metadata?: { readonly tier?: unknown } | null;
}

interface StripeEvent {
  readonly id?: unknown;
  readonly type?: unknown;
  readonly livemode?: unknown;
  readonly data?: { readonly object?: CheckoutSessionObject };
}

const PAID_EVENTS: ReadonlySet<string> = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const ok = () => new Response("ok", { status: 200, headers: NO_STORE });

export async function handleStripeWebhook(request: Request, deps: WebhookDeps): Promise<Response> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_EVENT_BYTES) {
    return new Response("Payload too large", { status: 413, headers: NO_STORE });
  }
  const payload = await request.text();
  const now = deps.nowSeconds ?? (() => Math.floor(Date.now() / 1000));
  if (
    !verifyStripeSignature(
      payload,
      request.headers.get("stripe-signature"),
      deps.webhookSecret,
      now(),
    )
  ) {
    deps.log.warn("stripe_webhook_rejected", { reason: "signature" });
    return new Response("Bad signature", { status: 400, headers: NO_STORE });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return new Response("Bad request", { status: 400, headers: NO_STORE });
  }
  const type = typeof event.type === "string" ? event.type : "";
  const eventId = typeof event.id === "string" ? event.id : null;
  if (!PAID_EVENTS.has(type)) {
    deps.log.info("stripe_webhook_ignored", { type, event: eventId });
    return ok();
  }
  if (event.livemode !== false) {
    // Real payments are not taken (ADR-0023 §2.5). Acknowledged, so Stripe does not retry it.
    deps.log.warn("stripe_webhook_live_refused", { type, event: eventId });
    return ok();
  }

  const object = event.data?.object ?? {};
  const sessionId = typeof object.id === "string" ? object.id : null;
  const tier = typeof object.metadata?.tier === "string" ? tierOffer(object.metadata.tier) : null;
  const userId = typeof object.client_reference_id === "string" ? object.client_reference_id : null;
  const paid = object.mode === "payment" && object.payment_status === "paid";
  if (!paid) {
    // A delayed method (Przelewy24): `completed` arrives unpaid; `async_payment_succeeded` follows.
    deps.log.info("stripe_webhook_unpaid", { type, session: sessionId });
    return ok();
  }
  if (
    sessionId === null ||
    tier === null ||
    userId === null ||
    !UUID.test(userId) ||
    object.currency !== "pln" ||
    object.amount_total !== tier.amount
  ) {
    // Not a session this site made, or one whose price differs from the tier's: never recorded.
    deps.log.warn("stripe_webhook_unrecognised", { type, session: sessionId });
    return ok();
  }

  try {
    const stored = await deps.purchases.record({
      userId,
      tier: tier.key,
      checkoutSessionId: sessionId,
      amountTotal: tier.amount,
      currency: "pln",
      livemode: false,
    });
    deps.log.info(stored ? "purchase_recorded" : "purchase_already_recorded", {
      tier: tier.key,
      session: sessionId,
    });
    return ok();
  } catch (error) {
    deps.log.warn("purchase_record_failed", {
      session: sessionId,
      detail: error instanceof Error ? error.message : "unknown",
    });
    return new Response("Retry", { status: 500, headers: NO_STORE });
  }
}
