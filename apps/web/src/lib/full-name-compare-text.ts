import type { Lang } from "./messages.js";

/**
 * The full-name comparison's words (TASK-155, D-049), in Polish and English.
 *
 * Plain, and nothing beyond the data: counts, ranks, a direction, what the
 * works say a name means. No kinship, no "popular" or "rare" for a first name,
 * no count of people with both names (ADR-0032 §7, D-033). Every number the
 * functions below put in a sentence comes from a claim.
 */

export type BirthSexKey = "MALE" | "FEMALE";

export interface FullNameCompareText {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede: string;
  readonly disclaimer: string;
  readonly togetherHeading: string;
  readonly togetherBody: string;
  readonly signedOut: string;
  readonly signIn: string;
  readonly person: (n: number) => string;
  readonly optional: string;
  readonly givenLabel: string;
  readonly surnameLabel: string;
  readonly givenPlaceholder: string;
  readonly surnamePlaceholder: string;
  readonly submit: string;
  readonly errorHalf: string;
  readonly errorTwo: string;
  readonly containsHeading: string;
  readonly contains: readonly { readonly title: string; readonly body: string }[];
  readonly lockedHeading: string;
  readonly lockedBody: string;
  readonly lockedPrice: string;
  readonly soon: string;
  readonly freeLink: string;
  readonly chapterRegister: string;
  readonly registerList: Readonly<Record<BirthSexKey, string>>;
  readonly registerApart: string;
  readonly registerNone: string;
  readonly registerAsOf: (date: string) => string;
  readonly rankOf: (rank: string, of: string) => string;
  readonly chapterBirths: string;
  readonly birthsSex: Readonly<Record<BirthSexKey, string>>;
  readonly birthsYear: (year: number) => string;
  readonly birthsBelow: (threshold: string) => string;
  readonly birthsNone: string;
  readonly direction: Readonly<Record<"RISING" | "STEADY" | "FALLING", string>>;
  readonly birthsDiffer: string;
  readonly chapterMeaning: string;
  readonly origin: string;
  readonly meaning: string;
  readonly quote: (text: string) => string;
  readonly translatedBy: string;
  readonly translationNote: string;
  readonly meaningNone: string;
  readonly rightsBlocked: string;
  readonly chapterSurnameCount: string;
  readonly chapterSurnameRarity: string;
  readonly chapterSurnameMap: string;
  readonly surnameNone: string;
  readonly notInDataset: string;
  readonly mapsMissing: (names: string) => string;
  readonly rarest: (name: string) => string;
  readonly tie: string;
  readonly tooClose: string;
  readonly givenNotFound: (name: string) => string;
  readonly givenHeld: string;
  readonly givenInvalid: string;
  readonly surnameUnknown: (name: string) => string;
  readonly unresolvedHeading: string;
  readonly pages: string;
  readonly surnamesOnly: string;
  readonly again: string;
  readonly stepsLabel: string;
  readonly steps: readonly [string, string, string];
  readonly stepNow: string;
  readonly stepDone: string;
  readonly peopleHeading: string;
  readonly peopleHint: string;
  readonly addPeople: string;
  readonly lockedHint: string;
  readonly lockedChip: string;
  readonly unlockedChip: string;
  readonly benefits: readonly string[];
  readonly containsLocked: string;
  readonly previewLabel: string;
  readonly chaptersLabel: string;
  readonly glanceHeading: string;
  readonly glanceNote: string;
  readonly glanceCols: Readonly<
    Record<"person" | "register" | "births" | "origin" | "count" | "rarity", string>
  >;
  readonly glanceNone: string;
  readonly glanceBelow: string;
  readonly glanceRarest: string;
  readonly navSurnames: string;
  readonly navMissing: string;
  readonly notOnList: (names: string) => string;
}

export const FULL_NAME_COMPARE_TEXT: Readonly<Record<Lang, FullNameCompareText>> = {
  pl: {
    eyebrow: "Porównanie imion i nazwisk",
    title: "Imię i nazwisko — porównaj z innymi",
    lede: "Wpisz imię i nazwisko: swoje i do trzech innych osób. Zestawimy, co rejestr PESEL i źródła mówią o każdym imieniu i każdym nazwisku, z tej samej listy i z tą samą datą.",
    disclaimer:
      "Porównujemy imiona i nazwiska, nie ludzi. Wspólne imię albo nazwisko nie oznacza wspólnej rodziny, wspólnych korzeni ani wspólnej narodowości.",
    togetherHeading: "Ile osób nazywa się dokładnie tak?",
    togetherBody:
      "Tego nie podajemy. Rejestr PESEL publikuje imiona i nazwiska w osobnych zestawieniach i żadne źródło nie łączy ich ze sobą, więc nikt nie wie, ile osób nosi oba razem. Nie szacujemy tej liczby.",
    signedOut:
      "To porównanie jest dla zalogowanych. Po zalogowaniu wpiszesz imiona i nazwiska do czterech osób i zobaczysz je obok siebie.",
    signIn: "Zaloguj się",
    person: (n) => `Osoba ${n}`,
    optional: "opcjonalnie",
    givenLabel: "Imię",
    surnameLabel: "Nazwisko",
    givenPlaceholder: "np. Zofia",
    surnamePlaceholder: "np. Nowak",
    submit: "Porównaj",
    errorHalf: "Wpisz dla każdej osoby i imię, i nazwisko.",
    errorTwo: "Wpisz co najmniej dwie osoby.",
    containsHeading: "Co zawiera porównanie",
    contains: [
      {
        title: "Imię w rejestrze PESEL",
        body: "Ile osób nosi każde imię jako pierwsze i jego miejsce na liście — osobno na liście mężczyzn i kobiet.",
      },
      {
        title: "Imię u dzieci",
        body: "Ile dzieci dostało je w ostatnim roku, jego miejsce na liście i czy jego udział rośnie, czy spada.",
      },
      {
        title: "Pochodzenie imienia",
        body: "Język pochodzenia i znaczenie, tak jak podają je dzieła, które wolno nam cytować — ze stroną.",
      },
      {
        title: "Nazwiska",
        body: "Liczba osób, rzadkość i województwa — na jednej skali, gdy dane na to pozwalają.",
      },
    ],
    lockedHeading: "Porównanie imion i nazwisk",
    lockedBody:
      "To porównanie jest płatne: jedna płatność, bez abonamentu. Zawiera je też każdy pakiet od 28,99 zł.",
    lockedPrice: "15,99 zł",
    soon: "Wkrótce",
    freeLink: "Dwa nazwiska porównasz za darmo",
    chapterRegister: "Imię w rejestrze PESEL",
    registerList: { MALE: "Lista mężczyzn", FEMALE: "Lista kobiet" },
    registerApart:
      "Każda lista jest liczona osobno. Liczb z dwóch list nie sumujemy ani nie zestawiamy ze sobą.",
    registerNone: "nie ma go na tej liście",
    registerAsOf: (date) => `Stan rejestru na ${date}`,
    rankOf: (rank, of) => `miejsce ${rank} z ${of}`,
    chapterBirths: "Imię u dzieci",
    birthsSex: { MALE: "Chłopcy", FEMALE: "Dziewczynki" },
    birthsYear: (year) => `Dzieci urodzone w ${year} r.`,
    birthsBelow: (threshold) => `nadane rzadziej niż ${threshold} razy — nie ma go na liście`,
    birthsNone: "nie ma go na listach imion dzieci",
    direction: { RISING: "rośnie", STEADY: "bez większej zmiany", FALLING: "spada" },
    birthsDiffer:
      "Liczby z roku to dzieci urodzone w tym roku; rejestr to wszyscy, w każdym wieku. Nie dodajemy jednych do drugich.",
    chapterMeaning: "Pochodzenie imienia",
    origin: "Pochodzenie",
    meaning: "Znaczenie",
    quote: (text) => `„${text}”`,
    translatedBy: "przekład Name Atlas",
    translationNote:
      "Objaśnienia po angielsku przytaczamy dosłownie. Przekład na polski jest nasz (Name Atlas), dosłowny, i nie pochodzi z dzieła.",
    meaningNone:
      "Żadne dzieło, które wolno nam cytować (z domeny publicznej albo za bezpłatną zgodą wydawcy), nie objaśnia tego imienia.",
    rightsBlocked: "Tych danych nie możemy tu pokazać.",
    chapterSurnameCount: "Nazwisko — liczba osób",
    chapterSurnameRarity: "Nazwisko — rzadkość",
    chapterSurnameMap: "Nazwisko — województwa",
    surnameNone: "Nie ma tu wartości, które dałoby się porównać.",
    notInDataset: "brak w tym zbiorze",
    mapsMissing: (names) => `Bez mapy w tym zbiorze: ${names}.`,
    rarest: (name) => `${name} jest najrzadsze w tym zbiorze.`,
    tie: "Najrzadsze nazwiska są w tym zbiorze równie rzadkie.",
    tooClose:
      "Najrzadsze wartości są zbyt bliskie, aby je rozróżnić po zaokrągleniu — nie wskazujemy, które nazwisko jest najrzadsze.",
    givenNotFound: (name) =>
      `Imienia „${name}” nie ma w rejestrze ani na listach imion nadanych dzieciom.`,
    givenHeld: "Tej formy imienia nie pokazujemy, dopóki nie zostanie sprawdzona.",
    givenInvalid: "To imię jest za długie albo puste.",
    surnameUnknown: (name) => `Nazwiska „${name}” nie ma w rejestrze.`,
    unresolvedHeading: "Czego nie znaleźliśmy",
    pages: "Strony nazwisk",
    surnamesOnly: "Porównaj same nazwiska",
    again: "Zmień osoby",
    stepsLabel: "Kroki",
    steps: ["Wpisz osoby", "Odblokuj porównanie", "Zobacz je obok siebie"],
    stepNow: "teraz",
    stepDone: "zrobione",
    peopleHeading: "Osoby",
    peopleHint: "od dwóch do czterech",
    addPeople: "Dodaj trzecią i czwartą osobę",
    lockedHint: "Najpierw odblokuj porównanie. Wpisane osoby zostaną w formularzu.",
    lockedChip: "Zablokowane",
    unlockedChip: "Odblokowane",
    benefits: [
      "Do czterech osób naraz",
      "Imię i nazwisko każdej osoby obok siebie",
      "Źródło przy każdej liczbie",
    ],
    containsLocked: "Co zobaczysz po odblokowaniu",
    previewLabel: "Podgląd układu · bez danych",
    chaptersLabel: "Rozdziały",
    glanceHeading: "W skrócie",
    glanceNote: "Jeden wiersz na osobę. Szczegóły i źródła są niżej.",
    glanceCols: {
      person: "Osoba",
      register: "Imię w rejestrze",
      births: "Imię u dzieci",
      origin: "Pochodzenie imienia",
      count: "Nazwisko · liczba osób",
      rarity: "Nazwisko · rzadkość",
    },
    glanceNone: "brak danych",
    glanceBelow: "poniżej progu listy",
    glanceRarest: "najrzadsze",
    navSurnames: "Nazwiska",
    navMissing: "Braki",
    notOnList: (names) => `Nie ma na tej liście: ${names}.`,
  },
  en: {
    eyebrow: "Full-name comparison",
    title: "A first name and surname — compared with others",
    lede: "Type a first name and surname: yours and up to three other people's. We set side by side what the PESEL register and the sources say about each first name and each surname, from the same list and the same date.",
    disclaimer:
      "We compare names, not people. A shared first name or surname does not mean a shared family, shared roots or shared nationality.",
    togetherHeading: "How many people have exactly this name?",
    togetherBody:
      "We do not say. The PESEL register publishes first names and surnames in separate lists and no source links them, so nobody knows how many people carry both. We do not estimate it.",
    signedOut:
      "This comparison is for signed-in readers. Once signed in, you type the first names and surnames of up to four people and see them side by side.",
    signIn: "Sign in",
    person: (n) => `Person ${n}`,
    optional: "optional",
    givenLabel: "First name",
    surnameLabel: "Surname",
    givenPlaceholder: "e.g. Zofia",
    surnamePlaceholder: "e.g. Nowak",
    submit: "Compare",
    errorHalf: "Type both a first name and a surname for each person.",
    errorTwo: "Type at least two people.",
    containsHeading: "What the comparison holds",
    contains: [
      {
        title: "The first name in the PESEL register",
        body: "How many people have each first name and its place on the list — the men's and the women's lists apart.",
      },
      {
        title: "The first name among children",
        body: "How many children were given it last year, its place on the list, and whether its share is rising or falling.",
      },
      {
        title: "Where the first name comes from",
        body: "Its language of origin and meaning, as the works we may quote state them — with the page.",
      },
      {
        title: "The surnames",
        body: "Number of people, rarity and voivodeships — on one scale, where the data allows it.",
      },
    ],
    lockedHeading: "Full-name comparison",
    lockedBody:
      "This comparison is paid: one payment, no subscription. Every package from PLN 28.99 holds it too.",
    lockedPrice: "PLN 15.99",
    soon: "Coming soon",
    freeLink: "Compare two surnames for free",
    chapterRegister: "The first name in the PESEL register",
    registerList: { MALE: "Men's list", FEMALE: "Women's list" },
    registerApart:
      "Each list is counted on its own. The two lists are never added together or set against each other.",
    registerNone: "not on this list",
    registerAsOf: (date) => `Register as of ${date}`,
    rankOf: (rank, of) => `place ${rank} of ${of}`,
    chapterBirths: "The first name among children",
    birthsSex: { MALE: "Boys", FEMALE: "Girls" },
    birthsYear: (year) => `Children born in ${year}`,
    birthsBelow: (threshold) => `given fewer than ${threshold} times — not on the list`,
    birthsNone: "on none of the lists of names given to children",
    direction: { RISING: "rising", STEADY: "steady", FALLING: "falling" },
    birthsDiffer:
      "Birth-year figures count children born that year; the register counts everyone, of any age. One is never added to the other.",
    chapterMeaning: "Where the first name comes from",
    origin: "Origin",
    meaning: "Meaning",
    quote: (text) => `“${text}”`,
    translatedBy: "",
    translationNote: "",
    meaningNone:
      "No work we may quote (in the public domain, or with its publisher's free permission) explains this name.",
    rightsBlocked: "We cannot show these figures here.",
    chapterSurnameCount: "Surname — number of people",
    chapterSurnameRarity: "Surname — rarity",
    chapterSurnameMap: "Surname — voivodeships",
    surnameNone: "There is no figure here that can be compared.",
    notInDataset: "not in this dataset",
    mapsMissing: (names) => `No map in this dataset: ${names}.`,
    rarest: (name) => `${name} is the rarest in this dataset.`,
    tie: "The rarest surnames are equally rare in this dataset.",
    tooClose:
      "The rarest figures are too close to separate once rounded, so none is called the rarest.",
    givenNotFound: (name) =>
      `“${name}” is neither in the register nor on the lists of names given to children.`,
    givenHeld: "We do not show this form of the name until it has been checked.",
    givenInvalid: "This first name is too long or empty.",
    surnameUnknown: (name) => `“${name}” is not in the register.`,
    unresolvedHeading: "What we did not find",
    pages: "Surname pages",
    surnamesOnly: "Compare the surnames only",
    again: "Change the people",
    stepsLabel: "Steps",
    steps: ["Type the people", "Unlock the comparison", "See them side by side"],
    stepNow: "now",
    stepDone: "done",
    peopleHeading: "People",
    peopleHint: "two to four",
    addPeople: "Add a third and fourth person",
    lockedHint: "Unlock the comparison first. The people you typed stay in the form.",
    lockedChip: "Locked",
    unlockedChip: "Unlocked",
    benefits: [
      "Up to four people at once",
      "Each person's first name and surname side by side",
      "A source with every figure",
    ],
    containsLocked: "What you will see once it is unlocked",
    previewLabel: "Layout preview · no data",
    chaptersLabel: "Chapters",
    glanceHeading: "At a glance",
    glanceNote: "One row per person. The details and sources are below.",
    glanceCols: {
      person: "Person",
      register: "First name in the register",
      births: "First name among children",
      origin: "Origin of the first name",
      count: "Surname · people",
      rarity: "Surname · rarity",
    },
    glanceNone: "no data",
    glanceBelow: "below the list's cut-off",
    glanceRarest: "the rarest",
    navSurnames: "Surnames",
    navMissing: "Gaps",
    notOnList: (names) => `Not on this list: ${names}.`,
  },
};
