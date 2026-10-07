import { describe, expect, it } from "vitest";
import {
  automaticTaxEnabled,
  CHECKOUT_TIERS,
  checkoutEnabled,
  checkoutTesters,
  formatPrice,
  isCheckoutTester,
  isTestKey,
  tierOffer,
} from "./checkout-config.js";

const ON = {
  CHECKOUT_ENABLED: "1",
  STRIPE_SECRET_KEY: "rk_test_abc123",
  STRIPE_WEBHOOK_SECRET: "whsec_abc",
};

describe("checkout's gate (TASK-111)", () => {
  it("is on with the flag, a test key and the webhook secret", () => {
    expect(checkoutEnabled(ON)).toBe(true);
    expect(checkoutEnabled({ ...ON, STRIPE_SECRET_KEY: "sk_test_abc123" })).toBe(true);
  });

  it("is off without any one of them, or with the flag not exactly 1", () => {
    for (const name of Object.keys(ON)) {
      expect(checkoutEnabled({ ...ON, [name]: undefined }), name).toBe(false);
    }
    expect(checkoutEnabled({ ...ON, CHECKOUT_ENABLED: "true" })).toBe(false);
    expect(checkoutEnabled({ ...ON, STRIPE_WEBHOOK_SECRET: "abc" })).toBe(false);
  });

  it("refuses a live key: real payments wait on the owner's gates (ADR-0023 §2.5)", () => {
    expect(isTestKey("sk_live_abc")).toBe(false);
    expect(isTestKey("rk_live_abc")).toBe(false);
    expect(isTestKey("pk_test_abc")).toBe(false);
    expect(checkoutEnabled({ ...ON, STRIPE_SECRET_KEY: "sk_live_abc123" })).toBe(false);
  });

  it("leaves Stripe Tax off unless asked for", () => {
    expect(automaticTaxEnabled({})).toBe(false);
    expect(automaticTaxEnabled({ STRIPE_AUTOMATIC_TAX: "1" })).toBe(true);
  });
});

describe("the tiers checkout sells", () => {
  it("are the 8,99 zł and 15,99 zł products and ADR-0037's three sellable tiers, the 800 zł one not among them", () => {
    expect(CHECKOUT_TIERS.map((t) => [t.key, t.amount])).toEqual([
      ["babynames", 899],
      ["fullnames", 1599],
      ["smaller", 2899],
      ["couple", 8999],
      ["family", 19900],
    ]);
    expect(tierOffer("genealogy")).toBeNull();
    expect(tierOffer("free")).toBeNull();
  });

  it("writes prices as the offer page does", () => {
    expect(formatPrice(899, "pl")).toBe("8,99 zł");
    expect(formatPrice(899, "en")).toBe("PLN 8.99");
    expect(formatPrice(2899, "pl")).toBe("28,99 zł");
    expect(formatPrice(19900, "pl")).toBe("199 zł");
    expect(formatPrice(8999, "en")).toBe("PLN 89.99");
    expect(formatPrice(19900, "en")).toBe("PLN 199");
  });
});

describe("who may buy in test mode (TASK-154)", () => {
  it("is nobody while CHECKOUT_TESTERS is unset or empty", () => {
    expect(checkoutTesters({}).size).toBe(0);
    expect(checkoutTesters({ CHECKOUT_TESTERS: " , " }).size).toBe(0);
    expect(isCheckoutTester("owner@example.com", checkoutTesters({}))).toBe(false);
  });

  it("is each listed address, trimmed and compared without case", () => {
    const testers = checkoutTesters({ CHECKOUT_TESTERS: " Owner@Example.com ,second@example.pl," });
    expect([...testers]).toEqual(["owner@example.com", "second@example.pl"]);
    expect(isCheckoutTester("OWNER@example.COM", testers)).toBe(true);
    expect(isCheckoutTester(" second@example.pl ", testers)).toBe(true);
    expect(isCheckoutTester("reader@example.com", testers)).toBe(false);
    // A listed address is matched whole, never as a part of another.
    expect(isCheckoutTester("owner@example.com.evil", testers)).toBe(false);
  });
});
