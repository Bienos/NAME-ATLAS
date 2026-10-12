import { randomUUID } from "node:crypto";
import { purchaseMail } from "@name-atlas/accounts";
import type { Accounts, Mailer, Purchases, RevokeReason } from "@name-atlas/accounts";
import { accountPath } from "./account-paths.js";
import { isSameSiteRequest } from "./account-routes.js";
import type { AccountLog } from "./account-routes.js";
import {
  formatPrice,
  tierOffer,
  WITHDRAWAL_CONSENT,
  WITHDRAWAL_CONSENT_FIELD,
  WITHDRAWAL_CONSENT_VERSION,
} from "./checkout-config.js";
import type { CheckoutMode, TierOffer } from "./checkout-config.js";
import { CONTACT_EMAIL, OPERATOR_NIP } from "./contact.js";
import { formatDate } from "./messages.js";
import type { Lang } from "./messages.js";
import { cookieValue, sessionCookieName } from "./session-cookie.js";
import { createCheckoutSession, verifyStripeSignature } from "./stripe.js";

/**
 * Checkout's two routes (TASK-111, TASK-179), as functions over their
 * dependencies, so they are tested without a server, a database or Stripe.
 *
 * `POST /api/checkout` — a buy form. Same-site only; a signed-in reader who may
 * buy only; a known tier only; the withdrawal statement ticked only. Creates a
 * hosted Checkout Session and answers 303 to it. Records nothing: a purchase
 * exists only once Stripe's webhook says it is paid.
 *
 * `POST /api/stripe/webhook` — Stripe's events. The signature is checked over
 * the raw body before anything is read, and an event of the other mode (a live
 * event in test mode, a test event in live mode) is acknowledged and ignored.
 *
 * - `checkout.session.completed` and `checkout.session.async_payment_succeeded`
 *   record a purchase when the session is paid (a Przelewy24 payment completes
 *   later than its session), then send its confirmation email if it has not
 *   gone out yet.
 * - `charge.refunded` with the charge refunded in full, and
 *   `charge.dispute.created`, revoke the purchase its PaymentIntent paid for. A
 *   partial refund changes nothing.
 * - Everything else is acknowledged and ignored.
 *
 * A database or mail failure answers 500 so that Stripe retries: the record and
 * the revocation are idempotent, and the email is sent until it is marked sent.
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
  /** Whether the signed-in account may buy: anyone live, a listed tester in test mode (TASK-154). */
  readonly mayBuy: (email: string) => boolean;
}

export interface WebhookDeps {
  readonly mode: CheckoutMode;
  readonly purchases: Pick<Purchases, "record" | "receiptDue" | "markReceiptSent" | "revoke">;
  /** Null only in test mode without Resend: no confirmation is sent then. */
  readonly mailer: Mailer | null;
  /** `SITE_ORIGIN`, for the account link in the confirmation. */
  readonly origin: string;
  readonly webhookSecret: string;
  readonly nowSeconds?: () => number;
  readonly now?: () => Date;
  readonly log: AccountLog;
}

const NO_STORE = { "cache-control": "no-store" } as const;
const MAX_FORM_BYTES = 1_024;
/** Stripe's events are a few kilobytes; a Checkout Session's is well under this. */
const MAX_EVENT_BYTES = 256 * 1_024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const PAYMENT_INTENT = /^pi_[A-Za-z0-9_]{1,250}$/u;
const CONSENT_VERSION = /^[a-z0-9-]{1,32}$/u;

function see(location: string): Response {
  return new Response(null, { status: 303, headers: { location, ...NO_STORE } });
}

/** The account page with checkout's status word: `success`, `cancelled`, `error` or `consent`. */
export function checkoutReturnPath(
  lang: Lang,
  status: "success" | "cancelled" | "error" | "consent",
): string {
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
  // Not a listed tester: as if checkout did not exist. The page offers them no button,
  // so only a hand-made request gets here. Nothing about the account is logged.
  if (!deps.mayBuy(session.email)) {
    deps.log.info("checkout_refused", { reason: "not_tester" });
    return new Response("Not found", { status: 404, headers: NO_STORE });
  }
  if (offer === null) return see(checkoutReturnPath(lang, "error"));
  // The form's checkbox is `required`; a request without it is refused before Stripe is asked.
  if (form.get(WITHDRAWAL_CONSENT_FIELD) !== WITHDRAWAL_CONSENT_VERSION) {
    deps.log.info("checkout_refused", { reason: "no_consent", tier: offer.key });
    return see(checkoutReturnPath(lang, "consent"));
  }

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
        withdrawalConsent: WITHDRAWAL_CONSENT_VERSION,
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

interface StripeObject {
  readonly id?: unknown;
  readonly mode?: unknown;
  readonly payment_status?: unknown;
  readonly client_reference_id?: unknown;
  readonly amount_total?: unknown;
  readonly currency?: unknown;
  readonly payment_intent?: unknown;
  readonly customer_email?: unknown;
  readonly customer_details?: { readonly email?: unknown } | null;
  readonly metadata?: {
    readonly tier?: unknown;
    readonly lang?: unknown;
    readonly withdrawal_consent?: unknown;
  } | null;
  /** A charge's: true once it is refunded in full. */
  readonly refunded?: unknown;
}

interface StripeEvent {
  readonly id?: unknown;
  readonly type?: unknown;
  readonly livemode?: unknown;
  readonly data?: { readonly object?: StripeObject };
}

const PAID_EVENTS: ReadonlySet<string> = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const REVOKING_EVENTS: ReadonlySet<string> = new Set(["charge.refunded", "charge.dispute.created"]);

const ok = () => new Response("ok", { status: 200, headers: NO_STORE });
const retry = () => new Response("Retry", { status: 500, headers: NO_STORE });

function text(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** `YYYY-MM-DD` of `at` in Warsaw, the day the buyer paid on. */
function warsawDay(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(at);
}

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
  if (!PAID_EVENTS.has(type) && !REVOKING_EVENTS.has(type)) {
    deps.log.info("stripe_webhook_ignored", { type, event: eventId });
    return ok();
  }
  const live = deps.mode === "live";
  if (event.livemode !== live) {
    // An event of the other mode: a live event before the owner switched live mode on, or a
    // test event on the live site. Acknowledged, so Stripe does not retry it.
    deps.log.warn("stripe_webhook_mode_refused", { type, event: eventId, mode: deps.mode });
    return ok();
  }

  const object = event.data?.object ?? {};
  if (REVOKING_EVENTS.has(type)) return revokeFor(type, object, deps);

  const sessionId = text(object.id);
  const tier = typeof object.metadata?.tier === "string" ? tierOffer(object.metadata.tier) : null;
  const userId = text(object.client_reference_id);
  const paymentIntent = text(object.payment_intent);
  const consent = text(object.metadata?.withdrawal_consent);
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
    object.amount_total !== tier.amount ||
    consent === null ||
    !CONSENT_VERSION.test(consent) ||
    (paymentIntent !== null && !PAYMENT_INTENT.test(paymentIntent)) ||
    (live && paymentIntent === null)
  ) {
    // Not a session this site made, one whose price differs from the tier's, or one
    // without the withdrawal statement: never recorded.
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
      livemode: live,
      paymentIntentId: paymentIntent,
      withdrawalConsent: consent,
    });
    deps.log.info(stored ? "purchase_recorded" : "purchase_already_recorded", {
      tier: tier.key,
      session: sessionId,
    });
  } catch (error) {
    deps.log.warn("purchase_record_failed", {
      session: sessionId,
      detail: error instanceof Error ? error.message : "unknown",
    });
    return retry();
  }

  return sendReceipt(object, sessionId, tier, deps);
}

/** The confirmation email, once per purchase; a failure answers 500 so Stripe's retry sends it. */
async function sendReceipt(
  object: StripeObject,
  sessionId: string,
  tier: TierOffer,
  deps: WebhookDeps,
): Promise<Response> {
  if (deps.mailer === null) return ok();
  const to = text(object.customer_details?.email) ?? text(object.customer_email);
  if (to === null) {
    deps.log.warn("purchase_receipt_skipped", { reason: "no_address", session: sessionId });
    return ok();
  }
  const lang: Lang = object.metadata?.lang === "en" ? "en" : "pl";
  try {
    if (!(await deps.purchases.receiptDue(sessionId))) return ok();
    const paidOn = warsawDay((deps.now ?? (() => new Date()))());
    await deps.mailer.send(
      purchaseMail(to, lang, {
        product: `Name Atlas — ${tier.name[lang]}`,
        price: formatPrice(tier.amount, lang),
        paidOn: formatDate(paidOn, lang),
        consent: WITHDRAWAL_CONSENT[lang],
        accountLink: `${deps.origin}${accountPath(lang, "account")}`,
        contact: CONTACT_EMAIL,
        seller:
          lang === "en"
            ? `the owner of the Name Atlas service, tax identification number (NIP) ${OPERATOR_NIP}`
            : `właściciel serwisu Name Atlas, NIP ${OPERATOR_NIP}`,
      }),
    );
    await deps.purchases.markReceiptSent(sessionId);
    deps.log.info("purchase_receipt_sent", { session: sessionId });
    return ok();
  } catch (error) {
    deps.log.warn("purchase_receipt_failed", {
      session: sessionId,
      detail: error instanceof Error ? error.message : "unknown",
    });
    return retry();
  }
}

/** A full refund or a dispute revokes the purchase its PaymentIntent paid for. */
async function revokeFor(type: string, object: StripeObject, deps: WebhookDeps): Promise<Response> {
  const paymentIntent = text(object.payment_intent);
  if (paymentIntent === null || !PAYMENT_INTENT.test(paymentIntent)) {
    deps.log.warn("stripe_webhook_unrecognised", { type });
    return ok();
  }
  if (type === "charge.refunded" && object.refunded !== true) {
    // A partial refund: the purchase stands. The owner decides case by case.
    deps.log.info("purchase_partly_refunded", { payment: paymentIntent });
    return ok();
  }
  const reason: RevokeReason = type === "charge.refunded" ? "refunded" : "disputed";
  try {
    const outcome = await deps.purchases.revoke(paymentIntent, reason);
    deps.log.info(
      outcome === "REVOKED"
        ? "purchase_revoked"
        : outcome === "ALREADY"
          ? "purchase_already_revoked"
          : "purchase_revoke_unknown",
      { payment: paymentIntent, reason },
    );
    return ok();
  } catch (error) {
    deps.log.warn("purchase_revoke_failed", {
      payment: paymentIntent,
      detail: error instanceof Error ? error.message : "unknown",
    });
    return retry();
  }
}
