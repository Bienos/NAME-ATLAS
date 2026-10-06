import type { Lang } from "./messages.js";

/**
 * The baby-names page's words (TASK-141, D-044), in Polish and English.
 *
 * Plain, and nothing beyond the data: a count, a rank on one year's list and
 * a direction. No meaning, no kinship, no "popular" or "rare". Every number
 * the functions below put in a sentence comes from a claim or from a list's
 * stored cut-off; none is written here.
 */

export type BirthDirection = "RISING" | "STEADY" | "FALLING";

export interface BabyNamesText {
  readonly title: string;
  readonly lede: string;
  readonly source: string;
  readonly signedOut: string;
  readonly signIn: string;
  readonly label: string;
  readonly placeholder: string;
  readonly submit: string;
  readonly invalid: string;
  readonly notFound: (name: string) => string;
  readonly held: string;
  readonly rightsBlocked: string;
  readonly apart: string;
  readonly sex: { readonly MALE: string; readonly FEMALE: string };
  readonly noList: string;
  readonly childrenIn: (year: number) => string;
  readonly rankIn: (year: number) => string;
  readonly rankOf: (rank: string, of: string) => string;
  readonly direction: string;
  readonly directions: Readonly<Record<BirthDirection, string>>;
  readonly trendBasis: (latest: number, earlier: number, percent: number) => string;
  readonly noTrend: string;
  readonly belowCutoff: (year: number, threshold: string) => string;
  readonly noYearList: string;
  readonly sourceLine: string;
  readonly yearWord: (year: number) => string;
  readonly resource: (id: string) => string;
  readonly historyHeading: string;
  readonly historyNote: string;
  readonly yearColumn: string;
  readonly countColumn: string;
  readonly rankColumn: string;
  readonly lockedHeading: string;
  readonly lockedTier: string;
  readonly lockedPrice: string;
  readonly soon: string;
  readonly lockedBody: string;
}

export const BABY_NAMES_TEXT: Readonly<Record<Lang, BabyNamesText>> = {
  pl: {
    title: "Imiona dla dziecka",
    lede: "Ile dzieci w Polsce dostało dane imię jako pierwsze, rok po roku.",
    source:
      "Źródło: rejestr PESEL, zbiór „Imiona nadawane dzieciom w Polsce” Ministerstwa Cyfryzacji (dane.gov.pl, zbiór 219). Listy chłopców i dziewczynek są osobne i nie sumujemy ich.",
    signedOut:
      "Ta część jest dla zalogowanych. Po zalogowaniu wpiszesz imię i zobaczysz, osobno dla chłopców i dla dziewczynek, ile dzieci dostało je w ostatnim roku, jego miejsce na liście tego roku i czy jego udział rośnie, spada, czy się nie zmienia.",
    signIn: "Zaloguj się",
    label: "Imię",
    placeholder: "np. Zofia",
    submit: "Pokaż",
    invalid: "Wpisz jedno imię, do 60 znaków.",
    notFound: (name) =>
      `Imienia „${name}” nie ma na żadnej z list imion nadanych dzieciom. Listy pomijają imiona nadane rzadziej niż próg danego roku.`,
    held: "Tej formy imienia nie pokazujemy, dopóki nie zostanie sprawdzona.",
    rightsBlocked: "Tych danych nie możemy tu pokazać.",
    apart: "Chłopcy i dziewczynki są na osobnych listach. Liczb z dwóch list nie sumujemy.",
    sex: { MALE: "Chłopcy", FEMALE: "Dziewczynki" },
    noList: "Nie mamy listy dla tej płci.",
    childrenIn: (year) => `Dzieci w ${year} r.`,
    rankIn: (year) => `Miejsce na liście ${year} r.`,
    rankOf: (rank, of) => `${rank} z ${of}`,
    direction: "Kierunek",
    directions: { RISING: "rośnie", STEADY: "bez większej zmiany", FALLING: "spada" },
    trendBasis: (latest, earlier, percent) =>
      `Porównujemy udział imienia wśród dzieci na opublikowanej liście: ${latest} r. wobec ${earlier} r. Wzrost o ponad ${percent}% to „rośnie”, spadek o ponad ${percent}% to „spada”.`,
    noTrend: "Kierunku nie podajemy: dane nie pozwalają go ustalić.",
    belowCutoff: (year, threshold) =>
      `W ${year} r. nadano je mniej niż ${threshold} razy, więc nie ma go na liście tego roku.`,
    noYearList: "brak listy",
    sourceLine: "Źródło",
    yearWord: (year) => `${year} r.`,
    resource: (id) => `zasób ${id}`,
    historyHeading: "Rok po roku",
    historyNote:
      "Brak imienia na liście danego roku znaczy, że nadano je rzadziej niż próg tego roku, a nie zero razy.",
    yearColumn: "Rok",
    countColumn: "Dzieci",
    rankColumn: "Miejsce",
    lockedHeading: "Rok po roku od 2000",
    lockedTier: "Imiona dla dziecka",
    lockedPrice: "8,99 zł",
    soon: "Wkrótce",
    lockedBody:
      "Liczba dzieci i miejsce na liście w każdym roku od 2000, osobno dla chłopców i dziewczynek.",
  },
  en: {
    title: "Baby names",
    lede: "How many children in Poland were given a first name, year by year.",
    source:
      "Source: the PESEL register, the Ministry of Digital Affairs' dataset “Imiona nadawane dzieciom w Polsce” (first names given to children in Poland; dane.gov.pl, dataset 219). Boys and girls are on separate lists, never added together.",
    signedOut:
      "This section is for signed-in readers. Once signed in, you type a first name and see, for boys and for girls separately, how many children were given it in the latest year, its place on that year's list, and whether its share is rising, falling or steady.",
    signIn: "Sign in",
    label: "First name",
    placeholder: "e.g. Zofia",
    submit: "Show",
    invalid: "Type one first name, up to 60 characters.",
    notFound: (name) =>
      `“${name}” is on none of the lists of first names given to children. The lists leave out names given fewer times than the year's cut-off.`,
    held: "We do not show this form of the name until it has been checked.",
    rightsBlocked: "We cannot show these figures here.",
    apart: "Boys and girls are on separate lists. We never add the two together.",
    sex: { MALE: "Boys", FEMALE: "Girls" },
    noList: "We have no list for this sex.",
    childrenIn: (year) => `Children in ${year}`,
    rankIn: (year) => `Place on the ${year} list`,
    rankOf: (rank, of) => `${rank} of ${of}`,
    direction: "Direction",
    directions: { RISING: "rising", STEADY: "steady", FALLING: "falling" },
    trendBasis: (latest, earlier, percent) =>
      `This compares the name's share of the children on the published list: ${latest} against ${earlier}. Up by more than ${percent}% is rising, down by more than ${percent}% is falling.`,
    noTrend: "No direction is given: the data cannot settle it.",
    belowCutoff: (year, threshold) =>
      `In ${year} it was given fewer than ${threshold} times, so it is not on that year's list.`,
    noYearList: "no list",
    sourceLine: "Source",
    yearWord: (year) => String(year),
    resource: (id) => `resource ${id}`,
    historyHeading: "Year by year",
    historyNote:
      "A name missing from a year's list was given fewer times than that year's cut-off, not zero times.",
    yearColumn: "Year",
    countColumn: "Children",
    rankColumn: "Place",
    lockedHeading: "Year by year since 2000",
    lockedTier: "Baby names",
    lockedPrice: "8,99 zł",
    soon: "Coming soon",
    lockedBody:
      "The number of children and the place on the list in every year since 2000, for boys and girls separately.",
  },
};
