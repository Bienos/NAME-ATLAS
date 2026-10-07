import type { Lang } from "./messages.js";

/**
 * The comparison's words (TASK-158, D-044): two first names of one sex side by
 * side, in Polish and English.
 *
 * Plain, and nothing beyond the data: a count, a share, a rank on one year's
 * list, a direction, the years at no. 1, the register's count. No "popular",
 * no "rare", no "better". Every number the functions below put in a sentence
 * comes from a claim or a list's stored figure, formatted by `messages.ts`;
 * none is written here. The direction words and the sex words are the page's
 * (`baby-names-text.ts`), so the two pages say the same thing.
 */

type Sex = "MALE" | "FEMALE";

export interface BabyCompareText {
  readonly title: string;
  /** "Porównanie · Dziewczynki", set in capitals by the eyebrow's style. */
  readonly eyebrow: (sex: Sex) => string;
  readonly signedOut: string;
  readonly firstName: string;
  readonly secondName: string;
  readonly submit: string;
  readonly placeholderFirst: string;
  readonly placeholderSecond: string;
  /** The way back to the page when no first name is given. */
  readonly backToPage: string;
  /** The way back to a name's page: the name itself, after the chevron. */
  readonly back: (name: string) => string;
  // --- one plain line, then the form ---
  readonly invalid: (name: string) => string;
  readonly notFound: (name: string) => string;
  readonly held: (name: string) => string;
  readonly notOnList: (name: string, sex: Sex) => string;
  readonly same: string;
  readonly rightsBlocked: (name: string) => string;
  // --- the two columns ---
  readonly columnsLabel: string;
  /** "2025 · 1. z 939" under each name. */
  readonly headRank: (year: number, rank: string) => string;
  readonly headBelow: (year: number) => string;
  /** "1. z 939" */
  readonly rankOf: (rank: string, of: string) => string;
  readonly inYear: (year: number) => string;
  readonly share: string;
  readonly direction: string;
  /** "2020 → 2025" under the direction's label. */
  readonly directionYears: (earlier: number, latest: number) => string;
  /** "4,0% → 3,7%" under the direction's word. */
  readonly sharesArrow: (earlier: string, latest: string) => string;
  readonly noDirection: string;
  readonly topYears: string;
  readonly noTopYears: string;
  readonly bears: string;
  /** "360 466 kobiet" */
  readonly registerCount: (count: string, sex: Sex) => string;
  readonly registerNote: string;
  /** "< 5": the year's cut-off, the name below it. */
  readonly below: (threshold: string) => string;
  readonly noYearList: string;
  // --- the chart and the ladder ---
  readonly chartHeading: (sex: Sex) => string;
  readonly chartLabel: (a: string, b: string, sex: Sex, first: number, latest: number) => string;
  readonly cutoffTick: string;
  readonly figuresLabel: string;
  readonly chartNote: (sex: Sex, years: string) => string;
  readonly ladderHeading: string;
  readonly ladderLabel: (a: string, b: string) => string;
  // --- the year table ---
  readonly tableHeading: string;
  readonly yearColumn: string;
  readonly childrenColumn: string;
  readonly placeColumn: string;
  readonly sourceLine: string;
  readonly allYears: (n: string) => string;
  readonly swapSecond: string;
  readonly footer: string;
}

export const BABY_NAMES_COMPARE_TEXT: Readonly<Record<Lang, BabyCompareText>> = {
  pl: {
    title: "Porównanie dwóch imion",
    eyebrow: (sex) => `Porównanie · ${sex === "MALE" ? "Chłopcy" : "Dziewczynki"}`,
    signedOut:
      "Porównanie dwóch imion jest dla zalogowanych i należy do widoku „Rok po roku” za 8,99 zł. Po zalogowaniu wpiszesz dwa imiona i zobaczysz je obok siebie, osobno dla chłopców i dla dziewczynek.",
    firstName: "Pierwsze imię",
    secondName: "Drugie imię",
    submit: "Porównaj",
    placeholderFirst: "np. Zofia",
    placeholderSecond: "np. Julia",
    backToPage: "Imiona dla dziecka",
    back: (name) => name,
    invalid: (name) => `Imię „${name}”: wpisz jedno imię, do 60 znaków.`,
    notFound: (name) =>
      `Imienia „${name}” nie ma na żadnej z list imion nadanych dzieciom. Listy pomijają imiona nadane rzadziej niż próg danego roku.`,
    held: (name) => `Formy „${name}” nie pokazujemy, dopóki nie zostanie sprawdzona.`,
    notOnList: (name, sex) =>
      `Imienia ${name} nie ma na żadnej liście ${sex === "MALE" ? "chłopców" : "dziewczynek"} od 2000 r. Porównać można dwa imiona z list tej samej płci.`,
    same: "Wpisz dwa różne imiona.",
    rightsBlocked: (name) => `Danych o imieniu ${name} nie możemy tu pokazać.`,
    columnsLabel: "Dwa imiona obok siebie",
    headRank: (year, rank) => `${year} · ${rank}`,
    headBelow: (year) => `${year} · poniżej progu`,
    rankOf: (rank, of) => `${rank}. z ${of}`,
    inYear: (year) => `W ${year}`,
    share: "Udział",
    direction: "Kierunek",
    directionYears: (earlier, latest) => `${earlier} → ${latest}`,
    sharesArrow: (earlier, latest) => `${earlier} → ${latest}`,
    noDirection: "—",
    topYears: "Nr 1 na liście",
    noTopYears: "w żadnym roku",
    bears: "Nosi dziś",
    registerCount: (count, sex) => `${count} ${sex === "MALE" ? "mężczyzn" : "kobiet"}`,
    registerNote:
      "„Nosi dziś” to wszyscy, którzy w dniu listy rejestru PESEL mają to imię jako pierwsze, w każdym wieku. Nie dodajemy tej liczby do liczb z roku.",
    below: (threshold) => `< ${threshold}`,
    noYearList: "brak listy",
    chartHeading: (sex) => `Co pięć lat · liczba ${sex === "MALE" ? "chłopców" : "dziewczynek"}`,
    chartLabel: (a, b, sex, first, latest) =>
      `Liczba ${sex === "MALE" ? "chłopców" : "dziewczynek"} o imieniu ${a} i o imieniu ${b} co pięć lat od ${first} do ${latest}; rok bez imienia na liście ma kreskę progu zamiast słupka. Liczby są pod wykresem.`,
    cutoffTick: "poniżej progu listy",
    figuresLabel: "Liczby z wykresu",
    chartNote: (sex, years) =>
      `Te same lata, ta sama lista ${sex === "MALE" ? "chłopców" : "dziewczynek"}. Pełne ${years} lat masz w tabeli pod spodem.`,
    ladderHeading: "Miejsce na liście",
    ladderLabel: (a, b) => `Miejsce imion ${a} i ${b} na liście co pięć lat`,
    tableHeading: "Rok po roku",
    yearColumn: "Rok",
    childrenColumn: "Dzieci",
    placeColumn: "Miejsce",
    sourceLine: "Źródło",
    allYears: (n) => `Wszystkie ${n} lat`,
    swapSecond: "Zamień drugie imię",
    footer:
      "Źródło przy każdym fakcie · Brak danych to też odpowiedź · Nic o Twoim dziecku, tylko o imieniu",
  },
  en: {
    title: "Comparing two names",
    eyebrow: (sex) => `Comparison · ${sex === "MALE" ? "Boys" : "Girls"}`,
    signedOut:
      "Comparing two names is for signed-in readers and belongs to the 8,99 zł “Year by year” view. Once signed in, you type two first names and see them side by side, for boys and for girls separately.",
    firstName: "First name",
    secondName: "Second name",
    submit: "Compare",
    placeholderFirst: "e.g. Zofia",
    placeholderSecond: "e.g. Julia",
    backToPage: "Baby names",
    back: (name) => name,
    invalid: (name) => `“${name}”: type one first name, up to 60 characters.`,
    notFound: (name) =>
      `“${name}” is on none of the lists of first names given to children. The lists leave out names given fewer times than the year's cut-off.`,
    held: (name) => `We do not show the form “${name}” until it has been checked.`,
    notOnList: (name, sex) =>
      `${name} is on no ${sex === "MALE" ? "boys'" : "girls'"} list since 2000. Two names can be compared on the lists of one sex.`,
    same: "Type two different names.",
    rightsBlocked: (name) => `We cannot show the figures for ${name} here.`,
    columnsLabel: "Two names side by side",
    headRank: (year, rank) => `${year} · ${rank}`,
    headBelow: (year) => `${year} · below the cut-off`,
    rankOf: (rank, of) => `no. ${rank} of ${of}`,
    inYear: (year) => `In ${year}`,
    share: "Share",
    direction: "Direction",
    directionYears: (earlier, latest) => `${earlier} → ${latest}`,
    sharesArrow: (earlier, latest) => `${earlier} → ${latest}`,
    noDirection: "—",
    topYears: "No. 1 on the list",
    noTopYears: "in no year",
    bears: "Bears it today",
    registerCount: (count, sex) => `${count} ${sex === "MALE" ? "men" : "women"}`,
    registerNote:
      "“Bears it today” counts everyone who has the name as their first name in the PESEL register on the list's date, of any age. It is never added to a birth-year figure.",
    below: (threshold) => `< ${threshold}`,
    noYearList: "no list",
    chartHeading: (sex) => `Every five years · number of ${sex === "MALE" ? "boys" : "girls"}`,
    chartLabel: (a, b, sex, first, latest) =>
      `The number of ${sex === "MALE" ? "boys" : "girls"} named ${a} and named ${b} every five years from ${first} to ${latest}; a year the name is not on the list has a cut-off tick instead of a bar. The figures are under the chart.`,
    cutoffTick: "below the list's cut-off",
    figuresLabel: "The chart's figures",
    chartNote: (sex, years) =>
      `The same years, the same ${sex === "MALE" ? "boys'" : "girls'"} list. All ${years} years are in the table below.`,
    ladderHeading: "Place on the list",
    ladderLabel: (a, b) => `The place of ${a} and of ${b} on the list every five years`,
    tableHeading: "Year by year",
    yearColumn: "Year",
    childrenColumn: "Children",
    placeColumn: "Place",
    sourceLine: "Source",
    allYears: (n) => `All ${n} years`,
    swapSecond: "Change the second name",
    footer:
      "A source beside every fact · No data is an answer too · Nothing about your child, only about the name",
  },
};
