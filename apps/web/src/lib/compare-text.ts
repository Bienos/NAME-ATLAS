import type { Lang } from "./messages.js";

/**
 * The redesigned comparison's own words (TASK-155), beside the comparison's
 * older strings in `messages.ts` (`compare*`), which it still uses. Nothing
 * here states a figure: every number on the page comes from a claim.
 */

export interface CompareText {
  /** Above the pair and above the picker's heading. */
  readonly eyebrow: string;
  /** The mark between two names: "a" / "vs". */
  readonly versus: string;
  readonly chapter: (n: number) => string;
  readonly rarerVerdict: (name: string) => string;
  readonly pages: string;
  readonly again: string;
  readonly againLede: string;
  readonly tryHeading: string;
  readonly givesHeading: string;
  readonly gives: readonly { readonly title: string; readonly body: string }[];
  /** The full-name comparison's card (D-049), on the free comparison and its picker. */
  readonly fullNames: {
    readonly eyebrow: string;
    readonly title: string;
    readonly body: string;
    readonly price: string;
    readonly once: string;
    readonly soon: string;
    readonly link: string;
  };
  /**
   * The card for couples (TASK-180): the couple surnames page (ADR-0035) and the
   * couple first names page (ADR-0047), each listed only while it is on.
   */
  readonly couples: {
    readonly eyebrow: string;
    readonly title: string;
    readonly surnames: { readonly title: string; readonly body: string; readonly link: string };
    readonly names: { readonly title: string; readonly body: string; readonly link: string };
  };
}

export const COMPARE_TEXT: Readonly<Record<Lang, CompareText>> = {
  pl: {
    eyebrow: "Porównanie nazwisk",
    versus: "a",
    chapter: (n) => String(n).padStart(2, "0"),
    rarerVerdict: (name) => `${name} jest rzadsze w tym zbiorze.`,
    pages: "Strony nazwisk",
    again: "Porównaj inne nazwiska",
    againLede: "Dwa nazwiska, tak jak się je pisze.",
    tryHeading: "Spróbuj",
    givesHeading: "Co zestawiamy",
    gives: [
      {
        title: "Liczba osób",
        body: "Ile osób nosi każde nazwisko według rejestru PESEL, z tej samej listy i daty.",
      },
      {
        title: "Rzadkość",
        body: "Jedna osoba na ile — tylko gdy oba nazwiska liczono w tym samym zbiorze.",
      },
      {
        title: "Województwa",
        body: "Dwie mapy na jednej skali: ten sam odcień znaczy ten sam udział.",
      },
    ],
    fullNames: {
      eyebrow: "Imię i nazwisko",
      title: "Porównaj imię i nazwisko — także z innymi",
      body: "Do czterech osób obok siebie: ile osób nosi każde imię, ile dzieci dostało je w ostatnim roku, skąd pochodzi, a do tego wszystko o ich nazwiskach.",
      price: "15,99 zł",
      once: "jednorazowo",
      soon: "Wkrótce",
      link: "Zobacz, co zawiera",
    },
    couples: {
      eyebrow: "Dla par",
      title: "Dwa nazwiska, dwa imiona — dla pary",
      surnames: {
        title: "Wasze nazwiska razem",
        body: "Jakie nazwiska może nosić para i co wiadomo o każdym z nich, obok siebie.",
        link: "Zobacz nazwiska pary",
      },
      names: {
        title: "Imiona pary",
        body: "Skąd pochodzą i co znaczą dwa imiona, według źródeł. Bez oceny i bez wyniku.",
        link: "Sprawdź imiona pary",
      },
    },
  },
  en: {
    eyebrow: "Surname comparison",
    versus: "vs",
    chapter: (n) => String(n).padStart(2, "0"),
    rarerVerdict: (name) => `${name} is rarer in this dataset.`,
    pages: "Surname pages",
    again: "Compare other surnames",
    againLede: "Two surnames, as they are written.",
    tryHeading: "Try",
    givesHeading: "What we set side by side",
    gives: [
      {
        title: "Number of people",
        body: "How many people carry each surname in the PESEL register, from the same list and date.",
      },
      {
        title: "Rarity",
        body: "One person in how many — only when both surnames were counted in the same dataset.",
      },
      {
        title: "Voivodeships",
        body: "Two maps on one scale: the same shade means the same share.",
      },
    ],
    fullNames: {
      eyebrow: "First name and surname",
      title: "Compare a first name and surname — with others too",
      body: "Up to four people side by side: how many people carry each first name, how many children were given it last year, where it comes from, and everything about their surnames.",
      price: "PLN 15.99",
      once: "one payment",
      soon: "Coming soon",
      link: "See what it includes",
    },
    couples: {
      eyebrow: "For couples",
      title: "Two surnames, two first names — for a couple",
      surnames: {
        title: "Your surnames together",
        body: "The surnames a couple could carry, and what is known about each of them, side by side.",
        link: "See the couple's surnames",
      },
      names: {
        title: "A couple's first names",
        body: "Where two first names come from and what they mean, according to the sources. No verdict and no score.",
        link: "Look up the couple's first names",
      },
    },
  },
};

/** One-tap pairs on the picker: real surnames the landing already offers or the register holds. */
export const COMPARE_EXAMPLES: readonly (readonly [string, string])[] = [
  ["NOWAK", "KOWALSKI"],
  ["ZAREMBA", "ŻMUDA-TRZEBIATOWSKI"],
  ["WIŚNIEWSKA", "WÓJCIK"],
];
