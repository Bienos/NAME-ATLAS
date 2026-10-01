import { assessmentWord, UI } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * "Jak to działa" / "How it works" (TASK-052): what the site shows, where it
 * comes from, and what it will not say. Every statement restates a rule the
 * product already keeps (`PRODUCT.md` §3, §7, §8; ADR-0012, ADR-0019) or a
 * sentence the surname page already shows; the chapters' own explanations are
 * reused verbatim from `messages.ts`, so the two pages cannot disagree.
 */

export interface HowSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly items?: readonly string[];
}

export interface HowDocument {
  readonly title: string;
  readonly lede: string;
  readonly sections: readonly HowSection[];
}

/** The confidence vocabulary, in the order the methodology ranks it. */
export const ASSESSMENTS = [
  "VERIFIED",
  "LIKELY",
  "POSSIBLE",
  "UNCONFIRMED",
  "CONFLICTING",
  "INSUFFICIENT_DATA",
] as const;

export function howDocument(lang: Lang): HowDocument {
  const t = UI[lang];
  const words = ASSESSMENTS.map((status) => assessmentWord(status, lang));
  if (lang === "pl") {
    return {
      title: "Jak to działa",
      lede:
        "Name Atlas odpowiada na pytania o nazwisko, nie o rodzinę. Przy każdej odpowiedzi jest " +
        "jej źródło, data i słowo, które mówi, na ile jest pewna. Tam, gdzie danych nie ma, " +
        "piszemy to wprost.",
      sections: [
        {
          heading: "Skąd są liczby",
          paragraphs: [
            "Liczby osób pochodzą z wykazów nazwisk w rejestrze PESEL, które Ministerstwo " +
              "Cyfryzacji publikuje w serwisie dane.gov.pl.",
            t.chapterCountLede,
            "Przy każdej liczbie podajemy jej zbiór danych i datę, na którą jest aktualna.",
          ],
        },
        { heading: "Rzadkość", paragraphs: [t.chapterRarityLede, t.rarityNotComparable] },
        {
          heading: "Województwa",
          paragraphs: [
            t.chapterWhereLede,
            "Udziały liczymy względem osób z zameldowaniem na pobyt stały, nie względem wszystkich " +
              "nosicieli nazwiska. Województwo, którego zbiór nie podaje, nie oznacza zera.",
          ],
        },
        {
          heading: "Znaczenie",
          paragraphs: [
            t.chapterMeaningLede,
            "Gdy źródła podają różne odczytania, pokazujemy wszystkie obok siebie i nie " +
              "rozstrzygamy za nie.",
          ],
        },
        {
          heading: "Skala pewności",
          paragraphs: [
            "Każde stwierdzenie ma jedno z tych słów. Słowo mówi, na ile pewne jest stwierdzenie. " +
              "Prawa do danych decydują tylko o tym, gdzie wolno coś pokazać — nigdy o tym, na ile " +
              "jest prawdziwe.",
          ],
          items: words,
        },
        {
          heading: "Brak danych to też odpowiedź",
          paragraphs: [
            "Wykazy PESEL nie podają nazwisk, które nosi tylko jedna osoba. Nazwisko, którego nie " +
              "ma w wykazie, może więc być bardzo rzadkie; to nie znaczy, że nikt go nie nosi.",
          ],
        },
        {
          heading: "Czego nie robimy",
          paragraphs: [],
          items: [
            "Nie ustalamy przodków ani pokrewieństwa.",
            "Nie przypisujemy nazwisku narodowości, wyznania ani herbu.",
            "Wspólne nazwisko nie oznacza wspólnej rodziny.",
          ],
        },
        {
          heading: "Źródła",
          paragraphs: [
            "Na dole każdej strony nazwiska są wszystkie jej źródła, każde z linkiem do strony, " +
              "z której pochodzą dane, i uwagi, jak czytać liczby.",
          ],
        },
      ],
    };
  }
  return {
    title: "How it works",
    lede:
      "Name Atlas answers questions about a surname, not about a family. Every answer carries " +
      "its source, its date and a word that says how certain it is. Where there is no data, " +
      "we say so.",
    sections: [
      {
        heading: "Where the figures come from",
        paragraphs: [
          "The counts come from the surname lists of the PESEL register, which Poland's Ministry " +
            "of Digital Affairs publishes on dane.gov.pl.",
          t.chapterCountLede,
          "Every figure is shown with its dataset and the date it describes.",
        ],
      },
      { heading: "Rarity", paragraphs: [t.chapterRarityLede, t.rarityNotComparable] },
      {
        heading: "Voivodeships",
        paragraphs: [
          t.chapterWhereLede,
          "Shares are of the people with a registered permanent address, not of everyone with " +
            "the surname. A voivodeship the dataset does not list is not zero.",
        ],
      },
      {
        heading: "Meaning",
        paragraphs: [
          t.chapterMeaningLede,
          "When sources read a surname differently, we show every reading side by side and do " +
            "not decide between them.",
        ],
      },
      {
        heading: "How certain",
        paragraphs: [
          "Every statement carries one of these words. The word says how certain the statement " +
            "is. Rights to the data decide only where something may be shown — never how true it is.",
        ],
        items: words,
      },
      {
        heading: "No data is also an answer",
        paragraphs: [
          "The PESEL lists leave out surnames that only one person has. A surname missing from " +
            "the list may be very rare; it does not mean nobody has it.",
        ],
      },
      {
        heading: "What we do not do",
        paragraphs: [],
        items: [
          "We do not identify ancestors or family relationships.",
          "We do not assign a nationality, a religion or a coat of arms to a surname.",
          "A shared surname does not mean a shared family.",
        ],
      },
      {
        heading: "Sources",
        paragraphs: [
          "At the foot of every surname page are all of its sources, each linked to the website " +
            "the data was taken from, with notes on how to read the figures.",
        ],
      },
    ],
  };
}
