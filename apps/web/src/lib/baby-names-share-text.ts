import type { Lang } from "./messages.js";

/**
 * The baby-names share cards' and share sheet's words (TASK-152), in Polish
 * and English.
 *
 * Plain, and nothing beyond the data: a count, a rank on one year's list, a
 * direction, the register's count. No "popular", no "rare". Every number the
 * functions below put in a sentence comes in as a string the page's
 * formatters wrote from a claim or a list's stored figure; none is written here.
 */

type Sex = "MALE" | "FEMALE";

export interface BabyNamesShareText {
  // --- the cards ---
  readonly brand: string;
  /** The story card's header eyebrow: "IMIONA DLA DZIECKA". */
  readonly sectionEyebrow: string;
  /** "IMIĘ DLA DZIEWCZYNKI · ROK 2025" (story); "DZIEWCZYNKA · 2025" (square). */
  readonly nameEyebrow: (sex: Sex, year: number) => string;
  readonly squareEyebrow: (sex: Sex, year: number) => string;
  /** The paid card's name eyebrow: "IMIĘ DLA DZIEWCZYNKI". */
  readonly paidNameEyebrow: (sex: Sex) => string;
  /** "dziewczynek dostało to imię w 2025 r." */
  readonly countLine: (sex: Sex, year: number) => string;
  /** The square card's two lines beside the count. */
  readonly squareCountLines: (sex: Sex, year: number) => readonly [string, string];
  /** "Nr 1" */
  readonly rankFigure: (rank: string) => string;
  /** "z 939 imion na liście" (story); "z 939 imion" (square). */
  readonly rankOf: (of: string) => string;
  readonly rankOfShort: (of: string) => string;
  /** "1 na 27" */
  readonly oneIn: (n: string) => string;
  /** "dziewczynek z listy" */
  readonly oneInNoun: Readonly<Record<Sex, string>>;
  /** The direction tile's word. */
  readonly directions: Readonly<Record<"RISING" | "STEADY" | "FALLING", string>>;
  /** "4,0% → 3,7% · 2020→2025"; the earlier side reads "poniżej progu" when absent. */
  readonly sharesLine: (
    earlier: string,
    latest: string,
    earlierYear: number,
    latestYear: number,
  ) => string;
  readonly belowThreshold: string;
  /** The square card's direction caption: "2020 → 2025". */
  readonly yearsLine: (earlierYear: number, latestYear: number) => string;
  /** "Dziś 360 466 kobiet w Polsce ma to imię" */
  readonly registerLine: (count: string, sex: Sex) => string;
  /** "14. miejsce z 28 781" */
  readonly registerRank: (rank: string, of: string) => string;
  /** "PESEL · dane.gov.pl, zbiór 219 · lista 2025, rejestr 20 stycznia 2026 r." */
  readonly sourceLine: (list: string, register: string | null) => string;
  /** "lista 2025" / "listy 2000–2025" */
  readonly listWord: (year: number) => string;
  readonly listsWord: (first: number, latest: number) => string;
  readonly privacyLine: string;
  /** The site's address when the request names no host. */
  readonly hostFallback: string;
  // --- the paid card ---
  /** "ROK PO ROKU · 2000–2025" */
  readonly paidEyebrow: (first: number, latest: number) => string;
  /** "×4,8" and its wording; `more` is latest ≥ first. */
  readonly times: (factor: string) => string;
  readonly timesWording: (more: boolean, year: number) => string;
  /** "2017 · najwięcej · 3. miejsce"; the place reads "—" without a rank claim. */
  readonly calloutLine: (year: number, peak: boolean, place: string) => string;
  readonly placeShort: (rank: string) => string;
  readonly noPlace: string;
  readonly ladderHeading: string;
  /** The ladder's rung: "44." */
  readonly rung: (rank: string) => string;
  /** "Numer 1 w 2022, 2023 i 2025 r." */
  readonly topYears: (years: readonly number[]) => string;
  // --- the share sheet ---
  readonly sheetTitle: string;
  readonly sheetBack: (name: string) => string;
  readonly pickerLabel: string;
  readonly basicCard: string;
  readonly basicPrice: string;
  readonly paidCard: string;
  readonly paidPrice: string;
  /** The locked option's mark; the page's "Wkrótce" rule (ADR-0023 §2.5). */
  readonly locked: string;
  readonly formatLabel: string;
  readonly story: string;
  readonly square: string;
  readonly storyOnly: string;
  readonly previewAlt: (name: string, sex: Sex) => string;
  readonly share: string;
  readonly save: string;
  readonly copy: string;
  readonly working: string;
  readonly shared: string;
  readonly saved: string;
  readonly cancelled: string;
  readonly copied: string;
  readonly copyDenied: string;
  readonly failed: string;
  readonly signInAgain: string;
  readonly linkNote: string;
  readonly footerFree: string;
  readonly footerPaid: string;
  /** No card for this sex: the name is not on its latest list. */
  readonly noCard: string;
  readonly noName: string;
  readonly signedOut: string;
  readonly backToPage: string;
}

const NOUN = {
  pl: { MALE: "chłopców", FEMALE: "dziewczynek" },
  en: { MALE: "boys", FEMALE: "girls" },
} as const;

function joinYears(years: readonly number[], and: string): string {
  if (years.length <= 1) return years.join("");
  return `${years.slice(0, -1).join(", ")} ${and} ${String(years[years.length - 1])}`;
}

export const BABY_NAMES_SHARE_TEXT: Readonly<Record<Lang, BabyNamesShareText>> = {
  pl: {
    brand: "Name Atlas",
    sectionEyebrow: "IMIONA DLA DZIECKA",
    nameEyebrow: (sex, year) =>
      `IMIĘ DLA ${sex === "MALE" ? "CHŁOPCA" : "DZIEWCZYNKI"} · ROK ${year}`,
    squareEyebrow: (sex, year) => `${sex === "MALE" ? "CHŁOPIEC" : "DZIEWCZYNKA"} · ${year}`,
    paidNameEyebrow: (sex) => `IMIĘ DLA ${sex === "MALE" ? "CHŁOPCA" : "DZIEWCZYNKI"}`,
    countLine: (sex, year) => `${NOUN.pl[sex]} dostało to imię w ${year} r.`,
    squareCountLines: (sex, year) => [NOUN.pl[sex], `w ${year} r.`],
    rankFigure: (rank) => `Nr ${rank}`,
    rankOf: (of) => `z ${of} imion na liście`,
    rankOfShort: (of) => `z ${of} imion`,
    oneIn: (n) => `1 na ${n}`,
    oneInNoun: { MALE: "chłopców z listy", FEMALE: "dziewczynek z listy" },
    directions: { RISING: "Rośnie", STEADY: "Bez większej zmiany", FALLING: "Spada" },
    sharesLine: (earlier, latest, earlierYear, latestYear) =>
      `${earlier} → ${latest} · ${earlierYear}→${latestYear}`,
    belowThreshold: "poniżej progu",
    yearsLine: (earlierYear, latestYear) => `${earlierYear} → ${latestYear}`,
    registerLine: (count, sex) =>
      `Dziś ${count} ${sex === "MALE" ? "mężczyzn" : "kobiet"} w Polsce ma to imię`,
    registerRank: (rank, of) => `${rank}. miejsce z ${of}`,
    sourceLine: (list, register) =>
      `PESEL · dane.gov.pl, zbiór 219 · ${list}${register === null ? "" : `, rejestr ${register}`}`,
    listWord: (year) => `lista ${year}`,
    listsWord: (first, latest) => `listy ${first}–${latest}`,
    privacyLine: "Nic o Twoim dziecku, tylko o imieniu",
    hostFallback: "name-atlas.pl",
    paidEyebrow: (first, latest) => `ROK PO ROKU · ${first}–${latest}`,
    times: (factor) => `×${factor}`,
    timesWording: (more, year) => `${more ? "częściej" : "rzadziej"} niż w ${year} r.`,
    calloutLine: (year, peak, place) =>
      [String(year), peak ? "najwięcej" : null, place].filter((x) => x !== null).join(" · "),
    placeShort: (rank) => `${rank}. miejsce`,
    noPlace: "—",
    ladderHeading: "MIEJSCE NA LIŚCIE",
    rung: (rank) => `${rank}.`,
    topYears: (years) => `Numer 1 w ${joinYears(years, "i")} r.`,
    sheetTitle: "Udostępnij",
    sheetBack: (name) => name,
    pickerLabel: "Karta",
    basicCard: "Podstawowa",
    basicPrice: "za darmo",
    paidCard: "Rok po roku",
    paidPrice: "8,99 zł",
    locked: "Wkrótce",
    formatLabel: "Format",
    story: "Pionowa 9:16",
    square: "Kwadrat 1:1",
    storyOnly: "Karta „Rok po roku” jest tylko pionowa.",
    previewAlt: (name, sex) =>
      `Karta do udostępnienia: ${name}, ${sex === "MALE" ? "chłopcy" : "dziewczynki"}`,
    share: "Udostępnij",
    save: "Zapisz obraz",
    copy: "Kopiuj link",
    working: "Chwilę…",
    shared: "Udostępniono.",
    saved: "Zapisano obraz.",
    cancelled: "Nie udostępniono.",
    copied: "Skopiowano link.",
    copyDenied: "Nie udało się skopiować. Link do skopiowania ręcznie:",
    failed: "Nie udało się pobrać obrazu.",
    signInAgain: "Zaloguj się ponownie",
    linkNote:
      "Link prowadzi do tej strony dla tego imienia i tej płci. Otwiera się po zalogowaniu.",
    footerFree: "Na karcie jest tylko to, co widać za darmo · Nic o Twoim dziecku, tylko o imieniu",
    footerPaid: "Na karcie są liczby z widoku „Rok po roku” · Nic o Twoim dziecku, tylko o imieniu",
    noCard: "Dla tej płci nie ma karty: imienia nie ma na ostatniej liście.",
    noName: "Wpisz imię na stronie Imiona dla dziecka, a przy wyniku znajdziesz „Udostępnij”.",
    signedOut: "Karty do udostępnienia są dla zalogowanych.",
    backToPage: "Wróć do imienia",
  },
  en: {
    brand: "Name Atlas",
    sectionEyebrow: "BABY NAMES",
    nameEyebrow: (sex, year) => `A ${sex === "MALE" ? "BOY'S" : "GIRL'S"} NAME · ${year}`,
    squareEyebrow: (sex, year) => `${sex === "MALE" ? "BOY" : "GIRL"} · ${year}`,
    paidNameEyebrow: (sex) => `A ${sex === "MALE" ? "BOY'S" : "GIRL'S"} NAME`,
    countLine: (sex, year) => `${NOUN.en[sex]} were given this name in ${year}`,
    squareCountLines: (sex, year) => [NOUN.en[sex], `in ${year}`],
    rankFigure: (rank) => `No. ${rank}`,
    rankOf: (of) => `of ${of} names on the list`,
    rankOfShort: (of) => `of ${of} names`,
    oneIn: (n) => `1 in ${n}`,
    oneInNoun: { MALE: "boys on the list", FEMALE: "girls on the list" },
    directions: { RISING: "Rising", STEADY: "Steady", FALLING: "Falling" },
    sharesLine: (earlier, latest, earlierYear, latestYear) =>
      `${earlier} → ${latest} · ${earlierYear}→${latestYear}`,
    belowThreshold: "below the cut-off",
    yearsLine: (earlierYear, latestYear) => `${earlierYear} → ${latestYear}`,
    registerLine: (count, sex) =>
      `Today ${count} ${sex === "MALE" ? "men" : "women"} in Poland have this name`,
    registerRank: (rank, of) => `place ${rank} of ${of}`,
    sourceLine: (list, register) =>
      `PESEL · dane.gov.pl, dataset 219 · ${list}${register === null ? "" : `, register ${register}`}`,
    listWord: (year) => `list ${year}`,
    listsWord: (first, latest) => `lists ${first}–${latest}`,
    privacyLine: "Nothing about your child, only about the name",
    hostFallback: "name-atlas.pl",
    paidEyebrow: (first, latest) => `YEAR BY YEAR · ${first}–${latest}`,
    times: (factor) => `×${factor}`,
    timesWording: (more, year) => `${more ? "more" : "less"} often than in ${year}`,
    calloutLine: (year, peak, place) =>
      [String(year), peak ? "most" : null, place].filter((x) => x !== null).join(" · "),
    placeShort: (rank) => `place ${rank}`,
    noPlace: "—",
    ladderHeading: "PLACE ON THE LIST",
    rung: (rank) => rank,
    topYears: (years) => `Number 1 in ${joinYears(years, "and")}.`,
    sheetTitle: "Share",
    sheetBack: (name) => name,
    pickerLabel: "Card",
    basicCard: "Basic",
    basicPrice: "free",
    paidCard: "Year by year",
    paidPrice: "8,99 zł",
    locked: "Coming soon",
    formatLabel: "Format",
    story: "Portrait 9:16",
    square: "Square 1:1",
    storyOnly: "The year-by-year card is portrait only.",
    previewAlt: (name, sex) => `Share card: ${name}, ${sex === "MALE" ? "boys" : "girls"}`,
    share: "Share",
    save: "Save image",
    copy: "Copy link",
    working: "One moment…",
    shared: "Shared.",
    saved: "Image saved.",
    cancelled: "Not shared.",
    copied: "Link copied.",
    copyDenied: "Could not copy. The link to copy by hand:",
    failed: "The image could not be fetched.",
    signInAgain: "Sign in again",
    linkNote: "The link opens this page for this name and sex. It opens after signing in.",
    footerFree:
      "The card shows only what the free view shows · Nothing about your child, only about the name",
    footerPaid:
      "The card shows the year-by-year view's figures · Nothing about your child, only about the name",
    noCard: "There is no card for this sex: the name is not on its latest list.",
    noName: "Type a name on the Baby names page; “Share” is beside the result.",
    signedOut: "Share cards are for signed-in readers.",
    backToPage: "Back to the name",
  },
};
