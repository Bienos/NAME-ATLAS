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

/**
 * The `lang` attribute value for a rendered page.
 *
 * The root layout cannot know it — the same tree answers in both languages —
 * so each page passes its own. Polish is `pl`; English is `en-GB`, because the
 * dates this app renders are day-month-year.
 */
export function htmlLang(lang: Lang): string {
  return lang === "en" ? "en-GB" : "pl";
}

/**
 * Presentation intent (TASK-023 §2.5; directive §17). Changes only the order
 * of sections; the payload and the canonical URL are unaffected
 * (`docs/canonical/21` §35).
 */
export type Intent = "default" | "rarity" | "map" | "meaning";

export function parseIntent(value: string | null | undefined): Intent {
  switch (value) {
    case "rarity":
    case "map":
    case "meaning":
      return value;
    default:
      return "default";
  }
}

/**
 * Polish plural forms: 1 → singular, 2–4 (but not 12–14) → paucal, else genitive
 * plural. `1 fakt`, `2 fakty`, `5 faktów`, `22 fakty`, `112 faktów`.
 */
export function pluralPl(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  const tens = abs % 100;
  const units = abs % 10;
  if (units >= 2 && units <= 4 && !(tens >= 12 && tens <= 14)) return few;
  return many;
}

/**
 * The assessment as a word (directive §14). The canonical status is the
 * vocabulary — nothing is added to it — and the word is what the reader sees.
 * Never a number, never a bar, never a percentage (`docs/canonical/16` §35).
 */
export function assessmentWord(status: string, lang: Lang): string {
  const words: Record<string, { pl: string; en: string }> = {
    VERIFIED: { pl: "Zweryfikowane", en: "Verified" },
    LIKELY: { pl: "Prawdopodobne", en: "Likely" },
    POSSIBLE: { pl: "Możliwe", en: "Possible" },
    UNCONFIRMED: { pl: "Niepotwierdzone", en: "Unconfirmed" },
    CONFLICTING: { pl: "Źródła się różnią", en: "Sources disagree" },
    INSUFFICIENT_DATA: { pl: "Za mało danych", en: "Insufficient data" },
  };
  return words[status]?.[lang] ?? status;
}

/**
 * The kind of source, from the citation's `source_type` (directive §15: source
 * category is not confidence and not freshness). An unrecognised code falls
 * back to the plain word "source" rather than being shown raw.
 */
export function sourceKindWord(sourceType: string, lang: Lang): string {
  const words: Record<string, { pl: string; en: string }> = {
    OFFICIAL_DATASET: { pl: "Dane urzędowe", en: "Official data" },
    DICTIONARY: { pl: "Opracowanie naukowe", en: "Scholarly work" },
    ACADEMIC: { pl: "Publikacja naukowa", en: "Academic publication" },
    ARCHIVE: { pl: "Archiwum", en: "Archive" },
    DIGITAL_LIBRARY: { pl: "Biblioteka cyfrowa", en: "Digital library" },
    PUBLICATION: { pl: "Publikacja", en: "Publication" },
  };
  return words[sourceType]?.[lang] ?? (lang === "pl" ? "Źródło" : "Source");
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
    sectionMeaning: "Znaczenie",
    /**
     * The gap sentence (ADR-0008 §3). It says three things, all of them true:
     * we have no sourced meaning, the reason is that no admissible work covers
     * this surname, and we will not guess. Deliberately not "unknown origin" —
     * that would state something about the surname; this states something about
     * our evidence.
     */
    meaningNoSource:
      "Nie mamy udokumentowanego znaczenia tego nazwiska. Nie znaleźliśmy go w żadnym " +
      "opracowaniu naukowym, które moglibyśmy tu zacytować, a znaczenia nie zgadujemy.",
    meaningBlocked:
      "Znaczenie tego nazwiska pochodzi z opracowania, którego licencja nie pozwala nam " +
      "pokazać go tutaj.",
    meaningUnavailable: "Znaczenia nie da się teraz pokazać.",
    meaningRootLabel: "Rdzeń",
    meaningLanguageLabel: "Język rdzenia",
    meaningFormationLabel: "Typ",
    meaningWorkLabel: "Opracowanie",
    meaningConflictNote:
      "Opracowania nie są zgodne co do pochodzenia tego nazwiska. Pokazujemy oba odczytania; " +
      "nie wybieramy między nimi.",
    meaningInterpretationNote:
      "To interpretacja naukowa, nie zmierzona wartość. Pochodzenie nazwisk bywa sporne.",
    sectionSources: "Źródło",
    sectionSourcesAll: "Źródła na tej stronie",
    viewEvidence: "Zobacz dowody",
    searchAnother: "Sprawdź inne nazwisko",
    heroPeople: "osób",
    heroNoCount: "Ten zbiór nie podaje liczby osób o tym nazwisku.",
    heroRightsBlocked: "Liczby nie można pokazać tutaj z powodu licencji źródła.",
    heroStrongestRegion: "Najwięcej zameldowanych",
    rarityNotComparable:
      "Każda wartość „1 na X” liczona jest w obrębie własnego zbioru. Zbiory mają różną wielkość, " +
      "więc tych dwóch wartości nie porównujemy ze sobą.",
    evidenceSourceTitle: "Źródło",
    evidenceProvider: "Wydawca",
    evidenceSourceType: "Rodzaj źródła",
    evidenceDataset: "Zakres zbioru",
    evidenceUnderlyingDate: "Dane na dzień",
    evidencePublicationDate: "Data publikacji",
    evidenceRetrieved: "Pobrano",
    evidenceLocator: "Identyfikator rekordu",
    evidenceRecordLink: "otwórz źródło",
    evidenceMethod: "Metoda",
    evidenceSupportedClaim: "Potwierdzane stwierdzenie",
    evidenceLimitations: "Ograniczenia",
    evidenceContradictions: "Rozbieżności",
    evidenceNoneRecorded: "nie odnotowano",
    evidenceAttribution: "Atrybucja",
    limitationNotSummed: "Zbiory męski i żeński są odrębne i nigdy nie są sumowane.",
    limitationSuppressed:
      "Nazwiska występujące raz nie są publikowane; brak w zbiorze nie oznacza zera.",
    limitationRegistered:
      "Zameldowanie na pobyt stały to adres w rejestrze — nie faktyczny adres i nie informacja " +
      "o korzeniach rodziny.",
    limitationInterpretation: "To interpretacja naukowa, nie zmierzona wartość.",
    limitationRounded: "Wartość „1 na X” jest zaokrąglona; liczba osób jest dokładna.",
    limitationPartition:
      "Wydawca nie podaje, czy podział dotyczy płci osoby, czy rodzaju gramatycznego nazwiska. " +
      "Dlatego zbiory nie są sumowane ani porównywane liczbowo.",
    slugUnknownBody: "Pod tym adresem nie ma nazwiska. Wpisz nazwisko w wyszukiwarce powyżej.",
    compareVersus: " a ",
    compareOneIn: "1 na",
    compareNothingToCompare: "Nie ma tu wartości, które dałoby się porównać.",
    compareEqualRarity: "Oba nazwiska są w tym zbiorze równie rzadkie.",
    compareTooClose:
      "Te wartości są zbyt bliskie, aby je rozróżnić po zaokrągleniu — nie wskazujemy, które " +
      "nazwisko jest rzadsze.",
    compareDisclaimer:
      "Porównujemy liczby z tego samego zbioru. Wspólne lub podobne nazwisko nie oznacza " +
      "wspólnej rodziny, wspólnych korzeni ani wspólnej narodowości.",
    slugCollisionBody:
      "Ten adres pasuje do więcej niż jednego nazwiska, więc nie wybieramy żadnego. Wpisz nazwisko w wyszukiwarce powyżej:",
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
    sectionMeaning: "Meaning",
    meaningNoSource:
      "We have no sourced meaning for this surname. We could not find it in any scholarly work " +
      "we are able to cite here, and we do not guess at meanings.",
    meaningBlocked:
      "The meaning of this surname comes from a work whose licence does not let us show it here.",
    meaningUnavailable: "The meaning cannot be shown right now.",
    meaningRootLabel: "Root",
    meaningLanguageLabel: "Root language",
    meaningFormationLabel: "Type",
    meaningWorkLabel: "Work",
    meaningConflictNote:
      "The works disagree about where this surname comes from. Both readings are shown; we do " +
      "not choose between them.",
    meaningInterpretationNote:
      "This is a scholarly interpretation, not a measured value. Surname origins are often " +
      "contested.",
    sectionSources: "Source",
    sectionSourcesAll: "Sources on this page",
    viewEvidence: "View evidence",
    searchAnother: "Search another surname",
    heroPeople: "people",
    heroNoCount: "This dataset publishes no count for this surname.",
    heroRightsBlocked: "The count cannot be shown here because of the source's licence.",
    heroStrongestRegion: "Most registered in",
    rarityNotComparable:
      "Each 1-in-X is computed within its own dataset. The datasets are different sizes, so these " +
      "two figures are not compared with each other.",
    evidenceSourceTitle: "Source",
    evidenceProvider: "Provider",
    evidenceSourceType: "Source type",
    evidenceDataset: "Dataset scope",
    evidenceUnderlyingDate: "Data as of",
    evidencePublicationDate: "Publication date",
    evidenceRetrieved: "Retrieved",
    evidenceLocator: "Record identifier",
    evidenceRecordLink: "open source",
    evidenceMethod: "Method",
    evidenceSupportedClaim: "Supported claim",
    evidenceLimitations: "Limitations",
    evidenceContradictions: "Contradictions",
    evidenceNoneRecorded: "none recorded",
    evidenceAttribution: "Attribution",
    limitationNotSummed: "The male and female datasets are separate and are never summed.",
    limitationSuppressed:
      "Surnames occurring once are not published; absence from the dataset is not zero.",
    limitationRegistered:
      "A permanent registered residence is an address in the register — not an actual address, " +
      "and not information about a family's roots.",
    limitationInterpretation: "This is a scholarly interpretation, not a measured value.",
    limitationRounded: "The 1-in-X figure is rounded; the count of people is exact.",
    limitationPartition:
      "The publisher does not state whether the split is by a person's sex or by the grammatical " +
      "gender of the surname form. The datasets are therefore neither summed nor compared numerically.",
    slugUnknownBody: "There is no surname at this address. Type a surname in the search above.",
    compareVersus: " vs ",
    compareOneIn: "1 in",
    compareNothingToCompare: "There is no figure here that can be compared.",
    compareEqualRarity: "Both surnames are equally rare in this dataset.",
    compareTooClose:
      "These figures are too close to separate once rounded, so neither is called rarer.",
    compareDisclaimer:
      "We compare figures from the same dataset. A shared or similar surname does not mean a " +
      "shared family, shared roots or shared nationality.",
    slugCollisionBody:
      "This address matches more than one surname, so none is chosen. Type the surname in the search above:",
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
