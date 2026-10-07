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
  readonly registerDiffers: string;
  readonly registerHeading: string;
  readonly registerCount: string;
  readonly registerRank: string;
  readonly registerAsOf: (date: string) => string;
  readonly registerNone: string;
  /** The link to the whole list (TASK-146), on the page and in the locked card. */
  readonly listLink: string;
  readonly lockedListNote: string;
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
  // --- TASK-159: the page for a signed-out reader. ---
  readonly out: BabyNamesSignedOutText;
}

/** The six things a signed-in reader gets, one card each on the signed-out page (TASK-159). */
export type BabyNamesFeature = "count" | "rank" | "direction" | "register" | "meaning" | "lists";

/**
 * The signed-out page's words (TASK-159). No number from the data: the preview's
 * figures are masked, and its noun is "dzieci", which names no sex.
 */
export interface BabyNamesSignedOutText {
  /** The hero's eyebrow above the title. */
  readonly eyebrow: string;
  readonly label: string;
  /** Under the search box before a name is typed. */
  readonly hint: string;
  readonly noAccount: string;
  /** "Załóż je": the sign-up link after "Nie masz konta?". */
  readonly signUpShort: string;
  readonly signUp: string;
  /** After a name was typed: "Zaloguj się, a od razu pokażemy wynik dla imienia „Zofia”." */
  readonly asked: (name: string) => string;
  readonly previewCaption: string;
  readonly previewLocked: string;
  /** The preview's name before one is typed. */
  readonly previewName: string;
  readonly previewEyebrow: string;
  readonly previewPlace: string;
  /** "1 na", before the masked N. */
  readonly previewOneIn: string;
  /** "Udział", before the two masked shares. */
  readonly previewShare: string;
  readonly whatHeading: string;
  readonly whatLede: string;
  readonly features: Readonly<
    Record<BabyNamesFeature, { readonly title: string; readonly body: string }>
  >;
  readonly plansHeading: string;
  readonly freeEyebrow: string;
  readonly freeTitle: string;
  readonly freeItems: readonly string[];
  /** "Pakiet · Imiona dla dziecka" */
  readonly tierEyebrow: (tier: string) => string;
  readonly oneTime: string;
  /** The right end of the tier card's masked chart, under "2000" on the left. */
  readonly chartLatest: string;
  readonly sourceHeading: string;
  readonly sourceBody: string;
  readonly sourceRef: string;
  readonly sourceAbsent: string;
}

export const BABY_NAMES_TEXT: Readonly<Record<Lang, BabyNamesText>> = {
  pl: {
    title: "Imiona dla dziecka",
    lede: "Ile dzieci w Polsce dostało dane imię jako pierwsze, rok po roku.",
    source:
      "Źródło: rejestr PESEL, zbiór „Imiona nadawane dzieciom w Polsce” Ministerstwa Cyfryzacji (dane.gov.pl, zbiór 219). Listy chłopców i dziewczynek są osobne i nie sumujemy ich.",
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
    registerDiffers:
      "Liczby z roku to dzieci urodzone w tym roku. Liczba z rejestru PESEL to wszyscy, którzy w dniu listy mają to imię jako pierwsze, w każdym wieku. Nie dodajemy jej do liczb z roku.",
    registerHeading: "W rejestrze PESEL",
    registerCount: "Osób z tym imieniem jako pierwszym",
    registerRank: "Miejsce na liście rejestru",
    registerAsOf: (date) => `Stan na ${date}`,
    registerNone: "Nie mamy liczby z listy rejestru PESEL dla tego imienia.",
    listLink: "Cała lista imion",
    lockedListNote: "Pełna lista imion każdego roku, z kierunkiem, jest w tym samym pakiecie.",
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
    out: {
      eyebrow: "Rejestr PESEL · imiona nadawane dzieciom",
      label: "Wpisz imię",
      hint: "Wynik zobaczysz po zalogowaniu. Podstawowe liczby są za darmo.",
      noAccount: "Nie masz konta?",
      signUpShort: "Załóż je",
      signUp: "Załóż konto",
      asked: (name) => `Zaloguj się, a od razu pokażemy wynik dla imienia „${name}”.`,
      previewCaption: "Podgląd wyniku",
      previewLocked: "liczby po zalogowaniu",
      previewName: "Twoje imię",
      previewEyebrow: "W ostatnim roku listy to imię dostało",
      previewPlace: "Miejsce",
      previewOneIn: "1 na",
      previewShare: "Udział",
      whatHeading: "Co zobaczysz po zalogowaniu",
      whatLede: "Wpisujesz imię. Liczby dla chłopców i dla dziewczynek dostajesz osobno.",
      features: {
        count: {
          title: "Ile dzieci",
          body: "Ile dzieci dostało to imię jako pierwsze w ostatnim roku listy i jaka to część wszystkich dzieci z listy.",
        },
        rank: {
          title: "Miejsce na liście",
          body: "Które miejsce zajmuje imię na liście tego roku, od najczęstszego do najrzadszego z listy.",
        },
        direction: {
          title: "Kierunek",
          body: "Czy udział imienia rośnie, spada, czy się nie zmienia, i z porównania których dwóch lat to wynika.",
        },
        register: {
          title: "W rejestrze PESEL",
          body: "Ile osób w każdym wieku ma to imię jako pierwsze. Tej liczby nie dodajemy do liczb z roku.",
        },
        meaning: {
          title: "Co znaczy",
          body: "Pochodzenie i znaczenie imienia słowami dzieła, które je objaśnia. Gdy takiego dzieła nie mamy albo nie możemy go pokazać, piszemy to wprost.",
        },
        lists: {
          title: "Dwie osobne listy",
          body: "Chłopcy i dziewczynki są na osobnych listach. Liczb z dwóch list nigdy nie sumujemy.",
        },
      },
      plansHeading: "Za darmo i w pakiecie",
      freeEyebrow: "Za darmo",
      freeTitle: "Po zalogowaniu",
      freeItems: [
        "Liczba dzieci w ostatnim roku listy i jej udział",
        "Miejsce na liście tego roku",
        "Kierunek: rośnie, spada albo bez większej zmiany",
        "Liczba z rejestru PESEL",
        "Pochodzenie i znaczenie, gdy objaśnia je dzieło",
      ],
      tierEyebrow: (tier) => `Pakiet · ${tier}`,
      oneTime: "jednorazowo",
      chartLatest: "ostatni rok",
      sourceHeading: "Źródło",
      sourceBody:
        "Rejestr PESEL, zbiór „Imiona nadawane dzieciom w Polsce” Ministerstwa Cyfryzacji.",
      sourceRef: "dane.gov.pl · zbiór 219",
      sourceAbsent:
        "Listy pomijają imiona nadane rzadziej niż próg danego roku. Brak imienia na liście nie znaczy, że nikt go nie dostał.",
    },
  },
  en: {
    title: "Baby names",
    lede: "How many children in Poland were given a first name, year by year.",
    source:
      "Source: the PESEL register, the Ministry of Digital Affairs' dataset “Imiona nadawane dzieciom w Polsce” (first names given to children in Poland; dane.gov.pl, dataset 219). Boys and girls are on separate lists, never added together.",
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
    registerDiffers:
      "Birth-year figures count children born in that year. The register figure counts everyone who has the name as their first name in the PESEL register on the list's date, of any age. It is never added to a birth-year figure.",
    registerHeading: "In the PESEL register",
    registerCount: "People with this first name",
    registerRank: "Place on the register's list",
    registerAsOf: (date) => `As of ${date}`,
    registerNone: "We have no figure from the PESEL register's list for this name.",
    listLink: "The whole list",
    lockedListNote:
      "The full list of names for every year, with direction, is in the same package.",
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
    out: {
      eyebrow: "PESEL register · names given to children",
      label: "Type a first name",
      hint: "You see the result once signed in. The basic figures are free.",
      noAccount: "No account?",
      signUpShort: "Create one",
      signUp: "Create an account",
      asked: (name) => `Sign in and we show the result for “${name}” straight away.`,
      previewCaption: "Result preview",
      previewLocked: "figures once signed in",
      previewName: "Your name",
      previewEyebrow: "In the latest year on the list this name went to",
      previewPlace: "Place",
      previewOneIn: "1 in",
      previewShare: "Share",
      whatHeading: "What you see once signed in",
      whatLede: "You type a first name. You get the figures for boys and for girls separately.",
      features: {
        count: {
          title: "How many children",
          body: "How many children were given the name first in the latest year on the list, and what part of all the list's children that is.",
        },
        rank: {
          title: "Place on the list",
          body: "The name's place on that year's list, from the most common to the rarest on the list.",
        },
        direction: {
          title: "Direction",
          body: "Whether the name's share is rising, falling or steady, and which two years the comparison is between.",
        },
        register: {
          title: "In the PESEL register",
          body: "How many people of any age have the name as their first. That figure is never added to a year's figures.",
        },
        meaning: {
          title: "What it means",
          body: "The name's origin and meaning in the words of a work that explains it. When we have no such work, or cannot show it, we say so.",
        },
        lists: {
          title: "Two separate lists",
          body: "Boys and girls are on separate lists. We never add the two together.",
        },
      },
      plansHeading: "Free and in the plan",
      freeEyebrow: "Free",
      freeTitle: "Once signed in",
      freeItems: [
        "The number of children in the latest year on the list, and its share",
        "The place on that year's list",
        "The direction: rising, falling or steady",
        "The PESEL register's figure",
        "The origin and meaning, when a work explains it",
      ],
      tierEyebrow: (tier) => `Plan · ${tier}`,
      oneTime: "one-time",
      chartLatest: "latest year",
      sourceHeading: "Source",
      sourceBody:
        "The PESEL register, the Ministry of Digital Affairs' dataset “Imiona nadawane dzieciom w Polsce” (first names given to children in Poland).",
      sourceRef: "dane.gov.pl · dataset 219",
      sourceAbsent:
        "The lists leave out names given fewer times than the year's cut-off. A name missing from a list does not mean no child was given it.",
    },
  },
};
