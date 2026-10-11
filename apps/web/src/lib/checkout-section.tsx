import {
  CHECKOUT_TIERS,
  formatPrice,
  tierOffer,
  WITHDRAWAL_CONSENT,
  WITHDRAWAL_CONSENT_FIELD,
  WITHDRAWAL_CONSENT_VERSION,
} from "./checkout-config.js";
import type { CheckoutMode } from "./checkout-config.js";
import { formatDate } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * The account page's purchases section (TASK-111, TASK-179), shown only while
 * checkout is on for the reader: a buy button per sellable tier, the reader's
 * purchases, and the word Stripe's return leaves in the query.
 *
 * Every buy form carries the withdrawal statement as a required checkbox
 * (`ConsentField`); `/api/checkout` refuses a request without it.
 *
 * In test mode it says plainly that this is a test: no card is charged. What a purchase
 * unlocks (the tree's cap, TASK-114; the baby-names figures, TASK-141) is shown
 * by the dashboard's plan panel (TASK-153). A plain form per tier, so it needs
 * no script.
 */

export type CheckoutStatus = "success" | "cancelled" | "error" | "consent";

export interface PurchaseRow {
  readonly tier: string;
  readonly amountTotal: number;
  /** `YYYY-MM-DD`. */
  readonly paidOn: string;
}

const TEXT = {
  pl: {
    heading: "Zakupy (tryb testowy)",
    liveHeading: "Zakupy",
    liveLede:
      "Płatność jednorazowa przez Stripe (BLIK, karta, Przelewy24). Potwierdzenie zakupu przyjdzie e-mailem. Co odblokowuje zakup, pokazuje „Twój plan”.",
    liveBuy: (name: string, price: string) => `Kup „${name}” — ${price}`,
    lede: "To próbna kasa Stripe: płatności są testowe i nie obciążają żadnej karty. Użyj karty testowej 4242 4242 4242 4242. Co odblokowuje zakup, pokazuje „Twój plan”.",
    buy: (name: string, price: string) => `Kup „${name}” — ${price}`,
    yours: "Twoje zakupy",
    none: "Nie masz jeszcze zakupów.",
    status: {
      success:
        "Płatność przyjęta. Zakup pojawi się na liście, gdy Stripe ją potwierdzi; odśwież stronę za chwilę.",
      cancelled: "Płatność przerwana. Nic nie zostało pobrane.",
      error: "Nie udało się rozpocząć płatności. Spróbuj ponownie za chwilę.",
      consent: "Aby kupić, zaznacz oświadczenie przy przycisku zakupu.",
    },
  },
  en: {
    heading: "Purchases (test mode)",
    liveHeading: "Purchases",
    liveLede:
      "A one-time payment through Stripe (BLIK, card, Przelewy24). A purchase confirmation arrives by email. “Your plan” shows what a purchase unlocks.",
    liveBuy: (name: string, price: string) => `Buy “${name}” — ${price}`,
    lede: "This is Stripe's test checkout: payments are test payments and no card is charged. Use the test card 4242 4242 4242 4242. “Your plan” shows what a purchase unlocks.",
    buy: (name: string, price: string) => `Buy “${name}” — ${price}`,
    yours: "Your purchases",
    none: "You have no purchases yet.",
    status: {
      success:
        "Payment received. The purchase appears in the list once Stripe confirms it; reload the page in a moment.",
      cancelled: "Payment cancelled. Nothing was charged.",
      error: "The payment could not be started. Try again in a moment.",
      consent: "To buy, tick the statement by the buy button.",
    },
  },
} as const;

export function checkoutStatusFrom(value: string | null): CheckoutStatus | null {
  return value === "success" || value === "cancelled" || value === "error" || value === "consent"
    ? value
    : null;
}

/**
 * The withdrawal statement (TASK-179, ADR-0052): a required checkbox, never
 * ticked in advance, inside a buy form. Its value is the statement's version,
 * which the purchase records.
 */
export function ConsentField({ lang }: { readonly lang: Lang }) {
  return (
    <label className="checkout-consent">
      <input
        type="checkbox"
        name={WITHDRAWAL_CONSENT_FIELD}
        value={WITHDRAWAL_CONSENT_VERSION}
        required
      />{" "}
      {WITHDRAWAL_CONSENT[lang]}
    </label>
  );
}

export function CheckoutSection({
  lang,
  mode,
  status,
  purchases,
}: {
  readonly lang: Lang;
  readonly mode: CheckoutMode;
  readonly status: CheckoutStatus | null;
  readonly purchases: readonly PurchaseRow[];
}) {
  const t = TEXT[lang];
  const live = mode === "live";
  return (
    <section
      className="account-panel account-purchases account-checkout"
      aria-labelledby="account-purchases-heading"
    >
      <h3 id="account-purchases-heading">{live ? t.liveHeading : t.heading}</h3>
      {status === null ? null : (
        <p className="account-status" role="status">
          {t.status[status]}
        </p>
      )}
      <p>{live ? t.liveLede : t.lede}</p>
      {CHECKOUT_TIERS.map((tier) => (
        <form
          key={tier.key}
          className="offer-form account-form"
          method="post"
          action="/api/checkout"
          aria-label={tier.name[lang]}
        >
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="tier" value={tier.key} />
          <ConsentField lang={lang} />
          <button type="submit" className="offer-send">
            {(live ? t.liveBuy : t.buy)(tier.name[lang], formatPrice(tier.amount, lang))}
          </button>
        </form>
      ))}
      <h4>{t.yours}</h4>
      {purchases.length === 0 ? (
        <p>{t.none}</p>
      ) : (
        <ul>
          {purchases.map((p, i) => (
            <li key={`${p.paidOn}-${i}`}>
              {tierOffer(p.tier)?.name[lang] ?? p.tier} — {formatPrice(p.amountTotal, lang)},{" "}
              {formatDate(p.paidOn, lang)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
