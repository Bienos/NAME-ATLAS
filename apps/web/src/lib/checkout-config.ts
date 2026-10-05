import type { Lang } from "./messages.js";

/**
 * Test-mode checkout (TASK-111): whether it exists, and the tiers it sells.
 *
 * On only when all of these hold, else every checkout route answers 404 and
 * the account page shows no purchases section:
 *
 * - `CHECKOUT_ENABLED` is exactly `1`;
 * - `STRIPE_SECRET_KEY` is a **test** key (`sk_test_` or, preferred, a
 *   restricted `rk_test_`). A live key turns checkout off: real payments wait on
 *   the owner's legal and tax gates (ADR-0023 §2.4–§2.5);
 * - `STRIPE_WEBHOOK_SECRET` is set (`whsec_…`): a purchase is recorded only
 *   from a signed webhook, so without the secret nothing could be bought;
 * - accounts are on (a purchase belongs to an account); `checkout-runtime.ts`
 *   checks that.
 *
 * `STRIPE_AUTOMATIC_TAX=1` turns on Stripe Tax for the session. Off by
 * default: Stripe Tax collects nothing without an active registration and a
 * head office address, and the account has neither yet (2026-10-04).
 *
 * Reads the variables by name and imports no package.
 */

export const CHECKOUT_ENV = "CHECKOUT_ENABLED";
export const STRIPE_KEY_ENV = "STRIPE_SECRET_KEY";
export const STRIPE_WEBHOOK_ENV = "STRIPE_WEBHOOK_SECRET";
export const STRIPE_TAX_ENV = "STRIPE_AUTOMATIC_TAX";

/** The API version every call pins, so a Dashboard upgrade changes nothing here. */
export const STRIPE_API_VERSION = "2026-09-30.endive";

/** Tags this flow's sessions in the Dashboard (`integration_identifier`). */
export const STRIPE_INTEGRATION_ID = "nameatlas-checkout-qhvbtmzk";

export type CheckoutTier = "smaller" | "couple" | "family";

export interface TierOffer {
  readonly key: CheckoutTier;
  /** In grosze, VAT included (ADR-0037 §2.1: prices include whatever VAT applies). */
  readonly amount: number;
  readonly name: Readonly<Record<Lang, string>>;
  /**
   * Stripe's product tax code. `txcd_10701411`, "Electronically Delivered
   * Information Services – Personal Use", from Stripe's list (read 2026-10-04);
   * the owner and their tax advisor confirm it before real sales.
   */
  readonly taxCode: string;
}

/**
 * The three tiers that can be sold in test mode, ADR-0037 §2.1's prices and
 * §2.3's names, in one place (ADR-0023 §4). The 800 zł tier is not here: it
 * sells a person's service, which waits on consumer terms (ADR-0037 §2.4).
 */
export const CHECKOUT_TIERS: readonly TierOffer[] = [
  {
    key: "smaller",
    amount: 2899,
    name: { pl: "Małe poszukiwania", en: "Smaller research" },
    taxCode: "txcd_10701411",
  },
  {
    key: "couple",
    amount: 8999,
    name: { pl: "Para", en: "Couple" },
    taxCode: "txcd_10701411",
  },
  {
    key: "family",
    amount: 19900,
    name: { pl: "Przegląd rodziny", en: "Family review" },
    taxCode: "txcd_10701411",
  },
];

export function tierOffer(key: string): TierOffer | null {
  return CHECKOUT_TIERS.find((tier) => tier.key === key) ?? null;
}

type Env = Readonly<Record<string, string | undefined>>;

function value(env: Env, name: string): string {
  return env[name]?.trim() ?? "";
}

/** Whether a key is a Stripe test key: secret or restricted, never live. */
export function isTestKey(key: string): boolean {
  return /^(sk|rk)_test_[A-Za-z0-9]+$/u.test(key);
}

/** The flag, a test key and the webhook's secret. Accounts are checked by the runtime. */
export function checkoutEnabled(env: Env = process.env): boolean {
  return (
    value(env, CHECKOUT_ENV) === "1" &&
    isTestKey(value(env, STRIPE_KEY_ENV)) &&
    value(env, STRIPE_WEBHOOK_ENV).startsWith("whsec_")
  );
}

export function automaticTaxEnabled(env: Env = process.env): boolean {
  return value(env, STRIPE_TAX_ENV) === "1";
}

/** "28,99 zł" / "PLN 28.99", and "199 zł" / "PLN 199", as the offer page writes them. */
export function formatPrice(amount: number, lang: Lang): string {
  const whole = Math.floor(amount / 100);
  const cents = String(amount % 100).padStart(2, "0");
  if (lang === "en") return cents === "00" ? `PLN ${whole}` : `PLN ${whole}.${cents}`;
  return cents === "00" ? `${whole} zł` : `${whole},${cents} zł`;
}
