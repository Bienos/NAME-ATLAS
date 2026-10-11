import type { Lang } from "./messages.js";

/**
 * Checkout (TASK-111, TASK-179): whether it exists, in which mode, and the
 * tiers it sells.
 *
 * On only when all of these hold, else every checkout route answers 404 and
 * the account page shows no purchases section:
 *
 * - `CHECKOUT_ENABLED` is exactly `1`;
 * - `STRIPE_SECRET_KEY` is a key of the mode `CHECKOUT_LIVE` names:
 *   - test mode (`CHECKOUT_LIVE` unset): a **test** key (`sk_test_` or,
 *     preferred, a restricted `rk_test_`); only the accounts on
 *     `CHECKOUT_TESTERS` may buy;
 *   - live mode (`CHECKOUT_LIVE` exactly `1`, ADR-0052): a **live** key
 *     (`rk_live_` preferred, or `sk_live_`); every signed-in account may buy.
 *     Only the owner sets it, once ADR-0023 §2.5's legal and tax gates are met.
 *   A key of the other mode turns checkout off, so neither variable alone can
 *   take a real payment;
 * - `STRIPE_WEBHOOK_SECRET` is set (`whsec_…`): a purchase is recorded only
 *   from a signed webhook, so without the secret nothing could be bought;
 * - accounts are on (a purchase belongs to an account), and in live mode the
 *   mailer too (the purchase confirmation); `checkout-runtime.ts` checks that.
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
/** Exactly `1`: real payments with a live key (TASK-179, ADR-0052). The owner's switch. */
export const CHECKOUT_LIVE_ENV = "CHECKOUT_LIVE";
/**
 * The accounts that may use test-mode checkout (TASK-154): email addresses,
 * comma-separated, compared without case. Unset or empty: nobody. A test-mode
 * purchase is recorded like any other and unlocks what its tier holds, so the
 * test card must not be offered to every signed-in reader.
 */
export const CHECKOUT_TESTERS_ENV = "CHECKOUT_TESTERS";

/** The API version every call pins, so a Dashboard upgrade changes nothing here. */
export const STRIPE_API_VERSION = "2026-09-30.endive";

/** Tags this flow's sessions in the Dashboard (`integration_identifier`). */
export const STRIPE_INTEGRATION_ID = "nameatlas-checkout-qhvbtmzk";

export type CheckoutTier = "babynames" | "fullnames" | "smaller" | "couple" | "family";

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
 * The products that can be sold in test mode, cheapest first, ADR-0037 §2.1's
 * prices and §2.3's names, in one place (ADR-0023 §4). `babynames` is the
 * 8,99 zł product of D-045 and `fullnames` the 15,99 zł full-name comparison of
 * D-049 (test mode only; neither unlocks the tree). The
 * 800 zł tier is not here: it sells a person's service, which waits on consumer
 * terms (ADR-0037 §2.4).
 */
export const CHECKOUT_TIERS: readonly TierOffer[] = [
  {
    key: "babynames",
    amount: 899,
    name: { pl: "Imiona dla dziecka", en: "Baby names" },
    taxCode: "txcd_10701411",
  },
  {
    key: "fullnames",
    amount: 1599,
    name: { pl: "Porównanie imion i nazwisk", en: "Full-name comparison" },
    taxCode: "txcd_10701411",
  },
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

/** Whether a key is a Stripe live key: secret or restricted. */
export function isLiveKey(key: string): boolean {
  return /^(sk|rk)_live_[A-Za-z0-9]+$/u.test(key);
}

export type CheckoutMode = "test" | "live";

/**
 * The mode checkout runs in, or null when it is off: the flag, a key of the
 * mode `CHECKOUT_LIVE` names, and the webhook's secret. Accounts and the mailer
 * are checked by the runtime.
 */
export function checkoutMode(env: Env = process.env): CheckoutMode | null {
  if (value(env, CHECKOUT_ENV) !== "1") return null;
  if (!value(env, STRIPE_WEBHOOK_ENV).startsWith("whsec_")) return null;
  const key = value(env, STRIPE_KEY_ENV);
  if (value(env, CHECKOUT_LIVE_ENV) === "1") return isLiveKey(key) ? "live" : null;
  return isTestKey(key) ? "test" : null;
}

export function checkoutEnabled(env: Env = process.env): boolean {
  return checkoutMode(env) !== null;
}

/** The listed testers' addresses, trimmed and lower-cased; empty when none is listed. */
export function checkoutTesters(env: Env = process.env): ReadonlySet<string> {
  return new Set(
    value(env, CHECKOUT_TESTERS_ENV)
      .split(",")
      .map((address) => address.trim().toLowerCase())
      .filter((address) => address !== ""),
  );
}

/** Whether an account's address is on the testers' list. */
export function isCheckoutTester(email: string, testers: ReadonlySet<string>): boolean {
  return testers.has(email.trim().toLowerCase());
}

/** Whether a signed-in account may buy: every one in live mode, a listed tester in test mode. */
export function mayBuy(
  email: string,
  checkout: { readonly mode: CheckoutMode; readonly testers: ReadonlySet<string> },
): boolean {
  return checkout.mode === "live" || isCheckoutTester(email, checkout.testers);
}

/**
 * The statement a buyer ticks before paying (TASK-179, ADR-0052): access to the
 * digital content at once, before the 14-day withdrawal period ends, and the
 * loss of the right of withdrawal that follows (art. 38 ust. 1 pkt 13 of the
 * Polish consumer rights act). Its version is recorded with the purchase and
 * the confirmation email repeats it word for word, so a new wording takes a
 * new version. Legal review is advised before real sales (ADR-0052 §4).
 */
export const WITHDRAWAL_CONSENT_VERSION = "v1";
export const WITHDRAWAL_CONSENT_FIELD = "withdrawal_consent";

export const WITHDRAWAL_CONSENT: Readonly<Record<Lang, string>> = {
  pl: "Żądam dostępu do zakupionych treści cyfrowych od razu po zapłacie, przed upływem 14 dni na odstąpienie od umowy, i przyjmuję do wiadomości, że w ten sposób tracę prawo do odstąpienia od umowy.",
  en: "I ask for access to the digital content I am buying straight after payment, before the 14-day period for withdrawing from the contract ends, and I acknowledge that I thereby lose my right to withdraw from the contract.",
};

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
