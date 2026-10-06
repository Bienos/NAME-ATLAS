import type { Lang } from "./messages.js";

/**
 * The baby-names list page's words (TASK-146, D-047), in Polish and English.
 *
 * Plain, and nothing beyond the data: a rank, a name, a count of children
 * born in a year and, on the latest list, a direction. Every number a function
 * here puts in a sentence comes from a list's stored cut-off or the rows read.
 */

export interface BabyNamesListText {
  readonly title: string;
  readonly lede: string;
  readonly signedOut: string;
  readonly signIn: string;
  readonly scope: string;
  readonly sexLabel: string;
  readonly yearLabel: string;
  readonly trendLabel: string;
  readonly trendOptions: {
    readonly all: string;
    readonly RISING: string;
    readonly FALLING: string;
  };
  readonly submit: string;
  readonly sexes: { readonly MALE: string; readonly FEMALE: string };
  readonly listHeading: (sex: string, year: number) => string;
  readonly cutoff: (threshold: string) => string;
  readonly noList: string;
  readonly noPage: string;
  readonly firstPage: string;
  readonly rankColumn: string;
  readonly nameColumn: string;
  readonly countColumn: string;
  readonly directionColumn: string;
  readonly noRank: string;
  readonly noDirection: string;
  readonly directions: {
    readonly RISING: string;
    readonly STEADY: string;
    readonly FALLING: string;
  };
  readonly trendOnlyLatest: (latest: number) => string;
  readonly trendBasis: string;
  readonly showing: (from: string, to: string, total: string) => string;
  readonly freeShowing: (rows: string, year: number) => string;
  readonly pageOf: (page: string, pages: string) => string;
  readonly previous: string;
  readonly next: string;
  readonly lockedHeading: string;
  readonly lockedBody: string;
  readonly lockedTier: string;
  readonly lockedPrice: string;
  readonly soon: string;
  readonly backToSearch: string;
  readonly rankHelp: string;
}

export const BABY_NAMES_LIST_TEXT: Readonly<Record<Lang, BabyNamesListText>> = {
  pl: {
    title: "Cała lista imion",
    lede: "Imiona nadane dzieciom urodzonym w wybranym roku, od najczęściej nadawanego.",
    signedOut:
      "Ta część jest dla zalogowanych. Po zalogowaniu zobaczysz listę imion nadanych dzieciom w ostatnim roku, osobno dla chłopców i dla dziewczynek.",
    signIn: "Zaloguj się",
    scope:
      "Lista to dzieci urodzone w danym roku, a nie wszyscy ludzie z tym imieniem. Chłopcy i dziewczynki są na osobnych listach, nigdy razem.",
    sexLabel: "Lista",
    yearLabel: "Rok urodzenia",
    trendLabel: "Kierunek",
    trendOptions: { all: "wszystkie imiona", RISING: "tylko rosnące", FALLING: "tylko spadające" },
    submit: "Pokaż",
    sexes: { MALE: "Chłopcy", FEMALE: "Dziewczynki" },
    listHeading: (sex, year) => `${sex}, urodzeni w ${year} r.`,
    cutoff: (threshold) => `Imion nadanych mniej niż ${threshold} razy nie publikujemy.`,
    noList: "Nie mamy takiej listy.",
    noPage: "Na tej liście nie ma takiej strony.",
    firstPage: "Pierwsza strona",
    rankColumn: "Miejsce",
    nameColumn: "Imię",
    countColumn: "Dzieci",
    directionColumn: "Kierunek",
    noRank: "—",
    noDirection: "—",
    directions: { RISING: "rośnie", STEADY: "bez większej zmiany", FALLING: "spada" },
    trendOnlyLatest: (latest) =>
      `Kierunek podajemy tylko dla ostatniego roku (${latest} r.), więc filtr kierunku pominięto.`,
    trendBasis:
      "Kierunek porównuje udział imienia wśród dzieci na opublikowanej liście z udziałem sprzed pięciu lat.",
    showing: (from, to, total) => `Imiona ${from}–${to} z ${total}.`,
    freeShowing: (rows, year) => `Pierwsze ${rows} imion z listy ${year} r.`,
    pageOf: (page, pages) => `Strona ${page} z ${pages}`,
    previous: "Poprzednia",
    next: "Następna",
    lockedHeading: "Cała lista, każdy rok",
    lockedBody:
      "Wszystkie imiona z listy, każdy rok od 2000, filtr rosnących i spadających imion oraz kolejne strony.",
    lockedTier: "Imiona dla dziecka",
    lockedPrice: "8,99 zł",
    soon: "Wkrótce",
    backToSearch: "Szukaj jednego imienia",
    rankHelp: "Imiona nadane tyle samo razy mają to samo miejsce.",
  },
  en: {
    title: "The whole list",
    lede: "The first names given to children born in a chosen year, the most given first.",
    signedOut:
      "This section is for signed-in readers. Once signed in, you see the list of first names given to children in the latest year, for boys and for girls separately.",
    signIn: "Sign in",
    scope:
      "A list is the children born in one year, not everyone who has the name. Boys and girls are on separate lists, never together.",
    sexLabel: "List",
    yearLabel: "Year of birth",
    trendLabel: "Direction",
    trendOptions: { all: "all names", RISING: "rising only", FALLING: "falling only" },
    submit: "Show",
    sexes: { MALE: "Boys", FEMALE: "Girls" },
    listHeading: (sex, year) => `${sex}, born in ${year}`,
    cutoff: (threshold) => `Names given fewer than ${threshold} times are not published.`,
    noList: "We have no such list.",
    noPage: "This list has no such page.",
    firstPage: "First page",
    rankColumn: "Place",
    nameColumn: "Name",
    countColumn: "Children",
    directionColumn: "Direction",
    noRank: "—",
    noDirection: "—",
    directions: { RISING: "rising", STEADY: "steady", FALLING: "falling" },
    trendOnlyLatest: (latest) =>
      `A direction exists only for the latest year (${latest}), so the direction filter was left out.`,
    trendBasis:
      "The direction compares the name's share of the children on the published list with its share five years earlier.",
    showing: (from, to, total) => `Names ${from}–${to} of ${total}.`,
    freeShowing: (rows, year) => `The first ${rows} names on the ${year} list.`,
    pageOf: (page, pages) => `Page ${page} of ${pages}`,
    previous: "Previous",
    next: "Next",
    lockedHeading: "The whole list, every year",
    lockedBody:
      "Every name on the list, every year since 2000, a filter for rising and falling names, and further pages.",
    lockedTier: "Baby names",
    lockedPrice: "8,99 zł",
    soon: "Coming soon",
    backToSearch: "Look up one name",
    rankHelp: "Names given the same number of times share a place.",
  },
};
