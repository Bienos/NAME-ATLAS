import { contactFormHref } from "./contact.js";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * The offer page's words (TASK-057, TASK-104, ADR-0037), and the two messages
 * its forms prepare for the contact form. Pure: the server page and the form's
 * client island both read it.
 *
 * What the page may say is what ADR-0037 records: the free tier as it is
 * today, and the four paid tiers as coming, with their prices, what the owner
 * has confirmed they hold, and no way to buy. The genealogy partner is
 * described by its service and never named (ADR-0026 §2.4).
 */

export type TierKey = "free" | "smaller" | "couple" | "family" | "genealogy";

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

/** The longest a typed answer may be: the answers travel in the contact page's address, which browsers cap. */
export const ANSWER_MAX = 600;

export interface OfferDocument {
  readonly title: string;
  readonly lede: string;
  readonly now: string;
  readonly soon: string;
  readonly freeCta: string;
  readonly tiers: readonly Tier[];
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

/** What every paid tier unlocks in the tree (D-025: "any paid tier"). Not built yet. */
const TREE_UNLOCK_PL =
  "Drzewo rodziny większe niż 5 osób i dopasowania dalsze niż kuzyni drugiego stopnia.";
const TREE_UNLOCK_EN = "A family tree of more than 5 people, and matches beyond second cousins.";

const PL: OfferDocument = {
  title: "Oferta",
  lede: "Odpowiedzi o nazwisku są za darmo, a wkrótce, z darmowym kontem, także drzewo rodziny do 5 osób. Płatne pakiety, każdy za jednorazową opłatą, poszerzą drzewo; najwyższy to badanie zawodowego genealoga z DNA.",
  now: "Teraz",
  soon: "Wkrótce",
  freeCta: "Sprawdź nazwisko",
  tiers: [
    {
      key: "free",
      name: "Za darmo",
      price: "0 zł",
      soon: false,
      lede: "Wszystko, co wiemy o nazwisku, z każdym źródłem i datą.",
      items: [
        "Karty z odpowiedziami zaraz po wpisaniu nazwiska: ile osób je nosi, jak jest rzadkie, w których województwach jest najczęstsze, jak zmieniało się od 2019 roku, co może znaczyć i gdzie pojawia się w dawnych drukach.",
        "Karta do udostępnienia z każdej odpowiedzi.",
        "Pełna strona ze źródłami i porównanie dwóch nazwisk.",
        "Znane osoby o tym nazwisku: tylko publiczne fakty i link do Wikipedii. To samo nazwisko, nie Twój krewny.",
      ],
      // The tree is free with an account, up to 5 people (D-034, D-025, ADR-0037 §2.1).
      note: "Wkrótce darmowe konto, także przez Google: zachowasz karty i zbudujesz drzewo rodziny do 5 osób: rodzice, dziadkowie, miejsca, daty, nazwiska panieńskie. Połączysz je z drzewami innych osób przez wspólnych przodków, którzy już nie żyją, z dopasowaniami do kuzynów drugiego stopnia.",
    },
    // ADR-0037 §2.2: only what the owner confirmed. What else 28,99 zł and 199 zł hold is not decided.
    {
      key: "smaller",
      name: "Małe poszukiwania",
      price: "28,99 zł",
      soon: true,
      lede: "Więcej miejsca w drzewie rodziny.",
      items: [TREE_UNLOCK_PL],
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
      ],
    },
    {
      key: "family",
      name: "Przegląd rodziny",
      price: "199 zł",
      soon: true,
      lede: "Drzewo całej rodziny.",
      items: [TREE_UNLOCK_PL],
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
  nothingOnSale:
    "Nic płatnego nie jest jeszcze w sprzedaży. Zapis i pytanie nic nie kosztują i do niczego nie zobowiązują.",
  howFormsWork:
    "Formularz przygotuje treść wiadomości i otworzy ją w formularzu kontaktowym. Tam ją wysyłasz. Strona niczego nie zapisuje.",
  noDna:
    "Nie wysyłaj w wiadomości wyników testu DNA ani informacji o zdrowiu. Do pierwszej odpowiedzi nie są potrzebne.",
  writeYourself: "Wolisz napisać własnymi słowami? Napisz przez formularz kontaktowy.",
  waitlist: {
    heading: "Zapisz się na listę",
    intro: "Damy znać, gdy pakiet ruszy.",
    surname: "Nazwisko, które Cię interesuje (nieobowiązkowo)",
    submit: "Zapisz się",
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
    submit: "Wyślij zapytanie",
    fallback: "Napisz, by zapytać o badanie",
    subject: "Zapytanie: Badanie genealogiczne (800 zł)",
    body: "Chcę zapytać o badanie genealogiczne z DNA.",
  },
};

const EN: OfferDocument = {
  title: "Offer",
  lede: "The answers about a surname are free, and soon, with a free account, so is a family tree of up to 5 people. The paid tiers, each a one-time payment, widen the tree; the highest is research by a professional genealogist with DNA.",
  now: "Now",
  soon: "Coming soon",
  freeCta: "Look up a surname",
  tiers: [
    {
      key: "free",
      name: "Free",
      price: "PLN 0",
      soon: false,
      lede: "Everything we know about a surname, with every source and date.",
      items: [
        "Cards with answers as soon as you type a surname: how many people bear it, how rare it is, the provinces where it is most common, how it has changed since 2019, what it may mean and where it appears in old print.",
        "A card to share for each answer.",
        "The full page with its sources, and a comparison of two surnames.",
        "Famous people with the surname: public facts only, with a link to Wikipedia. The same surname, not your relative.",
      ],
      note: "Coming soon, a free account, with Google too: keep your cards and build a family tree of up to 5 people: parents, grandparents, places, dates, maiden names. Connect it to other people's trees through shared ancestors who have died, with matches up to second cousins.",
    },
    {
      key: "smaller",
      name: "Smaller research",
      price: "PLN 28.99",
      soon: true,
      lede: "More room in your family tree.",
      items: [TREE_UNLOCK_EN],
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
      ],
    },
    {
      key: "family",
      name: "Family review",
      price: "PLN 199",
      soon: true,
      lede: "A tree for the whole family.",
      items: [TREE_UNLOCK_EN],
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
  nothingOnSale:
    "Nothing paid is on sale yet. Signing up or asking costs nothing and commits you to nothing.",
  howFormsWork:
    "The form prepares the message and opens it in the contact form. You send it from there. The site keeps nothing.",
  noDna:
    "Do not send DNA results or health information by email. They are not needed for a first reply.",
  writeYourself: "Prefer your own words? Write through the contact form.",
  waitlist: {
    heading: "Join the waiting list",
    intro: "We will let you know when it starts.",
    surname: "A surname you are interested in (optional)",
    submit: "Join the list",
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
    submit: "Send the enquiry",
    fallback: "Write to ask about research",
    subject: "Enquiry: Genealogist research (PLN 800)",
    body: "I would like to ask about genealogy research with DNA.",
  },
};

export function offerDocument(lang: Lang): OfferDocument {
  return lang === "en" ? EN : PL;
}

/** The contact form's topic for both messages: its last, "Inne" / "Something else". */
function offerTopic(lang: Lang): string {
  const topics: readonly string[] = UI[lang].contactTopicOptions;
  return topics[topics.length - 1]!;
}

/**
 * The contact page with the form prefilled (`contactFormHref`): the subject as
 * the message's first line, then the lines. Since 2026-10-06 the site publishes
 * no address, so the contact form sends what a `mailto:` to the owner once did.
 */
export function contactHref(lang: Lang, subject: string, lines: readonly string[]): string {
  return contactFormHref(lang, {
    topic: offerTopic(lang),
    message: [subject, "", ...lines].join("\n"),
  });
}

function answer(value: string): string {
  return value.trim().slice(0, ANSWER_MAX);
}

/** The tiers a reader joins a waiting list for: every paid tier but the genealogist's, which takes an enquiry. */
export type WaitlistTier = Exclude<TierKey, "free" | "genealogy">;

/** A paid tier's waiting list: the tier and its price in the subject, the surname if given. */
export function waitlistHref(tier: WaitlistTier, surname: string, lang: Lang): string {
  const doc = offerDocument(lang);
  const w = doc.waitlist;
  const t = doc.tiers.find((x) => x.key === tier);
  const label = w.surname.replace(/ \(.*\)$/u, "");
  const subject = t === undefined ? w.subject : `${w.subject}: ${t.name} (${t.price})`;
  return contactHref(lang, subject, [w.body, "", `${label}: ${answer(surname)}`]);
}

/** The 800 zł enquiry: each question with what the reader typed after it. */
export function enquiryHref(answers: EnquiryAnswers, lang: Lang): string {
  const e = offerDocument(lang).enquiry;
  return contactHref(lang, e.subject, [
    e.body,
    "",
    `${e.fields.name}: ${answer(answers.name)}`,
    `${e.fields.surnames}: ${answer(answers.surnames)}`,
    `${e.fields.places}: ${answer(answers.places)}`,
    `${e.fields.goal}: ${answer(answers.goal)}`,
    `${e.dna} ${answers.dna === "" ? "" : e.dnaAnswers[answers.dna]}`.trimEnd(),
  ]);
}
