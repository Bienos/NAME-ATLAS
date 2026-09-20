/**
 * The words the free result page renders (TASK-017).
 *
 * Pure: strings in, strings out. No database, no React, no request. That is
 * deliberate — every honesty rule this page must keep is then a unit test
 * rather than a review comment, and the page itself becomes a layout.
 *
 * The sentences are **verbatim from `docs/contracts/surname-result.md`**, where
 * the project owner accepted them. They are not paraphrased here, and the rules
 * attached to them are not negotiable by a layout decision:
 *
 * - a count is exact and never says "about"; a rarity figure is rounded and
 *   always does;
 * - the two sex partitions are two sentences and are never summed;
 * - a regional figure is *permanent registered residence*, never where someone
 *   lives, comes from or originates;
 * - a below-threshold distribution says so **before** any figure.
 *
 * Nothing here computes a fact. Every number it formats arrives already derived,
 * already validated against the contract, and already carrying its own scope.
 */
import type { DistributionEntry, PopulationObservation, RarityEntry } from "@name-atlas/contracts";

export type Lang = "pl" | "en";

/** Polish is the default: `PRODUCT.md` §2's primary user is Polish. */
export function parseLang(value: string | null | undefined): Lang {
  return value === "en" ? "en" : "pl";
}

/**
 * Thousands-grouped integer, hand-rolled rather than via `Intl`.
 *
 * `Intl.NumberFormat` output for `pl-PL` varies with the runtime's ICU data —
 * it has shipped both a non-breaking space and a narrow non-breaking space as
 * the group separator. This repository already refuses to let a runtime upgrade
 * change what it renders or stores (see `packages/resolver/src/version.ts`), so
 * the separator is chosen here: a non-breaking space for Polish, a comma for
 * English. `docs/contracts/surname-result.md` requires "a space" for Polish, and
 * a non-breaking one is that, and will not wrap mid-number.
 */
export function formatInteger(value: number, lang: Lang): string {
  const digits = Math.trunc(Math.abs(value)).toString();
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end));
  }
  const sign = value < 0 ? "-" : "";
  return sign + groups.join(lang === "pl" ? " " : ",");
}

/** A share as a percentage to one decimal place, in the locale's own notation. */
export function formatPercent(share: number, lang: Lang): string {
  const fixed = (share * 100).toFixed(1);
  return lang === "pl" ? `${fixed.replace(".", ",")}%` : `${fixed}%`;
}

/** Polish months in the genitive, as the accepted rendering requires. */
const PL_MONTHS_GENITIVE = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
] as const;

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * An ISO date as the accepted rendering writes it. Never a portal timestamp and
 * never a retrieval time: the caller passes the observation's `snapshot_date`.
 *
 * Returns the input unchanged if it is not an ISO date, rather than inventing a
 * date. A missing or malformed date is a bug upstream, and a fabricated one here
 * would hide it.
 */
export function formatDate(iso: string, lang: Lang): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match as unknown as [string, string, string, string];
  const index = Number(month) - 1;
  if (index < 0 || index > 11) return iso;
  const dayNumber = String(Number(day));
  return lang === "pl"
    ? `${dayNumber} ${PL_MONTHS_GENITIVE[index]!} ${year} r.`
    : `${dayNumber} ${EN_MONTHS[index]!} ${year}`;
}

/**
 * The partition label, from the comparability group.
 *
 * Returns `null` for a group this does not recognise, and every sentence below
 * then omits the parenthetical rather than guessing. TASK-004 §14 U-1 records
 * that the publisher never states whether the split is by a person's sex or by
 * the grammatical gender of the surname form, so the label reports the resource
 * and asserts nothing further.
 */
export function partitionLabel(comparabilityGroup: string | null, lang: Lang): string | null {
  if (comparabilityGroup === null) return null;
  if (comparabilityGroup.endsWith("_male")) return lang === "pl" ? "mężczyźni" : "male";
  if (comparabilityGroup.endsWith("_female")) return lang === "pl" ? "kobiety" : "female";
  return null;
}

function parenthetical(label: string | null): string {
  return label === null ? "" : ` (${label})`;
}

/**
 * Ends a sentence with exactly one full stop.
 *
 * The Polish date form ends in `r.` — *20 stycznia 2026 r.* — and that period
 * terminates the sentence. A template that appended its own produced `r..`,
 * which a unit test caught. A malformed date is returned unchanged by
 * {@link formatDate} and does not end in a stop, so it still gets one.
 */
function terminate(sentence: string): string {
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

/**
 * The accepted count sentence. Exact, with its scope and date, never "about"
 * and never an estimate: the number is a count of records.
 */
export function populationSentence(
  observation: PopulationObservation,
  surname: string,
  lang: Lang,
): string {
  const value = observation.value.value;
  if (value === null) {
    // The contract permits a status other than KNOWN. A value is then absent,
    // and absence is stated, never rendered as zero (canonical/16 §26).
    return terminate(
      lang === "pl"
        ? `Liczba osób o nazwisku ${surname} nie jest podana w tym zbiorze na dzień ${formatDate(observation.snapshot_date, lang)}`
        : `No count for the surname ${surname} is published in this dataset for ${formatDate(observation.snapshot_date, lang)}`,
    );
  }
  const count = formatInteger(value, lang);
  const sex = parenthetical(partitionLabel(observation.comparability_group, lang));
  const date = formatDate(observation.snapshot_date, lang);
  return terminate(
    lang === "pl"
      ? `${count} osób było zarejestrowanych z nazwiskiem ${surname}${sex} w rejestrze PESEL na dzień ${date}`
      : `${count} people were registered with the surname ${surname}${sex} in the PESEL register on ${date}`,
  );
}

/**
 * The accepted rarity sentence. "About" / "około" is correct here and only here,
 * because `ONE_IN_X` is rounded. The denominator is the published universe and
 * the wording says so: never "of Poles" and never "in Poland".
 */
export function raritySentence(entry: RarityEntry, surname: string, lang: Lang): string {
  const x = formatInteger(entry.primary.value, lang);
  const sex = parenthetical(partitionLabel(entry.comparability_group, lang));
  const date = formatDate(entry.snapshot_date, lang);
  return terminate(
    lang === "pl"
      ? `Około 1 na ${x} osób ujętych w rejestrze PESEL${sex} nosiło nazwisko ${surname} na dzień ${date}`
      : `About 1 in ${x} people counted in the PESEL register${sex} bore the surname ${surname} on ${date}`,
  );
}

/**
 * The rank within one resource version, where a rank claim exists.
 *
 * Phrased so it needs no total, because the contract does not carry one: a
 * rarity entry's `denominator` is the published-universe **sum** (21,197,537
 * people), not the number of surnames ranked (408,182), and rendering "1 of
 * 21,197,537" would be false. "Ranked Nth among the surnames in this dataset"
 * is interpretable without the total, so this asks for nothing the payload does
 * not have. Exposing the rank's own universe size is an additive contract
 * change for whichever task wants "N of M".
 */
export function rankSentence(entry: RarityEntry, surname: string, lang: Lang): string | null {
  const rank = entry.supporting.find((metric) => metric.metric === "RANK");
  if (!rank) return null;
  const sex = parenthetical(partitionLabel(entry.comparability_group, lang));
  const position = formatInteger(rank.value, lang);
  return terminate(
    lang === "pl"
      ? `${surname}${sex} zajmowało miejsce ${position} wśród nazwisk w tym zbiorze`
      : `${surname}${sex} ranked ${position} among the surnames in this dataset`,
  );
}

/**
 * The warning a below-threshold distribution carries, returned separately so the
 * page cannot render it after a figure. Null when coverage is adequate.
 */
export function coverageWarning(entry: DistributionEntry, lang: Lang): string | null {
  if (entry.coverage_state === "READY") return null;
  if (entry.coverage_ratio === null) {
    return lang === "pl"
      ? "Nie wiadomo, jaka część nosicieli miała zameldowanie na pobyt stały, więc nie jest to rozkład nazwiska."
      : "What share of bearers had a registered voivodeship is unknown, so this is not the surname's distribution.";
  }
  const coverage = formatPercent(entry.coverage_ratio, lang);
  return lang === "pl"
    ? `Tylko ${coverage} nosicieli miało zameldowanie na pobyt stały, więc nie jest to rozkład nazwiska.`
    : `Only ${coverage} of bearers had a registered voivodeship, so this is not the surname's distribution.`;
}

/**
 * One region's accepted sentence. Registered residence, always named as such.
 * Never "lives in", "comes from" or "originates in".
 */
export function distributionSentence(
  entry: DistributionEntry,
  regionIndex: number,
  surname: string,
  lang: Lang,
): string | null {
  const region = entry.regions[regionIndex];
  if (!region) return null;
  const covered = formatInteger(entry.covered_count, lang);
  const share = formatPercent(region.share_of_covered, lang);
  const sex = parenthetical(partitionLabel(entry.comparability_group, lang));
  const date = formatDate(entry.snapshot_date, lang);
  return terminate(
    lang === "pl"
      ? `Wśród ${covered} osób o nazwisku ${surname}${sex} mających zameldowanie na pobyt stały w dniu ${date}, ${share} było zameldowanych w województwie ${region.display_name}`
      : `Among the ${covered} people with the surname ${surname}${sex} who had a registered voivodeship on ${date}, ${share} were registered in ${region.display_name}`,
  );
}

/** Fixed interface strings. Every state has words; a state without them is a bug. */
export const UI = {
  pl: {
    title: "Name Atlas",
    tagline: "Uczciwe, udokumentowane odpowiedzi o polskich nazwiskach.",
    searchLabel: "Nazwisko",
    searchPlaceholder: "np. Nowak",
    searchAction: "Szukaj",
    langSwitch: "English",
    sectionPopulation: "Liczba osób",
    sectionRarity: "Jak rzadkie",
    sectionDistribution: "Zameldowanie na pobyt stały",
    sectionSources: "Źródło",
    regionsHeading: "Województwa",
    regionColumn: "Województwo",
    countColumn: "Liczba",
    shareColumn: "Udział",
    coveredNote:
      "Udziały liczone są względem osób z zameldowaniem, nie względem wszystkich nosicieli.",
    confidenceLabel: "Pewność",
    snapshotLabel: "Stan na",
    publisherLabel: "Wydawca",
    licenceLabel: "Licencja",
    scopeLabel: "Zakres zbioru",
    unresolvedHeading: "Nie znaleziono takiego nazwiska",
    suggestionsQuestion: "Czy chodziło Ci o:",
    ambiguousHeading: "Zapytanie wymaga uściślenia",
    invalidHeading: "Nie można przyjąć tego zapytania",
    unavailableHeading: "Usługa chwilowo niedostępna",
    unavailableBody: "Spróbuj ponownie za chwilę. To problem po naszej stronie, nie brak danych.",
    invalidBody: "Sprawdź wpisane nazwisko i spróbuj ponownie.",
    noFigures: "Brak danych do pokazania.",
    notSummed: "Zbiory męski i żeński są odrębne i nigdy nie są sumowane.",
    footer:
      "Każda liczba pochodzi z rejestru PESEL i jest podana razem z zakresem zbioru, datą i źródłem. Brak danych jest podany jako brak, nigdy jako zero.",
  },
  en: {
    title: "Name Atlas",
    tagline: "Honest, sourced answers about Polish surnames.",
    searchLabel: "Surname",
    searchPlaceholder: "e.g. Nowak",
    searchAction: "Search",
    langSwitch: "Polski",
    sectionPopulation: "How many people",
    sectionRarity: "How rare",
    sectionDistribution: "Permanent registered residence",
    sectionSources: "Source",
    regionsHeading: "Voivodeships",
    regionColumn: "Voivodeship",
    countColumn: "Count",
    shareColumn: "Share",
    coveredNote:
      "Shares are of the people with a registered voivodeship, not of every bearer of the surname.",
    confidenceLabel: "Confidence",
    snapshotLabel: "As of",
    publisherLabel: "Publisher",
    licenceLabel: "Licence",
    scopeLabel: "Dataset scope",
    unresolvedHeading: "No such surname was found",
    suggestionsQuestion: "Did you mean:",
    ambiguousHeading: "This query needs narrowing",
    invalidHeading: "That query cannot be accepted",
    unavailableHeading: "The service is temporarily unavailable",
    unavailableBody: "Try again shortly. This is a problem on our side, not missing data.",
    invalidBody: "Check the surname you entered and try again.",
    noFigures: "There is nothing to show.",
    notSummed: "The male and female datasets are separate and are never summed.",
    footer:
      "Every number comes from the PESEL register and is shown with its dataset scope, date and source. Missing data is stated as missing, never as zero.",
  },
} as const;

/**
 * Words for a section that is not READY, and for a suggestion section's reason.
 *
 * An unrecognised code falls back to an honest generic line rather than being
 * rendered raw or silently dropped: a code this page has no words for is a gap
 * in this table, and the reader should still be told something true.
 */
const REASON_CODES: Record<string, { pl: string; en: string }> = {
  NO_APPLICABLE_EVIDENCE: {
    pl: "Ten zbiór nie zawiera tego nazwiska. Nie znaczy to, że nikt go nie nosi — nazwiska występujące raz nie są publikowane.",
    en: "This dataset does not list this surname. That does not mean nobody bears it: surnames occurring once are not published.",
  },
  NO_COMPLETE_UNIVERSE: {
    pl: "Nie można podać tej wartości, bo wgrany zbiór nie jest kompletny.",
    en: "This figure cannot be given, because the ingested dataset is not complete.",
  },
  NO_COMPLETE_REGIONAL_UNIVERSE: {
    pl: "Nie ma kompletnego zbioru regionalnego, więc nie pokazujemy rozkładu.",
    en: "No complete regional dataset is available, so no distribution is shown.",
  },
  INPUT_TOO_SHORT: {
    pl: "Zapytanie jest za krótkie, aby bezpiecznie podpowiedzieć nazwisko.",
    en: "The query is too short to suggest a surname safely.",
  },
  NO_CANDIDATE_ABOVE_THRESHOLD: {
    pl: "Nie znaleziono dostatecznie podobnego nazwiska.",
    en: "No sufficiently similar surname was found.",
  },
  MIXED_SCRIPT_REVIEW: {
    pl: "Zapytanie łączy znaki z różnych alfabetów, więc nie podpowiadamy nazwisk.",
    en: "The query mixes letters from different alphabets, so no suggestions are offered.",
  },
  MULTIPLE_EXACT_MATCHES: {
    pl: "Istnieje więcej niż jedno dokładne dopasowanie.",
    en: "More than one exact match exists.",
  },
  SUGGESTIONS_UNAVAILABLE: {
    pl: "Podpowiedzi są chwilowo niedostępne.",
    en: "Suggestions are temporarily unavailable.",
  },
  RIGHTS_PERMIT_FREE_SURFACE: {
    pl: "Licencja źródła nie pozwala pokazać tej wartości tutaj.",
    en: "The source's licence does not permit showing this value here.",
  },
};

export function reasonText(code: string | null, lang: Lang): string | null {
  if (code === null) return null;
  const entry = REASON_CODES[code];
  if (entry) return entry[lang];
  return lang === "pl"
    ? "Tej wartości nie można podać dla tego nazwiska."
    : "This value cannot be given for this surname.";
}

/**
 * Words for a suggestion's explanation code.
 *
 * The contract calls these "localisable explanation codes" and this page is the
 * downstream that localises them: a reader is shown why a surname is on the list,
 * never the machine code.
 *
 * The `TRIGRAM_*` codes are deliberately **not** rendered. They convey a
 * similarity band, and the contract's rule that no similarity crosses the
 * boundary (`docs/canonical/16` §35) is about what a reader is told, not only
 * about a field name — "TRIGRAM_HIGH" is a score in words. A code with no entry
 * here is omitted rather than printed raw.
 */
const EXPLANATION_CODES: Record<string, { pl: string; en: string }> = {
  ADJACENT_TRANSPOSITION: {
    pl: "dwie litery przestawione",
    en: "two letters swapped",
  },
  EDIT_DISTANCE_1: { pl: "różni się jedną literą", en: "differs by one letter" },
  EDIT_DISTANCE_2: { pl: "różni się dwiema literami", en: "differs by two letters" },
  EDIT_DISTANCE_3: { pl: "różni się trzema literami", en: "differs by three letters" },
};

export function explanationText(codes: readonly string[], lang: Lang): string | null {
  const words = codes.map((code) => EXPLANATION_CODES[code]?.[lang]).filter((w) => w !== undefined);
  return words.length === 0 ? null : words.join(", ");
}

/** Words for a rights-blocked section. The value itself is never in the payload. */
export function rightsBlockedText(lang: Lang): string {
  return lang === "pl"
    ? "Licencja źródła nie pozwala pokazać tej wartości na tej stronie."
    : "The source's licence does not permit showing this value on this page.";
}
