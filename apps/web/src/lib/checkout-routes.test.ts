import { describe, expect, it, vi } from "vitest";
import { checkoutReturnPath, handleCheckoutPost, handleStripeWebhook } from "./checkout-routes.js";
import type { CheckoutRouteDeps, WebhookDeps } from "./checkout-routes.js";
import { signStripePayload } from "./stripe.js";

const ORIGIN = "https://atlas.test";
const SESSION = "S".repeat(43);
const USER = "0199a1b2-0000-7000-8000-00000000aa11";
const SECRET = "whsec_test";
const NOW = 1_790_000_000;

function log() {
  const logged: { event: string; fields: unknown }[] = [];
  return {
    logged,
    log: {
      info: (event: string, fields?: unknown) => logged.push({ event, fields }),
      warn: (event: string, fields?: unknown) => logged.push({ event, fields }),
    },
  };
}

function checkoutFakes(stripeStatus = 200) {
  const stripe = vi.fn((_url: string, _init: RequestInit) =>
    Promise.resolve(
      new Response(
        JSON.stringify(
          stripeStatus === 200
            ? { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }
            : { error: { code: "api_key_expired" } },
        ),
        { status: stripeStatus },
      ),
    ),
  );
  const accounts = {
    sessionFromToken: vi.fn((token: unknown) =>
      Promise.resolve(token === SESSION ? { userId: USER, email: "reader@example.com" } : null),
    ),
  };
  const { logged, log: l } = log();
  const deps: CheckoutRouteDeps = {
    accounts: accounts as unknown as CheckoutRouteDeps["accounts"],
    secretKey: "rk_test_x",
    automaticTax: false,
    origin: ORIGIN,
    secure: true,
    fetch: stripe as unknown as typeof fetch,
    log: l,
    mayBuy: (email) => email === "reader@example.com",
  };
  return { deps, stripe, logged };
}

function buy(
  fields: Record<string, string>,
  { cookie = `__Host-na_session=${SESSION}`, origin = ORIGIN } = {},
): Request {
  return new Request(`${ORIGIN}/api/checkout`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin,
      host: "atlas.test",
      cookie,
    },
    body: new URLSearchParams(fields).toString(),
  });
}

describe("POST /api/checkout (TASK-111)", () => {
  it("sends a signed-in reader to Stripe's hosted checkout for the tier", async () => {
    const { deps, stripe } = checkoutFakes();
    const response = await handleCheckoutPost(buy({ tier: "family", lang: "en" }), deps);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/c/pay/cs_test_1");
    const body = new URLSearchParams(String(stripe.mock.calls[0]?.[1]?.body));
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("19900");
    expect(body.get("client_reference_id")).toBe(USER);
    expect(body.get("success_url")).toBe(`${ORIGIN}/en/account?checkout=success`);
    expect(body.get("cancel_url")).toBe(`${ORIGIN}/en/account?checkout=cancelled`);
  });

  it("sells the 8,99 zł baby-names product at 899 grosze (TASK-144)", async () => {
    const { deps, stripe } = checkoutFakes();
    const response = await handleCheckoutPost(buy({ tier: "babynames", lang: "pl" }), deps);
    expect(response.status).toBe(303);
    const body = new URLSearchParams(String(stripe.mock.calls[0]?.[1]?.body));
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("899");
    expect(body.get("metadata[tier]")).toBe("babynames");
  });

  it("sends a reader with no session to sign in, and calls nobody", async () => {
    const { deps, stripe } = checkoutFakes();
    const response = await handleCheckoutPost(buy({ tier: "smaller" }, { cookie: "" }), deps);
    expect(response.headers.get("location")).toBe("/pl/konto/zaloguj");
    expect(stripe).not.toHaveBeenCalled();
  });

  it("answers 404 to a signed-in account not on the testers' list, and calls nobody (TASK-154)", async () => {
    const { deps, stripe, logged } = checkoutFakes();
    const response = await handleCheckoutPost(buy({ tier: "babynames" }), {
      ...deps,
      mayBuy: () => false,
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
    expect(stripe).not.toHaveBeenCalled();
    expect(logged).toEqual([{ event: "checkout_refused", fields: { reason: "not_tester" } }]);
    expect(JSON.stringify(logged)).not.toContain("reader@example.com");
  });

  it("refuses another site's form", async () => {
    const { deps, stripe } = checkoutFakes();
    const response = await handleCheckoutPost(
      buy({ tier: "smaller" }, { origin: "https://evil.test" }),
      deps,
    );
    expect(response.status).toBe(403);
    expect(stripe).not.toHaveBeenCalled();
  });

  it("does not sell an unknown tier or the 800 zł one", async () => {
    const { deps, stripe } = checkoutFakes();
    for (const tier of ["genealogy", "free", ""]) {
      const response = await handleCheckoutPost(buy({ tier }), deps);
      expect(response.headers.get("location"), tier).toBe(checkoutReturnPath("pl", "error"));
    }
    expect(stripe).not.toHaveBeenCalled();
  });

  it("returns to the account page with an error when Stripe refuses", async () => {
    const { deps, logged } = checkoutFakes(401);
    const response = await handleCheckoutPost(buy({ tier: "smaller" }), deps);
    expect(response.headers.get("location")).toBe("/pl/konto?checkout=error");
    expect(logged.map((l) => l.event)).toContain("checkout_failed");
  });
});

function sessionEvent(
  type: string,
  object: Record<string, unknown> = {},
  livemode = false,
): Record<string, unknown> {
  return {
    id: "evt_1",
    type,
    livemode,
    data: {
      object: {
        id: "cs_test_1",
        mode: "payment",
        payment_status: "paid",
        client_reference_id: USER,
        amount_total: 2899,
        currency: "pln",
        metadata: { tier: "smaller", user_id: USER },
        ...object,
      },
    },
  };
}

function webhookFakes(fail = false) {
  const record = vi.fn(() => (fail ? Promise.reject(new Error("db down")) : Promise.resolve(true)));
  const { logged, log: l } = log();
  const deps: WebhookDeps = {
    purchases: { record },
    webhookSecret: SECRET,
    nowSeconds: () => NOW,
    log: l,
  };
  return { deps, record, logged };
}

function deliver(event: unknown, signature?: string): Request {
  const body = JSON.stringify(event);
  return new Request(`${ORIGIN}/api/stripe/webhook`, {
    method: "POST",
    headers: { "stripe-signature": signature ?? signStripePayload(body, SECRET, NOW) },
    body,
  });
}

describe("POST /api/stripe/webhook (TASK-111)", () => {
  it("records a paid session's purchase", async () => {
    const { deps, record } = webhookFakes();
    const response = await handleStripeWebhook(
      deliver(sessionEvent("checkout.session.completed")),
      deps,
    );
    expect(response.status).toBe(200);
    expect(record).toHaveBeenCalledWith({
      userId: USER,
      tier: "smaller",
      checkoutSessionId: "cs_test_1",
      amountTotal: 2899,
      currency: "pln",
      livemode: false,
    });
  });

  it("records a baby-names purchase at 899 grosze only (TASK-144)", async () => {
    const { deps, record } = webhookFakes();
    const babynames = { metadata: { tier: "babynames", user_id: USER } };
    for (const amount_total of [2899, 100]) {
      const response = await handleStripeWebhook(
        deliver(sessionEvent("checkout.session.completed", { ...babynames, amount_total })),
        deps,
      );
      expect(response.status).toBe(200);
    }
    expect(record).not.toHaveBeenCalled();
    await handleStripeWebhook(
      deliver(sessionEvent("checkout.session.completed", { ...babynames, amount_total: 899 })),
      deps,
    );
    expect(record).toHaveBeenCalledWith({
      userId: USER,
      tier: "babynames",
      checkoutSessionId: "cs_test_1",
      amountTotal: 899,
      currency: "pln",
      livemode: false,
    });
  });

  it("records a delayed payment when it succeeds, not when the session completes unpaid", async () => {
    const { deps, record } = webhookFakes();
    await handleStripeWebhook(
      deliver(sessionEvent("checkout.session.completed", { payment_status: "unpaid" })),
      deps,
    );
    expect(record).not.toHaveBeenCalled();
    await handleStripeWebhook(
      deliver(sessionEvent("checkout.session.async_payment_succeeded")),
      deps,
    );
    expect(record).toHaveBeenCalledTimes(1);
  });

  it("refuses a bad signature before reading the body", async () => {
    const { deps, record } = webhookFakes();
    const forged = signStripePayload("{}", "whsec_other", NOW);
    const response = await handleStripeWebhook(
      deliver(sessionEvent("checkout.session.completed"), forged),
      deps,
    );
    expect(response.status).toBe(400);
    expect(record).not.toHaveBeenCalled();
  });

  it("never records a live payment, a foreign session or a price that is not the tier's", async () => {
    const { deps, record } = webhookFakes();
    for (const event of [
      sessionEvent("checkout.session.completed", {}, true),
      sessionEvent("checkout.session.completed", { metadata: { tier: "genealogy" } }),
      sessionEvent("checkout.session.completed", { client_reference_id: "someone" }),
      sessionEvent("checkout.session.completed", { amount_total: 100 }),
      sessionEvent("checkout.session.completed", { currency: "eur" }),
      sessionEvent("checkout.session.completed", { mode: "subscription" }),
    ]) {
      const response = await handleStripeWebhook(deliver(event), deps);
      expect(response.status).toBe(200);
    }
    expect(record).not.toHaveBeenCalled();
  });

  it("acknowledges other events without recording", async () => {
    const { deps, record } = webhookFakes();
    const response = await handleStripeWebhook(deliver(sessionEvent("charge.refunded")), deps);
    expect(response.status).toBe(200);
    expect(record).not.toHaveBeenCalled();
  });

  it("answers 500 when the purchase cannot be stored, so Stripe retries", async () => {
    const { deps } = webhookFakes(true);
    const response = await handleStripeWebhook(
      deliver(sessionEvent("checkout.session.completed")),
      deps,
    );
    expect(response.status).toBe(500);
  });
});
