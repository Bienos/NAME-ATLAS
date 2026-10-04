import type {
  HiddenField,
  InvitationAnswer,
  LivingStatus,
  TreePersonRead,
} from "@name-atlas/family";
import type { Lang } from "./messages.js";
import type { StarKind } from "./tree-constellation.js";
import type { SlotRole, TreePage } from "./tree-paths.js";

/**
 * The words of the tree's pages, in both languages (TASK-076). As the
 * account's pages: a page prints its message from a *status word* in the
 * address, only from the words listed for that page, and never from text in
 * the address. The one message that names a person ("X is in the tree")
 * takes the name from the tree the page has just read, keyed by an id.
 *
 * The voice is the product's (`PRODUCT.md` §7): an empty place is a question,
 * not an error; nothing is guessed for the reader.
 */

export interface StatusWords {
  readonly text: string;
  readonly tone: "ok" | "problem";
  /** A link to the offer page after the text, with these words (TASK-111). */
  readonly offer?: string;
}

type StatusMap = Readonly<Record<string, StatusWords>>;

export interface TreeLandingText {
  readonly title: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly lede: string;
  readonly yourTrees: string;
  readonly signUp: string;
  readonly signIn: string;
  readonly needsAccount: string;
  /** The sample pedigree in the hero: its labels and its one question. */
  readonly sample: {
    readonly figure: string;
    readonly caption: string;
    readonly generations: readonly [string, string, string, string];
    readonly question: string;
    readonly empty: string;
    readonly living: string;
    readonly deceased: string;
    readonly about: string;
    readonly alive: string;
  };
  readonly why: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly sub: string;
    readonly paragraphs: readonly string[];
    readonly pull: string;
  };
  readonly what: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly items: readonly string[];
    /** The phone frame's static demo of the question form. */
    readonly demo: {
      readonly figure: string;
      readonly tree: string;
      readonly privateChip: string;
      readonly progress: string;
      readonly step: string;
      readonly heading: string;
      readonly given: string;
      readonly givenValue: string;
      readonly year: string;
      readonly yearValue: string;
      readonly about: string;
      readonly place: string;
      readonly placeValue: string;
      readonly matches: readonly (readonly [string, string])[];
      readonly livingQuestion: string;
      readonly living: readonly [string, string, string];
      readonly submit: string;
      readonly caption: string;
    };
  };
  readonly who: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly items: readonly string[];
    readonly othersSee: string;
    readonly youSee: string;
    readonly hiddenChip: string;
    readonly livingChip: string;
    readonly caption: string;
  };
  readonly plans: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly items: readonly (readonly [string, string])[];
    readonly note: string;
  };
  readonly cta: {
    readonly eyebrow: string;
    readonly heading: string;
  };
  readonly offer: { readonly before: string; readonly link: string; readonly after: string };
}

export interface TreeText {
  readonly nav: string;
  readonly landing: TreeLandingText;
  readonly headings: Readonly<Record<TreePage, string>>;
  readonly dashboard: {
    readonly lede: string;
    readonly none: string;
    readonly open: string;
    readonly people: (n: number) => string;
    readonly role: Readonly<Record<"OWNER" | "EDITOR" | "VIEWER", string>>;
    readonly changed: string;
    readonly newTree: string;
    readonly title: string;
    readonly titleHint: string;
    readonly create: string;
    readonly privacyHeading: string;
    readonly privacy: readonly string[];
    readonly rules: string;
  };
  readonly question: {
    readonly heading: string;
    readonly start: string;
    readonly startLede: string;
    readonly ask: (role: SlotRole) => string;
    readonly complete: string;
    readonly answer: string;
    readonly skip: string;
    readonly emptyIsFine: string;
  };
  readonly pedigree: {
    readonly lede: string;
    readonly generation: readonly string[];
    readonly empty: (role: SlotRole) => string;
    readonly hidden: string;
    readonly hiddenCount: (n: number) => string;
    readonly unplaced: string;
    readonly addPerson: string;
    readonly addFirst: string;
    readonly living: string;
    readonly deceased: string;
    readonly unknown: string;
    readonly entered: string;
    readonly added: (name: string) => string;
    readonly viewer: string;
    /** The download (TASK-098): the link's words and the line under it. */
    readonly exportLink: string;
    readonly exportHint: string;
    readonly deleteHeading: string;
    readonly deleteLede: string;
    readonly deleteConfirm: string;
    readonly deleteSubmit: string;
    readonly back: string;
  };
  /** The Konstelacja view (TASK-091): the sky, the stars' words, the legend, the panel. */
  readonly constellation: {
    readonly lede: string;
    readonly viewsLabel: string;
    readonly views: Readonly<Record<"tree" | "constellation" | "map", string>>;
    readonly skyLabel: string;
    readonly arcLabel: (generation: number) => string;
    /** The word a star carries for its kind, in a label such as "Józef Zieliński, ze źródła". */
    readonly kind: Readonly<Record<StarKind, string>>;
    /** The short name under an empty or a hidden star. */
    readonly emptyName: string;
    readonly noneName: string;
    readonly hiddenName: string;
    readonly emptySub: string;
    readonly legend: Readonly<Record<Exclude<StarKind, "hidden">, string>>;
    readonly note: string;
    readonly outside: (n: number) => string;
    readonly outsideLink: string;
    readonly panel: {
      readonly heading: string;
      readonly emptyHeading: string;
      readonly emptyText: string;
      readonly hiddenHeading: string;
      readonly hiddenText: string;
      readonly birth: string;
      readonly birthSurname: string;
      readonly death: string;
      readonly source: string;
      readonly sourceChip: string;
      readonly livingNote: string;
      readonly edit: string;
    };
  };
  /** The Mapa view (TASK-092): the map by voivodeship, the rail, the card. */
  readonly map: {
    readonly lede: string;
    readonly mapLabel: string;
    readonly railLabel: string;
    readonly note: string;
    readonly offMap: (n: number) => string;
    readonly offMapItem: string;
    readonly noPlace: string;
    readonly regionLabel: (name: string, n: number) => string;
    readonly card: {
      readonly heading: string;
      readonly birth: string;
    };
  };
  readonly form: {
    readonly roleHeading: (role: SlotRole) => string;
    readonly whatHeading: (role: SlotRole) => string;
    readonly parentsHeading: string;
    readonly parentsLede: string;
    readonly chooseRole: (role: SlotRole) => string;
    readonly firstHeading: string;
    readonly firstLede: string;
    readonly anyHeading: string;
    readonly given: string;
    readonly surname: string;
    readonly birthSurname: string;
    readonly birthYear: string;
    readonly approx: string;
    readonly place: string;
    readonly placeHint: string;
    readonly search: string;
    readonly matches: string;
    readonly keepTyped: string;
    readonly noMatch: string;
    readonly unavailable: string;
    readonly livingHeading: string;
    readonly living: Readonly<Record<LivingStatus, string>>;
    readonly livingHint: string;
    readonly deathYear: string;
    readonly sourceNote: string;
    readonly sourceHint: string;
    readonly notes: string;
    readonly add: string;
    readonly save: string;
    readonly yourParent: (role: SlotRole, name: string) => string;
  };
  readonly person: {
    readonly lede: string;
    readonly parents: string;
    readonly noParents: string;
    readonly hiddenParents: (n: number) => string;
    readonly unlink: string;
    readonly link: string;
    readonly linkWho: string;
    readonly linkRole: string;
    readonly roles: Readonly<Record<"MOTHER" | "FATHER" | "PARENT", string>>;
    readonly addParent: (role: SlotRole) => string;
    readonly setRoot: string;
    readonly isRoot: string;
    readonly deleteHeading: string;
    readonly deleteConfirm: string;
    readonly deleteSubmit: string;
  };
  readonly consent: {
    readonly lede: string;
    readonly points: readonly string[];
    readonly check: string;
    readonly termsBefore: string;
    readonly termsLink: string;
    readonly termsAfter: string;
    readonly submit: string;
    readonly cancel: string;
  };
  /** The owner's invitation of a living person, on the person's page (TASK-094, ADR-0029 §2.6.20). */
  readonly invite: {
    readonly heading: string;
    readonly lede: string;
    readonly email: string;
    readonly consent: string;
    readonly send: string;
    readonly pending: (sent: string, until: string) => string;
    readonly answered: Readonly<Record<InvitationAnswer, (when: string) => string>>;
    readonly expired: (sent: string) => string;
    readonly claimedNote: string;
    readonly hiddenMark: string;
    readonly declinedNote: string;
  };
  /** The invited person's page: their own row and the three answers (§2.6.21). */
  readonly invitation: {
    readonly lede: string;
    readonly yourRow: string;
    readonly parents: string;
    readonly noParents: string;
    readonly question: string;
    readonly me: string;
    readonly notMe: string;
    readonly noContact: string;
    readonly explain: readonly string[];
    readonly missing: string;
  };
  readonly cards: {
    readonly lede: string;
    readonly none: string;
    readonly claimed: string;
    readonly dashboardLink: (n: number) => string;
  };
  /** The claimant's own card: the form, what to hide, the way to leave (§2.6.22). */
  readonly card: {
    readonly lede: string;
    readonly parents: string;
    readonly noParents: string;
    readonly hideHeading: string;
    readonly hide: Readonly<Record<HiddenField, string>>;
    readonly hideHint: string;
    readonly save: string;
    readonly leaveHeading: string;
    readonly leaveLede: string;
    readonly leaveConfirm: string;
    readonly leaveSubmit: string;
  };
  readonly status: Readonly<Record<TreePage, StatusMap>>;
}

const problem = (text: string): StatusWords => ({ text, tone: "problem" });
const ok = (text: string): StatusWords => ({ text, tone: "ok" });

/** The problems `checkPerson` reports, as a page's words. */
function personProblems(words: Readonly<Record<string, string>>): StatusMap {
  const map: Record<string, StatusWords> = {};
  for (const [word, text] of Object.entries(words)) map[word] = problem(text);
  return map;
}

const PL_PROBLEMS = {
  "given-names": "Wpisz imię. Najwyżej 120 znaków.",
  surname: "Wpisz nazwisko. Najwyżej 120 znaków.",
  "birth-surname": "Nazwisko rodowe: najwyżej 120 znaków.",
  "birth-year": "Rok urodzenia: cztery cyfry, od 1000 do 2100.",
  "death-year": "Rok zgonu: cztery cyfry, od 1000 do 2100.",
  "death-before-birth": "Rok zgonu nie może być wcześniejszy niż rok urodzenia.",
  "birth-place-code": "Miejscowość: wybierz jedną z listy albo zostaw nazwę wpisaną ręcznie.",
  "birth-place-text": "Miejsce urodzenia: najwyżej 120 znaków.",
  "death-place-code": "Miejsce zgonu: nieznany kod.",
  "death-place-text": "Miejsce zgonu: najwyżej 120 znaków.",
  "source-note": "Źródło: najwyżej 500 znaków.",
  notes: "Notatki: najwyżej 2000 znaków.",
  error: "Coś poszło nie tak po naszej stronie. Nic nie zostało zapisane. Spróbuj za chwilę.",
};

const EN_PROBLEMS = {
  "given-names": "Enter a given name. At most 120 characters.",
  surname: "Enter a surname. At most 120 characters.",
  "birth-surname": "Birth surname: at most 120 characters.",
  "birth-year": "Year of birth: four digits, 1000 to 2100.",
  "death-year": "Year of death: four digits, 1000 to 2100.",
  "death-before-birth": "The year of death cannot be before the year of birth.",
  "birth-place-code": "Place: choose one from the list or keep the name as typed.",
  "birth-place-text": "Place of birth: at most 120 characters.",
  "death-place-code": "Place of death: unknown code.",
  "death-place-text": "Place of death: at most 120 characters.",
  "source-note": "Source: at most 500 characters.",
  notes: "Notes: at most 2000 characters.",
  error: "Something went wrong on our side. Nothing was saved. Try again in a moment.",
};

const PL: TreeText = {
  nav: "Drzewa",
  landing: {
    title: "Drzewo rodzinne",
    eyebrow: "Drzewo rodzinne · pakiet Nazwisko i rodzina",
    heading: "Zbuduj drzewo. Jedno pytanie na raz.",
    lede: "Prywatne drzewo z tego, co pamięta Twoja rodzina. Wpisujesz Ty. Serwis niczego nie dopisuje i niczego nie zgaduje.",
    yourTrees: "Twoje drzewa",
    signUp: "Załóż konto",
    signIn: "Zaloguj się",
    needsAccount: "Drzewo wymaga konta: po zalogowaniu widzisz je tylko Ty.",
    sample: {
      figure:
        "Przykładowy rodowód: rzędy pokoleń uciekają ku horyzontowi, od pradziadków w tle do Ciebie na pierwszym planie; puste miejsce to następne pytanie.",
      caption:
        "Dane przykładowe · osoby wymyślone · im dalej, tym mniejsze: odległość w pokoleniach, nie ważność",
      generations: ["Ty", "Rodzice", "Dziadkowie", "Pradziadkowie"],
      question: "Kim była matka?",
      empty: "brak danych",
      living: "Żyje · prywatne",
      deceased: "Nie żyje",
      about: "ok.",
      alive: "żyje",
    },
    why: {
      eyebrow: "Po co",
      heading: "Nazwisko to nie rodzina.",
      sub: "Atlas mówi o nazwisku. Drzewo mówi o Twoich ludziach.",
      paragraphs: [
        "To, co pamiętają rodzice i dziadkowie, zwykle ginie w ciągu jednego pokolenia. Drzewo jest po to, żeby to spisać, zanim zniknie, i mieć to w jednym miejscu, obok faktów o nazwisku.",
        "Zamiast pustego formularza dostajesz jedno pytanie na ekran: kim była matka, kim był ojciec. Odpowiadasz na to, co wiesz.",
      ],
      pull: "Puste miejsce to pytanie, nie błąd.",
    },
    what: {
      eyebrow: "Co możesz zrobić",
      heading: "Jedno pytanie. Jedna osoba.",
      items: [
        "Zacznij od siebie albo od przodka, którego pamiętasz.",
        "Dodawaj rodziców po jednym pytaniu: imię, nazwisko, nazwisko rodowe, rok urodzenia (także „około”), miejsce urodzenia z rejestru TERYT.",
        "Zaznacz, czy osoba żyje. Bez roku zgonu traktujemy ją jako żyjącą.",
        "Zobacz rodowód: cztery pokolenia, puste miejsca jako pytania.",
        "Popraw każdą osobę, połącz ją z innymi, usuń ją albo całe drzewo.",
        "Pobierz wszystko, co wpisałeś, w każdej chwili.",
      ],
      demo: {
        figure: "Jedno pytanie na ekran: makieta formularza, tak jak wygląda w telefonie.",
        tree: "Rodzina Zielińskich",
        privateChip: "Prywatne",
        progress: "Pokolenie 2 z 4",
        step: "Pokolenie II · matka Andrzeja",
        heading: "Co o niej wiesz?",
        given: "Imię",
        givenValue: "Halina",
        year: "Rok urodzenia",
        yearValue: "1937",
        about: "Około",
        place: "Miejsce urodzenia",
        placeValue: "Szcze",
        matches: [
          ["Szczebrzeszyn", "zamojski · lubelskie"],
          ["Szczecinek", "szczecinecki · zachodniopomorskie"],
        ],
        livingQuestion: "Czy Halina żyje?",
        living: ["Żyje", "Nie żyje", "Nie wiem"],
        submit: "Dodaj do drzewa",
        caption: "Dane przykładowe · makieta",
      },
    },
    who: {
      eyebrow: "Kto to widzi",
      heading: "Widzisz tylko Ty.",
      items: [
        "Drzewo jest prywatne od pierwszej osoby.",
        "Osoby żyjące nie trafiają do żadnych dopasowań z cudzymi drzewami. Nigdy.",
        "Zaproszeni widzą osoby zmarłe; żyjące tylko wtedy, gdy im to włączysz.",
        "Drzewo żyje tak długo, jak Twoje konto. Usuwasz je sam.",
      ],
      othersSee: "Inni widzą",
      youSee: "Ty widzisz",
      hiddenChip: "Osoba ukryta",
      livingChip: "Żyje · prywatne",
      caption: "Dane przykładowe · osoby wymyślone",
    },
    plans: {
      eyebrow: "Co dalej",
      heading: "W planach.",
      items: [
        ["Konstelacja", "przodkowie jako gwiazdy"],
        ["Mapa miejsc urodzenia", "TERYT na mapie Polski"],
        ["Zaproszenia dla rodziny", "zmarli dla wszystkich, żyjący za Twoją zgodą"],
        ["Łączenie drzew", "tylko przez osoby zmarłe"],
        ["Potwierdzenie tożsamości", "mObywatel · bank"],
      ],
      note: "Nic z tego nie zmieni zasady: osoby żyjące widzisz tylko Ty.",
    },
    cta: { eyebrow: "Drzewo rodzinne · pakiet Nazwisko i rodzina", heading: "Zacznij od siebie." },
    offer: { before: "Część pakietu ", link: "Nazwisko i rodzina", after: "." },
  },
  headings: {
    trees: "Twoje drzewa",
    consent: "Ta osoba żyje?",
    tree: "Rodowód",
    constellation: "Konstelacja",
    map: "Mapa",
    add: "Dodaj osobę",
    person: "Osoba",
    invitation: "Zaproszenie",
    cards: "Twoje karty",
    card: "Twoja karta",
  },
  dashboard: {
    lede: "Prywatne, dopóki kogoś nie zaprosisz. Osoby żyjące widzisz tylko Ty.",
    none: "Nie masz jeszcze drzewa. Zacznij od siebie albo od przodka, którego pamiętasz.",
    open: "Otwórz",
    people: (n) => (n === 1 ? "1 osoba" : n >= 2 && n <= 4 ? `${n} osoby` : `${n} osób`),
    role: { OWNER: "Twoje", EDITOR: "Współtworzysz", VIEWER: "Oglądasz" },
    changed: "zmieniono",
    newTree: "Nowe drzewo",
    title: "Nazwa drzewa",
    titleHint: "Na przykład nazwisko rodziny. Widzisz ją tylko Ty.",
    create: "Zacznij",
    privacyHeading: "Kto co widzi",
    privacy: [
      "Osoby żyjące widzisz tylko Ty. Bez roku zgonu traktujemy osobę jako żyjącą.",
      "Zaproszeni widzą osoby zmarłe. Żyjące tylko wtedy, gdy im to włączysz.",
      "Nie dopasowujemy osób żyjących do cudzych drzew. Nigdy.",
    ],
    rules: "Zasady dotyczące osób żyjących",
  },
  question: {
    heading: "Następne pytanie",
    start: "Zacznij od siebie.",
    startLede: "Jedno pytanie na ekran. Puste miejsca zostają puste. Nie zgadujemy.",
    ask: (role) => (role === "MOTHER" ? "Kim była matka?" : "Kim był ojciec?"),
    complete: "Cztery pokolenia wypełnione. Resztę poprawisz na karcie osoby.",
    answer: "Odpowiedz",
    skip: "Pomiń. Wrócę później.",
    emptyIsFine: "Jeśli nie wiesz, zostaw puste. Nie zgadujemy za Ciebie.",
  },
  pedigree: {
    lede: "Cztery pokolenia od osoby, od której zaczyna się drzewo. Puste miejsce to pytanie, nie błąd.",
    generation: ["Ty", "Rodzice", "Dziadkowie", "Pradziadkowie"],
    empty: (role) => (role === "MOTHER" ? "Dodaj matkę" : "Dodaj ojca"),
    hidden: "Osoba ukryta",
    hiddenCount: (n) =>
      n === 1
        ? "1 osoba żyjąca jest ukryta: właściciel drzewa jej nie udostępnił."
        : `${n} osób żyjących jest ukrytych: właściciel drzewa ich nie udostępnił.`,
    unplaced: "Poza rodowodem",
    addPerson: "Dodaj osobę",
    addFirst: "Zacznij od siebie",
    living: "Żyje · prywatne",
    deceased: "Nie żyje",
    unknown: "Bez roku zgonu · prywatne",
    entered: "Wpisane przez Ciebie",
    added: (name) => `${name} jest w drzewie.`,
    viewer: "Oglądasz to drzewo. Zmienia je jego właściciel.",
    exportLink: "Pobierz drzewo (JSON)",
    exportHint:
      "Plik z tym, co widzisz: osoby, powiązania, miejsca jako kody TERYT. Każde pobranie jest zapisywane w historii drzewa.",
    deleteHeading: "Usuń drzewo",
    deleteLede:
      "Drzewo, wszystkie osoby, powiązania i zapisy zmian znikają od razu i nie da się tego cofnąć.",
    deleteConfirm: "Rozumiem. Usuń to drzewo na stałe.",
    deleteSubmit: "Usuń drzewo",
    back: "Wszystkie drzewa",
  },
  constellation: {
    lede: "Te same cztery pokolenia jako gwiazdozbiór: Ty na dole, przodkowie coraz wyżej. Wybierz gwiazdę, żeby zobaczyć osobę.",
    viewsLabel: "Widok drzewa",
    views: { tree: "Rodowód", constellation: "Konstelacja", map: "Mapa" },
    skyLabel: "Drzewo jako gwiazdozbiór",
    arcLabel: (generation) => `Pokolenie ${["I", "II", "III", "IV"][generation] ?? generation + 1}`,
    kind: {
      source: "ze źródła",
      entered: "wpisane przez Ciebie",
      living: "żyje, prywatne",
      hidden: "osoba ukryta",
      empty: "puste miejsce",
    },
    emptyName: "Dodaj",
    noneName: "Brak",
    hiddenName: "Ukryta",
    emptySub: "brak danych",
    legend: {
      source: "Ze źródła",
      entered: "Wpisane przez Ciebie",
      living: "Żyje, prywatne",
      empty: "Brak danych",
    },
    note: "Światło oznacza źródło, nie pewność. Puste miejsca zostają puste.",
    outside: (n) => (n === 1 ? "1 osoba poza rodowodem." : `${n} osób poza rodowodem.`),
    outsideLink: "Zobacz w rodowodzie",
    panel: {
      heading: "Osoba",
      emptyHeading: "Brak danych.",
      emptyText:
        "Nie wpisano tej osoby. Puste miejsce zostaje puste, dopóki nie dodasz osoby ze swojej wiedzy albo z dokumentu.",
      hiddenHeading: "Osoba ukryta.",
      hiddenText: "Właściciel drzewa nie udostępnił tej osoby.",
      birth: "Urodzenie",
      birthSurname: "Nazwisko rodowe",
      death: "Zgon",
      source: "Skąd to wiesz",
      sourceChip: "Ze źródła",
      livingNote:
        "Widzisz tę osobę tylko Ty. Nie bierze udziału w dopasowaniach z innymi drzewami.",
      edit: "Edytuj",
    },
  },
  map: {
    lede: "Miejsca urodzenia osób z drzewa na mapie Polski, według województw z rejestru TERYT. Wybierz osobę, żeby zobaczyć jej województwo.",
    mapLabel: "Drzewo na mapie",
    railLabel: "Osoby wg pokoleń",
    note: "Punkt to województwo, w którym urodziła się osoba z drzewa. Linia łączy dziecko z rodzicem, gdy urodzili się w różnych województwach.",
    offMap: (n) =>
      n === 1
        ? "1 osoba nie jest na mapie: brak miejscowości z rejestru TERYT."
        : `${n} osób nie ma miejsca na mapie: brak miejscowości z rejestru TERYT.`,
    offMapItem: "poza mapą",
    noPlace: "bez miejsca urodzenia",
    regionLabel: (name, n) => `${name}: ${n === 1 ? "1 osoba" : `${n} osób`}`,
    card: {
      heading: "Wybrana osoba",
      birth: "Urodzenie",
    },
  },
  form: {
    roleHeading: (role) => (role === "MOTHER" ? "Matka" : "Ojciec"),
    whatHeading: (role) => (role === "MOTHER" ? "Co o niej wiesz?" : "Co o nim wiesz?"),
    parentsHeading: "Kim byli rodzice?",
    parentsLede: "Dodaj tyle, ile wiesz. Resztę zostaw pustą.",
    chooseRole: (role) => (role === "MOTHER" ? "Matka" : "Ojciec"),
    firstHeading: "Zacznij od siebie.",
    firstLede:
      "Pierwsza osoba to początek drzewa: od niej liczymy pokolenia. Możesz zacząć od przodka, jeśli wolisz.",
    anyHeading: "Dodaj osobę",
    given: "Imię (imiona)",
    surname: "Nazwisko",
    birthSurname: "Nazwisko rodowe (jeśli inne)",
    birthYear: "Rok urodzenia",
    approx: "Około",
    place: "Miejsce urodzenia",
    placeHint: "Wpisz nazwę i poszukaj jej w rejestrze TERYT albo zostaw jak jest.",
    search: "Szukaj w TERYT",
    matches: "Miejscowości z rejestru TERYT",
    keepTyped: "Zostaw nazwę wpisaną ręcznie",
    noMatch: "Nie znaleźliśmy takiej miejscowości w TERYT. Nazwa zostanie wpisana ręcznie.",
    unavailable: "Rejestr miejscowości jest teraz niedostępny. Nazwa zostanie wpisana ręcznie.",
    livingHeading: "Czy ta osoba żyje?",
    living: { LIVING: "Żyje", DECEASED: "Nie żyje", UNKNOWN: "Nie wiem" },
    livingHint: "Bez roku zgonu traktujemy osobę jako żyjącą: widzisz ją tylko Ty.",
    deathYear: "Rok zgonu",
    sourceNote: "Skąd to wiesz?",
    sourceHint:
      "Pamięć, dokument, czyjaś relacja. Nie zmienia to niczego poza znacznikiem przy osobie.",
    notes: "Notatki",
    add: "Dodaj do drzewa",
    save: "Zapisz",
    yourParent: (role, name) => `${role === "MOTHER" ? "Matka" : "Ojciec"}: ${name}`,
  },
  person: {
    lede: "Popraw, co wiesz lepiej. Puste pole zostaje puste.",
    parents: "Rodzice",
    noParents: "Rodzice nie są jeszcze wpisani.",
    hiddenParents: (n) => (n === 1 ? "1 rodzic ukryty." : `${n} rodziców ukrytych.`),
    unlink: "Usuń powiązanie",
    link: "Połącz",
    linkWho: "Osoba z drzewa",
    linkRole: "Jako",
    roles: { MOTHER: "matka", FATHER: "ojciec", PARENT: "rodzic" },
    addParent: (role) => (role === "MOTHER" ? "Dodaj matkę" : "Dodaj ojca"),
    setRoot: "Zacznij rodowód od tej osoby",
    isRoot: "Od tej osoby zaczyna się rodowód.",
    deleteHeading: "Usuń osobę",
    deleteConfirm: "Rozumiem. Ta osoba zniknie z drzewa razem ze swoimi powiązaniami.",
    deleteSubmit: "Usuń osobę",
  },
  invite: {
    heading: "Zaproś tę osobę",
    lede: "Jedna wiadomość, na prośbę właściciela drzewa. Wymienia Ciebie, nie tę osobę: bez imienia, daty i miejsca. Bez przypomnień.",
    email: "Adres e-mail tej osoby",
    consent: "Ta osoba wie, że podaję jej adres, i zgadza się na to.",
    send: "Wyślij zaproszenie",
    pending: (sent, until) =>
      `Zaproszenie wysłane ${sent}, ważne do ${until}. Nie dowiesz się, czy zostało otwarte.`,
    answered: {
      ME: (when) => `Ta osoba potwierdziła kartę ${when}.`,
      NOT_ME: (when) => `Odpowiedź z ${when}: to nie ta osoba. Tego adresu nie zaprosisz ponownie.`,
      NO_CONTACT: (when) =>
        `Odpowiedź z ${when}: nie chce kontaktu. Tego adresu nie zaprosisz ponownie.`,
    },
    expired: (sent) => `Zaproszenie z ${sent} wygasło bez odpowiedzi. Możesz wysłać nowe.`,
    claimedNote:
      "Ta osoba potwierdziła, że to ona. Od teraz sama poprawia swoje dane; Ty zmieniasz tylko powiązania. Pole oznaczone jako ukryte widzi tylko ona.",
    hiddenMark: "ukryte przez tę osobę",
    declinedNote:
      "Ta osoba nie chce kontaktu. Widzisz ją tylko Ty; nie pokazujemy jej nikomu, kogo zaprosisz, i nigdy nie dopasujemy jej do innego drzewa.",
  },
  invitation: {
    lede: "Ktoś wpisał Cię do swojego prywatnego drzewa rodzinnego. To wszystko, co o Tobie zapisał. Nic więcej z drzewa nie zobaczysz, dopóki nie zdecydujesz.",
    yourRow: "Twój wpis",
    parents: "Rodzice, jak ich zapisano",
    noParents: "Rodziców nie wpisano.",
    question: "Czy to Ty?",
    me: "To ja",
    notMe: "To nie ja",
    noContact: "Nie chcę kontaktu",
    explain: [
      "„To ja”: karta staje się Twoja. Sam poprawiasz swoje dane, możesz ukryć rok i miejsce urodzenia oraz nazwisko rodowe i w każdej chwili możesz odejść z drzewa.",
      "„To nie ja”: właściciel dowie się, że to nie Ty, i nie zaprosi tego adresu ponownie.",
      "„Nie chcę kontaktu”: jak wyżej, a Twój wpis widzi od teraz tylko właściciel; nikt inny i żadne dopasowanie.",
      "Właściciel dowie się tylko, co odpowiedziałeś. Nie dowie się, czy otworzyłeś wiadomość.",
    ],
    missing: "Ten link nie prowadzi do zaproszenia. Sprawdź, czy skopiowałeś go w całości.",
  },
  cards: {
    lede: "Karty, które potwierdziłeś w cudzych drzewach. Każdą poprawiasz sam i z każdej możesz odejść.",
    none: "Nie potwierdziłeś jeszcze żadnej karty. Karta pojawi się tu, gdy ktoś Cię zaprosi i odpowiesz „to ja”.",
    claimed: "potwierdzono",
    dashboardLink: (n) =>
      n === 1 ? "Twoja karta w cudzym drzewie" : `Twoje karty w cudzych drzewach (${n})`,
  },
  card: {
    lede: "To Twój wpis w cudzym drzewie. Popraw, co chcesz; zaznacz, czego właściciel i zaproszeni mają nie widzieć.",
    parents: "Rodzice, jak ich zapisał właściciel",
    noParents: "Rodziców nie wpisano.",
    hideHeading: "Ukryj przed innymi",
    hide: {
      birth_year: "Rok urodzenia",
      birth_place: "Miejsce urodzenia",
      birth_surname: "Nazwisko rodowe",
    },
    hideHint: "Ukryte pole zostaje w Twojej karcie. Inni widzą tylko, że jest ukryte.",
    save: "Zapisz",
    leaveHeading: "Odejdź z drzewa",
    leaveLede:
      "Twoja karta wraca do notatki właściciela, bez tego, co ukryłeś. Ten adres nie dostanie już zaproszenia do tego drzewa.",
    leaveConfirm: "Rozumiem. Chcę odejść z tego drzewa.",
    leaveSubmit: "Odejdź",
  },
  consent: {
    lede: "Jeśli tak, wpisujesz ją do prywatnej części drzewa. Zanim ją zapiszemy:",
    points: [
      "Widzisz ją tylko Ty.",
      "Nigdy nie bierze udziału w dopasowaniach z cudzymi drzewami.",
      "Bez roku zgonu traktujemy osobę jako żyjącą.",
      "Odpowiadasz za to, że masz prawo wpisać jej dane.",
    ],
    check: "Mam prawo wpisać dane tej osoby i akceptuję ",
    termsBefore: "",
    termsLink: "regulamin w części o drzewie",
    termsAfter: ".",
    submit: "Zapisz osobę",
    cancel: "Wróć bez zapisywania",
  },
  status: {
    trees: {
      "tree-deleted": ok("Drzewo usunięte."),
      "not-found": problem("Nie ma takiego drzewa albo nie masz do niego dostępu."),
      forbidden: problem("Nie możesz tego zmienić w tym drzewie."),
      title: problem("Nazwa drzewa: od 1 do 120 znaków."),
      error: problem(PL_PROBLEMS.error),
    },
    consent: {
      terms: problem("Żeby zapisać osobę żyjącą, potwierdź, że masz prawo wpisać jej dane."),
      error: problem(PL_PROBLEMS.error),
    },
    tree: {
      added: ok("Osoba jest w drzewie."),
      "person-deleted": ok("Osoba usunięta z drzewa."),
      "person-limit": {
        text: "Darmowe drzewo mieści 5 osób i to drzewo jest pełne. Więcej osób odblokuje każdy płatny pakiet; pakiety będą dostępne wkrótce. Nic nie zostało zapisane.",
        tone: "problem",
        offer: "Zobacz ofertę",
      },
      "not-found": problem("Nie ma takiej osoby w tym drzewie."),
      confirm: problem("Zaznacz potwierdzenie, żeby usunąć drzewo."),
      root: ok("Rodowód zaczyna się teraz od tej osoby."),
      unlinked: problem(
        "Osoba jest w drzewie, ale nie została połączona: dziecko ma już dwoje rodziców albo powstałoby koło. Połącz ją na karcie osoby.",
      ),
      forbidden: problem("Nie możesz tego zmienić w tym drzewie."),
      error: problem(PL_PROBLEMS.error),
    },
    add: personProblems(PL_PROBLEMS),
    constellation: {},
    map: {},
    person: {
      saved: ok("Zapisano."),
      linked: ok("Rodzic połączony."),
      "parent-removed": ok("Powiązanie usunięte."),
      confirm: problem("Zaznacz potwierdzenie, żeby usunąć osobę."),
      "same-person": problem("Osoba nie może być własnym rodzicem."),
      "too-many-parents": problem("Ta osoba ma już dwoje rodziców."),
      "role-taken": problem("Ta osoba ma już zapisanego rodzica w tej roli."),
      "would-cycle": problem("Nikt nie może być własnym przodkiem."),
      "not-found": problem("Nie ma takiej osoby w tym drzewie."),
      forbidden: problem("Nie możesz tego zmienić w tym drzewie."),
      "claimed-row": problem(
        "Ta osoba potwierdziła swoją kartę i sama poprawia swoje dane. Możesz zmieniać tylko powiązania.",
      ),
      invited: ok("Zaproszenie wysłane. Dowiesz się, co ta osoba odpowie."),
      "invite-email": problem("Wpisz poprawny adres e-mail."),
      "invite-consent": problem(
        "Potwierdź, że ta osoba wie o przekazaniu adresu i zgadza się na to.",
      ),
      "invite-mail": problem(
        "Nie udało się wysłać wiadomości. Zaproszenie nie zostało zapisane. Spróbuj za chwilę.",
      ),
      "not-living": problem("Zaprosić można tylko osobę żyjącą."),
      minor: problem("Osoby, która według roku urodzenia ma mniej niż 18 lat, nie zapraszamy."),
      claimed: problem("Ta osoba już potwierdziła swoją kartę."),
      declined: problem("Ta osoba nie chce kontaktu. Nie zaprosisz jej ponownie."),
      suppressed: problem(
        "Ten adres odpowiedział już, że to nie ta osoba albo że nie chce kontaktu. Nie zaprosisz go ponownie.",
      ),
      pending: problem(
        "Zaproszenie dla tej osoby jest jeszcze ważne. Poczekaj, aż odpowie albo wygaśnie.",
      ),
      limit: problem(
        "Z jednego drzewa można wysłać dziesięć zaproszeń na 30 dni. Ten limit jest wyczerpany.",
      ),
      ...personProblems(PL_PROBLEMS),
    },
    invitation: {
      answer: problem("Wybierz jedną z trzech odpowiedzi."),
      expired: problem("To zaproszenie wygasło. Osoba, która je wysłała, może wysłać nowe."),
      answered: problem("Na to zaproszenie już odpowiedziano."),
      "not-found": problem(
        "Ten link nie prowadzi do zaproszenia. Sprawdź, czy skopiowałeś go w całości.",
      ),
      "already-claimed": problem("Tę kartę potwierdził już ktoś inny."),
      "already-in-tree": problem(
        "Masz już potwierdzoną kartę w tym drzewie. Jedno konto to jedna osoba.",
      ),
      error: problem(PL_PROBLEMS.error),
    },
    cards: {
      "not-me": ok(
        "Dziękujemy. Właściciel drzewa dowie się, że to nie Ty, i nie zaprosi tego adresu ponownie.",
      ),
      "no-contact": ok(
        "Dziękujemy. Właściciel drzewa dowie się, że nie chcesz kontaktu. Twój wpis widzi od teraz tylko on.",
      ),
      left: ok("Odszedłeś z drzewa. Twoja karta wróciła do notatki właściciela."),
      "not-found": problem("Nie ma takiej karty albo nie jest Twoja."),
      error: problem(PL_PROBLEMS.error),
    },
    card: {
      claimed: ok("To Twoja karta. Od teraz tylko Ty ją poprawiasz."),
      saved: ok("Zapisano."),
      confirm: problem("Zaznacz potwierdzenie, żeby odejść z drzewa."),
      "hidden-fields": problem(
        "Można ukryć tylko rok urodzenia, miejsce urodzenia i nazwisko rodowe.",
      ),
      "not-found": problem("Nie ma takiej karty albo nie jest Twoja."),
      forbidden: problem("Nie możesz tego zmienić."),
      ...personProblems(PL_PROBLEMS),
    },
  },
};

const EN: TreeText = {
  nav: "Trees",
  landing: {
    title: "Family tree",
    eyebrow: "Family tree · the Surname and family tier",
    heading: "Build a tree. One question at a time.",
    lede: "A private tree from what your family remembers. You enter it. The site adds nothing and guesses nothing.",
    yourTrees: "Your trees",
    signUp: "Create an account",
    signIn: "Sign in",
    needsAccount: "The tree needs an account: once signed in, only you see it.",
    sample: {
      figure:
        "A sample pedigree: rows of generations recede to the horizon, from great-grandparents at the back to you in front; an empty place is the next question.",
      caption:
        "Sample data · invented people · the farther, the smaller: distance in generations, not importance",
      generations: ["You", "Parents", "Grandparents", "Great-grandparents"],
      question: "Who was the mother?",
      empty: "no data",
      living: "Living · private",
      deceased: "Deceased",
      about: "c.",
      alive: "living",
    },
    why: {
      eyebrow: "Why",
      heading: "A surname is not a family.",
      sub: "The atlas speaks about the surname. The tree speaks about your people.",
      paragraphs: [
        "What parents and grandparents remember is usually lost within one generation. The tree is there to write it down before it goes, and to keep it in one place, beside the facts about the surname.",
        "Instead of a blank form you get one question per screen: who was the mother, who was the father. You answer what you know.",
      ],
      pull: "An empty place is a question, not an error.",
    },
    what: {
      eyebrow: "What you can do",
      heading: "One question. One person.",
      items: [
        "Start from yourself, or from an ancestor you remember.",
        "Add parents one question at a time: given names, surname, birth surname, year of birth (also “about”), place of birth from the TERYT register.",
        "Mark whether a person is living. Without a year of death they count as living.",
        "See the pedigree: four generations, empty places as questions.",
        "Correct any person, link them to others, delete them or the whole tree.",
        "Download everything you entered, at any time.",
      ],
      demo: {
        figure: "One question per screen: a mock-up of the form, as it looks on a phone.",
        tree: "The Zieliński family",
        privateChip: "Private",
        progress: "Generation 2 of 4",
        step: "Generation II · Andrzej's mother",
        heading: "What do you know about her?",
        given: "Given name",
        givenValue: "Halina",
        year: "Year of birth",
        yearValue: "1937",
        about: "About",
        place: "Place of birth",
        placeValue: "Szcze",
        matches: [
          ["Szczebrzeszyn", "zamojski · lubelskie"],
          ["Szczecinek", "szczecinecki · zachodniopomorskie"],
        ],
        livingQuestion: "Is Halina living?",
        living: ["Living", "Deceased", "I do not know"],
        submit: "Add to the tree",
        caption: "Sample data · mock-up",
      },
    },
    who: {
      eyebrow: "Who sees it",
      heading: "Only you.",
      items: [
        "The tree is private from the first person.",
        "Living people never enter any matching with other people's trees.",
        "People you invite see the deceased; the living only when you turn that on for them.",
        "The tree lives as long as your account. You delete it yourself.",
      ],
      othersSee: "Others see",
      youSee: "You see",
      hiddenChip: "Hidden person",
      livingChip: "Living · private",
      caption: "Sample data · invented people",
    },
    plans: {
      eyebrow: "What comes next",
      heading: "Planned.",
      items: [
        ["Constellation", "ancestors as stars"],
        ["Map of birthplaces", "TERYT on the map of Poland"],
        ["Invitations for the family", "the deceased for all, the living with your consent"],
        ["Connecting trees", "through the deceased only"],
        ["Identity verification", "mObywatel · bank"],
      ],
      note: "None of it changes the rule: living people are seen by you alone.",
    },
    cta: { eyebrow: "Family tree · the Surname and family tier", heading: "Start from yourself." },
    offer: { before: "Part of the ", link: "Surname and family", after: " tier." },
  },
  headings: {
    trees: "Your trees",
    consent: "Is this person living?",
    tree: "Pedigree",
    constellation: "Constellation",
    map: "Map",
    add: "Add a person",
    person: "Person",
    invitation: "Invitation",
    cards: "Your cards",
    card: "Your card",
  },
  dashboard: {
    lede: "Private until you invite someone. Living people are seen by you alone.",
    none: "You have no tree yet. Start from yourself, or from an ancestor you remember.",
    open: "Open",
    people: (n) => (n === 1 ? "1 person" : `${n} people`),
    role: { OWNER: "Yours", EDITOR: "You edit", VIEWER: "You view" },
    changed: "changed",
    newTree: "New tree",
    title: "Name of the tree",
    titleHint: "The family's surname, for example. Only you see it.",
    create: "Start",
    privacyHeading: "Who sees what",
    privacy: [
      "Living people are seen by you alone. Without a year of death a person counts as living.",
      "People you invite see the deceased. The living only when you turn that on for them.",
      "We never match living people against other people's trees.",
    ],
    rules: "The rules on living people",
  },
  question: {
    heading: "Next question",
    start: "Start from yourself.",
    startLede: "One question per screen. Empty places stay empty. We do not guess.",
    ask: (role) => (role === "MOTHER" ? "Who was the mother?" : "Who was the father?"),
    complete: "Four generations filled. The rest is corrected on a person's card.",
    answer: "Answer",
    skip: "Skip. I will come back.",
    emptyIsFine: "If you do not know, leave it empty. We do not guess for you.",
  },
  pedigree: {
    lede: "Four generations from the person the tree starts with. An empty place is a question, not an error.",
    generation: ["You", "Parents", "Grandparents", "Great-grandparents"],
    empty: (role) => (role === "MOTHER" ? "Add the mother" : "Add the father"),
    hidden: "Hidden person",
    hiddenCount: (n) =>
      n === 1
        ? "1 living person is hidden: the tree's owner has not shared them."
        : `${n} living people are hidden: the tree's owner has not shared them.`,
    unplaced: "Outside the pedigree",
    addPerson: "Add a person",
    addFirst: "Start from yourself",
    living: "Living · private",
    deceased: "Deceased",
    unknown: "No year of death · private",
    entered: "Entered by you",
    added: (name) => `${name} is in the tree.`,
    viewer: "You are viewing this tree. Its owner changes it.",
    exportLink: "Download the tree (JSON)",
    exportHint:
      "A file of what you see: the people, the links, the places as TERYT codes. Every download is recorded in the tree's history.",
    deleteHeading: "Delete the tree",
    deleteLede:
      "The tree, everyone in it, the links and the record of changes go at once, and this cannot be undone.",
    deleteConfirm: "I understand. Delete this tree for good.",
    deleteSubmit: "Delete the tree",
    back: "All trees",
  },
  constellation: {
    lede: "The same four generations as a constellation: you at the bottom, the ancestors higher up. Pick a star to see the person.",
    viewsLabel: "View of the tree",
    views: { tree: "Pedigree", constellation: "Constellation", map: "Map" },
    skyLabel: "The tree as a constellation",
    arcLabel: (generation) =>
      `Generation ${["I", "II", "III", "IV"][generation] ?? generation + 1}`,
    kind: {
      source: "from a source",
      entered: "entered by you",
      living: "living, private",
      hidden: "hidden person",
      empty: "empty place",
    },
    emptyName: "Add",
    noneName: "None",
    hiddenName: "Hidden",
    emptySub: "no data",
    legend: {
      source: "From a source",
      entered: "Entered by you",
      living: "Living, private",
      empty: "No data",
    },
    note: "Light means a source, not certainty. Empty places stay empty.",
    outside: (n) =>
      n === 1 ? "1 person outside the pedigree." : `${n} people outside the pedigree.`,
    outsideLink: "See them in the pedigree",
    panel: {
      heading: "Person",
      emptyHeading: "No data.",
      emptyText:
        "Nobody has been entered here. An empty place stays empty until you add a person from what you know or from a document.",
      hiddenHeading: "Hidden person.",
      hiddenText: "The tree's owner has not shared this person.",
      birth: "Birth",
      birthSurname: "Birth surname",
      death: "Death",
      source: "How you know",
      sourceChip: "From a source",
      livingNote: "Only you see this person. They take no part in matching with other trees.",
      edit: "Edit",
    },
  },
  map: {
    lede: "The birthplaces of the people in the tree on the map of Poland, by voivodeship from the TERYT register. Pick a person to see their voivodeship.",
    mapLabel: "The tree on the map",
    railLabel: "People by generation",
    note: "A mark is the voivodeship a person in the tree was born in. A line joins a child to a parent when they were born in different voivodeships.",
    offMap: (n) =>
      n === 1
        ? "1 person is not on the map: no locality from the TERYT register."
        : `${n} people are not on the map: no locality from the TERYT register.`,
    offMapItem: "off the map",
    noPlace: "no birthplace",
    regionLabel: (name, n) => `${name}: ${n === 1 ? "1 person" : `${n} people`}`,
    card: {
      heading: "Picked person",
      birth: "Birth",
    },
  },
  form: {
    roleHeading: (role) => (role === "MOTHER" ? "Mother" : "Father"),
    whatHeading: (role) =>
      role === "MOTHER" ? "What do you know about her?" : "What do you know about him?",
    parentsHeading: "Who were the parents?",
    parentsLede: "Add as much as you know. Leave the rest empty.",
    chooseRole: (role) => (role === "MOTHER" ? "Mother" : "Father"),
    firstHeading: "Start from yourself.",
    firstLede:
      "The first person is where the tree starts: generations are counted from them. You can start from an ancestor if you prefer.",
    anyHeading: "Add a person",
    given: "Given name(s)",
    surname: "Surname",
    birthSurname: "Birth surname (if different)",
    birthYear: "Year of birth",
    approx: "About",
    place: "Place of birth",
    placeHint: "Type a name and look it up in the TERYT register, or leave it as it is.",
    search: "Look up in TERYT",
    matches: "Localities in the TERYT register",
    keepTyped: "Keep the name as typed",
    noMatch: "No such locality in TERYT. The name stays as typed.",
    unavailable: "The register of localities is unavailable right now. The name stays as typed.",
    livingHeading: "Is this person living?",
    living: { LIVING: "Living", DECEASED: "Deceased", UNKNOWN: "I do not know" },
    livingHint: "Without a year of death a person counts as living: only you see them.",
    deathYear: "Year of death",
    sourceNote: "How do you know?",
    sourceHint:
      "Memory, a document, someone's account. It changes nothing but the mark on the person.",
    notes: "Notes",
    add: "Add to the tree",
    save: "Save",
    yourParent: (role, name) => `${role === "MOTHER" ? "Mother" : "Father"}: ${name}`,
  },
  person: {
    lede: "Correct what you know better. An empty field stays empty.",
    parents: "Parents",
    noParents: "No parents entered yet.",
    hiddenParents: (n) => (n === 1 ? "1 parent hidden." : `${n} parents hidden.`),
    unlink: "Remove the link",
    link: "Link",
    linkWho: "A person in the tree",
    linkRole: "As",
    roles: { MOTHER: "mother", FATHER: "father", PARENT: "parent" },
    addParent: (role) => (role === "MOTHER" ? "Add the mother" : "Add the father"),
    setRoot: "Start the pedigree from this person",
    isRoot: "The pedigree starts from this person.",
    deleteHeading: "Delete the person",
    deleteConfirm: "I understand. This person leaves the tree with their links.",
    deleteSubmit: "Delete the person",
  },
  invite: {
    heading: "Invite this person",
    lede: "One message, at your request. It names you, not them: no name, date or place. No reminders.",
    email: "This person's email address",
    consent: "This person knows I am passing on their address and agrees to it.",
    send: "Send the invitation",
    pending: (sent, until) =>
      `Invitation sent ${sent}, valid until ${until}. You will not learn whether it was opened.`,
    answered: {
      ME: (when) => `This person confirmed their card ${when}.`,
      NOT_ME: (when) =>
        `Answer from ${when}: not this person. You cannot invite that address again.`,
      NO_CONTACT: (when) =>
        `Answer from ${when}: no contact wanted. You cannot invite that address again.`,
    },
    expired: (sent) =>
      `The invitation of ${sent} expired without an answer. You can send a new one.`,
    claimedNote:
      "This person confirmed it is them. From now on they correct their own data; you change only the relationships. A field marked as hidden is seen by them alone.",
    hiddenMark: "hidden by this person",
    declinedNote:
      "This person wants no contact. You alone see them; we show them to nobody you invite, and never match them with another tree.",
  },
  invitation: {
    lede: "Someone entered you in their private family tree. This is everything they wrote about you. You see nothing else of the tree until you decide.",
    yourRow: "Your entry",
    parents: "Parents, as written",
    noParents: "No parents were entered.",
    question: "Is this you?",
    me: "It is me",
    notMe: "It is not me",
    noContact: "I want no contact",
    explain: [
      '"It is me": the card becomes yours. You correct your own data, you may hide the year and place of birth and the birth surname, and you can leave the tree at any time.',
      '"It is not me": the owner learns it is not you and cannot invite this address again.',
      '"I want no contact": as above, and from now on the owner alone sees your entry; nobody else, and no matching.',
      "The owner learns only what you answered. They do not learn whether you opened the message.",
    ],
    missing: "This link does not lead to an invitation. Check that you copied all of it.",
  },
  cards: {
    lede: "The cards you confirmed in other people's trees. You correct each yourself and can leave any of them.",
    none: 'You have not confirmed a card yet. One appears here when someone invites you and you answer "it is me".',
    claimed: "confirmed",
    dashboardLink: (n) =>
      n === 1 ? "Your card in someone else's tree" : `Your cards in other people's trees (${n})`,
  },
  card: {
    lede: "This is your entry in someone else's tree. Correct what you like; tick what the owner and the invited should not see.",
    parents: "Parents, as the owner wrote them",
    noParents: "No parents were entered.",
    hideHeading: "Hide from others",
    hide: {
      birth_year: "Year of birth",
      birth_place: "Place of birth",
      birth_surname: "Birth surname",
    },
    hideHint: "A hidden field stays in your card. Others see only that it is hidden.",
    save: "Save",
    leaveHeading: "Leave the tree",
    leaveLede:
      "Your card returns to the owner's note, without what you hid. This address will get no further invitation to this tree.",
    leaveConfirm: "I understand. I want to leave this tree.",
    leaveSubmit: "Leave",
  },
  consent: {
    lede: "If so, you are entering them into the private part of the tree. Before we save them:",
    points: [
      "Only you see them.",
      "They never take part in matching against other people's trees.",
      "Without a year of death a person counts as living.",
      "You are responsible for having the right to enter their data.",
    ],
    check: "I have the right to enter this person's data and I accept ",
    termsBefore: "",
    termsLink: "the terms' section on the tree",
    termsAfter: ".",
    submit: "Save the person",
    cancel: "Go back without saving",
  },
  status: {
    trees: {
      "tree-deleted": ok("Tree deleted."),
      "not-found": problem("There is no such tree, or you have no access to it."),
      forbidden: problem("You cannot change that in this tree."),
      title: problem("Name of the tree: 1 to 120 characters."),
      error: problem(EN_PROBLEMS.error),
    },
    consent: {
      terms: problem(
        "To save a living person, confirm that you have the right to enter their data.",
      ),
      error: problem(EN_PROBLEMS.error),
    },
    tree: {
      added: ok("The person is in the tree."),
      "person-deleted": ok("Person removed from the tree."),
      "person-limit": {
        text: "A free tree holds 5 people, and this one is full. Any paid tier unlocks more; the tiers are coming soon. Nothing was saved.",
        tone: "problem",
        offer: "See the offer",
      },
      "not-found": problem("There is no such person in this tree."),
      confirm: problem("Tick the confirmation to delete the tree."),
      root: ok("The pedigree now starts from this person."),
      unlinked: problem(
        "The person is in the tree but was not linked: the child already has two parents, or it would make a loop. Link them on the person's card.",
      ),
      forbidden: problem("You cannot change that in this tree."),
      error: problem(EN_PROBLEMS.error),
    },
    add: personProblems(EN_PROBLEMS),
    constellation: {},
    map: {},
    person: {
      saved: ok("Saved."),
      linked: ok("Parent linked."),
      "parent-removed": ok("Link removed."),
      confirm: problem("Tick the confirmation to delete the person."),
      "same-person": problem("A person cannot be their own parent."),
      "too-many-parents": problem("This person already has two parents."),
      "role-taken": problem("This person already has a parent in that role."),
      "would-cycle": problem("Nobody can be their own ancestor."),
      "not-found": problem("There is no such person in this tree."),
      forbidden: problem("You cannot change that in this tree."),
      "claimed-row": problem(
        "This person confirmed their card and corrects their own data. You can change only the relationships.",
      ),
      invited: ok("Invitation sent. You will learn what this person answers."),
      "invite-email": problem("Enter a valid email address."),
      "invite-consent": problem(
        "Confirm that this person knows about passing on the address and agrees to it.",
      ),
      "invite-mail": problem(
        "The message could not be sent. The invitation was not saved. Try again in a moment.",
      ),
      "not-living": problem("Only a living person can be invited."),
      minor: problem("We do not invite a person who is under 18 by their year of birth."),
      claimed: problem("This person has already confirmed their card."),
      declined: problem("This person wants no contact. You cannot invite them again."),
      suppressed: problem(
        "This address has already answered that it is not this person, or that they want no contact. You cannot invite it again.",
      ),
      pending: problem(
        "The invitation for this person is still valid. Wait for the answer or for it to expire.",
      ),
      limit: problem("One tree can send ten invitations per 30 days. That limit is used up."),
      ...personProblems(EN_PROBLEMS),
    },
    invitation: {
      answer: problem("Choose one of the three answers."),
      expired: problem("This invitation has expired. The person who sent it can send a new one."),
      answered: problem("This invitation has already been answered."),
      "not-found": problem(
        "This link does not lead to an invitation. Check that you copied all of it.",
      ),
      "already-claimed": problem("Someone else has already confirmed this card."),
      "already-in-tree": problem(
        "You already have a confirmed card in this tree. One account is one person.",
      ),
      error: problem(EN_PROBLEMS.error),
    },
    cards: {
      "not-me": ok(
        "Thank you. The tree's owner will learn it is not you and cannot invite this address again.",
      ),
      "no-contact": ok(
        "Thank you. The tree's owner will learn you want no contact. From now on they alone see your entry.",
      ),
      left: ok("You left the tree. Your card returned to the owner's note."),
      "not-found": problem("There is no such card, or it is not yours."),
      error: problem(EN_PROBLEMS.error),
    },
    card: {
      claimed: ok("This is your card. From now on you alone correct it."),
      saved: ok("Saved."),
      confirm: problem("Tick the confirmation to leave the tree."),
      "hidden-fields": problem(
        "Only the year of birth, the place of birth and the birth surname can be hidden.",
      ),
      "not-found": problem("There is no such card, or it is not yours."),
      forbidden: problem("You cannot change that."),
      ...personProblems(EN_PROBLEMS),
    },
  },
};

export const TREE_TEXT: Readonly<Record<Lang, TreeText>> = { pl: PL, en: EN };

/** The words for a status word on a page, or null for an unknown one. */
export function treeStatusWords(
  lang: Lang,
  page: TreePage,
  word: string | null,
): StatusWords | null {
  if (word === null) return null;
  const map = TREE_TEXT[lang].status[page];
  return Object.hasOwn(map, word) ? (map[word] ?? null) : null;
}

/** A page's status word for a service problem (`GIVEN_NAMES` → `given-names`). */
export function problemWord(problem: string): string {
  return problem.toLowerCase().replaceAll("_", "-");
}

/** The years a card shows: "1937 – 2015", "ok. 1906 –", "1991 · żyje". */
export function yearsLine(person: TreePersonRead, lang: Lang): string {
  const t = TREE_TEXT[lang];
  const about = lang === "pl" ? "ok. " : "c. ";
  const birth =
    person.birth.year === null ? "" : `${person.birth.approx ? about : ""}${person.birth.year}`;
  const death =
    person.death.year === null ? "" : `${person.death.approx ? about : ""}${person.death.year}`;
  if (death !== "") return `${birth === "" ? "?" : birth} – ${death}`;
  if (person.living_status === "LIVING")
    return birth === "" ? t.form.living.LIVING : `${birth} · ${t.form.living.LIVING.toLowerCase()}`;
  if (person.living_status === "DECEASED")
    return birth === "" ? t.pedigree.deceased : `${birth} – ?`;
  return birth;
}

/** The chip a card carries for the person's status. */
export function statusChip(
  person: TreePersonRead,
  lang: Lang,
): { readonly text: string; readonly kind: "living" | "deceased" } {
  const t = TREE_TEXT[lang];
  if (person.living_status === "DECEASED") return { text: t.pedigree.deceased, kind: "deceased" };
  if (person.living_status === "LIVING") return { text: t.pedigree.living, kind: "living" };
  return { text: t.pedigree.unknown, kind: "living" };
}
