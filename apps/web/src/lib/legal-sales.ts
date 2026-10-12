import { CONTACT_EMAIL, OPERATOR_NIP } from "./contact.js";
import type { LegalDocument, LegalKind, LegalSection } from "./legal-text.js";
import type { Lang } from "./messages.js";

/**
 * What the terms and the privacy notice say once checkout takes real payments
 * (TASK-182, ADR-0052). Applied on top of the accounts variant
 * (`legal-accounts.ts`, and the tree's when it is on), and only while checkout
 * runs live (`checkoutMode() === "live"`), so nothing changes before the owner
 * switches live mode on. It **throws** when a heading it expects is not there.
 *
 * Every statement rests on the code: `checkout-routes.ts` (the withdrawal
 * statement, the record on Stripe's signed webhook, the confirmation email,
 * revocation on a full refund or a dispute), `stripe.ts` (what a Checkout
 * Session sends Stripe: the account's address and id, the product, the amount,
 * the language), `purchases.ts` and migrations 0036 and 0048 (what a purchase
 * row keeps, and that it outlives its account with no user). Legal review is
 * advised before real sales (D-054).
 */

interface SalesWords {
  readonly termsAfter: string;
  readonly terms: LegalSection;
  readonly privacyAfter: string;
  readonly privacy: LegalSection;
  readonly processorsHeading: string;
  readonly stripeItem: string;
}

const WORDS: Record<Lang, SalesWords> = {
  pl: {
    termsAfter: "Konto",
    terms: {
      heading: "Zakupy",
      paragraphs: [
        `Sprzedawcą jest właściciel serwisu, NIP ${OPERATOR_NIP}, kontakt: ${CONTACT_EMAIL}. Płatne produkty, ich ceny i to, co zawierają, opisuje strona oferty. Ceny są cenami brutto w złotych i zawierają podatek VAT. Każdy zakup to jednorazowa płatność, bez subskrypcji i bez automatycznego odnawiania.`,
        "Kupić może osoba z kontem. Po wybraniu produktu i zaznaczeniu oświadczenia o natychmiastowym dostępie przechodzisz na stronę płatności Stripe i płacisz jedną z pokazanych tam metod. Umowa zostaje zawarta, gdy płatność zostanie potwierdzona. Dostęp pojawia się na koncie zaraz potem, a na adres e-mail konta wysyłamy potwierdzenie zakupu z treścią oświadczenia.",
        "Konsument może odstąpić od umowy zawartej na odległość w ciągu 14 dni bez podania przyczyny. Przy treściach cyfrowych dostarczanych od razu prawo to wygasa, jeśli przed zapłatą wyraźnie zażądasz natychmiastowego dostępu i przyjmiesz do wiadomości utratę tego prawa (art. 38 ust. 1 pkt 13 ustawy o prawach konsumenta). Bez zaznaczenia tego oświadczenia zakup nie jest możliwy.",
        `Jeśli kupiona treść nie działa lub jest niezgodna z opisem, napisz na ${CONTACT_EMAIL}, co zostało kupione, kiedy i na czym polega problem. Odpowiemy w ciągu 14 dni. Masz uprawnienia z ustawy o prawach konsumenta, w tym prawo do doprowadzenia treści do zgodności z umową, do obniżenia ceny albo do odstąpienia od umowy.`,
        `Zwrot płatności trafia tą samą metodą, którą zapłacono. Zwrot całej kwoty albo zakwestionowanie płatności u wydawcy karty kończy dostęp, który dawał zakup. Fakturę wystawiamy na prośbę wysłaną na ${CONTACT_EMAIL}.`,
        "W sporze możesz skorzystać z bezpłatnej pomocy miejskiego lub powiatowego rzecznika konsumentów albo wojewódzkiego inspektoratu Inspekcji Handlowej.",
      ],
    },
    privacyAfter: "Konto: po co, jak długo, komu",
    privacy: {
      heading: "Zakupy",
      paragraphs: [
        "Gdy coś kupujesz, zapisujemy przy koncie: produkt, kwotę, walutę i chwilę zapłaty, identyfikatory płatności w Stripe (sesji i płatności), wersję oświadczenia o natychmiastowym dostępie, kiedy wysłaliśmy potwierdzenie zakupu oraz to, czy płatność zwrócono w całości lub zakwestionowano. Danych karty, BLIK ani przelewu nie widzimy i nie przechowujemy: podajesz je bezpośrednio Stripe.",
        "Przetwarzamy te dane, żeby wykonać umowę (art. 6 ust. 1 lit. b RODO), a zapis sprzedaży przechowujemy także po to, żeby wypełnić obowiązki podatkowe i rachunkowe (art. 6 ust. 1 lit. c RODO). Potwierdzenie zakupu wysyłamy przez Resend na adres e-mail konta.",
        "Zapis sprzedaży zostaje także po usunięciu konta, już bez powiązania z kontem. Przepisy podatkowe wymagają przechowywania dokumentów sprzedaży co do zasady przez 5 lat od końca roku podatkowego.",
      ],
    },
    processorsHeading: "Komu powierzamy dane",
    stripeItem:
      "Stripe Payments Europe, Limited (Irlandia) — obsługa płatności. Dane karty, BLIK lub przelewu podajesz bezpośrednio Stripe. Od nas Stripe otrzymuje adres e-mail konta, identyfikator konta, nazwę produktu, kwotę i język strony.",
  },
  en: {
    termsAfter: "The account",
    terms: {
      heading: "Purchases",
      paragraphs: [
        `The seller is the owner of the service, tax identification number (NIP) ${OPERATOR_NIP}, contact: ${CONTACT_EMAIL}. The offer page describes the paid products, their prices and what they include. Prices are gross prices in Polish złoty and include VAT. Every purchase is a one-time payment, with no subscription and no automatic renewal.`,
        "Purchases need an account. After choosing a product and ticking the statement on immediate access, you go to Stripe's payment page and pay with one of the methods shown there. The contract is made when the payment is confirmed. Access appears on the account straight after, and we send a purchase confirmation with the statement's text to the account's email address.",
        "A consumer may withdraw from a distance contract within 14 days without giving a reason. For digital content supplied at once, that right ends if, before paying, you expressly ask for immediate access and acknowledge that you lose the right (Article 38(1)(13) of the Polish Consumer Rights Act). A purchase is not possible without ticking that statement.",
        `If what you bought does not work or does not match its description, write to ${CONTACT_EMAIL} saying what was bought, when, and what the problem is. We answer within 14 days. You have the rights the Consumer Rights Act gives, including to have the content brought into conformity with the contract, to a price reduction, or to withdraw from the contract.`,
        `A refund goes back by the payment method used. A refund of the whole amount, or a payment disputed with the card issuer, ends the access the purchase gave. We issue an invoice on request sent to ${CONTACT_EMAIL}.`,
        "In a dispute you may get free help from a municipal or district consumer ombudsman (rzecznik konsumentów) or the regional Trade Inspection (Inspekcja Handlowa).",
      ],
    },
    privacyAfter: "The account: why, how long, who",
    privacy: {
      heading: "Purchases",
      paragraphs: [
        "When you buy something, we record with the account: the product, the amount, the currency and when it was paid, Stripe's identifiers of the payment (the session and the payment), the version of the statement on immediate access, when we sent the purchase confirmation, and whether the payment was refunded in full or disputed. We do not see or keep card, BLIK or transfer details: you give them to Stripe directly.",
        "We process this data to perform the contract (Article 6(1)(b) GDPR), and we keep the record of the sale also to meet tax and accounting obligations (Article 6(1)(c) GDPR). The purchase confirmation is sent through Resend to the account's email address.",
        "The record of a sale stays after the account is deleted, no longer linked to the account. Tax law generally requires sales records to be kept for 5 years from the end of the tax year.",
      ],
    },
    processorsHeading: "Who processes data for us",
    stripeItem:
      "Stripe Payments Europe, Limited (Ireland): payment processing. You give card, BLIK or transfer details to Stripe directly. From us Stripe receives the account's email address, the account's identifier, the product name, the amount and the page language.",
  },
};

function insertAfter(doc: LegalDocument, heading: string, section: LegalSection): LegalDocument {
  if (!doc.sections.some((s) => s.heading === heading)) {
    throw new Error(`legal-sales: the text has no section "${heading}"`);
  }
  return {
    ...doc,
    sections: doc.sections.flatMap((s) => (s.heading === heading ? [s, section] : [s])),
  };
}

/** The processors' list with Stripe added at its end. */
function withStripe(doc: LegalDocument, words: SalesWords): LegalDocument {
  if (!doc.sections.some((s) => s.heading === words.processorsHeading)) {
    throw new Error(`legal-sales: the text has no section "${words.processorsHeading}"`);
  }
  return {
    ...doc,
    sections: doc.sections.map((s) =>
      s.heading === words.processorsHeading
        ? { ...s, items: [...(s.items ?? []), words.stripeItem] }
        : s,
    ),
  };
}

/** The accounts (and tree) variant with the purchases' statements in it. */
export function salesVariant(kind: LegalKind, lang: Lang, doc: LegalDocument): LegalDocument {
  const words = WORDS[lang];
  return kind === "terms"
    ? insertAfter(doc, words.termsAfter, words.terms)
    : withStripe(insertAfter(doc, words.privacyAfter, words.privacy), words);
}
