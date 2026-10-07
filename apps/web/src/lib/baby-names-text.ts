import type { Lang } from "./messages.js";

/**
 * The baby-names page's words (TASK-141, D-044), in Polish and English.
 *
 * Plain, and nothing beyond the data: a count, a rank on one year's list and
 * a direction. No kinship, no "popular" or "rare". Every number the functions
 * below put in a sentence comes from a claim or from a list's stored cut-off or
 * `people_sum`; none is written here. A meaning is shown only in a work's own
 * words (TASK-151, ADR-0045).
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
  // --- TASK-160: the free window (D-051). ---
  /** The button that opens the view while the window is open. */
  readonly freeCta: string;
  /** "dziś 0 zł": beside the struck price. */
  readonly freeToday: string;
  readonly lockedBody: string;
  readonly registerDiffers: string;
  readonly registerHeading: string;
  readonly registerCount: string;
  readonly registerRank: string;
  readonly registerAsOf: (date: string) => string;
  readonly registerNone: string;
  /** The link to the whole list (TASK-146), on the page and in the locked card. */
  readonly listLink: string;
  readonly lockedListNote: string;
  /** The link to the couple first-names page (TASK-156), only while it exists. */
  readonly coupleLink: string;
  // --- TASK-151: the redesigned page. Every number comes in as a formatted string. ---
  /** The sex tabs' accessible name. */
  readonly tabsLabel: string;
  /** The hero tile's eyebrow: "W 2025 TO IMIĘ DOSTAŁO". */
  readonly eyebrowGot: (year: number) => string;
  /** The noun after the big number: "dziewczynek" / "chłopców". */
  readonly noun: { readonly MALE: string; readonly FEMALE: string };
  /** "To 3,7% wszystkich dziewczynek z listy za 2025 r." */
  readonly shareLine: (share: string, sex: "MALE" | "FEMALE", year: number) => string;
  /** "Miejsce 1" */
  readonly place: (rank: string) => string;
  /** "z 939 imion" */
  readonly ofNames: (of: string) => string;
  /** The rank track's two ends. */
  readonly trackMost: string;
  readonly trackRarest: string;
  /** The rank track's accessible name. */
  readonly trackLabel: (rank: string, of: string) => string;
  readonly howCommonHeading: string;
  /** "1 na 27" */
  readonly oneIn: (n: string) => string;
  /** "dziewczynek z listy" */
  readonly oneInNoun: { readonly MALE: string; readonly FEMALE: string };
  /** The dot grid's accessible name. */
  readonly dotsLabel: (n: string) => string;
  /** "Z każdych 27 dziewczynek z listy za 2025 r. jedna dostała imię ZOFIA." */
  readonly oneInCaption: (n: string, sex: "MALE" | "FEMALE", year: number, name: string) => string;
  /** "Udział: 2020 r. 4,0% → 2025 r. 3,7%"; the earlier side reads "poniżej progu" when absent. */
  readonly sharesLine: (
    earlierYear: number,
    earlier: string,
    latestYear: number,
    latest: string,
  ) => string;
  readonly belowThreshold: string;
  readonly meaningHeading: string;
  /** The one line when no work explains the name. */
  readonly meaningNone: string;
  readonly origin: string;
  readonly meaning: string;
  readonly quote: (text: string) => string;
  readonly translatedBy: string;
  /** Empty on the English page. */
  readonly translationNote: string;
  readonly assessment: string;
  /** "Buryan, Title (1933), s. 12" */
  readonly workLine: (author: string, title: string, year: number, locator: string) => string;
  /** "×4,8" and its wording; `more` is latest ≥ first. */
  readonly times: (factor: string) => string;
  readonly timesWording: (more: boolean, year: number) => string;
  readonly calloutFirst: string;
  readonly calloutPeak: string;
  readonly calloutLatest: string;
  readonly peakWord: string;
  readonly childrenWord: string;
  readonly chartLabel: (sex: "MALE" | "FEMALE", first: number, latest: number) => string;
  readonly cutoffTick: string;
  readonly ladderHeading: string;
  readonly topYears: (years: string) => string;
  readonly allYears: (n: string) => string;
  readonly latestYearsShown: (n: string) => string;
  /** The other sex's line when it is on no list in any year. */
  readonly noneSince: (sex: "MALE" | "FEMALE", first: number) => string;
  // --- TASK-152: the way to the share cards. ---
  /** "Udostępnij": the link to this sex's share sheet. */
  readonly shareEntry: string;
  /** "Karta z tymi liczbami, do wysłania bliskim." */
  readonly shareEntryNote: string;
  // --- TASK-158: the way to the comparison, in the paid view. ---
  /** "Porównaj z innym imieniem": the link to the comparison with this name as the first. */
  readonly compareEntry: string;
  // --- TASK-170: the year-by-year dashboard. ---
  readonly dashTotal: (first: number) => string;
  readonly dashAtLeast: string;
  readonly dashYearsOnList: string;
  readonly dashOf: (n: string, m: string) => string;
  readonly dashBest: string;
  readonly dashBestYears: (years: string) => string;
  readonly dashChange: (from: number, to: number) => string;
  readonly dashNoChange: string;
  readonly dashRisesFalls: string;
  readonly dashRisesFallsValue: (rises: string, falls: string) => string;
  readonly momentsHeading: string;
  readonly momentFirst: (fromStart: boolean) => string;
  readonly momentFirstDesc: (count: string, rank: string) => string;
  readonly momentTopTen: string;
  readonly momentTopTenDesc: (rank: string) => string;
  readonly momentNumberOne: string;
  readonly momentNumberOneDesc: (years: number) => string;
  readonly momentPeak: string;
  readonly momentPeakDesc: (count: string) => string;
  readonly momentRise: string;
  readonly momentRiseDesc: (change: string) => string;
  readonly momentLast: string;
  readonly momentLastDesc: string;
  readonly yoyHeading: string;
  readonly yoyNote: string;
  readonly yoyRise: string;
  readonly yoyFall: string;
  readonly yoyNone: string;
  readonly yoyBiggestRise: string;
  readonly yoyBiggestFall: string;
  readonly yoyTileLabel: (year: number, text: string) => string;
  readonly decadesHeading: string;
  readonly decadesNote: string;
  readonly decadeFoot: (average: string | null, listed: string, stored: string) => string;
  readonly metricLabel: string;
  readonly metricCount: string;
  readonly metricShare: string;
  readonly shareChartLabel: (sex: "MALE" | "FEMALE", first: number, last: number) => string;
  readonly gridHeading: string;
  readonly gridNote: string;
  readonly sortBy: string;
  readonly sortYear: string;
  readonly sortCount: string;
  readonly sortRank: string;
  readonly sortChange: string;
  readonly gridShare: string;
  readonly gridChange: string;
  readonly gridBar: string;
  // --- TASK-171: the search page in Brand System v1 (design A, "Punkt na mapie"). ---
  /** The mono line above the title. */
  readonly searchKicker: string;
  /** The label before the example names. */
  readonly examplesLabel: string;
  /** The panel beside the search: what the result shows. */
  readonly seeHeading: string;
  readonly seeHeadingSignedOut: string;
  readonly seeApart: string;
  readonly seeItems: readonly string[];
  /** The source chip on the panel's contour art. */
  readonly sourceTag: string;
  /** The section with the two list cards. */
  readonly listsHeading: string;
  readonly listsBody: string;
  readonly listsKicker: string;
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
    freeCta: "Sprawdź dziś za darmo",
    freeToday: "dziś 0 zł",
    lockedBody:
      "Liczba dzieci i miejsce na liście w każdym roku od 2000, osobno dla chłopców i dziewczynek.",
    registerDiffers:
      "Liczby z roku to dzieci urodzone w tym roku. Liczba z rejestru PESEL to wszyscy, którzy w dniu listy mają to imię jako pierwsze, w każdym wieku. Nie dodajemy jej do liczb z roku.",
    registerHeading: "W rejestrze PESEL",
    registerCount: "Osób z tym imieniem jako pierwszym",
    registerRank: "Miejsce na liście rejestru",
    registerAsOf: (date) => `Stan na ${date}`,
    registerNone: "Nie mamy liczby z listy rejestru PESEL dla tego imienia.",
    listLink: "Cała lista imion",
    lockedListNote:
      "Pełna lista imion każdego roku, z kierunkiem, i porównanie dwóch imion są w tym samym pakiecie.",
    coupleLink: "Dwa imiona razem",
    tabsLabel: "Płeć",
    eyebrowGot: (year) => `W ${year} to imię dostało`,
    noun: { MALE: "chłopców", FEMALE: "dziewczynek" },
    shareLine: (share, sex, year) =>
      `To ${share} wszystkich ${sex === "MALE" ? "chłopców" : "dziewczynek"} z listy za ${year} r.`,
    place: (rank) => `Miejsce ${rank}`,
    ofNames: (of) => `z ${of} imion`,
    trackMost: "najczęstsze",
    trackRarest: "najrzadsze z listy",
    trackLabel: (rank, of) =>
      `Miejsce ${rank} z ${of} na osi od najczęstszego imienia (po lewej) do najrzadszego z listy (po prawej)`,
    howCommonHeading: "Jak częste",
    oneIn: (n) => `1 na ${n}`,
    oneInNoun: { MALE: "chłopców z listy", FEMALE: "dziewczynek z listy" },
    dotsLabel: (n) => `${n} kropek, jedna podświetlona`,
    oneInCaption: (n, sex, year, name) =>
      `Z każdych ${n} ${sex === "MALE" ? "chłopców" : "dziewczynek"} z listy za ${year} r. ${sex === "MALE" ? "jeden dostał" : "jedna dostała"} imię ${name}.`,
    sharesLine: (earlierYear, earlier, latestYear, latest) =>
      `Udział: ${earlierYear} r. ${earlier} → ${latestYear} r. ${latest}`,
    belowThreshold: "poniżej progu",
    meaningHeading: "Co znaczy",
    meaningNone: "Brak danych o pochodzeniu i znaczeniu.",
    origin: "Pochodzenie",
    meaning: "Znaczenie",
    quote: (text) => `„${text}”`,
    translatedBy: "przekład Name Atlas",
    translationNote:
      "Objaśnienia po angielsku przytaczamy dosłownie. Przekład na polski jest nasz (Name Atlas), dosłowny, i nie pochodzi z dzieła.",
    assessment: "Ocena",
    workLine: (author, title, year, locator) => `${author}, ${title} (${year}), ${locator}`,
    times: (factor) => `×${factor}`,
    timesWording: (more, year) => `tyle razy ${more ? "częściej" : "rzadziej"} niż w ${year} r.`,
    calloutFirst: "Pierwszy rok na liście",
    calloutPeak: "Szczyt",
    calloutLatest: "Ostatni rok",
    peakWord: "najwięcej",
    childrenWord: "dzieci",
    chartLabel: (sex, first, latest) =>
      `Liczba ${sex === "MALE" ? "chłopców" : "dziewczynek"} z tym imieniem rok po roku, od ${first} do ${latest}; słupek szczytowego roku jest wyróżniony, rok bez imienia na liście ma kreskę progu zamiast słupka. Tabela poniżej podaje te same liczby.`,
    cutoffTick: "poniżej progu listy",
    ladderHeading: "Miejsce na liście",
    topYears: (years) => `Imię nr 1 w latach: ${years}.`,
    allYears: (n) => `Wszystkie ${n} lat`,
    latestYearsShown: (n) => `Ostatnie ${n} lat`,
    noneSince: (sex, first) =>
      `Nie ma go na żadnej liście ${sex === "MALE" ? "chłopców" : "dziewczynek"} od ${first} r.`,
    shareEntry: "Udostępnij",
    shareEntryNote: "Karta z tymi liczbami, do wysłania bliskim.",
    compareEntry: "Porównaj z innym imieniem",
    dashTotal: (first) => `Razem od ${first}`,
    dashAtLeast: "co najmniej",
    dashYearsOnList: "Lata na liście",
    dashOf: (n, m) => `${n} z ${m}`,
    dashBest: "Najlepsze miejsce",
    dashBestYears: (years) => `w latach: ${years}`,
    dashChange: (from, to) => `Zmiana ${from} → ${to}`,
    dashNoChange: "brak porównania",
    dashRisesFalls: "Lata wzrostu i spadku",
    dashRisesFallsValue: (rises, falls) => `${rises} ↑ · ${falls} ↓`,
    momentsHeading: "Najważniejsze momenty",
    momentFirst: (fromStart) =>
      fromStart ? "Na liście od początku danych" : "Pierwszy raz na liście",
    momentFirstDesc: (count, rank) => `${count} dzieci, miejsce ${rank}`,
    momentTopTen: "W pierwszej dziesiątce",
    momentTopTenDesc: (rank) => `miejsce ${rank}`,
    momentNumberOne: "Imię nr 1",
    momentNumberOneDesc: (years) =>
      `na pierwszym miejscu w ${years} ${years === 1 ? "roku" : "latach"}`,
    momentPeak: "Najwięcej dzieci",
    momentPeakDesc: (count) => `${count} dzieci`,
    momentRise: "Największy skok",
    momentRiseDesc: (change) => `${change} wobec roku wcześniej`,
    momentLast: "Ostatni rok na liście",
    momentLastDesc: "w kolejnych latach poniżej progu listy",
    yoyHeading: "Zmiana rok do roku",
    yoyNote:
      "Każdy kafelek to rok. Kolor pokazuje, o ile liczba dzieci wzrosła lub spadła wobec roku wcześniej.",
    yoyRise: "wzrost",
    yoyFall: "spadek",
    yoyNone: "bez porównania",
    yoyBiggestRise: "Największy wzrost",
    yoyBiggestFall: "Największy spadek",
    yoyTileLabel: (year, text) => `${year}: ${text}`,
    decadesHeading: "Dekady",
    decadesNote: "Suma dzieci z lat, w których imię było na liście.",
    decadeFoot: (average, listed, stored) =>
      `${average === null ? "poza listą" : `średnie miejsce ${average}`} · ${listed} z ${stored} lat na liście`,
    metricLabel: "Wykres",
    metricCount: "Liczba dzieci",
    metricShare: "Udział ‰",
    shareChartLabel: (sex, first, last) =>
      `Udział imienia wśród ${sex === "MALE" ? "chłopców" : "dziewczynek"} z listy, w promilach, rok po roku od ${first} do ${last}; rok bez imienia na liście ma kreskę progu zamiast słupka.`,
    gridHeading: "Wszystkie lata",
    gridNote: "Wybierz, jak ułożyć lata. Brak imienia na liście to nie zero.",
    sortBy: "Sortuj",
    sortYear: "rok",
    sortCount: "liczba dzieci",
    sortRank: "miejsce",
    sortChange: "zmiana r/r",
    gridShare: "Udział",
    gridChange: "Zmiana r/r",
    gridBar: "Na tle szczytu",
    searchKicker: "Imiona nadawane dzieciom w Polsce",
    examplesLabel: "Na przykład",
    seeHeading: "Co zobaczysz",
    seeHeadingSignedOut: "Co zobaczysz po zalogowaniu",
    seeApart: "Osobno dla dziewczynek i dla chłopców.",
    seeItems: [
      "Ile dzieci dostało to imię w ostatnim roku",
      "Jego miejsce na liście tego roku",
      "Jak częste jest: „1 na N” dzieci",
      "Czy jego udział rośnie, spada, czy się nie zmienia",
      "Pochodzenie i znaczenie, jeśli podają je źródła",
    ],
    sourceTag: "PESEL · zbiór 219",
    listsHeading: "Cała lista imion",
    listsBody: "Imiona nadane dzieciom urodzonym w wybranym roku, od najczęściej nadawanego.",
    listsKicker: "Lista · rok po roku",
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
    freeCta: "See it free today",
    freeToday: "0 zł today",
    lockedBody:
      "The number of children and the place on the list in every year since 2000, for boys and girls separately.",
    registerDiffers:
      "Birth-year figures count children born in that year. The register figure counts everyone who has the name as their first name in the PESEL register on the list's date, of any age. It is never added to a birth-year figure.",
    registerHeading: "In the PESEL register",
    registerCount: "People with this first name",
    registerRank: "Place on the register's list",
    registerAsOf: (date) => `As of ${date}`,
    registerNone: "We have no figure from the PESEL register's list for this name.",
    listLink: "The whole list",
    lockedListNote:
      "The full list of names for every year, with direction, and a comparison of two names are in the same package.",
    coupleLink: "Two names together",
    tabsLabel: "Sex",
    eyebrowGot: (year) => `In ${year} this name went to`,
    noun: { MALE: "boys", FEMALE: "girls" },
    shareLine: (share, sex, year) =>
      `That is ${share} of all ${sex === "MALE" ? "boys" : "girls"} on the ${year} list.`,
    place: (rank) => `Place ${rank}`,
    ofNames: (of) => `of ${of} names`,
    trackMost: "most common",
    trackRarest: "rarest on the list",
    trackLabel: (rank, of) =>
      `Place ${rank} of ${of} on a line from the most common name (left) to the rarest on the list (right)`,
    howCommonHeading: "How common",
    oneIn: (n) => `1 in ${n}`,
    oneInNoun: { MALE: "boys on the list", FEMALE: "girls on the list" },
    dotsLabel: (n) => `${n} dots, one lit`,
    oneInCaption: (n, sex, year, name) =>
      `Of every ${n} ${sex === "MALE" ? "boys" : "girls"} on the ${year} list, one was given the name ${name}.`,
    sharesLine: (earlierYear, earlier, latestYear, latest) =>
      `Share: ${earlierYear} ${earlier} → ${latestYear} ${latest}`,
    belowThreshold: "below the cut-off",
    meaningHeading: "What it means",
    meaningNone: "No data on origin or meaning.",
    origin: "Origin",
    meaning: "Meaning",
    quote: (text) => `“${text}”`,
    translatedBy: "translated by Name Atlas",
    translationNote: "",
    assessment: "Assessment",
    workLine: (author, title, year, locator) => `${author}, ${title} (${year}), ${locator}`,
    times: (factor) => `×${factor}`,
    timesWording: (more, year) => `times ${more ? "more" : "less"} often than in ${year}`,
    calloutFirst: "First year on the list",
    calloutPeak: "Peak",
    calloutLatest: "Latest year",
    peakWord: "most",
    childrenWord: "children",
    chartLabel: (sex, first, latest) =>
      `The number of ${sex === "MALE" ? "boys" : "girls"} given this name year by year, ${first} to ${latest}; the peak year's bar is highlighted, and a year the name is not on the list has a cut-off tick instead of a bar. The table below gives the same figures.`,
    cutoffTick: "below the list's cut-off",
    ladderHeading: "Place on the list",
    topYears: (years) => `Name no. 1 in: ${years}.`,
    allYears: (n) => `All ${n} years`,
    latestYearsShown: (n) => `The latest ${n} years`,
    noneSince: (sex, first) =>
      `It is on no ${sex === "MALE" ? "boys'" : "girls'"} list since ${first}.`,
    shareEntry: "Share",
    shareEntryNote: "A card with these figures, to send to family.",
    compareEntry: "Compare with another name",
    dashTotal: (first) => `Total since ${first}`,
    dashAtLeast: "at least",
    dashYearsOnList: "Years on the list",
    dashOf: (n, m) => `${n} of ${m}`,
    dashBest: "Best rank",
    dashBestYears: (years) => `in ${years}`,
    dashChange: (from, to) => `Change ${from} → ${to}`,
    dashNoChange: "no comparison",
    dashRisesFalls: "Years up and down",
    dashRisesFallsValue: (rises, falls) => `${rises} ↑ · ${falls} ↓`,
    momentsHeading: "Key moments",
    momentFirst: (fromStart) =>
      fromStart ? "On the list since the data begins" : "First on the list",
    momentFirstDesc: (count, rank) => `${count} children, rank ${rank}`,
    momentTopTen: "In the top ten",
    momentTopTenDesc: (rank) => `rank ${rank}`,
    momentNumberOne: "Name no. 1",
    momentNumberOneDesc: (years) => `first place in ${years} ${years === 1 ? "year" : "years"}`,
    momentPeak: "Most children",
    momentPeakDesc: (count) => `${count} children`,
    momentRise: "Biggest jump",
    momentRiseDesc: (change) => `${change} on the year before`,
    momentLast: "Last year on the list",
    momentLastDesc: "below the list's cut-off in the years after",
    yoyHeading: "Year on year",
    yoyNote:
      "Each tile is a year. The colour shows how much the number of children rose or fell on the year before.",
    yoyRise: "up",
    yoyFall: "down",
    yoyNone: "no comparison",
    yoyBiggestRise: "Biggest rise",
    yoyBiggestFall: "Biggest fall",
    yoyTileLabel: (year, text) => `${year}: ${text}`,
    decadesHeading: "Decades",
    decadesNote: "The sum of children in the years the name was on the list.",
    decadeFoot: (average, listed, stored) =>
      `${average === null ? "off the list" : `average rank ${average}`} · ${listed} of ${stored} years on the list`,
    metricLabel: "Chart",
    metricCount: "Children",
    metricShare: "Share ‰",
    shareChartLabel: (sex, first, last) =>
      `The name's share of the ${sex === "MALE" ? "boys" : "girls"} on the list, per thousand, year by year from ${first} to ${last}; a year the name is not on the list has a cut-off tick instead of a bar.`,
    gridHeading: "Every year",
    gridNote: "Choose how to order the years. Not on the list does not mean zero.",
    sortBy: "Sort by",
    sortYear: "year",
    sortCount: "children",
    sortRank: "rank",
    sortChange: "change",
    gridShare: "Share",
    gridChange: "Change",
    gridBar: "Against the peak",
    searchKicker: "First names given to children in Poland",
    examplesLabel: "For example",
    seeHeading: "What you will see",
    seeHeadingSignedOut: "What you will see once signed in",
    seeApart: "For girls and for boys separately.",
    seeItems: [
      "How many children were given the name in the latest year",
      "Its place on that year's list",
      "How common it is: “1 in N” children",
      "Whether its share is rising, falling or steady",
      "Its origin and meaning, where the sources give them",
    ],
    sourceTag: "PESEL · dataset 219",
    listsHeading: "The whole list of names",
    listsBody: "The names given to children born in a chosen year, most frequent first.",
    listsKicker: "List · year by year",
  },
};
