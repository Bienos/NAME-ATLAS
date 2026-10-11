import { createHmac, timingSafeEqual } from "node:crypto";
import { STRIPE_API_VERSION, STRIPE_INTEGRATION_ID } from "./checkout-config.js";
import type { CheckoutTier } from "./checkout-config.js";
import type { Lang } from "./messages.js";

/**
 * The two things checkout needs from Stripe (TASK-111), by hand over `fetch`
 * and `node:crypto`, as Google sign-in and the mailer are (ADR-0033): no SDK.
 *
 * - `createCheckoutSession`: one hosted Checkout Session, `mode: payment`, one
 *   line at the tier's price with VAT included. `payment_method_types` is never
 *   sent, so the Dashboard decides the methods (BLIK, cards, Przelewy24 when
 *   switched on).
 * - `verifyStripeSignature`: the `Stripe-Signature` check of a webhook, an
 *   HMAC-SHA256 of `{t}.{body}` under the endpoint's secret, compared in
 *   constant time, refused when older than five minutes.
 */

export const STRIPE_API = "https://api.stripe.com/v1";
/** Stripe's own default tolerance for a webhook's timestamp. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export interface CheckoutSessionInput {
  readonly tier: CheckoutTier;
  readonly productName: string;
  readonly amount: number;
  readonly taxCode: string;
  readonly userId: string;
  readonly email: string;
  readonly lang: Lang;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly automaticTax: boolean;
  /** The version of the withdrawal statement the buyer ticked (TASK-179). */
  readonly withdrawalConsent: string;
}

export interface CreatedSession {
  readonly id: string;
  readonly url: string;
}

export class StripeError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
  ) {
    super(`stripe answered ${status}${code === null ? "" : ` (${code})`}`);
    this.name = "StripeError";
  }
}

/** The form body Stripe's v1 API takes, from the session's input. Exported for the tests. */
export function checkoutSessionForm(input: CheckoutSessionInput): URLSearchParams {
  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "pln",
    "line_items[0][price_data][unit_amount]": String(input.amount),
    "line_items[0][price_data][tax_behavior]": "inclusive",
    "line_items[0][price_data][product_data][name]": input.productName,
    "line_items[0][price_data][product_data][tax_code]": input.taxCode,
    client_reference_id: input.userId,
    customer_email: input.email,
    "metadata[user_id]": input.userId,
    "metadata[tier]": input.tier,
    "metadata[lang]": input.lang,
    "metadata[withdrawal_consent]": input.withdrawalConsent,
    "payment_intent_data[metadata][user_id]": input.userId,
    "payment_intent_data[metadata][tier]": input.tier,
    locale: input.lang,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    integration_identifier: STRIPE_INTEGRATION_ID,
  });
  if (input.automaticTax) {
    form.set("automatic_tax[enabled]", "true");
    // A business buyer's VAT number, for reverse charge; only meaningful with Stripe Tax.
    form.set("tax_id_collection[enabled]", "true");
  }
  return form;
}

export async function createCheckoutSession(
  input: CheckoutSessionInput,
  deps: {
    readonly secretKey: string;
    readonly fetch?: typeof fetch;
    readonly idempotencyKey: string;
  },
): Promise<CreatedSession> {
  const response = await (deps.fetch ?? fetch)(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${deps.secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": STRIPE_API_VERSION,
      "idempotency-key": deps.idempotencyKey,
    },
    body: checkoutSessionForm(input).toString(),
  });
  const body = (await response.json().catch(() => null)) as {
    id?: unknown;
    url?: unknown;
    error?: { code?: unknown };
  } | null;
  if (!response.ok || typeof body?.id !== "string" || typeof body.url !== "string") {
    const code = typeof body?.error?.code === "string" ? body.error.code : null;
    throw new StripeError(response.status, code);
  }
  return { id: body.id, url: body.url };
}

/** Whether `header` signs `payload` under `secret`, within the tolerance of `nowSeconds`. */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds: number,
): boolean {
  if (header === null || header.length > 4_096) return false;
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t" && value !== undefined && /^\d{1,12}$/u.test(value)) timestamp = Number(value);
    if (key === "v1" && value !== undefined && /^[0-9a-f]{64}$/u.test(value))
      signatures.push(value);
  }
  if (timestamp === null || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  return signatures.some((hex) => timingSafeEqual(Buffer.from(hex, "hex"), expected));
}

/** The header Stripe would send for `payload` at `timestamp`. For the tests and local replays. */
export function signStripePayload(payload: string, secret: string, timestamp: number): string {
  const hex = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${hex}`;
}
