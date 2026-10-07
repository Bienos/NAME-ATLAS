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
 * Since TASK-176 (D-052) the report is free for signed-in readers until the
 * owner ends it: every place shows the price struck and "dziś 0 zł" instead of
 * "Wkrótce", and the page of what the report holds gives a signed-in reader
 * their own report as a PDF. `FULL_REPORT_FREE=0` ends it; any other value,
 * or none, keeps it open. Pages built ahead read it at build time, so a change
 * shows on the next deploy.
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

/** The variable that ends the free report (D-052): exactly `0` ends it. */
export const REPORT_FREE_ENV = "FULL_REPORT_FREE";

/** Whether the report is free for signed-in readers now (TASK-176, D-052). */
export function reportFree(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return env[REPORT_FREE_ENV] !== "0";
}

/** A signed-in reader's own report as a PDF: `/pl/nazwisko/{slug}/pelny-raport/pdf?imie=…`. */
export function readerReportPdfHref(pagePath: string, lang: Lang, givenName: string): string {
  return `${reportInsidePath(pagePath, lang)}/pdf?${reportInsideQueryKey(lang)}=${encodeURIComponent(givenName)}`;
}

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
    // TASK-176 (D-052): while the report is free for signed-in readers.
    freeToday: "dziś 0 zł",
    freeNow: "Na razie za darmo dla zalogowanych.",
    freeHint: "Wpisz imię i pobierz swój raport jako PDF.",
    download: "Pobierz pełny raport (PDF)",
    downloadNote: (pair: string) =>
      `Raport dla imienia i nazwiska ${pair}, 10 rozdziałów, z przypisami.`,
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
    outroFree: "Pełny raport PDF · dziś 0 zł",
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
    freeToday: "PLN 0 today",
    freeNow: "Free for signed-in readers, for now.",
    freeHint: "Type a first name and download your report as a PDF.",
    download: "Download the full report (PDF)",
    downloadNote: (pair: string) =>
      `The report for the first name and surname ${pair}: 10 chapters, with footnotes.`,
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
    outroFree: "Full PDF report · PLN 0 today",
  },
} as const;
