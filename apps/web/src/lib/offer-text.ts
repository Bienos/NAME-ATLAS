import { CONTACT_EMAIL } from "./contact.js";
import type { Lang } from "./messages.js";

/**
 * The offer page's words (TASK-057, ADR-0026), and the two emails its forms
 * prepare. Pure: the server page and the form's client island both read it.
 *
 * What the page may say is what ADR-0026 decided: the free tier as it is
 * today, and the two paid tiers as coming, with their prices and no way to buy.
 * The genealogy partner is described by its service and never named.
 */

export type TierKey = "free" | "family" | "genealogy";

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

/** The longest a typed answer may be: a `mailto:` address much past 2,000 characters fails in some mail programs. */
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

const PL: OfferDocument = {
  title: "Oferta",
  lede: "Odpowiedzi o nazwisku są za darmo, a wkrótce także drzewo, które zbudujesz sam. Potem łączenie drzew i badania zawodowych genealogów z DNA.",
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
      ],
      // The tree is free with an account (D-034, 2026-10-04), no longer part of the 29,99 zł tier.
      note: "Wkrótce darmowe konto, także przez Google: zachowasz karty i zbudujesz drzewo rodziny: rodzice, dziadkowie, miejsca, daty, nazwiska panieńskie.",
    },
    {
      key: "family",
      name: "Nazwisko i rodzina",
      price: "29,99 zł",
      soon: true,
      lede: "Od nazwiska do Twojej rodziny.",
      items: [
        "Pełny raport nazwiska: dawne formy, wzmianki w archiwach i drukach, zmiany w czasie i wszystkie źródła.",
        "Znane osoby o tym nazwisku: tylko publiczne fakty i link do Wikipedii. To samo nazwisko, nie Twój krewny.",
        "Łączenie drzew z innymi osobami przez wspólnych przodków, którzy już nie żyją.",
        "Dodatkowe poszukiwania w źródłach serwisu dla miejsc i dat z Twojego drzewa.",
      ],
    },
    {
      key: "genealogy",
      name: "Genealogia z DNA",
      price: "499 zł",
      soon: true,
      lede: "Zawodowi genealodzy szukają Twoich przodków w archiwach.",
      items: [
        "Poszukiwania w archiwach w Polsce i za granicą: księgi metrykalne, akta stanu cywilnego, spisy.",
        "Drzewo rodziny z kopiami dokumentów, pokolenie po pokoleniu, tak daleko, jak sięgają źródła.",
        "DNA: pomoc w wyborze testu (autosomalny: krewni z obu stron; Y-DNA: linia ojca; mtDNA: linia matki) i analiza testu, który już masz.",
        "Pisemny raport ze źródłami.",
      ],
    },
  ],
  nothingOnSale:
    "Nic płatnego nie jest jeszcze w sprzedaży. Zapis i pytanie nic nie kosztują i do niczego nie zobowiązują.",
  howFormsWork: `Formularz przygotuje wiadomość e-mail w Twoim programie pocztowym. Wysyłasz ją sam, na adres ${CONTACT_EMAIL}. Strona niczego nie zapisuje.`,
  noDna:
    "Nie wysyłaj w wiadomości wyników testu DNA ani informacji o zdrowiu. Do pierwszej odpowiedzi nie są potrzebne.",
  writeYourself: `Nie otwiera się program pocztowy? Napisz na ${CONTACT_EMAIL}.`,
  waitlist: {
    heading: "Zapisz się na listę",
    intro: "Damy znać, gdy pakiet ruszy.",
    surname: "Nazwisko, które Cię interesuje (nieobowiązkowo)",
    submit: "Zapisz się e-mailem",
    fallback: "Napisz, by zapisać się na listę",
    subject: "Lista oczekujących: Nazwisko i rodzina (29,99 zł)",
    body: "Proszę o wiadomość, gdy pakiet „Nazwisko i rodzina” będzie dostępny.",
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
    subject: "Zapytanie: Genealogia z DNA (499 zł)",
    body: "Chcę zapytać o badanie genealogiczne z DNA.",
  },
};

const EN: OfferDocument = {
  title: "Offer",
  lede: "The answers about a surname are free, and soon so is a tree you build yourself. Then connecting trees, and research by professional genealogists with DNA.",
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
      ],
      note: "Coming soon, a free account, with Google too: keep your cards and build your family tree: parents, grandparents, places, dates, maiden names.",
    },
    {
      key: "family",
      name: "Surname and family",
      price: "PLN 29.99",
      soon: true,
      lede: "From the surname to your family.",
      items: [
        "The full surname report: old forms, mentions in archives and print, change over time and every source.",
        "Famous people with the surname: public facts only, with a link to Wikipedia. The same surname, not your relative.",
        "Connecting trees with other people through shared ancestors who have died.",
        "Extra searches in the site's sources for the places and dates in your tree.",
      ],
    },
    {
      key: "genealogy",
      name: "Genealogy with DNA",
      price: "PLN 499",
      soon: true,
      lede: "Professional genealogists search the archives for your ancestors.",
      items: [
        "Research in archives in Poland and abroad: parish registers, civil records, censuses.",
        "A family tree with copies of the documents, generation by generation, as far back as the sources go.",
        "DNA: help choosing a test (autosomal: relatives on both sides; Y-DNA: the father's line; mtDNA: the mother's line) and analysis of a test you have already taken.",
        "A written report with its sources.",
      ],
    },
  ],
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
    subject: "Waiting list: Surname and family (PLN 29.99)",
    body: "Please let me know when “Surname and family” is available.",
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
    subject: "Enquiry: Genealogy with DNA (PLN 499)",
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

/** The 29.99 zł waiting list: the tier in the subject, the surname if given. */
export function waitlistMailto(surname: string, lang: Lang): string {
  const w = offerDocument(lang).waitlist;
  const label = w.surname.replace(/ \(.*\)$/u, "");
  return mailtoHref(w.subject, [w.body, "", `${label}: ${answer(surname)}`]);
}

/** The 499 zł enquiry: each question with what the reader typed after it. */
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
