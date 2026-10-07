import { CONTACT_EMAIL } from "./contact.js";
import type { Lang } from "./messages.js";

/**
 * The offer page's words (TASK-057, TASK-104, TASK-167, ADR-0037), and the two
 * emails its forms prepare. Pure: the server page and the form's client island
 * both read it.
 *
 * What the page may say is what ADR-0037 records: the free plan as it is
 * today, the two one-off products (D-045, D-049) and the four paid tiers as
 * coming, with their prices and what the owner has confirmed they hold. Only a
 * listed tester is offered a test-mode purchase (TASK-167, the exception of
 * TASK-111 and TASK-154); the page itself sells nothing. The genealogy partner
 * is described by its service and never named (ADR-0026 §2.4).
 */

export type TierKey = "free" | "smaller" | "couple" | "family" | "genealogy";
/** The one-off products (D-045, D-049): no tree unlock. */
export type ProductKey = "babynames" | "fullnames";

export interface Tier {
  readonly key: TierKey;
  readonly name: string;
  readonly price: string;
  /** Free is on offer now; the paid tiers are coming. */
  readonly soon: boolean;
  readonly lede: string;
  readonly items: readonly string[];
  readonly note?: string;
}

export interface Product {
  readonly key: ProductKey;
  readonly name: string;
  readonly price: string;
  readonly lede: string;
  readonly items: readonly string[];
}

/** The comparison table's columns, cheapest first; 800 zł is not in it (it is a service). */
export const TABLE_COLUMNS = [
  "free",
  "babynames",
  "fullnames",
  "smaller",
  "couple",
  "family",
] as const;
export type TableColumn = (typeof TABLE_COLUMNS)[number];

/** The table's rows, in order; `offer-page.tsx` decides each cell from the entitlement lists. */
export const TABLE_ROWS = [
  "surname",
  "compare",
  "babyTop",
  "babyFull",
  "fullnames",
  "coupleReport",
  "tree",
  "matches",
] as const;
export type TableRow = (typeof TABLE_ROWS)[number];

/** The reader's answer to "do you have a DNA test?"; empty is no answer. */
export const DNA_ANSWERS = ["none", "autosomal", "y", "mt", "unsure"] as const;
export type DnaAnswer = (typeof DNA_ANSWERS)[number];

export interface EnquiryAnswers {
  readonly name: string;
  readonly surnames: string;
  readonly places: string;
  readonly goal: string;
  readonly dna: DnaAnswer | "";
}

export const EMPTY_ENQUIRY: EnquiryAnswers = {
  name: "",
  surnames: "",
  places: "",
  goal: "",
  dna: "",
};

/** The longest a typed answer may be: a `mailto:` address much past 2,000 characters fails in some mail programs. */
export const ANSWER_MAX = 600;

export interface OfferDocument {
  readonly title: string;
  readonly lede: string;
  readonly facts: readonly string[];
  readonly now: string;
  readonly soon: string;
  readonly freeToday: string;
  readonly testMode: string;
  readonly once: string;
  readonly freeCta: string;
  readonly signUp: string;
  readonly yourAccount: string;
  readonly accountWays: string;
  readonly tiers: readonly Tier[];
  readonly products: readonly Product[];
  readonly productsHeading: string;
  readonly productsLede: string;
  readonly packsHeading: string;
  readonly packsLede: string;
  readonly freeWindow: {
    /** The window's true end (D-051, TASK-167); "the last week" only when it is. */
    readonly when: (date: string, lastWeek: boolean) => string;
    readonly signedIn: string;
    readonly signedOut: string;
  };
  readonly buy: (price: string) => string;
  readonly testNote: string;
  readonly table: {
    readonly heading: string;
    readonly rows: Readonly<Record<TableRow, string>>;
    readonly upTo5: string;
    readonly more: string;
    readonly upToSecond: string;
    readonly further: string;
    readonly yes: string;
    readonly no: string;
  };
  readonly pay: {
    readonly heading: string;
    readonly lede: string;
    readonly steps: readonly string[];
  };
  readonly faq: {
    readonly heading: string;
    readonly items: readonly { readonly q: string; readonly a: string }[];
  };
  readonly nothingOnSale: string;
  readonly howFormsWork: string;
  readonly noDna: string;
  readonly writeYourself: string;
  readonly waitlist: {
    readonly heading: string;
    readonly intro: string;
    readonly surname: string;
    readonly submit: string;
    readonly fallback: string;
    readonly subject: string;
    readonly body: string;
  };
  readonly enquiry: {
    readonly heading: string;
    readonly intro: string;
    readonly fields: Readonly<Record<Exclude<keyof EnquiryAnswers, "dna">, string>>;
    readonly dna: string;
    readonly dnaAnswers: Readonly<Record<DnaAnswer | "", string>>;
    readonly submit: string;
    readonly fallback: string;
    readonly subject: string;
    readonly body: string;
  };
}

/** What every tier from 28,99 zł up unlocks in the tree (D-025, ADR-0037 §2.1). */
const TREE_UNLOCK_PL =
  "Drzewo rodziny większe niż 5 osób i dopasowania dalsze niż kuzyni drugiego stopnia.";
const TREE_UNLOCK_EN = "A family tree of more than 5 people, and matches beyond second cousins.";
/** And the two one-off products, which every tier from 28,99 zł up holds (D-044 §4, D-049 §3). */
const INCLUDES_PL =
  "W cenie: Imiona dla dziecka (8,99 zł) i Porównanie imion i nazwisk (15,99 zł).";
const INCLUDES_EN = "Included: Baby names (PLN 8.99) and Full-name comparison (PLN 15.99).";
/** "Imiona pary" (D-050 §3): free for now; 15,99 zł later and held by every dearer pack. */
const COUPLE_NAMES_PL =
  "Wkrótce w cenie także „Co mówią Wasze imiona razem”: znaczenia dwóch imion pary obok siebie.";
const COUPLE_NAMES_EN =
  "Coming, also included: “What your names say together”, the meanings of a couple's two first names side by side.";

const PL: OfferDocument = {
  title: "Oferta",
  lede: "Odpowiedzi o nazwisku są za darmo, a z darmowym kontem także drzewo rodziny do 5 osób. Płatne produkty otworzą więcej danych o imionach i większe drzewo. Każdy kupisz jednorazowo: bez abonamentu i bez odnawiania.",
  facts: ["Ceny brutto, z VAT", "Jedna płatność, bez abonamentu", "Bez automatycznego odnawiania"],
  now: "Działa teraz",
  soon: "Wkrótce",
  freeToday: "Dziś za darmo",
  testMode: "Tryb testowy",
  once: "jednorazowo",
  freeCta: "Sprawdź nazwisko",
  signUp: "Załóż darmowe konto",
  yourAccount: "Twoje konto",
  accountWays: "Konto założysz e-mailem albo przez Google.",
  tiers: [
    {
      key: "free",
      name: "Za darmo, z kontem",
      price: "0 zł",
      soon: false,
      lede: "Wszystko, co wiemy o nazwisku, z każdym źródłem i datą.",
      items: [
        "Karty z odpowiedziami zaraz po wpisaniu nazwiska: ile osób je nosi, jak jest rzadkie, w których województwach jest najczęstsze, jak zmieniało się od 2019 roku, co może znaczyć i gdzie pojawia się w dawnych drukach.",
        "Pełna strona ze źródłami i porównanie dwóch nazwisk.",
        "Karta do udostępnienia z każdej odpowiedzi.",
        "Znane osoby o tym nazwisku: tylko publiczne fakty i link do Wikipedii. To samo nazwisko, nie Twój krewny.",
        "Z kontem: drzewo rodziny do 5 osób i łączenie go z drzewami innych osób przez wspólnych przodków, którzy już nie żyją, z dopasowaniami do kuzynów drugiego stopnia.",
        "Imiona dla dziecka: pierwsza dziesiątka najnowszego roku.",
      ],
    },
    // ADR-0037 §2.2: only what the owner confirmed. What else 28,99 zł and 199 zł hold is not decided.
    {
      key: "smaller",
      name: "Małe poszukiwania",
      price: "28,99 zł",
      soon: true,
      lede: "Więcej miejsca w drzewie rodziny.",
      items: [TREE_UNLOCK_PL, INCLUDES_PL, COUPLE_NAMES_PL],
    },
    {
      key: "couple",
      name: "Para",
      price: "89,99 zł",
      soon: true,
      lede: "Dwa nazwiska obok siebie.",
      items: [
        "Raport „Wasze nazwiska razem”: nazwiska, które może nosić para, i fakty o obu nazwiskach obok siebie: ile osób je nosi, gdzie, jak się zmieniało i co może znaczyć. Bez żadnej oceny pary.",
        TREE_UNLOCK_PL,
        INCLUDES_PL,
        COUPLE_NAMES_PL,
      ],
    },
    {
      key: "family",
      name: "Przegląd rodziny",
      price: "199 zł",
      soon: true,
      lede: "Drzewo całej rodziny.",
      items: [TREE_UNLOCK_PL, INCLUDES_PL, COUPLE_NAMES_PL],
    },
    {
      key: "genealogy",
      name: "Badanie genealogiczne",
      price: "800 zł",
      soon: true,
      lede: "Zawodowi genealodzy szukają Twoich przodków w archiwach.",
      items: [
        "Poszukiwania w archiwach w Polsce i za granicą: księgi metrykalne, akta stanu cywilnego, spisy.",
        "Drzewo rodziny z kopiami dokumentów, pokolenie po pokoleniu, tak daleko, jak sięgają źródła.",
        "DNA: pomoc w wyborze testu (autosomalny: krewni z obu stron; Y-DNA: linia ojca; mtDNA: linia matki) i analiza testu, który już masz.",
        "Pisemny raport ze źródłami.",
        TREE_UNLOCK_PL,
      ],
    },
  ],
  products: [
    {
      key: "babynames",
      name: "Imiona dla dziecka",
      price: "8,99 zł",
      lede: "Pełne liczby imion nadawanych dzieciom.",
      items: [
        "Pełne liczby każdego imienia, od 2000 roku.",
        "Cała lista imion z danego roku, z kierunkiem: rośnie czy spada.",
        "Porównanie imion obok siebie.",
        "Karta do udostępnienia z pełnymi liczbami.",
      ],
    },
    {
      key: "fullnames",
      name: "Porównanie imion i nazwisk",
      price: "15,99 zł",
      lede: "Imię i nazwisko od 2 do 4 osób, obok siebie.",
      items: [
        "Dla każdej osoby: imię w rejestrze PESEL, imię nadawane dzieciom w ostatnim roku, nazwisko i pochodzenie według źródeł.",
        "Bez łącznej liczby osób o tym imieniu i nazwisku: żadne źródło jej nie publikuje.",
      ],
    },
  ],
  productsHeading: "Pojedyncze raporty",
  productsLede: "Kupujesz tylko ten widok. Nie powiększa drzewa.",
  packsHeading: "Pakiety z większym drzewem",
  packsLede:
    "Każdy pakiet otwiera drzewo większe niż 5 osób i dalsze dopasowania. W każdym są oba raporty powyżej.",
  freeWindow: {
    when: (date, lastWeek) =>
      lastWeek
        ? `Ostatni tydzień: za darmo dla zalogowanych do ${date}`
        : `Za darmo dla zalogowanych do ${date}`,
    signedIn: "Sprawdź dziś za darmo",
    signedOut: "Zaloguj się i sprawdź za darmo",
  },
  buy: (price) => `Kup testowo — ${price}`,
  testNote:
    "Płatność testowa Stripe: żadna karta nie zostanie obciążona. Karta testowa 4242 4242 4242 4242.",
  table: {
    heading: "Co jest w czym",
    rows: {
      surname: "Wszystko o nazwisku, ze źródłami",
      compare: "Porównanie dwóch nazwisk",
      babyTop: "Imiona dla dziecka: najnowszy rok, pierwsza dziesiątka",
      babyFull: "Imiona dla dziecka: pełne liczby od 2000 roku",
      fullnames: "Porównanie imion i nazwisk, 2–4 osoby",
      coupleReport: "Raport „Wasze nazwiska razem”",
      tree: "Drzewo rodziny",
      matches: "Dopasowania z innymi drzewami",
    },
    upTo5: "do 5 osób",
    more: "więcej niż 5 osób",
    upToSecond: "do kuzynów 2. stopnia",
    further: "dalej",
    yes: "Tak",
    no: "Nie",
  },
  pay: {
    heading: "Jak będzie wyglądać płatność",
    lede: "Zakup należy do konta, więc najpierw się logujesz.",
    steps: [
      "Wybierasz produkt na tej stronie.",
      "Płacisz na bezpiecznej stronie Stripe. Nie widzimy numeru Twojej karty.",
      "Gdy Stripe potwierdzi płatność, zakup pojawia się w „Twoim planie” na koncie i widoki się otwierają.",
    ],
  },
  faq: {
    heading: "Pytania",
    items: [
      { q: "Czy to abonament?", a: "Nie. Każdy produkt opłacasz raz i nic się nie odnawia." },
      {
        q: "Czy mogę zacząć od tańszego i dokupić pakiet?",
        a: "Tak. Zakupy się sumują: to, co już masz, zostaje na koncie.",
      },
      {
        q: "Czy zapłata zmienia odpowiedzi?",
        a: "Nie. Płatny widok pokazuje więcej danych, ale żadna odpowiedź nie zależy od tego, czy zapłaciłeś.",
      },
    ],
  },
  nothingOnSale:
    "Nic płatnego nie jest jeszcze w sprzedaży. Zapis i pytanie nic nie kosztują i do niczego nie zobowiązują.",
  howFormsWork: `Formularz przygotuje wiadomość e-mail w Twoim programie pocztowym. Wysyłasz ją sam, na adres ${CONTACT_EMAIL}. Strona niczego nie zapisuje.`,
  noDna:
    "Nie wysyłaj w wiadomości wyników testu DNA ani informacji o zdrowiu. Do pierwszej odpowiedzi nie są potrzebne.",
  writeYourself: `Nie otwiera się program pocztowy? Napisz na ${CONTACT_EMAIL}.`,
  waitlist: {
    heading: "Zapisz się na listę",
    intro: "Damy znać, gdy produkt ruszy.",
    surname: "Nazwisko, które Cię interesuje (nieobowiązkowo)",
    submit: "Zapisz się e-mailem",
    fallback: "Napisz, by zapisać się na listę",
    subject: "Lista oczekujących",
    body: "Proszę o wiadomość, gdy ten pakiet będzie dostępny.",
  },
  enquiry: {
    heading: "Zapytaj o badanie",
    intro: "Opisz, czego szukasz. Odpiszemy z zakresem i terminem.",
    fields: {
      name: "Imię i nazwisko",
      surnames: "Nazwiska w rodzinie, których szukasz",
      places: "Miejsca i lata, które znasz",
      goal: "Co chcesz odkryć?",
    },
    dna: "Czy masz test DNA?",
    dnaAnswers: {
      "": "Wybierz",
      none: "Nie mam",
      autosomal: "Tak, autosomalny",
      y: "Tak, Y-DNA",
      mt: "Tak, mtDNA",
      unsure: "Nie wiem",
    },
    submit: "Wyślij zapytanie e-mailem",
    fallback: "Napisz, by zapytać o badanie",
    subject: "Zapytanie: Badanie genealogiczne (800 zł)",
    body: "Chcę zapytać o badanie genealogiczne z DNA.",
  },
};

const EN: OfferDocument = {
  title: "Offer",
  lede: "The answers about a surname are free, and with a free account so is a family tree of up to 5 people. The paid products will open more first-name figures and a bigger tree. Each is a one-time payment: no subscription and no renewal.",
  facts: ["Prices include VAT", "One payment, no subscription", "No automatic renewal"],
  now: "Available now",
  soon: "Coming soon",
  freeToday: "Free today",
  testMode: "Test mode",
  once: "one-time",
  freeCta: "Look up a surname",
  signUp: "Create a free account",
  yourAccount: "Your account",
  accountWays: "Sign up with email or with Google.",
  tiers: [
    {
      key: "free",
      name: "Free, with an account",
      price: "PLN 0",
      soon: false,
      lede: "Everything we know about a surname, with every source and date.",
      items: [
        "Cards with answers as soon as you type a surname: how many people bear it, how rare it is, the provinces where it is most common, how it has changed since 2019, what it may mean and where it appears in old print.",
        "The full page with its sources, and a comparison of two surnames.",
        "A card to share for each answer.",
        "Famous people with the surname: public facts only, with a link to Wikipedia. The same surname, not your relative.",
        "With an account: a family tree of up to 5 people, connected to other people's trees through shared ancestors who have died, with matches up to second cousins.",
        "Baby names: the top 10 of the latest year.",
      ],
    },
    {
      key: "smaller",
      name: "Smaller research",
      price: "PLN 28.99",
      soon: true,
      lede: "More room in your family tree.",
      items: [TREE_UNLOCK_EN, INCLUDES_EN, COUPLE_NAMES_EN],
    },
    {
      key: "couple",
      name: "Couple",
      price: "PLN 89.99",
      soon: true,
      lede: "Two surnames side by side.",
      items: [
        "The “Your names together” report: the names a couple could carry, and both surnames' facts side by side: how many people bear each, where, how it has changed and what it may mean. No score about the couple.",
        TREE_UNLOCK_EN,
        INCLUDES_EN,
        COUPLE_NAMES_EN,
      ],
    },
    {
      key: "family",
      name: "Family review",
      price: "PLN 199",
      soon: true,
      lede: "A tree for the whole family.",
      items: [TREE_UNLOCK_EN, INCLUDES_EN, COUPLE_NAMES_EN],
    },
    {
      key: "genealogy",
      name: "Genealogist research",
      price: "PLN 800",
      soon: true,
      lede: "Professional genealogists search the archives for your ancestors.",
      items: [
        "Research in archives in Poland and abroad: parish registers, civil records, censuses.",
        "A family tree with copies of the documents, generation by generation, as far back as the sources go.",
        "DNA: help choosing a test (autosomal: relatives on both sides; Y-DNA: the father's line; mtDNA: the mother's line) and analysis of a test you have already taken.",
        "A written report with its sources.",
        TREE_UNLOCK_EN,
      ],
    },
  ],
  products: [
    {
      key: "babynames",
      name: "Baby names",
      price: "PLN 8.99",
      lede: "The full figures of first names given to children.",
      items: [
        "The full figures of every name, since 2000.",
        "The whole list of a year's names, with its direction: rising or falling.",
        "Names compared side by side.",
        "A share card with the full figures.",
      ],
    },
    {
      key: "fullnames",
      name: "Full-name comparison",
      price: "PLN 15.99",
      lede: "The first names and surnames of 2 to 4 people, side by side.",
      items: [
        "For each person: the first name in the PESEL register, the first name given to children in the latest year, the surname, and its origin as the sources state it.",
        "No count of people with a first name and a surname together: no source publishes one.",
      ],
    },
  ],
  productsHeading: "Single reports",
  productsLede: "You buy only this view. It does not enlarge the tree.",
  packsHeading: "Packs with a bigger tree",
  packsLede:
    "Each pack opens a tree of more than 5 people and further matches. Each includes both reports above.",
  freeWindow: {
    when: (date, lastWeek) =>
      lastWeek
        ? `Last week: free for signed-in readers until ${date}`
        : `Free for signed-in readers until ${date}`,
    signedIn: "See it free today",
    signedOut: "Sign in and see it free",
  },
  buy: (price) => `Test purchase — ${price}`,
  testNote: "A Stripe test payment: no card is charged. Test card 4242 4242 4242 4242.",
  table: {
    heading: "What each includes",
    rows: {
      surname: "Everything about a surname, with sources",
      compare: "A comparison of two surnames",
      babyTop: "Baby names: the latest year's top 10",
      babyFull: "Baby names: the full figures since 2000",
      fullnames: "Full-name comparison, 2–4 people",
      coupleReport: "The “Your names together” report",
      tree: "Family tree",
      matches: "Matches with other trees",
    },
    upTo5: "up to 5 people",
    more: "more than 5 people",
    upToSecond: "up to second cousins",
    further: "further",
    yes: "Yes",
    no: "No",
  },
  pay: {
    heading: "How paying will work",
    lede: "A purchase belongs to an account, so you sign in first.",
    steps: [
      "You choose a product on this page.",
      "You pay on Stripe's secure page. We never see your card number.",
      "Once Stripe confirms the payment, the purchase appears under “Your plan” in your account and the views open.",
    ],
  },
  faq: {
    heading: "Questions",
    items: [
      { q: "Is it a subscription?", a: "No. You pay for each product once and nothing renews." },
      {
        q: "Can I start with a cheaper one and add a pack later?",
        a: "Yes. Purchases add up: what you already have stays on your account.",
      },
      {
        q: "Does paying change the answers?",
        a: "No. A paid view shows more figures, but no answer depends on whether you paid.",
      },
    ],
  },
  nothingOnSale:
    "Nothing paid is on sale yet. Signing up or asking costs nothing and commits you to nothing.",
  howFormsWork: `The form prepares an email in your own mail program. You send it yourself, to ${CONTACT_EMAIL}. The site keeps nothing.`,
  noDna:
    "Do not send DNA results or health information by email. They are not needed for a first reply.",
  writeYourself: `No mail program opens? Write to ${CONTACT_EMAIL}.`,
  waitlist: {
    heading: "Join the waiting list",
    intro: "We will let you know when it starts.",
    surname: "A surname you are interested in (optional)",
    submit: "Join by email",
    fallback: "Write to join the waiting list",
    subject: "Waiting list",
    body: "Please let me know when this tier is available.",
  },
  enquiry: {
    heading: "Ask about research",
    intro: "Tell us what you are looking for. We will reply with the scope and timing.",
    fields: {
      name: "Your name",
      surnames: "Family surnames you are researching",
      places: "Places and years you know",
      goal: "What do you want to find out?",
    },
    dna: "Do you have a DNA test?",
    dnaAnswers: {
      "": "Choose",
      none: "No",
      autosomal: "Yes, autosomal",
      y: "Yes, Y-DNA",
      mt: "Yes, mtDNA",
      unsure: "Not sure",
    },
    submit: "Send the enquiry by email",
    fallback: "Write to ask about research",
    subject: "Enquiry: Genealogist research (PLN 800)",
    body: "I would like to ask about genealogy research with DNA.",
  },
};

export function offerDocument(lang: Lang): OfferDocument {
  return lang === "en" ? EN : PL;
}

/**
 * A `mailto:` to the owner. Subject and body are percent-encoded with
 * `encodeURIComponent`, which writes a space as `%20` as RFC 6068 requires
 * (the same rule as TASK-050's report link).
 */
export function mailtoHref(subject: string, lines: readonly string[]): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

function answer(value: string): string {
  return value.trim().slice(0, ANSWER_MAX);
}

/** What a reader joins a waiting list for: every paid tier but the genealogist's, which takes an enquiry, and both products. */
export type WaitlistTier = Exclude<TierKey, "free" | "genealogy"> | ProductKey;

/** A waiting list: the tier or product and its price in the subject, the surname if given. */
export function waitlistMailto(tier: WaitlistTier, surname: string, lang: Lang): string {
  const doc = offerDocument(lang);
  const w = doc.waitlist;
  const t = [...doc.tiers, ...doc.products].find((x) => x.key === tier);
  const label = w.surname.replace(/ \(.*\)$/u, "");
  const subject = t === undefined ? w.subject : `${w.subject}: ${t.name} (${t.price})`;
  return mailtoHref(subject, [w.body, "", `${label}: ${answer(surname)}`]);
}

/** The 800 zł enquiry: each question with what the reader typed after it. */
export function enquiryMailto(answers: EnquiryAnswers, lang: Lang): string {
  const e = offerDocument(lang).enquiry;
  return mailtoHref(e.subject, [
    e.body,
    "",
    `${e.fields.name}: ${answer(answers.name)}`,
    `${e.fields.surnames}: ${answer(answers.surnames)}`,
    `${e.fields.places}: ${answer(answers.places)}`,
    `${e.fields.goal}: ${answer(answers.goal)}`,
    `${e.dna} ${answers.dna === "" ? "" : e.dnaAnswers[answers.dna]}`.trimEnd(),
  ]);
}
