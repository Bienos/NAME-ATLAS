import type { Lang } from "./messages.js";
import type { NoReadingWhy } from "./couple-names-reading.js";

/**
 * The couple first-names page's words (TASK-156, ADR-0047), in Polish and
 * English. Nothing that judges the couple: no "pasują", "dopasowanie",
 * "zgodność", "match", "compatible", no score and no heart; a test holds the
 * messages, the rendered page and every stored reading to it
 * (`COUPLE_NAMES_BANNED`).
 */

export interface CoupleNamesText {
  readonly title: string;
  readonly lede: string;
  readonly source: string;
  readonly signedOut: string;
  readonly signIn: string;
  readonly labelA: string;
  readonly labelB: string;
  readonly placeholderA: string;
  readonly placeholderB: string;
  readonly submit: string;
  readonly empty: string;
  readonly invalid: string;
  readonly notFound: (name: string) => string;
  readonly held: string;
  readonly pairTitle: (a: string, b: string) => string;
  readonly sameName: string;
  readonly readingHeading: string;
  readonly readingNote: (model: string) => string;
  readonly readingDate: (date: string) => string;
  readonly readingWhy: string;
  readonly readingButton: string;
  readonly readingMissing: (name: string, why: NoReadingWhy) => string;
  readonly readingUnavailable: string;
  readonly statusFailed: string;
  readonly statusLimit: string;
  readonly statusUnavailable: string;
  readonly nameLink: (name: string) => string;
}

export const COUPLE_NAMES_TEXT: Readonly<Record<Lang, CoupleNamesText>> = {
  pl: {
    title: "Co mówią Wasze imiona razem",
    lede: "Dwa imiona, ich pochodzenie i znaczenie w dziełach, które wolno nam cytować, i odczytanie tych dwóch znaczeń obok siebie.",
    source:
      "Znaczenia pochodzą wyłącznie z dzieł z domeny publicznej, cytowanych przy każdym wpisie. Imię, którego żadne z nich nie objaśnia, nie ma znaczenia na tej stronie i nie zgadujemy go.",
    signedOut:
      "Ta część jest dla zalogowanych. Po zalogowaniu wpiszesz dwa imiona i zobaczysz, co o każdym z nich mówią dzieła, które wolno nam cytować, a potem odczytanie tych znaczeń razem.",
    signIn: "Zaloguj się",
    labelA: "Pierwsze imię",
    labelB: "Drugie imię",
    placeholderA: "np. Małgorzata",
    placeholderB: "np. Bartłomiej",
    submit: "Pokaż",
    empty: "Wpisz imię.",
    invalid: "Wpisz jedno imię, do 60 znaków.",
    notFound: (name) => `Imienia „${name}” nie ma na listach imion z rejestru PESEL.`,
    held: "Tej formy imienia nie pokazujemy, dopóki nie zostanie sprawdzona.",
    pairTitle: (a, b) => `${a} i ${b}`,
    sameName: "To samo imię dwa razy. Pokazujemy je raz; odczytanie powstaje tak samo.",
    readingHeading: "Odczytanie Name Atlas",
    readingNote: (model) =>
      `Interpretacja znaczeń podanych wyżej, napisana przez model ${model}. To nie jest fakt ani ocena Waszej pary.`,
    readingDate: (date) => `Napisane ${date}`,
    readingWhy:
      "Odczytanie powstaje z samych wpisów powyżej: bez dopisywania znaczeń, bez oceny Waszej pary i bez liczb. Powstaje raz dla tych dwóch imion; każdy, kto o nie zapyta, zobaczy ten sam tekst.",
    readingButton: "Napisz odczytanie",
    readingMissing: (name, why) =>
      why === "ORIGIN_ONLY"
        ? `Odczytanie wymaga znaczenia zacytowanego z dzieła dla obu imion. Dla imienia ${name} dzieła podają tylko język pochodzenia, nie znaczenie.`
        : why === "RIGHTS_BLOCKED"
          ? `Odczytanie wymaga znaczenia zacytowanego z dzieła dla obu imion. Dla imienia ${name} prawa źródła nie pozwalają go tu pokazać.`
          : `Odczytanie wymaga znaczenia zacytowanego z dzieła dla obu imion. Dla imienia ${name} żadne dzieło, które wolno nam cytować, nie podaje znaczenia.`,
    readingUnavailable: "Odczytania są teraz niedostępne. Znaczenia powyżej pozostają.",
    statusFailed:
      "Odczytanie nie powstało. Spróbujcie ponownie później; znaczenia powyżej pozostają.",
    statusLimit: "Dziś nie powstanie już więcej odczytań; wróćcie jutro.",
    statusUnavailable: "Odczytania są teraz niedostępne.",
    nameLink: (name) => `Imię ${name} wśród imion dla dziecka`,
  },
  en: {
    title: "What your names say together",
    lede: "Two first names, their origin and meaning in the works we may quote, and a reading of the two meanings side by side.",
    source:
      "Meanings come only from public-domain works, cited at every entry. A name none of them explains has no meaning on this page, and we do not guess one.",
    signedOut:
      "This part is for signed-in readers. Once signed in, you type two first names and see what the works we may quote say about each, then a reading of those meanings together.",
    signIn: "Sign in",
    labelA: "First name",
    labelB: "Second name",
    placeholderA: "e.g. Małgorzata",
    placeholderB: "e.g. Bartłomiej",
    submit: "Show",
    empty: "Type a name.",
    invalid: "Type one first name, up to 60 characters.",
    notFound: (name) => `“${name}” is not on the PESEL register's lists of first names.`,
    held: "This form of the name is not shown until it has been reviewed.",
    pairTitle: (a, b) => `${a} and ${b}`,
    sameName: "The same name twice. It is shown once; the reading is written all the same.",
    readingHeading: "A Name Atlas reading",
    readingNote: (model) =>
      `An interpretation of the meanings above, written by the model ${model}. It is neither a fact nor a judgement of your couple.`,
    readingDate: (date) => `Written ${date}.`,
    readingWhy:
      "The reading is written from the entries above alone: no added meanings, no judgement of your couple, no numbers. It is written once for these two names; anyone who asks for them sees the same text.",
    readingButton: "Write the reading",
    readingMissing: (name, why) =>
      why === "ORIGIN_ONLY"
        ? `A reading needs a meaning quoted from a work for both names. For ${name} the works give only a language of origin, not a meaning.`
        : why === "RIGHTS_BLOCKED"
          ? `A reading needs a meaning quoted from a work for both names. For ${name} the source's rights do not allow it to be shown here.`
          : `A reading needs a meaning quoted from a work for both names. For ${name} no work we may quote gives a meaning.`,
    readingUnavailable: "Readings are unavailable right now. The meanings above remain.",
    statusFailed: "The reading was not written. Try again later; the meanings above remain.",
    statusLimit: "No more readings will be written today; come back tomorrow.",
    statusUnavailable: "Readings are unavailable right now.",
    nameLink: (name) => `${name} among the baby names`,
  },
};
