/**
 * The words the free result page renders (TASK-017), and the landing atlas's
 * (TASK-040).
 *
 * Pure: strings in, strings out. No database, no React, no request. That is
 * deliberate — every honesty rule this page must keep is then a unit test
 * rather than a review comment, and the page itself becomes a layout.
 *
 * The result page's sentences are **verbatim from
 * `docs/contracts/surname-result.md`**, where the project owner accepted them.
 * The `lf*` strings are the landing atlas's own (TASK-040), written for
 * `list-atlas.tsx` under the list-facts contract's rules (every figure names
 * its list; the two lists are never summed). Neither set is paraphrased here,
 * and the rules attached to them are not negotiable by a layout decision:
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

/**
 * A share as a percentage, in the locale's own notation: one decimal place
 * unless the caller asks for another precision. Rounding here is display only;
 * the stored value is never rounded to match it.
 */
export function formatPercent(share: number, lang: Lang, digits = 1): string {
  const fixed = (share * 100).toFixed(digits);
  return lang === "pl" ? `${fixed.replace(".", ",")}%` : `${fixed}%`;
}

/**
 * A number to a fixed count of decimal places, grouped like
 * {@link formatInteger}: `921,1` and `146 707` in Polish, `921.1` and
 * `146,707` in English. For expected values, which are not counts.
 */
export function formatDecimal(value: number, digits: number, lang: Lang): string {
  const fixed = Math.abs(value).toFixed(digits);
  const [whole = "0", fraction] = fixed.split(".");
  const sign = value < 0 && Number(fixed) !== 0 ? "-" : "";
  const grouped = formatInteger(Number(whole), lang);
  if (fraction === undefined) return sign + grouped;
  return `${sign}${grouped}${lang === "pl" ? "," : "."}${fraction}`;
}

/**
 * A round axis value in words: `1 tys.`, `100 tys.`, `1 mln` in Polish, `1k`,
 * `100k`, `1M` in English. Only for tick labels on a log axis, where the full
 * digits would collide; a value that is not a round thousand or million is
 * written in full.
 */
export function formatCompact(value: number, lang: Lang): string {
  const units: readonly (readonly [number, string])[] =
    lang === "pl"
      ? [
          [1_000_000, "\u00a0mln"],
          [1_000, "\u00a0tys."],
        ]
      : [
          [1_000_000, "M"],
          [1_000, "k"],
        ];
  for (const [size, word] of units) {
    if (Math.abs(value) >= size && value % size === 0) {
      return `${formatInteger(value / size, lang)}${word}`;
    }
  }
  return formatInteger(value, lang);
}

/**
 * A probability as a percentage to two decimals, so that 49,72% and 50,56% are
 * not both "50%" (TASK-040 §4.5). Where two decimals would round a value onto
 * 0%, 50% or 100% that it does not equal, up to two more are shown: a chance of
 * 0.50002 reads "50,002%", never a bare "50,00%". A value still on such an
 * edge at four decimals is rounded toward the side it is on, so a chance below
 * one half never reads 50% or more, and one above never 50% or less.
 */
export function formatChance(p: number, lang: Lang): string {
  const edges = [0, 0.5, 1] as const;
  let digits = 2;
  const misleading = (d: number) =>
    edges.some((edge) => p !== edge && Math.abs(p - edge) * 100 < 0.5 * 10 ** -d);
  while (digits < 4 && misleading(digits)) digits += 1;
  let fixed = (p * 100).toFixed(digits);
  for (const edge of edges) {
    const shown = Number(fixed);
    if (p < edge && shown >= edge * 100) fixed = (edge * 100 - 10 ** -digits).toFixed(digits);
    else if (p > edge && shown <= edge * 100) fixed = (edge * 100 + 10 ** -digits).toFixed(digits);
  }
  return lang === "pl" ? `${fixed.replace(".", ",")}%` : `${fixed}%`;
}

/**
 * A quantile as its percentage with only the digits it needs: 50%, 99%, 99,9%
 * (TASK-040). Up to three decimals for a quantile that is not a round tenth of
 * a per cent.
 */
export function formatQuantile(q: number, lang: Lang): string {
  for (const digits of [0, 1, 2]) {
    const scaled = q * 100 * 10 ** digits;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return formatPercent(q, lang, digits);
  }
  return formatPercent(q, lang, 3);
}

/**
 * A share of people (TASK-040): one decimal, two below one per cent, so a
 * share of 0.46% never reads "0,5%".
 */
export function formatShare(share: number, lang: Lang): string {
  return formatPercent(share, lang, share < 0.01 ? 2 : 1);
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
export function terminate(sentence: string): string {
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

// Intents are section aliases, so they live in the section registry (TASK-034).
// Re-exported so every importer of this module is unchanged.
export { parseIntent } from "./sections.js";
export type { Intent } from "./sections.js";

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
 * One piece of a message template (TASK-040's atlas strings).
 *
 * A template is plain text with three marks, so a whole sentence stays in one
 * string in `UI` and is translated as a sentence:
 *
 * - `{key}` — a value the caller supplies, already formatted;
 * - `{key:one|few|many}` — the word that agrees with the count `key`: Polish
 *   takes three forms ({@link pluralPl}), English two (`{key:one|other}`);
 * - `**text**` — emphasis.
 */
export type TemplatePart =
  | { readonly kind: "text"; readonly text: string; readonly strong: boolean }
  | { readonly kind: "slot"; readonly key: string; readonly strong: boolean }
  | {
      readonly kind: "plural";
      readonly key: string;
      readonly forms: readonly string[];
      readonly strong: boolean;
    };

export function parseTemplate(template: string): TemplatePart[] {
  const parts: TemplatePart[] = [];
  template.split("**").forEach((segment, index) => {
    const strong = index % 2 === 1;
    const pattern = /\{([a-z0-9_]+)(?::([^}]*))?\}/giu;
    let last = 0;
    for (const match of segment.matchAll(pattern)) {
      const at = match.index;
      if (at > last) parts.push({ kind: "text", text: segment.slice(last, at), strong });
      const key = match[1] ?? "";
      const forms = match[2];
      parts.push(
        forms === undefined
          ? { kind: "slot", key, strong }
          : { kind: "plural", key, forms: forms.split("|"), strong },
      );
      last = at + match[0].length;
    }
    if (last < segment.length) parts.push({ kind: "text", text: segment.slice(last), strong });
  });
  return parts;
}

/** The form of `forms` that agrees with `n`: Polish one/few/many, otherwise one/other. */
export function pluralForm(n: number, forms: readonly string[], lang: Lang): string {
  const [one = "", few = one, many = few] = forms;
  if (lang === "pl" && forms.length >= 3) return pluralPl(n, one, few, many);
  return Math.abs(n) === 1 ? one : (forms[forms.length - 1] ?? one);
}

/**
 * A template filled as plain text: for an accessible label or a test. An
 * unknown key renders nothing rather than the raw mark, and a test asserts no
 * brace ever reaches the page.
 */
export function fillTemplate(
  template: string,
  values: Readonly<Record<string, string>>,
  counts: Readonly<Record<string, number>>,
  lang: Lang,
): string {
  return parseTemplate(template)
    .map((part) => {
      if (part.kind === "text") return part.text;
      if (part.kind === "slot") return values[part.key] ?? "";
      const n = counts[part.key];
      return n === undefined ? "" : pluralForm(n, part.forms, lang);
    })
    .join("");
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

/**
 * Words for a meaning's formation type (`docs/canonical/11` §7.2). The code is
 * a machine value and is never shown raw; an unknown code reads as "not
 * determined" rather than leaking.
 */
export function formationWord(code: string, lang: Lang): string {
  const words: Record<string, { pl: string; en: string }> = {
    PATRONYMIC: { pl: "odojcowskie (patronimiczne)", en: "patronymic" },
    TOPONYMIC: { pl: "od nazwy miejscowej", en: "from a place name" },
    OCCUPATIONAL: { pl: "od zajęcia lub zawodu", en: "occupational" },
    DESCRIPTIVE: { pl: "od cechy lub przezwiska", en: "from a trait or nickname" },
    OTHER: { pl: "inne", en: "other" },
    UNKNOWN: { pl: "nieustalone", en: "not determined" },
  };
  return words[code]?.[lang] ?? words["UNKNOWN"]![lang];
}

/** Fixed interface strings. Every state has words; a state without them is a bug. */
export const UI = {
  pl: {
    title: "Name Atlas",
    tagline: "Uczciwe, udokumentowane odpowiedzi o polskich nazwiskach.",
    landingHeadline: "Każde nazwisko",
    landingHeadlineEm: "ma swój początek.",
    landingLede:
      "Zobacz, co oficjalny rejestr PESEL zapisuje o nazwisku — ze źródłem i datą przy każdej " +
      "liczbie i z uczciwą luką wszędzie tam, gdzie kończą się dane.",
    landingHint: "Wpisz dokładnie tak, jak się pisze — z polskimi znakami.",
    searchLabel: "Nazwisko",
    searchPlaceholder: "np. Nowak",
    searchAction: "Szukaj",
    suggestionsAvailable: "Podpowiedzi:",
    commonHeading: "Najczęstsze nazwiska",
    commonNote:
      "Pozycje w rejestrze PESEL; listy mężczyzn i kobiet są osobne i nie są sumowane. Stan na",
    commonNoteUndated:
      "Pozycje w rejestrze PESEL; listy mężczyzn i kobiet są osobne i nie są sumowane.",
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
    notesSummary: "Jak czytać te liczby",
    sourceSiteLink: "strona źródła",
    searchAnother: "Sprawdź inne nazwisko",
    heroPeople: "osób",
    heroNoCount: "Ten zbiór nie podaje liczby osób o tym nazwisku.",
    heroNotDerived:
      "Rejestr PESEL zawiera to nazwisko, ale jego liczby nie zostały jeszcze opracowane.",
    heroRightsBlocked: "Liczby nie można pokazać tutaj z powodu licencji źródła.",
    heroStrongestRegion: "Najwięcej zameldowanych",
    heroInRegister: "osób w rejestrze PESEL",
    chapterCountTitle: "Ile osób nosi to nazwisko?",
    chapterCountLede:
      "Rejestr PESEL publikuje dwie osobne listy nazwisk: męską i żeńską. Każdą liczbę " +
      "pokazujemy osobno i nigdy ich nie sumujemy.",
    chapterRarityTitle: "Jak rzadkie jest to nazwisko?",
    chapterRarityLede:
      "„1 na X” znaczy, że mniej więcej jedna na X osób z tej listy nosi to nazwisko. Im większe " +
      "X, tym rzadsze nazwisko. Miejsce liczymy od najczęstszego nazwiska na liście.",
    chapterWhereTitle: "Gdzie jest najczęściej zameldowane?",
    chapterWhereLede:
      "Mapa i lista pokazują, w których województwach osoby o tym nazwisku mają zameldowanie " +
      "na pobyt stały. Im ciemniejszy kolor i dłuższy pasek, tym większy udział.",
    chapterMeaningTitle: "Co oznacza to nazwisko?",
    chapterMeaningLede:
      "Znaczenie podajemy tylko wtedy, gdy stoi za nim opracowanie naukowe. Nie zgadujemy.",
    navLabel: "Na tej stronie",
    navCount: "Liczba osób",
    navRarity: "Rzadkość",
    navWhere: "Województwa",
    navMeaning: "Znaczenie",
    navSources: "Źródła",
    rankCaption: "miejsce na liście nazwisk",
    scaleLabel: "Skala rzadkości",
    scaleCommon: "częstsze",
    scaleRare: "rzadsze",
    rarityNotComparable:
      "Każda wartość „1 na X” liczona jest w obrębie własnego zbioru. Zbiory mają różną wielkość, " +
      "więc tych dwóch wartości nie porównujemy ze sobą.",
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
    mapTitle: "Mapa udziałów według województw",
    mapLegend: "Udział osób z zameldowaniem, od najmniejszego:",
    mapNotListed: "brak w zbiorze — nie oznacza zera",
    mapNotListedShort: "brak w zbiorze",
    mapHint: "Najedź na województwo lub je dotknij, aby zobaczyć liczby.",
    regionColumn: "Województwo",
    countColumn: "Liczba",
    shareColumn: "Udział",
    coveredNote:
      "Udziały liczone są względem osób z zameldowaniem, nie względem wszystkich nosicieli.",
    snapshotLabel: "Stan na",
    publisherLabel: "Wydawca",
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
    // --- The landing atlas (TASK-040). Every figure arrives from `listFacts()`;
    // these are the words around it. The two lists are named in every sentence
    // that carries a figure, and nothing here adds them up.
    lfEyebrow: "Atlas nazwisk",
    lfTitle: "Dwie listy, trzy plansze",
    lfLede:
      "Trzy plansze o opublikowanych listach nazwisk z rejestru PESEL: o tym, jak nazwiska się " +
      "rozkładają, kiedy się powtarzają i ile ich jest w tłumie. Listę mężczyzn i listę kobiet " +
      "pokazujemy obok siebie i nigdy ich nie sumujemy.",
    lfScope:
      "Każda liczba opisuje jedną opublikowaną listę rejestru PESEL: nazwiska noszone przez co " +
      "najmniej 2 osoby, osoby żyjące, nazwisko aktualne. Stan\u00a0na\u00a0{date}",
    lfIndexLabel: "Plansze",
    lfP1Short: "Typowe nazwisko i typowa osoba",
    lfP2Short: "Kiedy nazwisko się powtarza",
    lfP3Short: "Ile nazwisk w tłumie",
    lfSwitchLabel: "Która lista",
    lfSwitchMale: "Mężczyźni",
    lfSwitchFemale: "Kobiety",
    lfSwitchNote: "osobne listy, nigdy sumowane",
    lfListMale: "Lista mężczyzn",
    lfListFemale: "Lista kobiet",
    lfListInMale: "lista mężczyzn",
    lfListInFemale: "lista kobiet",
    lfSource: "Źródło: {link} · stan\u00a0na\u00a0{date}",
    lfSourceName: "rejestr PESEL, dane.gov.pl",
    lfSourceTwo: "Źródło: rejestr PESEL, dane.gov.pl ({male}, {female}) · stan\u00a0na\u00a0{date}",
    lfMethod: "{status} · metoda {method}",
    lfP1No: "Plansza I · Suwak",
    lfP1TitleMale:
      "Na liście mężczyzn typowe nazwisko {s:nosi|noszą|nosi} {s} {s:osoba|osoby|osób}, a typowy " +
      "mężczyzna\u00a0— nazwisko {p} mężczyzn.",
    lfP1TitleFemale:
      "Na liście kobiet typowe nazwisko {s:nosi|noszą|nosi} {s} {s:osoba|osoby|osób}, a typowa " +
      "kobieta\u00a0— nazwisko {p} kobiet.",
    lfP1Lede:
      "Rzadkich nazwisk jest bardzo wiele, ale każde nosi niewiele osób. Częstych jest niewiele, " +
      "ale noszą je tłumy. Dlatego typowe nazwisko i nazwisko typowej osoby to dwie różne liczby " +
      "— z tej samej listy.",
    lfP1AxisNote: "liczba osób z nazwiskiem · skala logarytmiczna",
    lfP1TopRow: "co najmniej …% nazwisk ma najwyżej tyle osób",
    lfP1BottomRowMale: "co najmniej …% mężczyzn nosi nazwisko, które ma najwyżej tyle osób",
    lfP1BottomRowFemale: "co najmniej …% kobiet nosi nazwisko, które ma najwyżej tyle osób",
    lfP1FlagSurname: "typowe nazwisko: {s} {s:osoba|osoby|osób}",
    lfP1FlagPersonMale: "typowy mężczyzna: nazwisko {p} mężczyzn",
    lfP1FlagPersonFemale: "typowa kobieta: nazwisko {p} kobiet",
    lfP1Omitted: "1 osoba: pomijane przez wydawcę",
    lfP1Max: "najczęstsze nazwisko listy",
    lfP1Arc: "ta sama lista, dwa pytania",
    lfP1Rung: "{t}+: {n} {n:nazwisko|nazwiska|nazwisk}",
    lfP1ThresholdsHeading: "Ile nazwisk ma co najmniej…",
    lfP1ThresholdAtLeast: "{t}+ {t:osoba|osoby|osób}",
    lfP1ThresholdSurnames: "{n} {n:nazwisko|nazwiska|nazwisk}",
    lfP1ThresholdPeopleMale: "nosi je {p} mężczyzn",
    lfP1ThresholdPeopleFemale: "{p:nosi|noszą|nosi} je {p} {p:kobieta|kobiety|kobiet}",
    lfP1FigureMale:
      "Skala logarytmiczna liczby osób z nazwiskiem na liście mężczyzn, od {min} do {max} osób. " +
      "Typowe nazwisko: {s} {s:osoba|osoby|osób}. Typowy mężczyzna: nazwisko {p} mężczyzn. " +
      "Nazwiska: {surnames}. Mężczyźni: {people}.",
    lfP1FigureFemale:
      "Skala logarytmiczna liczby osób z nazwiskiem na liście kobiet, od {min} do {max} osób. " +
      "Typowe nazwisko: {s} {s:osoba|osoby|osób}. Typowa kobieta: nazwisko {p} kobiet. " +
      "Nazwiska: {surnames}. Kobiety: {people}.",
    lfP1FigureSurnameQuantile: "co najmniej {q} ma najwyżej {c} {c:osobę|osoby|osób}",
    lfP1FigurePersonQuantile:
      "co najmniej {q} nosi nazwisko, które ma najwyżej {c} {c:osobę|osoby|osób}",
    lfP1Fact:
      "**Typowe nazwisko** nosi {sm} {sm:mężczyzna|mężczyzn|mężczyzn} na liście mężczyzn i {sf} " +
      "{sf:kobieta|kobiety|kobiet} na liście kobiet: co najmniej połowa nazwisk z każdej " +
      "listy ma najwyżej tylu. **Typowy mężczyzna** nosi nazwisko {pm} mężczyzn, a **typowa " +
      "kobieta** — nazwisko {pf} kobiet: co najmniej połowa osób z każdej listy nosi nazwisko co " +
      "najmniej tak częste. Lista mężczyzn liczy {nm} {nm:osobę|osoby|osób} i {rm} " +
      "{rm:nazwisko|nazwiska|nazwisk}, lista kobiet — {nf} {nf:osobę|osoby|osób} i {rf} " +
      "{rf:nazwisko|nazwiska|nazwisk}. Najczęstsze nazwisko listy mężczyzn nosi {xm} mężczyzn, " +
      "a najczęstsze nazwisko listy kobiet — {xf} {xf:kobieta|kobiety|kobiet}.",
    lfP1Caveat:
      "Liczone na opublikowanej liście: nazwiska noszone przez co najmniej 2 osoby, osoby żyjące, " +
      "nazwisko aktualne. Wydawca pomija nazwiska noszone przez 1 osobę, więc nie wchodzą one do " +
      "rachunku — ich brak nie oznacza zera. Mediana opisuje tylko tę listę. Listy mężczyzn " +
      "i kobiet liczone są osobno i nigdy nie są sumowane.",
    lfP2No: "Plansza II · Sala",
    lfP2Title: "Ile osób musi wejść, zanim nazwisko się powtórzy?",
    lfP2Lede:
      "Dwie osoby wylosowane z listy mężczyzn noszą to samo nazwisko z szansą około 1 na {om}; " +
      "z listy kobiet — około 1 na {of}. Ile osób musi wejść do sali, żeby szansa, że co " +
      "najmniej dwie noszą to samo nazwisko, sięgnęła połowy?",
    lfP2Answer: "{n:osoba|osoby|osób} — szansa, że co najmniej dwie noszą to samo nazwisko: {p}",
    lfP2Model: "Model: osoby losowane bez zwracania z tej listy.",
    lfP2XAxis: "osób w sali",
    lfP2BirthdayTick: "urodziny",
    lfP2CurveFigure:
      "Wykres: szansa, że co najmniej dwie z n osób wylosowanych z listy ({list}) noszą to samo " +
      "nazwisko, dla n od {from} do {to}. Połowę osiąga przy {n} osobach: {p}. Przy {bn} " +
      "osobach: {p23}.",
    lfP2StripCaption:
      "{rooms} {rooms:przykładowa sala|przykładowe sale|przykładowych sal}: każda kropka to jedna " +
      "sala, postawiona przy osobie, z którą weszła do niej pierwsza para o tym samym nazwisku. " +
      "Pionowa kreska: {n} {n:osoba|osoby|osób}.",
    lfP2StripFigure:
      "Przykładowe sale ({list}): kropka na salę, przy osobie, z którą weszła pierwsza para o tym " +
      "samym nazwisku.",
    lfP2StripList: "Przykładowe sale ({list}), po kolei: osoba, z którą weszła pierwsza para",
    lfP2RoomCaption:
      "W tym losowaniu, w pierwszej z tych sal, pierwsza para pojawiła się przy osobie nr {b}: " +
      "osoby nr {a} i nr {b} noszą to samo nazwisko.",
    lfP2RoomFigure:
      "Sala ({list}): {b} {b:zajęte miejsce|zajęte miejsca|zajętych miejsc}; osoby nr {a} i nr {b} " +
      "połączone linią, bo noszą to samo nazwisko.",
    lfP2Birthday:
      "Urodziny (model 365 jednakowo prawdopodobnych dni): {bn} {bn:osoba|osoby|osób}, {bp}. " +
      "Wspólne nazwisko przy {bn} osobach: {p23}.",
    lfP2LegendSeat: "osoba w sali",
    lfP2LegendEmpty: "wolne miejsce",
    lfP2LegendPair: "pierwsza para o tym samym nazwisku",
    lfP2RoomHalf: "{n} {n:osoba|osoby|osób}: szansa {p}",
    lfP2RoomHalfFigure:
      "Kreska po miejscu nr {n}: przy {n} {n:osobie|osobach|osobach} szansa, że co najmniej " +
      "dwie noszą to samo nazwisko, wynosi {p}.",
    lfP2Fact:
      "{nm:Wystarczy|Wystarczą|Wystarczy} **{nm} {nm:osoba|osoby|osób}** z listy mężczyzn, żeby " +
      "szansa, że co najmniej dwie noszą to samo nazwisko, wyniosła {pm}; o jedną osobę mniej — " +
      "{qm}. Z listy kobiet {nf:wystarczy|wystarczą|wystarczy} **{nf} {nf:osoba|osoby|osób}**: " +
      "{pf}, a o jedną mniej — {qf}. Dwie losowo wybrane osoby noszą to samo nazwisko z szansą " +
      "około 1 na {om} na liście mężczyzn i około 1 na {of} na liście kobiet.",
    lfP2FactBirthday:
      "Dla porównania: w modelu 365 jednakowo prawdopodobnych dni urodzin " +
      "{bn:wystarczy|wystarczą|wystarczy} {bn} {bn:osoba|osoby|osób} ({bp}), a przy {bn} osobach " +
      "szansa na wspólne nazwisko wynosi {p23m} na liście mężczyzn i {p23f} na liście kobiet.",
    lfP2Caveat:
      "Model: osoby losowane bez zwracania z jednej opublikowanej listy (nazwiska noszone przez " +
      "co najmniej 2 osoby, osoby żyjące, nazwisko aktualne). Prawdziwe grupy — rodziny, klasy, zakłady pracy — nie są losowe. " +
      "Przykładowe sale to zapisane losowania, nie prawdziwe sale. Liczba {bn} dla urodzin to " +
      "wynik modelu 365 jednakowo prawdopodobnych dni, nie dane PESEL.",
    lfP3No: "Plansza III · Tłum",
    lfP3TitleThousandMale:
      "Tysiąc nieznajomych z listy mężczyzn: średnio {d} {d:różne nazwisko|różne nazwiska|różnych nazwisk}",
    lfP3TitleThousandFemale:
      "Tysiąc nieznajomych z listy kobiet: średnio {d} {d:różne nazwisko|różne nazwiska|różnych nazwisk}",
    lfP3TitleMale:
      "{c} nieznajomych z listy mężczyzn: średnio {d} {d:różne nazwisko|różne nazwiska|różnych nazwisk}",
    lfP3TitleFemale:
      "{c} nieznajomych z listy kobiet: średnio {d} {d:różne nazwisko|różne nazwiska|różnych nazwisk}",
    lfP3LedeMale:
      "Wylosuj {c} {c:osobę|osoby|osób} z listy mężczyzn i sprawdź ich nazwiska. Kropka to jedna " +
      "osoba; linia łączy osoby o tym samym nazwisku.",
    lfP3LedeFemale:
      "Wylosuj {c} {c:osobę|osoby|osób} z listy kobiet i sprawdź ich nazwiska. Kropka to jedna " +
      "osoba; linia łączy osoby o tym samym nazwisku.",
    lfP3Distinct: "różnych nazwisk — średnio w losowym tłumie {c} {c:osoby|osób|osób}",
    lfP3Alone: "osób bez nikogo o tym samym nazwisku — średnio",
    lfP3Example:
      "W tym losowaniu: {d} {d:różne nazwisko|różne nazwiska|różnych nazwisk}, {w} " +
      "{w:osoba|osoby|osób} bez nikogo o tym samym nazwisku.",
    lfP3CrowdFigure:
      "Przykładowy tłum {n} {n:osoby|osób|osób} z listy ({list}), jedna kropka na osobę. {example}",
    lfP3LegendDot: "1 kropka = 1 osoba",
    lfP3LegendAlone: "jedyne takie nazwisko w tłumie",
    lfP3LegendShared: "wspólne nazwisko w tłumie",
    lfP3SparkTitle: "Im większy tłum, tym wolniej przybywa nazwisk",
    lfP3SparkLine: "średnio różnych nazwisk",
    lfP3SparkRef: "gdyby każdy nosił inne nazwisko",
    lfP3SparkAxis: "osób w tłumie · obie osie w skali logarytmicznej",
    lfP3SparkFigure: "Średnia liczba różnych nazwisk w losowym tłumie ({list}): {values}.",
    lfP3SparkPoint: "{n} {n:osoba|osoby|osób}: {d}",
    lfP3LanesTitle: "Po ilu nieznajomych…",
    lfP3LanesLede:
      "…szansa, że jest wśród nich ktoś o nazwisku z danej grupy, sięga połowy? Kropka to jedna " +
      "osoba w kolejce.",
    lfP3SetTop100: "ktoś ze 100 najczęstszych nazwisk listy",
    lfP3SetTop10: "ktoś z 10 najczęstszych nazwisk listy",
    lfP3SetTop1: "najczęstsze nazwisko listy",
    lfP3SetSubMale:
      "nosi je {s} mężczyzn z listy · szansa przy {n} {n:osobie|osobach|osobach}: {p}",
    lfP3SetSubFemale:
      "nosi je {s} kobiet z listy · szansa przy {n} {n:osobie|osobach|osobach}: {p}",
    lfP3QueueAxis: "osób w kolejce",
    // The plate III fact card in three sentences: one whose figure is missing
    // is left out, never printed with a blank or a zero.
    lfP3FactDistinct:
      "W losowym tłumie {cm} mężczyzn z listy jest średnio **{dm}** różnych nazwisk, a w tłumie " +
      "{cf} kobiet z listy — **{df}**.",
    lfP3FactAlone:
      "Nikogo o tym samym nazwisku nie ma w swoim tłumie średnio {sm} mężczyzn i {sf} kobiet.",
    lfP3FactReach:
      "Żeby szansa na spotkanie kogoś ze 100 " +
      "najczęstszych nazwisk listy sięgnęła połowy, wystarczy {a1} mężczyzn albo {a2} " +
      "{a2:kobieta|kobiety|kobiet}; dla 10 najczęstszych nazwisk — {b1} mężczyzn albo {b2} " +
      "{b2:kobieta|kobiety|kobiet}; dla najczęstszego nazwiska listy — {c1} mężczyzn albo {c2} " +
      "{c2:kobieta|kobiety|kobiet}.",
    lfP3Caveat:
      "Tłum to model: osoby losowane bez zwracania z jednej opublikowanej listy (nazwiska noszone " +
      "przez co najmniej 2 osoby, osoby żyjące, nazwisko aktualne) — prawdziwe tłumy nie są " +
      "losowe. „Średnio” to wartość oczekiwana dla losowego tłumu. Każdy przykładowy tłum to " +
      "jedno zapisane losowanie, a dwóch przykładowych tłumów nie należy ze sobą porównywać. " +
      "Nazwiska noszone przez 1 osobę nie są publikowane i nie są tu uwzględnione.",
    footer:
      "Każda liczba pochodzi z rejestru PESEL i jest podana razem z zakresem zbioru, datą i źródłem. Brak danych jest podany jako brak, nigdy jako zero.",
  },
  en: {
    title: "Name Atlas",
    tagline: "Honest, sourced answers about Polish surnames.",
    landingHeadline: "Every surname",
    landingHeadlineEm: "begins somewhere.",
    landingLede:
      "See what Poland's official register records about a surname — with the source and date " +
      "behind every figure, and an honest blank wherever the evidence runs out.",
    landingHint: "Exactly as it's written — Polish letters welcome.",
    searchLabel: "Surname",
    searchPlaceholder: "e.g. Nowak",
    searchAction: "Search",
    suggestionsAvailable: "Suggestions:",
    commonHeading: "Most common surnames",
    commonNote:
      "Positions in the PESEL register; the male and female lists are separate and never summed. As of",
    commonNoteUndated:
      "Positions in the PESEL register; the male and female lists are separate and never summed.",
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
    notesSummary: "How to read these figures",
    sourceSiteLink: "source website",
    searchAnother: "Search another surname",
    heroPeople: "people",
    heroNoCount: "This dataset publishes no count for this surname.",
    heroNotDerived:
      "The PESEL register lists this surname, but its figures have not been prepared yet.",
    heroRightsBlocked: "The count cannot be shown here because of the source's licence.",
    heroStrongestRegion: "Most registered in",
    heroInRegister: "people in the PESEL register",
    chapterCountTitle: "How many people have this surname?",
    chapterCountLede:
      "The PESEL register publishes two separate surname lists, male and female. We show each " +
      "figure on its own and never add them up.",
    chapterRarityTitle: "How rare is this surname?",
    chapterRarityLede:
      "“1 in X” means that roughly one in every X people on this list has this surname. The " +
      "bigger X, the rarer the name. The rank counts from the most common surname on the list.",
    chapterWhereTitle: "Where is it most often registered?",
    chapterWhereLede:
      "The map and the list show the voivodeships where people with this surname have a " +
      "registered permanent address. The darker the colour and the longer the bar, the bigger " +
      "the share.",
    chapterMeaningTitle: "What does this surname mean?",
    chapterMeaningLede: "We give a meaning only when a scholarly work supports it. We don't guess.",
    navLabel: "On this page",
    navCount: "Count",
    navRarity: "Rarity",
    navWhere: "Voivodeships",
    navMeaning: "Meaning",
    navSources: "Sources",
    rankCaption: "rank on the surname list",
    scaleLabel: "Rarity scale",
    scaleCommon: "more common",
    scaleRare: "rarer",
    rarityNotComparable:
      "Each 1-in-X is computed within its own dataset. The datasets are different sizes, so these " +
      "two figures are not compared with each other.",
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
    mapTitle: "Map of shares by voivodeship",
    mapLegend: "Share of people with a registered voivodeship, lowest first:",
    mapNotListed: "not listed in the dataset — not zero",
    mapNotListedShort: "not listed",
    mapHint: "Hover over or tap a voivodeship to see its figures.",
    regionColumn: "Voivodeship",
    countColumn: "Count",
    shareColumn: "Share",
    coveredNote:
      "Shares are of the people with a registered voivodeship, not of every bearer of the surname.",
    snapshotLabel: "As of",
    publisherLabel: "Publisher",
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
    lfEyebrow: "Surname atlas",
    lfTitle: "Two lists, three plates",
    lfLede:
      "Three plates about the published surname lists of the PESEL register: how surnames are " +
      "spread, when they repeat, and how many turn up in a crowd. The male list and the female " +
      "list are shown side by side and never summed.",
    lfScope:
      "Every figure describes one published list of the PESEL register: surnames borne by at " +
      "least 2 people, living persons, current surname. As\u00a0of\u00a0{date}",
    lfIndexLabel: "Plates",
    lfP1Short: "The typical surname and the typical person",
    lfP2Short: "When a surname repeats",
    lfP3Short: "How many surnames a crowd carries",
    lfSwitchLabel: "Which list",
    lfSwitchMale: "Male list",
    lfSwitchFemale: "Female list",
    lfSwitchNote: "separate lists, never summed",
    lfListMale: "Male list",
    lfListFemale: "Female list",
    lfListInMale: "male list",
    lfListInFemale: "female list",
    lfSource: "Source: {link} · as\u00a0of\u00a0{date}",
    lfSourceName: "PESEL register, dane.gov.pl",
    lfSourceTwo: "Source: PESEL register, dane.gov.pl ({male}, {female}) · as\u00a0of\u00a0{date}",
    lfMethod: "{status} · method {method}",
    lfP1No: "Plate I · Slide rule",
    lfP1TitleMale:
      "On the male list the typical surname has {s} {s:bearer|bearers}, and the typical man bears " +
      "one shared by {p} men.",
    lfP1TitleFemale:
      "On the female list the typical surname has {s} {s:bearer|bearers}, and the typical woman " +
      "bears one shared by {p} women.",
    lfP1Lede:
      "Rare surnames are many, but each has few bearers; common ones are few, but each is carried " +
      "by crowds. So the typical surname and the typical person's surname are two different " +
      "numbers — from the same list.",
    lfP1AxisNote: "bearers per surname · log scale",
    lfP1TopRow: "at least …% of surnames have at most this many bearers",
    lfP1BottomRowMale: "at least …% of men carry a surname with at most this many bearers",
    lfP1BottomRowFemale: "at least …% of women carry a surname with at most this many bearers",
    lfP1FlagSurname: "typical surname: {s} {s:bearer|bearers}",
    lfP1FlagPersonMale: "typical man: a surname of {p} men",
    lfP1FlagPersonFemale: "typical woman: a surname of {p} women",
    lfP1Omitted: "1 bearer: left out by the publisher",
    lfP1Max: "the list's most common surname",
    lfP1Arc: "one list, two questions",
    lfP1Rung: "{t}+: {n} {n:surname|surnames}",
    lfP1ThresholdsHeading: "How many surnames have at least…",
    lfP1ThresholdAtLeast: "{t}+ {t:bearer|bearers}",
    lfP1ThresholdSurnames: "{n} {n:surname|surnames}",
    lfP1ThresholdPeopleMale: "borne by {p} men",
    lfP1ThresholdPeopleFemale: "borne by {p} women",
    lfP1FigureMale:
      "Log scale of bearers per surname on the male list, from {min} to {max} bearers. Typical " +
      "surname: {s} {s:bearer|bearers}. Typical man: a surname of {p} men. Surnames: {surnames}. " +
      "Men: {people}.",
    lfP1FigureFemale:
      "Log scale of bearers per surname on the female list, from {min} to {max} bearers. Typical " +
      "surname: {s} {s:bearer|bearers}. Typical woman: a surname of {p} women. Surnames: " +
      "{surnames}. Women: {people}.",
    lfP1FigureSurnameQuantile: "at least {q} have at most {c} {c:bearer|bearers}",
    lfP1FigurePersonQuantile: "at least {q} carry a surname with at most {c} {c:bearer|bearers}",
    lfP1Fact:
      "The **typical surname** has {sm} {sm:bearer|bearers} on the male list and {sf} on the " +
      "female list: at least half the surnames on each list have at most that many. The **typical " +
      "man** bears a surname shared by {pm} men, the **typical woman** one shared by {pf} women: " +
      "at least half the people on each list carry a surname at least that common. The male list " +
      "counts {nm} people and {rm} surnames; the female list, {nf} people and {rf} surnames. The " +
      "male list's most common surname is borne by {xm} men; the female list's, by {xf} women.",
    lfP1Caveat:
      "Counted on the published list: surnames borne by at least 2 people, living persons, current " +
      "surname. The publisher leaves out surnames borne by 1 person, so they are not counted — " +
      "their absence is not zero. A median describes this list only. The male and female lists " +
      "are counted separately and never summed.",
    lfP2No: "Plate II · The room",
    lfP2Title: "How many people must walk in before a surname repeats?",
    lfP2Lede:
      "Two people drawn from the male list share a surname with a chance of about 1 in {om}; from " +
      "the female list, about 1 in {of}. How many people must walk into a room before the chance " +
      "that at least two share a surname reaches one half?",
    lfP2Answer: "{n:person|people} — the chance that at least two share a surname: {p}",
    lfP2Model: "Model: people drawn at random, without replacement, from this list.",
    lfP2XAxis: "people in the room",
    lfP2BirthdayTick: "birthdays",
    lfP2CurveFigure:
      "Chart: the chance that at least two of n people drawn from the {list} share a surname, for " +
      "n from {from} to {to}. It reaches one half at {n} people: {p}. At {bn} people: {p23}.",
    lfP2StripCaption:
      "{rooms} example {rooms:room|rooms}: each dot is one room, placed at the person with whom " +
      "its first pair sharing a surname arrived. Vertical line: {n} {n:person|people}.",
    lfP2StripFigure:
      "Example rooms ({list}): one dot per room, at the person with whom its first pair sharing a " +
      "surname arrived.",
    lfP2StripList: "Example rooms ({list}), in order: the person with whom the first pair arrived",
    lfP2RoomCaption:
      "In this draw, in the first of these rooms, the first pair arrived with person no. {b}: " +
      "people no. {a} and no. {b} share a surname.",
    lfP2RoomFigure:
      "Room ({list}): {b} {b:seat|seats} taken; people no. {a} and no. {b} are joined by a line " +
      "because they share a surname.",
    lfP2Birthday:
      "Birthdays (a model of 365 equally likely days): {bn} {bn:person|people}, {bp}. A shared " +
      "surname at {bn} people: {p23}.",
    lfP2LegendSeat: "person in the room",
    lfP2LegendEmpty: "empty seat",
    lfP2LegendPair: "first pair with the same surname",
    lfP2RoomHalf: "{n} {n:person|people}: a {p} chance",
    lfP2RoomHalfFigure:
      "A line after seat no. {n}: with {n} {n:person|people}, the chance that at least two share " +
      "a surname is {p}.",
    lfP2Fact:
      "**{nm} {nm:person|people}** from the male list are enough for the chance that at least two " +
      "share a surname to reach {pm}; with one person fewer it is {qm}. From the female list, " +
      "**{nf} {nf:person|people}**: {pf}, and with one fewer, {qf}. Two people picked at random " +
      "share a surname with a chance of about 1 in {om} on the male list and about 1 in {of} on " +
      "the female list.",
    lfP2FactBirthday:
      "For comparison, in a model of 365 equally likely birthdays {bn} {bn:person is|people are} " +
      "enough ({bp}); at {bn} people the chance of a shared surname is {p23m} on the male list and " +
      "{p23f} on the female list.",
    lfP2Caveat:
      "Model: people drawn at random, without replacement, from one published list (surnames " +
      "borne by at least 2 people, living persons, current surname). Real groups — families, classes, workplaces — are not random. " +
      "The example rooms are recorded draws, not real rooms. The {bn} for birthdays is the result " +
      "of a model of 365 equally likely days, not PESEL data.",
    lfP3No: "Plate III · The crowd",
    lfP3TitleThousandMale:
      "A thousand strangers from the male list: {d} different {d:surname|surnames} on average",
    lfP3TitleThousandFemale:
      "A thousand strangers from the female list: {d} different {d:surname|surnames} on average",
    lfP3TitleMale:
      "{c} strangers from the male list: {d} different {d:surname|surnames} on average",
    lfP3TitleFemale:
      "{c} strangers from the female list: {d} different {d:surname|surnames} on average",
    lfP3LedeMale:
      "Draw {c} {c:person|people} from the male list and look at their surnames. A dot is one " +
      "person; a line joins people who share a surname.",
    lfP3LedeFemale:
      "Draw {c} {c:person|people} from the female list and look at their surnames. A dot is one " +
      "person; a line joins people who share a surname.",
    lfP3Distinct: "different surnames — the average over random crowds of {c}",
    lfP3Alone: "of people with nobody else of the same surname — on average",
    lfP3Example:
      "In this draw: {d} different {d:surname|surnames}, {w} {w:person|people} with nobody else of " +
      "the same surname.",
    lfP3CrowdFigure:
      "An example crowd of {n} {n:person|people} from the {list}, one dot per person. {example}",
    lfP3LegendDot: "1 dot = 1 person",
    lfP3LegendAlone: "the only one with that surname",
    lfP3LegendShared: "a surname shared in the crowd",
    lfP3SparkTitle: "The bigger the crowd, the more slowly new surnames arrive",
    lfP3SparkLine: "different surnames, on average",
    lfP3SparkRef: "if everyone had a different surname",
    lfP3SparkAxis: "people in the crowd · both axes on a log scale",
    lfP3SparkFigure: "Average number of different surnames in a random crowd ({list}): {values}.",
    lfP3SparkPoint: "{n} {n:person|people}: {d}",
    lfP3LanesTitle: "After how many strangers…",
    lfP3LanesLede:
      "…does the chance that one of them carries a surname from the group reach one half? A dot is " +
      "one person in the queue.",
    lfP3SetTop100: "someone with one of the list's 100 most common surnames",
    lfP3SetTop10: "someone with one of the list's 10 most common surnames",
    lfP3SetTop1: "the list's most common surname",
    lfP3SetSubMale: "carried by {s} of the men on the list · the chance at {n}: {p}",
    lfP3SetSubFemale: "carried by {s} of the women on the list · the chance at {n}: {p}",
    lfP3QueueAxis: "people in the queue",
    lfP3FactDistinct:
      "In a random crowd of {cm} men from the list there are on average **{dm}** different " +
      "surnames; in a crowd of {cf} women from the list, **{df}**.",
    lfP3FactAlone:
      "On average {sm} of the men and {sf} of the women have nobody else of the same surname in " +
      "their crowd.",
    lfP3FactReach:
      "For the chance of " +
      "meeting someone with one of the list's 100 most common surnames to reach one half, {a1} men " +
      "or {a2} women are enough; for the 10 most common, {b1} men or {b2} women; for the list's " +
      "most common surname, {c1} men or {c2} women.",
    lfP3Caveat:
      "The crowd is a model: people drawn at random, without replacement, from one published list " +
      "(surnames borne by at least 2 people, living persons, current surname) — real crowds are " +
      "not random. “On average” is the expected value for a random crowd. Each example " +
      "crowd is one recorded draw, and the two example crowds are not to be compared with each " +
      "other. Surnames borne by 1 person are not published and are not included here.",
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
  NOT_DERIVED_YET: {
    pl: "Rejestr PESEL zawiera to nazwisko, ale jego liczby nie zostały jeszcze opracowane.",
    en: "The PESEL register lists this surname, but its figures have not been prepared yet.",
  },
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
