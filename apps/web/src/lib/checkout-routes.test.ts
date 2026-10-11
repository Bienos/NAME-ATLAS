import { describe, expect, it, vi } from "vitest";
import { checkoutReturnPath, handleCheckoutPost, handleStripeWebhook } from "./checkout-routes.js";
import type { CheckoutRouteDeps, WebhookDeps } from "./checkout-routes.js";
import type { OutgoingMail } from "@name-atlas/accounts";
import { signStripePayload } from "./stripe.js";

const ORIGIN = "https://atlas.test";
const SESSION = "S".repeat(43);
const USER = "0199a1b2-0000-7000-8000-00000000aa11";
const SECRET = "whsec_test";
const NOW = 1_790_000_000;
const CONSENT = { withdrawal_consent: "v1" };
const META = { user_id: USER, lang: "pl", ...CONSENT };

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
    body: new URLSearchParams({ ...CONSENT, ...fields }).toString(),
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

  it("sells the 15,99 zł full-name comparison at 1599 grosze (TASK-155)", async () => {
    const { deps, stripe } = checkoutFakes();
    const response = await handleCheckoutPost(buy({ tier: "fullnames", lang: "pl" }), deps);
    expect(response.status).toBe(303);
    const body = new URLSearchParams(String(stripe.mock.calls[0]?.[1]?.body));
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("1599");
    expect(body.get("metadata[tier]")).toBe("fullnames");
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

  it("refuses a form without the withdrawal statement, and calls nobody (TASK-179)", async () => {
    const { deps, stripe, logged } = checkoutFakes();
    for (const consent of ["", "v0", "on"]) {
      const response = await handleCheckoutPost(
        buy({ tier: "babynames", withdrawal_consent: consent }),
        deps,
      );
      expect(response.headers.get("location"), consent).toBe(checkoutReturnPath("pl", "consent"));
    }
    expect(stripe).not.toHaveBeenCalled();
    expect(logged.map((l) => l.event)).toContain("checkout_refused");
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
        payment_intent: "pi_test_1",
        customer_details: { email: "buyer@example.com" },
        metadata: { ...META, tier: "smaller" },
        ...object,
      },
    },
  };
}

function webhookFakes(
  fail = false,
  { mode = "test" as "test" | "live", mailFails = false, receiptDue = true } = {},
) {
  const record = vi.fn((_paid: unknown) =>
    fail ? Promise.reject(new Error("db down")) : Promise.resolve(true),
  );
  const revoke = vi.fn((_paymentIntent: string, _reason: string) =>
    fail ? Promise.reject(new Error("db down")) : Promise.resolve("REVOKED" as const),
  );
  const markReceiptSent = vi.fn((_session: string) => Promise.resolve());
  const sent: OutgoingMail[] = [];
  const mailer = {
    send: vi.fn((mail: OutgoingMail) => {
      if (mailFails) return Promise.reject(new Error("mail down"));
      sent.push(mail);
      return Promise.resolve();
    }),
  };
  const { logged, log: l } = log();
  const deps: WebhookDeps = {
    mode,
    purchases: {
      record,
      revoke,
      markReceiptSent,
      receiptDue: vi.fn(() => Promise.resolve(receiptDue)),
    },
    mailer,
    origin: ORIGIN,
    webhookSecret: SECRET,
    nowSeconds: () => NOW,
    now: () => new Date("2026-10-11T22:30:00Z"),
    log: l,
  };
  return { deps, record, revoke, markReceiptSent, sent, logged };
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
      paymentIntentId: "pi_test_1",
      withdrawalConsent: "v1",
    });
  });

  it("records a baby-names purchase at 899 grosze only (TASK-144)", async () => {
    const { deps, record } = webhookFakes();
    const babynames = { metadata: { ...META, tier: "babynames" } };
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
      paymentIntentId: "pi_test_1",
      withdrawalConsent: "v1",
    });
  });

  it("records a full-name comparison purchase at 1599 grosze only (TASK-155)", async () => {
    const { deps, record } = webhookFakes();
    const fullnames = { metadata: { ...META, tier: "fullnames" } };
    for (const amount_total of [899, 2899, 1600]) {
      const response = await handleStripeWebhook(
        deliver(sessionEvent("checkout.session.completed", { ...fullnames, amount_total })),
        deps,
      );
      expect(response.status).toBe(200);
    }
    expect(record).not.toHaveBeenCalled();
    await handleStripeWebhook(
      deliver(sessionEvent("checkout.session.completed", { ...fullnames, amount_total: 1599 })),
      deps,
    );
    expect(record).toHaveBeenCalledWith({
      userId: USER,
      tier: "fullnames",
      checkoutSessionId: "cs_test_1",
      amountTotal: 1599,
      currency: "pln",
      livemode: false,
      paymentIntentId: "pi_test_1",
      withdrawalConsent: "v1",
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
    const response = await handleStripeWebhook(deliver(sessionEvent("customer.created")), deps);
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

function chargeEvent(type: string, object: Record<string, unknown>, livemode = false) {
  return { id: "evt_2", type, livemode, data: { object: { id: "ch_1", ...object } } };
}

describe("POST /api/stripe/webhook: live mode, consent, receipts, refunds (TASK-179)", () => {
  it("records only events of its own mode", async () => {
    const live = webhookFakes(false, { mode: "live" });
    await handleStripeWebhook(deliver(sessionEvent("checkout.session.completed")), live.deps);
    expect(live.record).not.toHaveBeenCalled();
    await handleStripeWebhook(
      deliver(sessionEvent("checkout.session.completed", {}, true)),
      live.deps,
    );
    expect(live.record).toHaveBeenCalledWith(
      expect.objectContaining({ livemode: true, paymentIntentId: "pi_test_1" }),
    );
  });

  it("never records a session without the withdrawal statement, or a live one without its PaymentIntent", async () => {
    const test = webhookFakes();
    for (const metadata of [
      { user_id: USER, tier: "smaller" },
      { ...META, tier: "smaller", withdrawal_consent: "Yes!" },
    ]) {
      await handleStripeWebhook(
        deliver(sessionEvent("checkout.session.completed", { metadata })),
        test.deps,
      );
    }
    expect(test.record).not.toHaveBeenCalled();
    const live = webhookFakes(false, { mode: "live" });
    await handleStripeWebhook(
      deliver(sessionEvent("checkout.session.completed", { payment_intent: null }, true)),
      live.deps,
    );
    expect(live.record).not.toHaveBeenCalled();
  });

  it("sends the confirmation once, in the buyer's language, with the statement word for word", async () => {
    const { deps, sent, markReceiptSent } = webhookFakes();
    const response = await handleStripeWebhook(
      deliver(
        sessionEvent("checkout.session.completed", {
          metadata: { ...META, lang: "en", tier: "babynames" },
          amount_total: 899,
        }),
      ),
      deps,
    );
    expect(response.status).toBe(200);
    expect(sent).toHaveLength(1);
    const mail = sent[0];
    expect(mail?.to).toBe("buyer@example.com");
    expect(mail?.subject).toBe("Purchase confirmation: Name Atlas — Baby names");
    expect(mail?.text).toContain("PLN 8.99");
    // 22:30 UTC on 11 October is already 12 October in Warsaw.
    expect(mail?.text).toContain("12 October 2026");
    expect(mail?.text).toContain("I thereby lose my right to withdraw from the contract");
    expect(mail?.text).toContain(`${ORIGIN}/en/account`);
    expect(markReceiptSent).toHaveBeenCalledWith("cs_test_1");
  });

  it("does not send it again once sent, and asks Stripe to retry when the mail fails", async () => {
    const done = webhookFakes(false, { receiptDue: false });
    await handleStripeWebhook(deliver(sessionEvent("checkout.session.completed")), done.deps);
    expect(done.sent).toHaveLength(0);

    const failing = webhookFakes(false, { mailFails: true });
    const response = await handleStripeWebhook(
      deliver(sessionEvent("checkout.session.completed")),
      failing.deps,
    );
    expect(response.status).toBe(500);
    expect(failing.record).toHaveBeenCalledTimes(1);
    expect(failing.markReceiptSent).not.toHaveBeenCalled();
    expect(JSON.stringify(failing.logged)).not.toContain("buyer@example.com");
  });

  it("revokes on a full refund or a dispute, not on a partial refund", async () => {
    const { deps, revoke } = webhookFakes();
    await handleStripeWebhook(
      deliver(chargeEvent("charge.refunded", { payment_intent: "pi_test_1", refunded: false })),
      deps,
    );
    expect(revoke).not.toHaveBeenCalled();
    await handleStripeWebhook(
      deliver(chargeEvent("charge.refunded", { payment_intent: "pi_test_1", refunded: true })),
      deps,
    );
    expect(revoke).toHaveBeenLastCalledWith("pi_test_1", "refunded");
    await handleStripeWebhook(
      deliver(chargeEvent("charge.dispute.created", { payment_intent: "pi_test_2" })),
      deps,
    );
    expect(revoke).toHaveBeenLastCalledWith("pi_test_2", "disputed");
  });

  it("ignores a refund of the other mode or without a PaymentIntent, and retries a failed store", async () => {
    const { deps, revoke } = webhookFakes();
    for (const event of [
      chargeEvent("charge.refunded", { payment_intent: "pi_test_1", refunded: true }, true),
      chargeEvent("charge.refunded", { refunded: true }),
      chargeEvent("charge.dispute.created", { payment_intent: "not_a_pi" }),
    ]) {
      expect((await handleStripeWebhook(deliver(event), deps)).status).toBe(200);
    }
    expect(revoke).not.toHaveBeenCalled();
    const failing = webhookFakes(true);
    const response = await handleStripeWebhook(
      deliver(chargeEvent("charge.dispute.created", { payment_intent: "pi_test_1" })),
      failing.deps,
    );
    expect(response.status).toBe(500);
  });
});
