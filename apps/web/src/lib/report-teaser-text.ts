import { offerDocument, waitlistMailto } from "./offer-text.js";
import type { Lang } from "./messages.js";

/**
 * The full-name report's announcement (TASK-166, ADR-0037 §2 as amended): on
 * the deck's last card, in the share studio and its video, and on the page
 * that says what the report holds. The report is the 28,99 zł tier's
 * (D-043); it cannot be bought yet, so every place says "Wkrótce" and its one
 * way to ask is the tier's waiting-list email (ADR-0037 §2.5), never a buy
 * button (ADR-0026 §2.2, ADR-0023 §2.5).
 *
 * Pure data and addresses, with nothing that reaches the database, so the
 * share-card renderer can read it too.
 */

/** The tier the report belongs to (D-043), whose price and waiting list it uses. */
const REPORT_TIER = "smaller";

/** The page that says what the report holds: `/pl/nazwisko/{slug}/pelny-raport`. */
export function reportInsidePath(pagePath: string, lang: Lang): string {
  return `${pagePath}/${lang === "en" ? "full-report" : "pelny-raport"}`;
}

/** The invented sample of the report as a PDF (TASK-172): public, every page marked as such. */
export const SAMPLE_REPORT_PATHS = {
  pl: "/pl/przykladowy-raport.pdf",
  en: "/en/sample-report.pdf",
} as const;

/** The query key the page reads the typed first name from. */
export function reportInsideQueryKey(lang: Lang): string {
  return lang === "en" ? "name" : "imie";
}

/** The report's price, as the offer page states its tier's (ADR-0037). */
export function reportPrice(lang: Lang): string {
  return offerDocument(lang).tiers.find((t) => t.key === REPORT_TIER)?.price ?? "";
}

/** "Powiadom mnie": the tier's waiting-list email, with the surname in its body. */
export function reportNotifyHref(surname: string, lang: Lang): string {
  return waitlistMailto(REPORT_TIER, surname, lang);
}

export const REPORT_TEASER_TEXT = {
  pl: {
    eyebrow: "Pełny raport · PDF",
    cardHeading: "Dopisz imię. Raport opowie o imieniu i nazwisku.",
    cardItems: (surname: string) => [
      "Ile osób w Polsce ma Twoje imię",
      "Ile dzieci dostało je, rok po roku",
      "Skąd pochodzi, słowami dawnych słowników, gdy je objaśniają",
      `${surname}: liczby, mapa i zmiana w czasie`,
      "Do druku, z przypisem przy każdym fakcie",
    ],
    sample: "Zobacz próbkę",
    show: "Pokaż",
    sampleReport: "Przejrzyj przykładowy raport (PDF)",
    sampleReportNote: "Imię, nazwisko i dane w przykładzie są zmyślone.",
    soon: "Wkrótce.",
    notify: "Powiadom mnie",
    notifyHint: "Otworzy się e-mail do nas. Odpiszemy, gdy raport będzie gotowy.",
    studioHeading: "Ten PDF ma jedną stronę. Pełny raport ma dziesięć rozdziałów.",
    studioTry: (surname: string) =>
      `Wpisz imię, a pokażemy pierwszą stronę raportu dla imienia i nazwiska ${surname}.`,
    studioSample: "Zobacz próbkę raportu",
    tableCaption: "Co zawiera",
    tableOnePage: "1 strona",
    tableReport: "Raport",
    yes: "tak",
    no: "nie",
    tableRows: [
      { label: "Liczby z rejestru PESEL", onePage: true },
      { label: "Twoje imię: liczba osób i miejsce", onePage: false },
      { label: "Imię u dzieci, rok po roku", onePage: false },
      { label: "Pochodzenie imienia, ze stronami dzieł", onePage: false },
      { label: "Dziewięć rozdziałów o nazwisku", onePage: false },
      { label: "Bibliografia i „Czego nie wiemy”", onePage: false },
    ],
    videoOutro: "Na końcu: zapowiedź pełnego raportu",
    outroHeading: "Imię i nazwisko w 10 rozdziałach",
    outroLine: (surname: string) => `${surname} i Twoje imię, z przypisem przy każdym fakcie.`,
    outroSoon: "Pełny raport PDF · wkrótce",
  },
  en: {
    eyebrow: "Full report · PDF",
    cardHeading: "Add a first name. The report tells of the first name and the surname.",
    cardItems: (surname: string) => [
      "How many people in Poland have your first name",
      "How many children were given it, year by year",
      "Where it comes from, in old dictionaries' words, where they explain it",
      `${surname}: numbers, map and change over time`,
      "Print-ready, with a footnote on every fact",
    ],
    sample: "See a sample",
    show: "Show",
    sampleReport: "Browse a sample report (PDF)",
    sampleReportNote: "The names and the data in the sample are invented.",
    soon: "Coming soon.",
    notify: "Notify me",
    notifyHint: "This opens an email to us. We will write back when the report is ready.",
    studioHeading: "This PDF is one page. The full report has ten chapters.",
    studioTry: (surname: string) =>
      `Type a first name and we will show the report's first page for it and ${surname}.`,
    studioSample: "See a sample of the report",
    tableCaption: "What it holds",
    tableOnePage: "1 page",
    tableReport: "Report",
    yes: "yes",
    no: "no",
    tableRows: [
      { label: "Figures from the PESEL register", onePage: true },
      { label: "Your first name: how many people, and its rank", onePage: false },
      { label: "The first name given to children, year by year", onePage: false },
      { label: "The first name's origin, with the works' pages", onePage: false },
      { label: "Nine chapters on the surname", onePage: false },
      { label: "Bibliography and “What we don't know”", onePage: false },
    ],
    videoOutro: "End with the full report's announcement",
    outroHeading: "First name and surname in 10 chapters",
    outroLine: (surname: string) =>
      `${surname} and your first name, with a footnote on every fact.`,
    outroSoon: "Full PDF report · coming soon",
  },
} as const;
