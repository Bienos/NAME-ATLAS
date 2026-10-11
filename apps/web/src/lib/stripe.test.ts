import { describe, expect, it, vi } from "vitest";
import {
  checkoutSessionForm,
  createCheckoutSession,
  signStripePayload,
  StripeError,
  verifyStripeSignature,
} from "./stripe.js";
import type { CheckoutSessionInput } from "./stripe.js";

const INPUT: CheckoutSessionInput = {
  tier: "couple",
  productName: "Name Atlas — Para",
  amount: 8999,
  taxCode: "txcd_10701411",
  userId: "0199a1b2-0000-7000-8000-00000000aa11",
  email: "reader@example.com",
  lang: "pl",
  successUrl: "https://atlas.test/pl/konto?checkout=success",
  cancelUrl: "https://atlas.test/pl/konto?checkout=cancelled",
  automaticTax: false,
  withdrawalConsent: "v1",
};

describe("the Checkout Session's form (TASK-111)", () => {
  it("is one PLN line, VAT included, tied to the reader and the tier", () => {
    const form = checkoutSessionForm(INPUT);
    expect(form.get("mode")).toBe("payment");
    expect(form.get("line_items[0][price_data][currency]")).toBe("pln");
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe("8999");
    expect(form.get("line_items[0][price_data][tax_behavior]")).toBe("inclusive");
    expect(form.get("line_items[0][price_data][product_data][tax_code]")).toBe("txcd_10701411");
    expect(form.get("client_reference_id")).toBe(INPUT.userId);
    expect(form.get("metadata[tier]")).toBe("couple");
    expect(form.get("locale")).toBe("pl");
    // The webhook records the statement's version and words the confirmation in this language (TASK-179).
    expect(form.get("metadata[withdrawal_consent]")).toBe("v1");
    expect(form.get("metadata[lang]")).toBe("pl");
  });

  it("never names payment methods, so the Dashboard decides them", () => {
    const keys = [...checkoutSessionForm({ ...INPUT, automaticTax: true }).keys()];
    expect(keys.some((k) => k.startsWith("payment_method_types"))).toBe(false);
  });

  it("asks for Stripe Tax and a VAT number only when told to", () => {
    expect(checkoutSessionForm(INPUT).has("automatic_tax[enabled]")).toBe(false);
    const taxed = checkoutSessionForm({ ...INPUT, automaticTax: true });
    expect(taxed.get("automatic_tax[enabled]")).toBe("true");
    expect(taxed.get("tax_id_collection[enabled]")).toBe("true");
  });
});

describe("createCheckoutSession", () => {
  it("posts with the key, the pinned version and the idempotency key, and returns the session", async () => {
    const fake = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(
        new Response(
          JSON.stringify({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/x" }),
        ),
      ),
    );
    const created = await createCheckoutSession(INPUT, {
      secretKey: "rk_test_x",
      idempotencyKey: "idem-1",
      fetch: fake as unknown as typeof fetch,
    });
    expect(created).toEqual({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/x" });
    const [url, init] = fake.mock.calls[0] ?? [];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    const headers = init?.headers as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer rk_test_x");
    expect(headers["stripe-version"]).toBe("2026-09-30.endive");
    expect(headers["idempotency-key"]).toBe("idem-1");
  });

  it("throws Stripe's status and code, never the body", async () => {
    const fake = () =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { code: "parameter_invalid", message: "secret" } }), {
          status: 400,
        }),
      );
    const failure = createCheckoutSession(INPUT, {
      secretKey: "rk_test_x",
      idempotencyKey: "i",
      fetch: fake as unknown as typeof fetch,
    });
    await expect(failure).rejects.toBeInstanceOf(StripeError);
    await expect(failure).rejects.toThrow("stripe answered 400 (parameter_invalid)");
  });
});

describe("the webhook's signature", () => {
  const SECRET = "whsec_test";
  const BODY = '{"id":"evt_1"}';
  const NOW = 1_790_000_000;

  it("accepts Stripe's signature over the exact body", () => {
    expect(verifyStripeSignature(BODY, signStripePayload(BODY, SECRET, NOW), SECRET, NOW)).toBe(
      true,
    );
  });

  it("accepts it among several, as Stripe sends while a secret is rolled", () => {
    const good = signStripePayload(BODY, SECRET, NOW);
    const header = `${good},v1=${"0".repeat(64)},v0=abc`;
    expect(verifyStripeSignature(BODY, header, SECRET, NOW)).toBe(true);
  });

  it("refuses another secret, another body, an old timestamp, or no header", () => {
    const header = signStripePayload(BODY, SECRET, NOW);
    expect(verifyStripeSignature(BODY, header, "whsec_other", NOW)).toBe(false);
    expect(verifyStripeSignature(`${BODY} `, header, SECRET, NOW)).toBe(false);
    expect(verifyStripeSignature(BODY, header, SECRET, NOW + 301)).toBe(false);
    expect(verifyStripeSignature(BODY, null, SECRET, NOW)).toBe(false);
    expect(verifyStripeSignature(BODY, "t=abc,v1=zz", SECRET, NOW)).toBe(false);
  });
});
