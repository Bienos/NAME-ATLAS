/**
 * The words the free result page renders (TASK-017), and the landing atlas's
 * (TASK-040; six plates since TASK-043, seven since TASK-044).
 *
 * Pure: strings in, strings out. No database, no React, no request. That is
 * deliberate — every honesty rule this page must keep is then a unit test
 * rather than a review comment, and the page itself becomes a layout.
 *
 * The result page's sentences are **verbatim from
 * `docs/contracts/surname-result.md`**, where the project owner accepted them.
 * The `lf*` strings are the landing atlas's own (TASK-040, TASK-043, TASK-044),
 * written for `list-atlas.tsx` under the list-facts contract's rules (every
 * figure names its list; the two lists are never summed; a change is stated,
 * never its cause). Neither set is paraphrased here,
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
import type {
  ArchivePeriod,
  ArchiveSection,
  Bearer,
  BearersSection,
  ChangeEntry,
  DistributionEntry,
  LocalitiesSection,
  LocalityEntry,
  LocalityKind,
  OtherForm,
  OtherSpelling,
  PopulationObservation,
  RarityEntry,
} from "@name-atlas/contracts";

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

/**
 * A stored difference with its sign (TASK-044): `+1 318 492`, `−5` (a minus
 * sign, not a hyphen), `0`. Grouped like {@link formatInteger}. It formats a
 * difference the artefact stores; it never takes one.
 */
export function formatSigned(value: number, lang: Lang): string {
  if (value > 0) return `+${formatInteger(value, lang)}`;
  if (value < 0) return `−${formatInteger(Math.abs(value), lang)}`;
  return formatInteger(0, lang);
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
 * The archive sentence (TASK-054, ADR-0024 §2.5): how many pages and catalogue
 * records Polona's search returned for the word, and when. Never people, never
 * mentions of a family; the chapter's caveat says what a match is. Zero is an
 * answer and is said as one. Null when the section holds no search.
 */
export function archiveSentence(
  section: ArchiveSection,
  surname: string,
  lang: Lang,
): string | null {
  if (
    section.state !== "READY" ||
    section.pages === null ||
    section.catalogue_records === null ||
    section.searched_on === null
  ) {
    return null;
  }
  const date = formatDate(section.searched_on, lang);
  if (section.pages === 0 && section.catalogue_records === 0) {
    return terminate(
      lang === "pl"
        ? `Wyszukiwarka Polony nie zwróciła żadnego wyniku dla słowa ${surname} (wyszukiwanie z ${date})`
        : `Polona's search returned no result for the word ${surname} (searched on ${date})`,
    );
  }
  const pages = formatInteger(section.pages, lang);
  const records = formatInteger(section.catalogue_records, lang);
  if (lang === "pl") {
    const onPages = section.pages === 1 ? "stronie" : "stronach";
    const inRecords = section.catalogue_records === 1 ? "rekordzie" : "rekordach";
    return terminate(
      `Słowo ${surname} występuje na ${pages} ${onPages} dzieł niechronionych prawem autorskim i w ` +
        `${records} ${inRecords} katalogu Polony (wyszukiwanie z ${date})`,
    );
  }
  return terminate(
    `The word ${surname} appears on ${pages} ${section.pages === 1 ? "page" : "pages"} of works ` +
      `not under copyright and in ${records} catalogue ${section.catalogue_records === 1 ? "record" : "records"} ` +
      `in Polona (searched on ${date})`,
  );
}

/**
 * The bearers sentence (TASK-073, ADR-0030): how many people Wikidata names
 * with exactly this surname and an article in a Wikipedia, and when it was
 * asked. Zero is an answer and is said as one. Null when the section holds no
 * answer.
 */
export function bearersSentence(
  section: BearersSection,
  surname: string,
  lang: Lang,
): string | null {
  if (section.state !== "READY" || section.total === null || section.searched_on === null) {
    return null;
  }
  const date = formatDate(section.searched_on, lang);
  if (section.total === 0) {
    return terminate(
      lang === "pl"
        ? `Wikidane nie wymieniają nikogo o nazwisku ${surname}, kto ma artykuł w Wikipedii (stan z ${date})`
        : `Wikidata lists nobody with the surname ${surname} who has a Wikipedia article (as of ${date})`,
    );
  }
  const n = formatInteger(section.total, lang);
  return terminate(
    lang === "pl"
      ? `Wikidane wymieniają ${n} ${pluralPl(section.total, "osobę", "osoby", "osób")} o nazwisku ${surname} z artykułem w Wikipedii (stan z ${date})`
      : `Wikidata lists ${n} ${section.total === 1 ? "person" : "people"} with the surname ${surname} who ${section.total === 1 ? "has" : "have"} a Wikipedia article (as of ${date})`,
  );
}

/** A person's years as Wikidata states them: "1863–1942", "ur. 1973", or nothing. */
export function bearerYears(person: Bearer, lang: Lang): string | null {
  if (person.born !== null && person.died !== null) {
    return `${String(person.born)}–${String(person.died)}`;
  }
  if (person.born !== null) return `${UI[lang].bearersBorn} ${String(person.born)}`;
  if (person.died !== null) return `† ${String(person.died)}`;
  return null;
}

/** A period of publication as a reader says it: `przed 1800`, `1800–1849`, `od 1940`. */
export function archivePeriodLabel(period: ArchivePeriod, lang: Lang): string {
  if (period.from_year === null && period.to_year !== null) {
    return lang === "pl"
      ? `przed ${String(period.to_year + 1)}`
      : `before ${String(period.to_year + 1)}`;
  }
  if (period.to_year === null && period.from_year !== null) {
    return lang === "pl" ? `od ${String(period.from_year)}` : `${String(period.from_year)} on`;
  }
  return `${String(period.from_year ?? "")}–${String(period.to_year ?? "")}`;
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
 * The other grammatical form's line (ADR-0025 §2.5): its count and place on its
 * own list, with the list's date. It states a form, never a relation.
 */
export function otherFormSentence(other: OtherForm, lang: Lang): string {
  const sex = parenthetical(partitionLabel(other.comparability_group, lang));
  const count = formatInteger(other.count, lang);
  const rank = formatInteger(other.rank, lang);
  const on = formatDate(other.snapshot_date, lang);
  return terminate(
    lang === "pl"
      ? `${other.surname.display_name}${sex}: ${count} ${other.count === 1 ? "osoba" : "osób"}, miejsce ${rank} na liście nazwisk na dzień ${on}`
      : `${other.surname.display_name}${sex}: ${count} ${other.count === 1 ? "person" : "people"}, rank ${rank} on the surname list on ${on}`,
  );
}

/**
 * The other spelling's line (TASK-131), as a question: "Szukasz WIŚNIEWSKI?"
 * then its count on its own list, with the list's date. In three parts, so the
 * page can link the name. It asks; it never says the reader misspelled, and it
 * states no relation between the two surnames' bearers.
 */
export function otherSpellingParts(
  other: OtherSpelling,
  lang: Lang,
): { readonly lead: string; readonly name: string; readonly rest: string } {
  const sex = parenthetical(partitionLabel(other.comparability_group, lang));
  const count = formatInteger(other.count, lang);
  const on = formatDate(other.snapshot_date, lang);
  const name = other.surname.display_name;
  return lang === "pl"
    ? {
        lead: "Szukasz ",
        name,
        rest: terminate(
          `? ${count} ${pluralPl(other.count, "osoba", "osoby", "osób")}${sex} w rejestrze PESEL na dzień ${on}`,
        ),
      }
    : {
        lead: "Looking for ",
        name,
        rest: terminate(
          `? ${count} ${other.count === 1 ? "person" : "people"}${sex} in the PESEL register on ${on}`,
        ),
      };
}

/**
 * Polona's own names for its catalogue's kinds, in English. The Polish page
 * shows them as Polona prints them; an unknown one is shown as printed.
 */
const POLONA_CATEGORY_EN: Readonly<Record<string, string>> = {
  Czasopisma: "Periodicals",
  Książki: "Books",
  Nuty: "Sheet music",
  "Druki ulotne": "Ephemera",
  Artykuły: "Articles",
  Fotografia: "Photographs",
  Rękopisy: "Manuscripts",
  "Mapy i Atlasy": "Maps and atlases",
  Pocztówki: "Postcards",
  Ebooki: "E-books",
  "Grafika i Rysunek": "Prints and drawings",
  Prasa: "Newspapers",
  Dokumenty: "Documents",
  Muzealia: "Museum objects",
  Audiobooki: "Audiobooks",
  Mikrofilmy: "Microfilms",
};

export function archiveCategoryLabel(label: string, lang: Lang): string {
  return lang === "en" ? (POLONA_CATEGORY_EN[label] ?? label) : label;
}

/**
 * A change in per cent as the claim stores it (already one decimal, already
 * rounded): with its sign, a true minus and one decimal, `+6,0%` / `−6.7%` /
 * `0,0%`. Display only; it formats a figure the claim carries and takes none.
 */
export function formatPercentChange(percent: number, lang: Lang): string {
  const fixed = Math.abs(percent).toFixed(1);
  const number = lang === "pl" ? fixed.replace(".", ",") : fixed;
  if (Number(fixed) === 0) return `${number}%`;
  return `${percent > 0 ? "+" : "−"}${number}%`;
}

/** Which list a change entry is of, in the words the count's own label uses. */
export function changeListLabel(list: ChangeEntry["list"], lang: Lang): string {
  return list === "MALE"
    ? lang === "pl"
      ? "mężczyźni"
      : "male"
    : lang === "pl"
      ? "kobiety"
      : "female";
}

/**
 * The accepted change sentence (TASK-051, ADR-0020): what changed, between which
 * two editions, and what the whole list did over the same editions. Never why,
 * and never a word of popularity, decline or fashion — a number went from one
 * value to another, and the list it is counted in moved too.
 */
export function changeSentence(entry: ChangeEntry, surname: string, lang: Lang): string {
  const { first, last, count_change_percent, list_change_percent } = entry.summary;
  const sex = parenthetical(changeListLabel(entry.list, lang));
  const from = formatDate(first.data_date, lang);
  const to = formatDate(last.data_date, lang);
  const list = formatPercentChange(list_change_percent, lang);
  if (first.count === last.count) {
    const count = formatInteger(first.count, lang);
    return `${terminate(
      lang === "pl"
        ? `Liczba osób o nazwisku ${surname}${sex} w rejestrze PESEL była taka sama (${count}) na dzień ${from} i na dzień ${to}`
        : `The number of people with the surname ${surname}${sex} in the PESEL register was the same (${count}) on ${from} and on ${to}`,
    )} ${terminate(
      lang === "pl"
        ? `Cała lista zmieniła się między tymi edycjami o ${list}`
        : `The whole list changed by ${list} between those editions`,
    )}`;
  }
  const a = formatInteger(first.count, lang);
  const b = formatInteger(last.count, lang);
  const change = formatPercentChange(count_change_percent, lang);
  return `${terminate(
    lang === "pl"
      ? `Liczba osób o nazwisku ${surname}${sex} w rejestrze PESEL zmieniła się z ${a} na dzień ${from} na ${b} na dzień ${to}: ${change}`
      : `The number of people with the surname ${surname}${sex} in the PESEL register changed from ${a} on ${from} to ${b} on ${to}: ${change}`,
  )} ${terminate(
    lang === "pl"
      ? `Cała lista zmieniła się między tymi edycjami o ${list}`
      : `The whole list changed by ${list} between those editions`,
  )}`;
}

/** Why an edition the publisher lists is not one of the table's rows. */
export function changeGapNote(date: string, lang: Lang): string {
  const when = formatDate(date, lang);
  return lang === "pl"
    ? `Plik wydawcy z dnia ${when} powtarza dane poprzedniej edycji, więc nie jest pokazany jako osobna edycja.`
    : `The publisher's file dated ${when} repeats the data of the previous edition, so it is not shown as an edition of its own.`;
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
    landingHeadlineEm: "gdzieś się zaczęło.",
    landingLede:
      "Wpisz nazwisko. Sprawdź, ile osób je nosi, jak jest rzadkie, skąd może pochodzić i skąd " +
      "to wiemy.",
    landingHint: "Wpisz dokładnie tak, jak się pisze — z polskimi znakami.",
    // The dusk hero (TASK-052): the register line above the headline, the
    // status line while a search leaves the page, and the two promises.
    landingEyebrow: "Rejestr PESEL",
    landingAsOf: "stan na",
    landingSearching: "Sprawdzamy rejestr PESEL…",
    landingTrust: "Źródło przy każdym fakcie · Brak danych to też odpowiedź",
    // The family tree's two ways in from the landing (TASK-084), shown only when the tree is on.
    landingTreeLine: "Chcesz zapisać swoją rodzinę?",
    landingTreeStart: "Zacznij drzewo rodzinne",
    landingTreeSignIn: "Zaloguj się",
    landingTreeEyebrow: "Drzewo rodzinne",
    landingTreeHeading: "Twoje drzewo zaczyna się od Ciebie.",
    landingTreePoints: [
      "Dodajesz rodziców, dziadków i pradziadków, po jednym pytaniu na ekranie.",
      "Żyjące osoby widzisz tylko Ty, dopóki ich nie udostępnisz.",
      "Miejsca urodzenia sprawdzamy w rejestrze TERYT.",
    ],
    landingTreeGoogle: "Zacznij z Google",
    landingTreeOther: "Inny sposób",
    landingTreeMore: "Jak działa drzewo",
    landingTreeFree: "Darmowe konto. Bez karty płatniczej.",
    // The second screen (TASK-065): what you get, in plain commercial terms,
    // then the surnames to try, the example's cards and the offer's strip.
    pitchEyebrow: "Co dostaniesz · za darmo · bez konta",
    pitchHeading: "Wpisz nazwisko i dostań karty z odpowiedziami.",
    pitchLede:
      "Name Atlas czyta rejestr PESEL i zbiory Polony i odpowiada na sześć pytań o nazwisko. " +
      "Każda odpowiedź to jedna karta z datą i źródłem: do przeczytania, udostępnienia albo " +
      "zapisania na telefonie.",
    pitchAnswers: [
      ["Ile osób je nosi?", "Liczba z rejestru PESEL, osobno dla kobiet i mężczyzn."],
      ["Jak jest rzadkie?", "Miejsce na liście i „1 na X” na tle całej listy."],
      ["Gdzie jest najczęstsze?", "Mapa województw, z udziałem każdego z nich."],
      [
        "Jak zmieniało się od 2019 r.?",
        "Liczba w każdym wydaniu listy, rok po roku, obok zmiany całej listy.",
      ],
      ["Co może znaczyć?", "Hasło ze słownika, gdy je ma, ze słowem pewności."],
      [
        "Gdzie jest w dawnych drukach?",
        "Strony z Polony według okresu i miejsca wydania, z cytatem.",
      ],
    ],
    pitchNote: "Tam, gdzie źródła milczą, karta mówi to wprost. Brak danych to też odpowiedź.",
    landingTry: "Spróbuj:",
    previewLede: "Trzy z kart dla nazwiska",
    previewAll: "Zobacz wszystkie karty:",
    offerHeading: "Dziś za darmo. Wkrótce więcej.",
    offerAll: "Cała oferta",
    offerWaitlist: "Zapisz się na listę oczekujących",
    // The journey (TASK-053). What the one request reads while the camera comes
    // down: each line is a part of the answer it fetches, none is ticked off.
    analysisLabel: "Co sprawdzamy",
    analysisSteps: [
      "Sprawdzamy rejestr PESEL",
      "Odczytujemy rzadkość",
      "Sprawdzamy województwa",
      "Szukamy znaczenia",
    ],
    // The question that leads from the last chapter to the evidence, and the
    // journey's last screen.
    chapterSourcesQuestion: "Skąd to wiemy?",
    summaryHeading: "Twój wynik",
    summaryLede:
      "Liczby, rzadkość, mapa i zmiana na jednej karcie, każda z datą i źródłem. Udostępnij ją albo zapisz.",
    summaryCardAlt: "Karta nazwiska z liczbami z rejestru PESEL",
    saveImage: "Zapisz obraz",
    // The landing's last two sections, after the atlas (TASK-053).
    landingHowPoints: [
      "Każda liczba ma źródło i datę.",
      "Brak danych to też odpowiedź.",
      "Mówimy o nazwisku, nie o Twojej rodzinie.",
    ],
    landingHowMore: "Skąd są liczby i co znaczą słowa pewności",
    // The site's header (TASK-052).
    siteNavLabel: "Nawigacja",
    navAtlas: "Atlas",
    navCompare: "Porównaj",
    navHow: "Jak to działa",
    navOffer: "Oferta",
    navAccount: "Konto",
    // Only when the baby-names page is on (TASK-143).
    navBabyNames: "Imiona dla dziecka",
    // Only when the family tree is on (TASK-076).
    navTrees: "Drzewa",
    // The deck's last card, to the offer (TASK-057).
    deckOffer: "Więcej: Twoja rodzina i DNA",
    // The footer's blog and social links (TASK-057).
    followLabel: "Blog i media społecznościowe",
    // The blog (TASK-071).
    blogTitle: "Blog",
    blogLede: "Wpisy o polskich nazwiskach i o Name Atlas.",
    blogEmpty: "Nie ma jeszcze żadnych wpisów.",
    blogListLabel: "Wpisy",
    blogBack: "Wszystkie wpisy",
    // The blog's redesign (TASK-075). The two headings name the posts' own
    // sections, which get their own styling.
    blogMore: "Więcej wpisów",
    blogFaqHeading: "Najczęstsze pytania",
    blogSourcesHeading: "Źródła",
    blogCtaTitle: "Sprawdź swoje nazwisko",
    blogCtaBody:
      "Zobacz, ile osób nosi je dziś, jak jest rzadkie i gdzie występuje najczęściej. Za darmo i bez konta.",
    navMenu: "Menu",
    langNamePl: "Polski",
    langNameEn: "English",
    searchLabel: "Nazwisko",
    breadcrumbLabel: "Ścieżka nawigacyjna",
    searchPlaceholder: "np. Zaremba",
    searchAction: "Odkryj",
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
      "na pobyt stały. Im jaśniejszy kolor i dłuższy pasek, tym większy udział.",
    chapterChangeTitle: "Jak zmieniała się ta liczba w kolejnych edycjach listy?",
    chapterChangeLede:
      "Rejestr PESEL publikuje swoje listy co roku. Pokazujemy liczbę osób o tym nazwisku na " +
      "każdej edycji, obok tego, jak zmieniła się cała lista. Mówimy, co się zmieniło — nie dlaczego.",
    chapterMeaningTitle: "Co oznacza to nazwisko?",
    chapterMeaningLede:
      "Znaczenie podajemy tylko wtedy, gdy stoi za nim opracowanie naukowe. Nie zgadujemy.",
    // TASK-054: the archive chapter (ADR-0024).
    chapterArchiveTitle: "Gdzie pojawia się w dawnych drukach?",
    chapterArchiveLede:
      "Polona, cyfrowa biblioteka Biblioteki Narodowej, przeszukuje swój katalog i tekst " +
      "zeskanowanych stron. Pokazujemy, ile wyników zwraca dla tego słowa i z jakich lat.",
    archiveWordCaveat:
      "To wyniki wyszukiwania słowa w każdej odmianie. Mogą dotyczyć innego znaczenia tej " +
      "samej pisowni i nie są liczbą osób ani wzmianek o czyjejś rodzinie.",
    archiveByPeriod: "Strony według daty wydania",
    archiveByPlace: "Najczęstsze miejsca wydania",
    archiveExamples: "Przykładowe strony z domeny publicznej",
    archiveOpen: "Otwórz stronę w Polonie",
    archivePage: "s.",
    archiveNotSearched: "Tego nazwiska jeszcze nie sprawdziliśmy w zbiorach Polony.",
    archiveUnavailable: "Wyników z Polony nie można teraz pokazać.",
    archiveBlocked: "Wyników z Polony nie można pokazać tutaj z powodu licencji źródła.",
    // TASK-090: localities with the same name (ADR-0025 §2.7).
    chapterPlacesTitle: "Które miejscowości tak się nazywają?",
    chapterPlacesLede:
      "Rejestr TERYT, urzędowy wykaz miejscowości, zawiera miejscowości o nazwie takiej samej " +
      "jak to nazwisko. Pokazujemy je z gminą, powiatem i województwem.",
    placesNote:
      "Zbieżność nazw w rejestrze. Nie mówi ona, skąd wzięło się nazwisko, ani że ma ono " +
      "związek z tymi miejscami.",
    placesWhole:
      "Tylko miejscowości samodzielne według SIMC, bez części miejscowości, pod nazwą urzędową " +
      "z rejestru.",
    placesCity: "miasto",
    placesVillage: "wieś",
    placesOther: "inna miejscowość",
    // TASK-073: known people with the surname, from Wikidata (ADR-0030).
    chapterBearersTitle: "Kto znany nosi to nazwisko?",
    chapterBearersLede:
      "Wikidane, otwarta baza wiedzy powiązana z Wikipedią, wymieniają osoby o tym nazwisku. " +
      "Najpierw pokazujemy obywateli Polski, a wśród nich te osoby, o których napisano " +
      "najwięcej artykułów w Wikipediach.",
    bearersCaveat:
      "To samo nazwisko nie oznacza pokrewieństwa. Wikidane redagują wolontariusze, więc " +
      "mogą zawierać błędy.",
    bearersBorn: "ur.",
    bearersNoDeath: "bez daty śmierci w Wikidanych",
    bearersArticle: "Wikipedia",
    bearersMore: "Pozostałe osoby ({n}) pokażemy w raporcie „Nazwisko i rodzina”.",
    bearersRemoval: "Jesteś na tej liście i nie chcesz na niej być? Napisz do nas.",
    bearersNotSearched: "Tego nazwiska jeszcze nie sprawdziliśmy w Wikidanych.",
    bearersUnavailable: "Listy znanych osób nie można teraz pokazać.",
    bearersBlocked: "Listy znanych osób nie można pokazać tutaj z powodu licencji źródła.",
    navLabel: "Na tej stronie",
    navCount: "Liczba osób",
    navRarity: "Rzadkość",
    navWhere: "Województwa",
    navMeaning: "Znaczenie",
    navChange: "Zmiany w czasie",
    navArchive: "W archiwach",
    navPlaces: "Miejscowości",
    navBearers: "Znane osoby",
    navSources: "Źródła",
    rankCaption: "miejsce na liście nazwisk",
    neighboursHeading: "Sąsiedzi na liście",
    neighboursNote:
      "Dwa miejsca wyżej i dwa niżej na tej samej liście. Nazwiska z tą samą liczbą osób " +
      "dzielą miejsce.",
    neighboursSelf: "to nazwisko",
    otherFormHeading: "Druga forma gramatyczna",
    otherFormNote:
      "To samo nazwisko w drugim rodzaju gramatycznym, na drugiej liście. Nie mówi nic " +
      "o pokrewieństwie.",
    archiveByCategory: "Rekordy katalogu według rodzaju",
    deckOpen: "Zobacz karty",
    deckClose: "Cała strona",
    deckLabel: "Karty nazwiska",
    deckCards: "Karty",
    deckOf: "z",
    deckPrev: "Poprzednia karta",
    deckNext: "Następna karta",
    deckHintKeys: "Strzałki ← → · Esc: cała strona",
    deckHintTouch: "Przesuń kartę lub dotknij jej krawędzi",
    deckHello: "Nazwisko",
    deckHelloEyebrow: "Twoje nazwisko",
    deckPeopleInRegister: "osób w rejestrze PESEL",
    deckRarity: "Rzadkość",
    deckRarityHeading: "Mniej więcej jedna na tyle osób z listy nosi to nazwisko.",
    deckNeighbours: "Sąsiedzi",
    deckNeighboursHeading: "Tuż obok na liście nazwisk.",
    deckWhere: "Województwa",
    deckWhereHeading: "Gdzie mieszka najwięcej osób z tym nazwiskiem?",
    deckWhereTop: "Najwięcej",
    deckChange: "Zmiany w czasie",
    deckChangeSurname: "to nazwisko",
    deckChangeList: "cała lista",
    deckChangeWhy: "Mówimy, co się zmieniło, nie dlaczego.",
    deckOther: "Druga forma",
    deckOtherHeading: "Na drugiej liście to nazwisko ma formę",
    deckMeaning: "Znaczenie",
    deckInterpretation: "interpretacja",
    deckPrint: "Dawne druki",
    deckBearers: "Znane osoby",
    deckPrintPages: "stron dzieł w domenie publicznej",
    deckCatalogue: "W katalogu",
    deckCatalogueHeading: "Rekordy katalogu Polony, w których pada to słowo.",
    deckCatalogueTotal: "rekordów łącznie",
    deckPlaces: "Miejscowości",
    deckPlacesHeading: "Miejscowości w rejestrze TERYT o tej samej nazwie.",
    deckEnd: "Podsumowanie",
    deckEndHeading: "w liczbach.",
    deckFullPage: "Zobacz całą stronę",
    deckCompareForms: "Porównaj obie formy",
    deckShare: "Udostępnij kartę",
    // The share studio (TASK-093, ADR-0034).
    deckFinish: "Twoja karta jest gotowa",
    studioTitle: "Udostępnij kartę",
    studioHeading: "Twoja karta",
    studioCards: "Wybierz kartę",
    studioImageAlt: "Karta nazwiska do udostępnienia",
    studioPreviewMark: "Podgląd · Name Atlas",
    studioShare: "Udostępnij",
    studioDownload: "Pobierz",
    studioGallery: "Zapisz w galerii",
    studioGalleryHint: "Wybierz „Zapisz obraz”.",
    studioWorking: "Przygotowuję…",
    studioFailed: "Nie udało się. Spróbuj jeszcze raz.",
    studioInstagram:
      "Na Instagramie: udostępnij z telefonu albo pobierz i wyślij obraz na telefon.",
    studioSignInPrompt: "Zaloguj się, aby pobrać i udostępnić kartę.",
    studioSignIn: "Zaloguj się",
    studioSignUp: "Załóż konto",
    studioUnavailable: "Pobieranie jest chwilowo niedostępne. Spróbuj za chwilę.",
    studioBack: "Wróć do kart",
    studioMore: "Co dalej",
    // The page link's share, beside the card's own "Udostępnij".
    studioShareLink: "Udostępnij link",
    // The share video (TASK-097).
    studioVideo: "Pobierz wideo",
    studioVideoWorking: "Tworzę wideo… {n}%",
    studioVideoCancel: "Anuluj",
    studioVideoFailed: "Nie udało się utworzyć wideo.",
    studioPdf: "Pobierz jednostronicowy PDF",
    videoHook: "Ile osób nosi to nazwisko?",
    studioVideoLength: "Długość",
    studioVideoShort: "Krótkie (ok. 7 s)",
    studioVideoFull: "Pełne (wszystkie karty)",
    studioVideoMotion: "Przejścia",
    studioVideoUp: "Z dołu",
    studioVideoSide: "Z boku",
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
    limitationArchiveWord:
      "Liczby z Polony to wyniki wyszukiwania słowa w każdej odmianie, w katalogu i w tekście " +
      "stron dzieł, które nie są chronione prawem autorskim; nie każdy wynik dotyczy nazwiska.",
    limitationBearersFamily:
      "Osoby z Wikidanych mają to samo nazwisko; to nie znaczy, że są ze sobą ani z kimkolwiek " +
      "spokrewnione. Brak daty śmierci w Wikidanych nie oznacza, że ktoś żyje.",
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
    // The comparison's picker (TASK-052): two surnames typed as they are written.
    compareHeading: "Porównaj dwa nazwiska",
    compareIntro:
      "Wpisz dwa nazwiska. Zestawimy ich liczby, rzadkość i województwa z tego samego zbioru " +
      "i z tą samą datą.",
    compareFirstLabel: "Pierwsze nazwisko",
    compareSecondLabel: "Drugie nazwisko",
    compareAction: "Porównaj",
    compareNeedsTwo: "Wpisz oba nazwiska, tak jak się je pisze.",
    compareFromHere: "Porównaj z innym nazwiskiem",
    // The couple report (TASK-100, ADR-0035): two surnames' facts side by side,
    // no score. `couple-view.test.ts` holds these to §3.4's wording rules.
    coupleHeading: "Wasze nazwiska razem",
    coupleIntro:
      "Wpiszcie oba nazwiska. Zestawimy obok siebie to, co rejestr i źródła mówią o każdym " +
      "z nich osobno.",
    coupleAction: "Pokaż",
    coupleNote:
      "Każde nazwisko opisujemy osobno, z jego własnych danych. Nie liczymy niczego z dwóch " +
      "nazwisk razem.",
    coupleNamesHeading: "Nazwiska, które możecie nosić",
    coupleNamesNote:
      "Każde nazwisko sprawdzamy osobno w rejestrze PESEL. Liczby z list mężczyzn i kobiet " +
      "nie są sumowane.",
    coupleNotListed: "Nie ma go na liście PESEL",
    coupleWhereHeading: "Gdzie mieszka każde nazwisko",
    coupleCommonHeading: "Jak częste jest każde nazwisko i jak się zmienia",
    coupleMeaningHeading: "Co znaczy każde nazwisko",
    coupleBearersHeading: "Znane osoby i miejscowości o tych nazwiskach",
    coupleCompareLink: "Porównanie tych dwóch nazwisk",
    // The page for an address that does not exist (TASK-052).
    notFoundHeading: "Nie ma takiej strony",
    notFoundBody:
      "Adres mógł się zmienić albo zawierać literówkę. Wpisz nazwisko, którego szukasz.",
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
    changeTableLabel: "Liczba osób na kolejnych edycjach listy",
    changeEditionColumn: "Stan na dzień",
    changeShareColumn: "Udział w liście",
    changeCountColumn: "Liczba osób",
    changeNotOnList: "brak na liście — nie oznacza zera",
    changeNoteMark: "zob. uwaga pod tabelą",
    changeListNote:
      "Rozmiar samej listy zmienia się między edycjami, dlatego obok liczby osób pokazujemy udział " +
      "w liście danej edycji („1 na X”).",
    change2019Note:
      "Pliki z 2019 roku opisują swoją zawartość krótszym opisem niż późniejsze. Czytamy je jako " +
      "tę samą listę: osoby z nazwiskiem aktualnym.",
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
    // --- The landing atlas (TASK-040; six plates since TASK-043, seven since
    // TASK-044). Every figure arrives from `listFacts()`; these are the words
    // around it. A line that carries one list's figures names that list, and
    // nothing here adds the two lists up. A named surname is the artefact's
    // published string, linked to its search answer (ADR-0019 §2.6).
    lfEyebrow: "Rejestr PESEL · wydanie {year}",
    lfTitle: "Atlas nazwisk",
    lfLede:
      "Siedem plansz o nazwiskach z rejestru PESEL (stan na {date}). Mężczyźni i kobiety są w " +
      "nim na dwóch osobnych listach: przełącz listę, a plansze I–V i VII pokażą tę listę, a " +
      "plansza VI porówna obie. Nigdy ich nie sumujemy.",
    lfScope:
      "Każda liczba opisuje jedną opublikowaną listę rejestru PESEL: nazwiska noszone przez co " +
      "najmniej 2 osoby, osoby żyjące, nazwisko aktualne. Plansza VII zestawia też wcześniejsze " +
      "wydania tej samej listy. Stan\u00a0na\u00a0{date}",
    lfSwitchLabel: "Która lista",
    lfSwitchMale: "Mężczyźni",
    lfSwitchFemale: "Kobiety",
    lfSwitchNote: "osobne listy, nigdy sumowane",
    lfListInMale: "lista mężczyzn",
    lfListInFemale: "lista kobiet",
    lfSource: "Źródło: {link} · stan\u00a0na\u00a0{date}",
    lfSourceName: "rejestr PESEL, dane.gov.pl",
    lfSourceTwo: "Źródło: rejestr PESEL, dane.gov.pl ({male}, {female}) · stan\u00a0na\u00a0{date}",
    lfSourceEditions: "Źródło: {link} · wydania z {date}",
    lfSourceEditionsTwo: "Źródło: rejestr PESEL, dane.gov.pl ({male}, {female}) · wydania z {date}",
    lfMethod: "{status} · metoda {method}",
    lfPlate: "Plansza",
    // Plate I: the constellation.
    lfP1Name: "Gwiazdozbiór",
    lfP1Title: "Każde nazwisko to jeden punkt.",
    lfP1SurnamesMale: "{n:nazwisko|nazwiska|nazwisk} na liście mężczyzn",
    lfP1SurnamesFemale: "{n:nazwisko|nazwiska|nazwisk} na liście kobiet",
    lfP1PeopleMale: "{n:mężczyzna|mężczyzn|mężczyzn} na liście",
    lfP1PeopleFemale: "{n:kobieta|kobiety|kobiet} na liście",
    lfP1CoreMale: "W środku najczęstsze nazwiska listy mężczyzn:",
    lfP1CoreFemale: "W środku najczęstsze nazwiska listy kobiet:",
    lfP1RingMale:
      "W przerywanym kółku {k} {k:najczęstsze nazwisko|najczęstsze nazwiska|najczęstszych nazwisk}. " +
      "Nosi je połowa mężczyzn z listy.",
    lfP1RingFemale:
      "W przerywanym kółku {k} {k:najczęstsze nazwisko|najczęstsze nazwiska|najczęstszych nazwisk}. " +
      "Nosi je połowa kobiet z listy.",
    lfP1Dust:
      "Pył na brzegu: {u} {u:nazwisko noszone|nazwiska noszone|nazwisk noszonych} przez mniej " +
      "niż {edge} {edge:osobę|osoby|osób}.",
    lfP1Foot:
      "Punkty ułożone od najczęstszego nazwiska (środek) do najrzadszego (brzeg), na skali " +
      "logarytmicznej; punkt rośnie z liczbą osób.",
    // Plate II: half.
    lfP2Name: "Połowa",
    lfP2TitleMale: "Połowa mężczyzn nosi jedno z {k} nazwisk.",
    lfP2TitleFemale: "Połowa kobiet nosi jedno z {k} nazwisk.",
    lfP2LedeMale:
      "Druga połowa dzieli się na {b} {b:nazwisko|nazwiska|nazwisk}. Górny pasek to wszyscy " +
      "mężczyźni z listy, dolny — wszystkie nazwiska.",
    lfP2LedeFemale:
      "Druga połowa dzieli się na {b} {b:nazwisko|nazwiska|nazwisk}. Górny pasek to wszystkie " +
      "kobiety z listy, dolny — wszystkie nazwiska.",
    lfP2PeopleMale: "Wszyscy: {n} {n:mężczyzna|mężczyzn|mężczyzn}",
    lfP2PeopleFemale: "Wszystkie: {n} {n:kobieta|kobiety|kobiet}",
    lfP2Surnames: "Wszystkie nazwiska: {n}",
    lfP2LevelMale:
      "{k} {k:najczęstsze nazwisko|najczęstsze nazwiska|najczęstszych nazwisk} → {q} mężczyzn",
    lfP2LevelFemale:
      "{k} {k:najczęstsze nazwisko|najczęstsze nazwiska|najczęstszych nazwisk} → {q} kobiet",
    lfP2Foot:
      "Wstęgi łączą część ludzi z listy z najczęstszymi nazwiskami, które ta część nosi; każdy " +
      "próg jest osiągnięty albo nieznacznie przekroczony.",
    // Plate III: rarity.
    lfP3Name: "Rzadkość",
    lfP3TitleMale: "{n} {n:nazwisko|nazwiska|nazwisk} nosi dokładnie dwóch mężczyzn.",
    lfP3TitleFemale: "{n} {n:nazwisko|nazwiska|nazwisk} noszą dokładnie dwie kobiety.",
    lfP3LedeMale:
      "Typowe nazwisko (mediana) {m:nosi|noszą|nosi} {m} {m:osoba|osoby|osób}: co najmniej " +
      "połowa nazwisk z listy mężczyzn ma najwyżej tylu nosicieli.",
    lfP3LedeFemale:
      "Typowe nazwisko (mediana) {m:nosi|noszą|nosi} {m} {m:osoba|osoby|osób}: co najmniej " +
      "połowa nazwisk z listy kobiet ma najwyżej tylu nosicieli.",
    lfP3KeySurnames: "ile nazwisk",
    lfP3KeyPeople: "ile osób je nosi",
    lfP3Axis: "liczba nosicieli nazwiska",
    lfP3NoteKicker: "Czego nie ma na liście",
    lfP3Note:
      "Nazwisk noszonych przez jedną osobę wydawca nie publikuje, więc najmniejsza liczba " +
      "nosicieli na liście to {min}. Nie pokazujemy też przykładów tak rzadkich nazwisk: tak " +
      "małe liczby mogą wskazywać konkretne osoby.",
    lfP3Foot:
      "Przedziały liczby nosicieli nazwiska. Czarne słupki: nazwiska; niebieskie: osoby, które je " +
      "noszą.",
    // Plate IV: endings. The headline says "one in four" only when the stored
    // share lies in [0.24, 0.26); otherwise it states the share.
    lfP4Name: "Końcówki",
    lfP4TitleQuarterMale: "Co czwarty mężczyzna nosi nazwisko na\u00a0{ending}.",
    lfP4TitleQuarterFemale: "Co czwarta kobieta nosi nazwisko na\u00a0{ending}.",
    lfP4TitleShareMale: "{share} mężczyzn nosi nazwisko na\u00a0{ending}.",
    lfP4TitleShareFemale: "{share} kobiet nosi nazwisko na\u00a0{ending}.",
    lfP4CaptionMale:
      "**{share}** mężczyzn z listy · {p} {p:osoba|osoby|osób} · {s} " +
      "{s:nazwisko|nazwiska|nazwisk} na\u00a0{ending}",
    lfP4CaptionFemale:
      "**{share}** kobiet z listy · {p} {p:osoba|osoby|osób} · {s} " +
      "{s:nazwisko|nazwiska|nazwisk} na\u00a0{ending}",
    lfP4Glyph: "Cztery znaki to cała lista; niebieskie wypełnienie to udział osób z tą końcówką.",
    lfP4ListMale: "Udział mężczyzn z listy, według końcówki nazwiska",
    lfP4ListFemale: "Udział kobiet z listy, według końcówki nazwiska",
    lfP4Foot:
      "Liczymy zapis końcówki, nie pochodzenie nazwiska. Końcówki się nie nakładają: żadne " +
      "nazwisko nie jest liczone dwa razy.",
    // Plate V: the alphabet.
    lfP5Name: "Alfabet",
    lfP5TitleMale: "Najwięcej mężczyzn ma nazwisko na {letter}.",
    lfP5TitleFemale: "Najwięcej kobiet ma nazwisko na {letter}.",
    lfP5LedeMale:
      "{p} {p:mężczyzna ma|mężczyzn ma|mężczyzn ma} nazwisko na {letter}. Wielkość litery rośnie " +
      "z liczbą osób, których nazwisko się od niej zaczyna.",
    lfP5LedeFemale:
      "{p} {p:kobieta ma|kobiety mają|kobiet ma} nazwisko na {letter}. Wielkość litery rośnie " +
      "z liczbą osób, których nazwisko się od niej zaczyna.",
    lfP5GridMale: "Pierwsze litery nazwisk z listy mężczyzn i liczba osób",
    lfP5GridFemale: "Pierwsze litery nazwisk z listy kobiet i liczba osób",
    lfP5AbsentCell: "brak nazwisk",
    lfP5AbsentMale:
      "**{letters} — brak.** Żadne nazwisko z listy mężczyzn nie zaczyna się od " +
      "{n:tej litery|tych liter|tych liter}. To brak, nie zero.",
    lfP5AbsentFemale:
      "**{letters} — brak.** Żadne nazwisko z listy kobiet nie zaczyna się od " +
      "{n:tej litery|tych liter|tych liter}. To brak, nie zero.",
    lfP5RarestMale:
      "**{letter} — {s} {s:nazwisko|nazwiska|nazwisk}, {p} {p:osoba|osoby|osób}.** Najrzadsza " +
      "litera polskiego alfabetu, od której zaczyna się nazwisko na liście mężczyzn.",
    lfP5RarestFemale:
      "**{letter} — {s} {s:nazwisko|nazwiska|nazwisk}, {p} {p:osoba|osoby|osób}.** Najrzadsza " +
      "litera polskiego alfabetu, od której zaczyna się nazwisko na liście kobiet.",
    lfP5OutsideMale:
      "**{s} {s:nazwisko|nazwiska|nazwisk} ({p} {p:osoba|osoby|osób})** z listy mężczyzn " +
      "{s:zaczyna|zaczynają|zaczyna} się od litery, której nie ma w tej tablicy.",
    lfP5OutsideFemale:
      "**{s} {s:nazwisko|nazwiska|nazwisk} ({p} {p:osoba|osoby|osób})** z listy kobiet " +
      "{s:zaczyna|zaczynają|zaczyna} się od litery, której nie ma w tej tablicy.",
    lfP5Foot:
      "Q, V i X nie należą do polskiego alfabetu (pola kreskowane). Liczymy pierwszą literę " +
      "zapisu nazwiska.",
    // Plate VI: the two lists as sets of surnames. Counts of surnames only.
    lfP6Name: "Dwie listy",
    lfP6Title: "{b} {b:nazwisko jest|nazwiska są|nazwisk jest} na obu listach.",
    lfP6OnBoth:
      "{name} jest na obu listach: {m} {m:mężczyzna|mężczyzn|mężczyzn} na liście mężczyzn i {f} " +
      "{f:kobieta|kobiety|kobiet} na liście kobiet.",
    lfP6FemaleOnly: "{name} jest tylko na liście kobiet ({f} {f:kobieta|kobiety|kobiet}).",
    lfP6MaleOnly: "{name} jest tylko na liście mężczyzn ({m} {m:mężczyzna|mężczyzn|mężczyzn}).",
    lfP6Why: "Dlatego list nie sumujemy: wspólne nazwiska liczyłyby się dwa razy.",
    lfP6MaleOnlyLabel: "tylko na liście mężczyzn",
    lfP6BothLabel: "na obu listach",
    lfP6FemaleOnlyLabel: "tylko na liście kobiet",
    lfP6HyphenKicker: "Nazwiska z łącznikiem",
    lfP6HyphenTopMale:
      "Najczęstsze nazwisko z łącznikiem na liście mężczyzn: {c} {c:mężczyzna|mężczyzn|mężczyzn}.",
    lfP6HyphenTopFemale:
      "Najczęstsze nazwisko z łącznikiem na liście kobiet: {c} {c:kobieta|kobiety|kobiet}.",
    lfP6HyphenNoneMale:
      "Żadnego nazwiska z łącznikiem z listy mężczyzn nie nosi dość osób, by je wymienić.",
    lfP6HyphenNoneFemale:
      "Żadnego nazwiska z łącznikiem z listy kobiet nie nosi dość osób, by je wymienić.",
    lfP6HyphenCountMale:
      "Na liście mężczyzn {s:jest|są|jest} {s} " +
      "{s:nazwisko|nazwiska|nazwisk} z łącznikiem; nosi je {p} " +
      "{p:mężczyzna|mężczyzn|mężczyzn}.",
    lfP6HyphenCountFemale:
      "Na liście kobiet {s:jest|są|jest} {s} " +
      "{s:nazwisko|nazwiska|nazwisk} z łącznikiem; {p:nosi|noszą|nosi} " +
      "je {p} {p:kobieta|kobiety|kobiet}.",
    lfP6Foot:
      "Pola kół są proporcjonalne do liczby nazwisk na każdej liście. Nazwiska porównujemy po " +
      "dokładnym zapisie, z polskimi znakami: forma męska i żeńska to dwa różne nazwiska.",
    // Plate VII: the editions of one list's series (ADR-0019). What changed,
    // never why; a gap is a gap with its reason; no surname named for growth.
    // The headline's words are chosen by the sign of the stored difference.
    lfP7Name: "Zmiany w czasie",
    lfP7TitleMoreMale:
      "Lista mężczyzn z {last}\u00a0r. ma o {d} {d:nazwisko|nazwiska|nazwisk} więcej niż lista z " +
      "{first}\u00a0r.",
    lfP7TitleMoreFemale:
      "Lista kobiet z {last}\u00a0r. ma o {d} {d:nazwisko|nazwiska|nazwisk} więcej niż lista z " +
      "{first}\u00a0r.",
    lfP7TitleFewerMale:
      "Lista mężczyzn z {last}\u00a0r. ma mniej nazwisk niż lista z {first}\u00a0r.: {sl} wobec {sf}.",
    lfP7TitleFewerFemale:
      "Lista kobiet z {last}\u00a0r. ma mniej nazwisk niż lista z {first}\u00a0r.: {sl} wobec {sf}.",
    lfP7TitleSameMale:
      "Lista mężczyzn z {last}\u00a0r. ma tyle samo nazwisk co lista z {first}\u00a0r.: {sl}.",
    lfP7TitleSameFemale:
      "Lista kobiet z {last}\u00a0r. ma tyle samo nazwisk co lista z {first}\u00a0r.: {sl}.",
    lfP7LedeMale:
      "Wydania listy mężczyzn od {from} do {to}, jedno obok drugiego: słupek to liczba nazwisk " +
      "w wydaniu; niebieskie są dwa porównywane wydania, pierwsze i ostatnie. Mężczyzn na liście: " +
      "{pf} w pierwszym wydaniu, {pl} w ostatnim ({pd}).",
    lfP7LedeFemale:
      "Wydania listy kobiet od {from} do {to}, jedno obok drugiego: słupek to liczba nazwisk " +
      "w wydaniu; niebieskie są dwa porównywane wydania, pierwsze i ostatnie. Kobiet na liście: " +
      "{pf} w pierwszym wydaniu, {pl} w ostatnim ({pd}).",
    lfP7TableMale: "Wydania listy mężczyzn: liczba nazwisk i mężczyzn w każdym",
    lfP7TableFemale: "Wydania listy kobiet: liczba nazwisk i kobiet w każdym",
    lfP7ColEdition: "Wydanie",
    lfP7ColSurnames: "Nazwiska",
    lfP7ColPeopleMale: "Mężczyźni",
    lfP7ColPeopleFemale: "Kobiety",
    lfP7GapShort: "brak",
    // {of} is a date that already ends in "r.", so no full stop follows it.
    lfP7Gap: "brak: plik z {date} jest identyczny z plikiem z {of}",
    lfP7NewMale:
      "{s:nazwisko jest|nazwiska są|nazwisk jest} na liście z {last}\u00a0r., a nie na liście z " +
      "{first}\u00a0r.; {p} {p:mężczyzna nosi|mężczyzn nosi|mężczyzn nosi} " +
      "{s:to nazwisko|te nazwiska|te nazwiska}.",
    lfP7NewFemale:
      "{s:nazwisko jest|nazwiska są|nazwisk jest} na liście z {last}\u00a0r., a nie na liście z " +
      "{first}\u00a0r.; {p} {p:kobieta nosi|kobiety noszą|kobiet nosi} " +
      "{s:to nazwisko|te nazwiska|te nazwiska}.",
    lfP7GoneMale:
      "{s:nazwisko było|nazwiska były|nazwisk było} na liście z {first}\u00a0r., a nie ma " +
      "{s:go|ich|ich} na liście z {last}\u00a0r.; na liście z {first}\u00a0r. " +
      "{p:nosił je|nosiło je|nosiło je} {p} {p:mężczyzna|mężczyzn|mężczyzn}.",
    lfP7GoneFemale:
      "{s:nazwisko było|nazwiska były|nazwisk było} na liście z {first}\u00a0r., a nie ma " +
      "{s:go|ich|ich} na liście z {last}\u00a0r.; na liście z {first}\u00a0r. " +
      "{p:nosiła je|nosiły je|nosiło je} {p} {p:kobieta|kobiety|kobiet}.",
    lfP7NotZero:
      "Brak na liście to nie zero: wydawca nie publikuje nazwisk noszonych przez jedną osobę.",
    lfP7TopMale: "Najczęstsze nazwiska listy mężczyzn: {first}\u00a0→\u00a0{last}",
    lfP7TopFemale: "Najczęstsze nazwiska listy kobiet: {first}\u00a0→\u00a0{last}",
    lfP7TopAbsent: "nie na liście z {first}\u00a0r.",
    lfP7Top10Male:
      "Dziesięć najczęstszych nazwisk listy mężczyzn to te same nazwiska, w tej samej " +
      "kolejności, co na liście z {first}\u00a0r.",
    lfP7Top10Female:
      "Dziesięć najczęstszych nazwisk listy kobiet to te same nazwiska, w tej samej " +
      "kolejności, co na liście z {first}\u00a0r.",
    lfP7Top10ChangedMale:
      "Dziesięć najczęstszych nazwisk listy mężczyzn to nie te same nazwiska w tej samej " +
      "kolejności, co na liście z {first}\u00a0r.",
    lfP7Top10ChangedFemale:
      "Dziesięć najczęstszych nazwisk listy kobiet to nie te same nazwiska w tej samej " +
      "kolejności, co na liście z {first}\u00a0r.",
    lfP7Foot:
      "Pliki z 2019 roku opisują swoją zawartość krótszym opisem niż późniejsze. Czytamy je jako " +
      "tę samą listę: osoby z nazwiskiem aktualnym. Pokazujemy, co się zmieniło, nie dlaczego.",
    contactLink: "Kontakt",
    privacyLink: "Prywatność",
    reportLink: "Zgłoś błąd",
    reportSubject: "Name Atlas, zgłoszenie",
    reportBodyPage: "Strona",
    reportBodyWhat: "Co jest nie tak albo czego brakuje",
    reportBodySource: "Źródło, jeśli je znasz",
    termsLink: "Regulamin",
    contactHeading: "Kontakt",
    contactIntro:
      "Name Atlas prowadzi jedna osoba. Napisz przez formularz niżej: wiadomość trafi prosto na skrzynkę, a odpowiedź na adres, który podasz.",
    contactTopicsLead: "Napisz, jeśli:",
    contactTopics: [
      "liczba, znaczenie lub źródło na stronie nazwiska jest błędne albo czegoś brakuje (podaj nazwisko i, jeśli możesz, źródło);",
      "chcesz skorzystać z praw dotyczących danych osobowych albo zgłosić naruszenie praw do źródła;",
      "widzisz problem z bezpieczeństwem strony.",
    ],
    contactReportHint:
      "Na każdej stronie nazwiska i na stronie porównania jest link „Zgłoś błąd”, który otwiera ten formularz z wpisanym nazwiskiem i adresem strony.",
    contactNoPromise:
      "Czytamy każdą wiadomość, ale nie obiecujemy terminu odpowiedzi. Zgłoszenie błędu nie zmienia strony od razu: najpierw sprawdzamy źródło.",
    // The contact form (sends through `/api/contact`) and the footer's groups.
    contactFormLabel: "Formularz kontaktowy",
    contactName: "Imię",
    contactEmail: "Twój e-mail",
    contactTopic: "Temat",
    contactTopicOptions: [
      "Błąd w danych",
      "Dane osobowe lub prawa do źródła",
      "Bezpieczeństwo",
      "Współpraca",
      "Inne",
    ],
    contactMessage: "Wiadomość",
    contactTrap: "Zostaw to pole puste",
    contactSend: "Wyślij wiadomość",
    contactSending: "Wysyłanie…",
    contactSent: "Dziękujemy, wiadomość wysłana. Odpowiemy na podany adres.",
    contactInvalid: "Podaj poprawny adres e-mail i wpisz wiadomość (do 5000 znaków).",
    contactFailed: "Nie udało się wysłać wiadomości. Spróbuj za chwilę.",
    contactUnavailable: "Wysyłka z formularza nie jest jeszcze włączona. Spróbuj później.",
    contactPrivacyNote: "Serwis nie zapisuje wiadomości: trafia ona tylko na skrzynkę Name Atlas.",
    footerExplore: "Odkrywaj",
    footerRead: "Czytaj",
    footerSite: "Serwis",
    footerFollow: "Obserwuj",
    footerCtaTitle: "Coś się nie zgadza? Masz pytanie?",
    footerCtaAction: "Napisz do nas",
    footerTop: "Na górę",
    footer:
      "Każda liczba pochodzi z rejestru PESEL i jest podana razem z zakresem zbioru, datą i źródłem. Brak danych jest podany jako brak, nigdy jako zero.",
  },
  en: {
    title: "Name Atlas",
    tagline: "Honest, sourced answers about Polish surnames.",
    landingHeadline: "Every surname",
    landingHeadlineEm: "begins somewhere.",
    landingLede:
      "Type a Polish surname. See how many people carry it, how rare it is, where it may come " +
      "from, and how we know.",
    landingHint: "Exactly as it's written — Polish letters welcome.",
    landingEyebrow: "PESEL register",
    landingAsOf: "as of",
    landingSearching: "Checking the PESEL register…",
    landingTrust: "A source on every fact · No data is also an answer",
    landingTreeLine: "Want to record your family?",
    landingTreeStart: "Start a family tree",
    landingTreeSignIn: "Sign in",
    landingTreeEyebrow: "Family tree",
    landingTreeHeading: "Your tree starts with you.",
    landingTreePoints: [
      "You add parents, grandparents and great-grandparents, one question per screen.",
      "Only you see living people until you share them.",
      "Birthplaces are checked against the TERYT register.",
    ],
    landingTreeGoogle: "Start with Google",
    landingTreeOther: "Another way",
    landingTreeMore: "How the tree works",
    landingTreeFree: "A free account. No card needed.",
    pitchEyebrow: "What you get · free · no account",
    pitchHeading: "Type a surname and get cards with the answers.",
    pitchLede:
      "Name Atlas reads the PESEL register and Polona's collections and answers six questions " +
      "about a surname. Each answer is one card with its date and source: to read, to share or " +
      "to save to your phone.",
    pitchAnswers: [
      [
        "How many people carry it?",
        "The count from the PESEL register, women and men listed separately.",
      ],
      ["How rare is it?", "Its rank and “1 in X” against the whole list."],
      ["Where is it most common?", "A map of the voivodeships, with each one's share."],
      [
        "How has it changed since 2019?",
        "The count on every edition of the list, year by year, beside the whole list's change.",
      ],
      ["What might it mean?", "A dictionary entry, where one exists, with its confidence word."],
      [
        "Where is it in old prints?",
        "Pages from Polona by period and place of publication, with a quote.",
      ],
    ],
    pitchNote: "Where the sources are silent, the card says so. No data is also an answer.",
    landingTry: "Try:",
    previewLede: "Three of the cards for",
    previewAll: "See every card:",
    offerHeading: "Free today. More soon.",
    offerAll: "The full offer",
    offerWaitlist: "Join the waiting list",
    analysisLabel: "What we are checking",
    analysisSteps: [
      "Checking the PESEL register",
      "Reading the rarity",
      "Checking the voivodeships",
      "Looking for a meaning",
    ],
    chapterSourcesQuestion: "How do we know?",
    summaryHeading: "Your result",
    summaryLede:
      "Counts, rarity, the map and the change on one card, each with its date and source. Share it or save it.",
    summaryCardAlt: "Surname card with figures from the PESEL register",
    saveImage: "Save image",
    landingHowPoints: [
      "Every figure has a source and a date.",
      "No data is also an answer.",
      "We speak about the surname, never about your family.",
    ],
    landingHowMore: "Where the figures come from and what the confidence words mean",
    siteNavLabel: "Site",
    navAtlas: "Atlas",
    navCompare: "Compare",
    navHow: "How it works",
    navOffer: "Offer",
    navAccount: "Account",
    navBabyNames: "Baby names",
    navTrees: "Trees",
    // The deck's last card, to the offer (TASK-057).
    deckOffer: "More: your family and DNA",
    // The footer's blog and social links (TASK-057).
    followLabel: "Blog and social media",
    // The blog (TASK-071).
    blogTitle: "Blog",
    blogLede: "Posts about Polish surnames and about Name Atlas.",
    blogEmpty: "There are no posts yet.",
    blogListLabel: "Posts",
    blogBack: "All posts",
    // The blog's redesign (TASK-075). The two headings name the posts' own
    // sections, which get their own styling.
    blogMore: "More posts",
    blogFaqHeading: "Frequently asked questions",
    blogSourcesHeading: "Sources",
    blogCtaTitle: "Look up your surname",
    blogCtaBody:
      "See how many people bear it today, how rare it is and where it is most common. Free, no account needed.",
    navMenu: "Menu",
    langNamePl: "Polski",
    langNameEn: "English",
    searchLabel: "Surname",
    breadcrumbLabel: "Breadcrumb",
    searchPlaceholder: "e.g. Zaremba",
    searchAction: "Discover",
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
      "registered permanent address. The brighter the colour and the longer the bar, the bigger " +
      "the share.",
    chapterChangeTitle: "How did this count change between editions of the list?",
    chapterChangeLede:
      "The PESEL register publishes its lists every year. We show the number of people with this " +
      "surname on each edition, beside how the whole list changed. We say what changed, not why.",
    chapterMeaningTitle: "What does this surname mean?",
    chapterMeaningLede: "We give a meaning only when a scholarly work supports it. We don't guess.",
    chapterArchiveTitle: "Where does it appear in old print?",
    chapterArchiveLede:
      "Polona, the National Library's digital library, searches its catalogue and the text of " +
      "its scanned pages. We show how many results it returns for this word, and from which years.",
    archiveWordCaveat:
      "These are search results for the word in any inflected form. Some may be another meaning " +
      "of the same spelling, and they are not a count of people or of mentions of anyone's family.",
    archiveByPeriod: "Pages by date of publication",
    archiveByPlace: "Most common places of publication",
    archiveExamples: "Example pages in the public domain",
    archiveOpen: "Open the page in Polona",
    archivePage: "p.",
    archiveNotSearched: "We have not searched Polona's collections for this surname yet.",
    archiveUnavailable: "Results from Polona cannot be shown right now.",
    archiveBlocked: "Results from Polona cannot be shown here because of the source's licence.",
    // TASK-090: localities with the same name (ADR-0025 §2.7).
    chapterPlacesTitle: "Which localities have this name?",
    chapterPlacesLede:
      "The TERYT register, Poland's official list of localities, holds localities named the " +
      "same as this surname. We show them with their gmina, powiat and voivodeship.",
    placesNote:
      "A shared name in the register. It does not say where the surname began, or that the " +
      "surname and these places are connected.",
    placesWhole:
      "Whole localities only, as SIMC lists them, without parts of a locality, under the " +
      "register's official name.",
    placesCity: "town",
    placesVillage: "village",
    placesOther: "other locality",
    // TASK-073: known people with the surname, from Wikidata (ADR-0030).
    chapterBearersTitle: "Who well known has this surname?",
    chapterBearersLede:
      "Wikidata, the open knowledge base behind Wikipedia, lists people with this surname. " +
      "Polish citizens come first, and among them those the most Wikipedia articles are " +
      "written about.",
    bearersCaveat:
      "Sharing a surname does not mean being related. Wikidata is edited by volunteers and " +
      "can be wrong.",
    bearersBorn: "b.",
    bearersNoDeath: "no date of death in Wikidata",
    bearersArticle: "Wikipedia",
    bearersMore: "The other people ({n}) will be in the “Surname and family” report.",
    bearersRemoval: "Are you on this list and would rather not be? Write to us.",
    bearersNotSearched: "We have not looked this surname up in Wikidata yet.",
    bearersUnavailable: "The list of well-known people cannot be shown right now.",
    bearersBlocked:
      "The list of well-known people cannot be shown here because of the source's licence.",
    navLabel: "On this page",
    navCount: "Count",
    navRarity: "Rarity",
    navWhere: "Voivodeships",
    navMeaning: "Meaning",
    navChange: "Change over time",
    navArchive: "In archives",
    navPlaces: "Localities",
    navBearers: "Well-known people",
    navSources: "Sources",
    rankCaption: "rank on the surname list",
    neighboursHeading: "Neighbours on the list",
    neighboursNote:
      "Two places above and two below on the same list. Surnames with the same count share " +
      "a place.",
    neighboursSelf: "this surname",
    otherFormHeading: "The other grammatical form",
    otherFormNote:
      "The same surname in the other grammatical gender, on the other list. It says nothing " +
      "about kinship.",
    archiveByCategory: "Catalogue records by kind",
    deckOpen: "See the cards",
    deckClose: "Full page",
    deckLabel: "The surname's cards",
    deckCards: "Cards",
    deckOf: "of",
    deckPrev: "Previous card",
    deckNext: "Next card",
    deckHintKeys: "Arrow keys ← → · Esc: full page",
    deckHintTouch: "Swipe the card or tap its edge",
    deckHello: "Surname",
    deckHelloEyebrow: "Your surname",
    deckPeopleInRegister: "people in the PESEL register",
    deckRarity: "Rarity",
    deckRarityHeading: "Roughly one in this many people on the list has this surname.",
    deckNeighbours: "Neighbours",
    deckNeighboursHeading: "Right beside it on the surname list.",
    deckWhere: "Voivodeships",
    deckWhereHeading: "Where do most people with this surname live?",
    deckWhereTop: "Most",
    deckChange: "Change over time",
    deckChangeSurname: "this surname",
    deckChangeList: "the whole list",
    deckChangeWhy: "We say what changed, not why.",
    deckOther: "Other form",
    deckOtherHeading: "On the other list this surname takes the form",
    deckMeaning: "Meaning",
    deckInterpretation: "interpretation",
    deckPrint: "Old print",
    deckBearers: "Well-known people",
    deckPrintPages: "pages of public-domain works",
    deckCatalogue: "In the catalogue",
    deckCatalogueHeading: "Records in Polona's catalogue in which the word appears.",
    deckCatalogueTotal: "records in all",
    deckPlaces: "Localities",
    deckPlacesHeading: "Localities in the TERYT register with the same name.",
    deckEnd: "Summary",
    deckEndHeading: "in numbers.",
    deckFullPage: "See the full page",
    deckCompareForms: "Compare both forms",
    deckShare: "Share this card",
    // The share studio (TASK-093, ADR-0034).
    deckFinish: "Your card is ready",
    studioTitle: "Share your card",
    studioHeading: "Your card",
    studioCards: "Choose a card",
    studioImageAlt: "Surname card to share",
    studioPreviewMark: "Preview · Name Atlas",
    studioShare: "Share",
    studioDownload: "Download",
    studioGallery: "Save to Photos",
    studioGalleryHint: "Choose “Save Image”.",
    studioWorking: "Preparing…",
    studioFailed: "That did not work. Try again.",
    studioInstagram:
      "For Instagram: share from your phone, or download and send the image to your phone.",
    studioSignInPrompt: "Sign in to download and share the card.",
    studioSignIn: "Sign in",
    studioSignUp: "Create an account",
    studioUnavailable: "Downloads are unavailable for a moment. Try again shortly.",
    studioBack: "Back to the cards",
    studioMore: "What next",
    // The page link's share, beside the card's own "Share".
    studioShareLink: "Share the link",
    // The share video (TASK-097).
    studioVideo: "Download video",
    studioVideoWorking: "Making the video… {n}%",
    studioVideoCancel: "Cancel",
    studioVideoFailed: "The video could not be made.",
    studioPdf: "Download a one-page PDF",
    videoHook: "How many people carry this surname?",
    studioVideoLength: "Length",
    studioVideoShort: "Short (about 7 s)",
    studioVideoFull: "Full (every card)",
    studioVideoMotion: "Transitions",
    studioVideoUp: "From below",
    studioVideoSide: "From the side",
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
    limitationArchiveWord:
      "Polona's figures are search results for the word in any inflected form, in the catalogue " +
      "and in the text of pages of works not under copyright; not every result is the surname.",
    limitationBearersFamily:
      "The people from Wikidata share the surname; that does not mean they are related to each " +
      "other or to anyone. No date of death in Wikidata does not mean a person is living.",
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
    compareHeading: "Compare two surnames",
    compareIntro:
      "Type two surnames. We set their counts, rarity and voivodeships side by side, from the " +
      "same dataset and the same date.",
    compareFirstLabel: "First surname",
    compareSecondLabel: "Second surname",
    compareAction: "Compare",
    compareNeedsTwo: "Type both surnames, as they are written.",
    compareFromHere: "Compare with another surname",
    coupleHeading: "Your names together",
    coupleIntro:
      "Type both surnames. We set side by side what the register and the sources say about " +
      "each one on its own.",
    coupleAction: "Show",
    coupleNote:
      "Each surname is described on its own, from its own data. Nothing is computed from the " +
      "two surnames together.",
    coupleNamesHeading: "The names you could carry",
    coupleNamesNote:
      "Each name is looked up on its own in the PESEL register. Figures from the men's and " +
      "women's lists are not added up.",
    coupleNotListed: "Not on the PESEL list",
    coupleWhereHeading: "Where each name lives",
    coupleCommonHeading: "How common each name is, and its change",
    coupleMeaningHeading: "What each name means",
    coupleBearersHeading: "Famous bearers and places of the same name",
    coupleCompareLink: "The comparison of these two surnames",
    notFoundHeading: "There is no such page",
    notFoundBody:
      "The address may have changed or have a typo in it. Type the surname you are looking for.",
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
    changeTableLabel: "The number of people on successive editions of the list",
    changeEditionColumn: "As of",
    changeShareColumn: "Share of the list",
    changeCountColumn: "People",
    changeNotOnList: "not on the list — not zero",
    changeNoteMark: "see the note under the table",
    changeListNote:
      "The size of the list itself changes between editions, so beside the count we show the " +
      "share of that edition's list (“1 in X”).",
    change2019Note:
      "The 2019 files describe their contents in fewer words than the later ones. We read them as " +
      "the same list: people with their current surname.",
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
    lfEyebrow: "PESEL register · {year} edition",
    lfTitle: "Surname atlas",
    lfLede:
      "Seven plates about the surnames in the PESEL register (as of {date}). Men and women are " +
      "on two separate lists: switch the list and plates I–V and VII show that list, while " +
      "plate VI compares both. We never add them up.",
    lfScope:
      "Every figure describes one published list of the PESEL register: surnames borne by at " +
      "least 2 people, living persons, current surname. Plate VII also sets out earlier " +
      "editions of the same list. As\u00a0of\u00a0{date}",
    lfSwitchLabel: "Which list",
    lfSwitchMale: "Men",
    lfSwitchFemale: "Women",
    lfSwitchNote: "separate lists, never summed",
    lfListInMale: "male list",
    lfListInFemale: "female list",
    lfSource: "Source: {link} · as\u00a0of\u00a0{date}",
    lfSourceName: "PESEL register, dane.gov.pl",
    lfSourceTwo: "Source: PESEL register, dane.gov.pl ({male}, {female}) · as\u00a0of\u00a0{date}",
    lfSourceEditions: "Source: {link} · editions of {date}",
    lfSourceEditionsTwo:
      "Source: PESEL register, dane.gov.pl ({male}, {female}) · editions of {date}",
    lfMethod: "{status} · method {method}",
    lfPlate: "Plate",
    lfP1Name: "Constellation",
    lfP1Title: "Every surname is one dot.",
    lfP1SurnamesMale: "{n:surname|surnames} on the male list",
    lfP1SurnamesFemale: "{n:surname|surnames} on the female list",
    lfP1PeopleMale: "{n:man|men} on the list",
    lfP1PeopleFemale: "{n:woman|women} on the list",
    lfP1CoreMale: "At the centre, the male list's most common surnames:",
    lfP1CoreFemale: "At the centre, the female list's most common surnames:",
    lfP1RingMale:
      "Inside the dashed ring, the {k} most common {k:surname|surnames}. Half the men on the " +
      "list carry them.",
    lfP1RingFemale:
      "Inside the dashed ring, the {k} most common {k:surname|surnames}. Half the women on the " +
      "list carry them.",
    lfP1Dust: "Dust at the edge: {u} {u:surname|surnames} borne by fewer than {edge} people.",
    lfP1Foot:
      "Dots run from the most common surname (centre) to the rarest (edge) on a logarithmic " +
      "scale; a dot grows with the number of people.",
    lfP2Name: "Half",
    lfP2TitleMale: "Half of the men on the list carry one of {k} surnames.",
    lfP2TitleFemale: "Half of the women on the list carry one of {k} surnames.",
    lfP2LedeMale:
      "The other half is spread over {b} {b:surname|surnames}. The top bar is every man on the " +
      "list, the bottom bar every surname.",
    lfP2LedeFemale:
      "The other half is spread over {b} {b:surname|surnames}. The top bar is every woman on the " +
      "list, the bottom bar every surname.",
    lfP2PeopleMale: "All: {n} {n:man|men}",
    lfP2PeopleFemale: "All: {n} {n:woman|women}",
    lfP2Surnames: "All surnames: {n}",
    lfP2LevelMale: "{k} most common {k:surname|surnames} → {q} of men",
    lfP2LevelFemale: "{k} most common {k:surname|surnames} → {q} of women",
    lfP2Foot:
      "The bands link a share of the people on the list with the most common surnames that share " +
      "carries; each threshold is met or just passed.",
    lfP3Name: "Rarity",
    lfP3TitleMale: "{n} {n:surname is|surnames are} borne by exactly two men.",
    lfP3TitleFemale: "{n} {n:surname is|surnames are} borne by exactly two women.",
    lfP3LedeMale:
      "The typical surname (the median) is borne by {m} {m:person|people}: at least half the " +
      "surnames on the male list have at most that many bearers.",
    lfP3LedeFemale:
      "The typical surname (the median) is borne by {m} {m:person|people}: at least half the " +
      "surnames on the female list have at most that many bearers.",
    lfP3KeySurnames: "surnames",
    lfP3KeyPeople: "people bearing them",
    lfP3Axis: "bearers per surname",
    lfP3NoteKicker: "What the list leaves out",
    lfP3Note:
      "The publisher omits surnames borne by one person, so the smallest count on the list is " +
      "{min}. Nor do we show examples of surnames this rare: counts this small can point to " +
      "particular people.",
    lfP3Foot:
      "Bands of bearers per surname. Black bars: surnames; blue bars: the people bearing them.",
    lfP4Name: "Endings",
    lfP4TitleQuarterMale: "One man in four has a surname ending in\u00a0{ending}.",
    lfP4TitleQuarterFemale: "One woman in four has a surname ending in\u00a0{ending}.",
    lfP4TitleShareMale: "{share} of men on the list have a surname ending in\u00a0{ending}.",
    lfP4TitleShareFemale: "{share} of women on the list have a surname ending in\u00a0{ending}.",
    lfP4CaptionMale:
      "**{share}** of men on the list · {p} {p:person|people} · {s} {s:surname|surnames} ending " +
      "in\u00a0{ending}",
    lfP4CaptionFemale:
      "**{share}** of women on the list · {p} {p:person|people} · {s} {s:surname|surnames} " +
      "ending in\u00a0{ending}",
    lfP4Glyph:
      "The four marks are the whole list; the blue fill is the share of people with this ending.",
    lfP4ListMale: "Share of men on the list, by surname ending",
    lfP4ListFemale: "Share of women on the list, by surname ending",
    lfP4Foot:
      "We count an ending as it is spelled, never as a surname's origin. The endings do not " +
      "overlap: no surname is counted twice.",
    lfP5Name: "Alphabet",
    lfP5TitleMale: "{letter} starts the surnames of the most men.",
    lfP5TitleFemale: "{letter} starts the surnames of the most women.",
    lfP5LedeMale:
      "{p} {p:man has|men have} a surname starting with {letter}. Each letter grows with the " +
      "number of people whose surname starts with it.",
    lfP5LedeFemale:
      "{p} {p:woman has|women have} a surname starting with {letter}. Each letter grows with the " +
      "number of people whose surname starts with it.",
    lfP5GridMale: "First letters of the surnames on the male list, with the number of people",
    lfP5GridFemale: "First letters of the surnames on the female list, with the number of people",
    lfP5AbsentCell: "no surnames",
    lfP5AbsentMale:
      "**{letters}: none.** No surname on the male list starts with " +
      "{n:this letter|these letters}. That is absence, not zero.",
    lfP5AbsentFemale:
      "**{letters}: none.** No surname on the female list starts with " +
      "{n:this letter|these letters}. That is absence, not zero.",
    lfP5RarestMale:
      "**{letter}: {s} {s:surname|surnames}, {p} {p:person|people}.** The rarest letter of the " +
      "Polish alphabet that starts a surname on the male list.",
    lfP5RarestFemale:
      "**{letter}: {s} {s:surname|surnames}, {p} {p:person|people}.** The rarest letter of the " +
      "Polish alphabet that starts a surname on the female list.",
    lfP5OutsideMale:
      "**{s} {s:surname|surnames} ({p} {p:person|people})** on the male list " +
      "{s:starts|start} with a letter that is not in this table.",
    lfP5OutsideFemale:
      "**{s} {s:surname|surnames} ({p} {p:person|people})** on the female list " +
      "{s:starts|start} with a letter that is not in this table.",
    lfP5Foot:
      "Q, V and X are not in the Polish alphabet (hatched). We count the first letter of the " +
      "surname as spelled.",
    lfP6Name: "Two lists",
    lfP6Title: "{b} {b:surname is|surnames are} on both lists.",
    lfP6OnBoth:
      "{name} is on both lists: {m} {m:man|men} on the male list and {f} {f:woman|women} on the " +
      "female list.",
    lfP6FemaleOnly: "{name} is on the female list only ({f} {f:woman|women}).",
    lfP6MaleOnly: "{name} is on the male list only ({m} {m:man|men}).",
    lfP6Why: "That is why the lists are never added up: the shared surnames would count twice.",
    lfP6MaleOnlyLabel: "on the male list only",
    lfP6BothLabel: "on both lists",
    lfP6FemaleOnlyLabel: "on the female list only",
    lfP6HyphenKicker: "Hyphenated surnames",
    lfP6HyphenTopMale: "The most common hyphenated surname on the male list: {c} {c:man|men}.",
    lfP6HyphenTopFemale:
      "The most common hyphenated surname on the female list: {c} {c:woman|women}.",
    lfP6HyphenNoneMale:
      "No hyphenated surname on the male list is borne by enough people to be named.",
    lfP6HyphenNoneFemale:
      "No hyphenated surname on the female list is borne by enough people to be named.",
    lfP6HyphenCountMale:
      "The male list holds {s} hyphenated {s:surname|surnames}, borne by {p} {p:man|men}.",
    lfP6HyphenCountFemale:
      "The female list holds {s} hyphenated {s:surname|surnames}, borne by {p} " +
      "{p:woman|women}.",
    lfP6Foot:
      "Each circle's area is proportional to the number of surnames on its list. Surnames are " +
      "compared exactly as spelled, with Polish letters: a male and a female form are two " +
      "different surnames.",
    lfP7Name: "Change over time",
    lfP7TitleMoreMale:
      "The {last} male list has {d} more {d:surname|surnames} than the {first} one.",
    lfP7TitleMoreFemale:
      "The {last} female list has {d} more {d:surname|surnames} than the {first} one.",
    lfP7TitleFewerMale:
      "The {last} male list has fewer surnames than the {first} one: {sl} against {sf}.",
    lfP7TitleFewerFemale:
      "The {last} female list has fewer surnames than the {first} one: {sl} against {sf}.",
    lfP7TitleSameMale: "The {last} male list has as many surnames as the {first} one: {sl}.",
    lfP7TitleSameFemale: "The {last} female list has as many surnames as the {first} one: {sl}.",
    lfP7LedeMale:
      "The editions of the male list from {from} to {to}, side by side: each bar is the number " +
      "of surnames in one edition; the two blue bars are the editions compared, the first and " +
      "the last. Men on the list: {pf} in the first edition, {pl} in the last ({pd}).",
    lfP7LedeFemale:
      "The editions of the female list from {from} to {to}, side by side: each bar is the " +
      "number of surnames in one edition; the two blue bars are the editions compared, the first " +
      "and the last. Women on the list: {pf} in the first edition, {pl} in the last ({pd}).",
    lfP7TableMale: "Editions of the male list: surnames and men in each",
    lfP7TableFemale: "Editions of the female list: surnames and women in each",
    lfP7ColEdition: "Edition",
    lfP7ColSurnames: "Surnames",
    lfP7ColPeopleMale: "Men",
    lfP7ColPeopleFemale: "Women",
    lfP7GapShort: "missing",
    lfP7Gap: "missing: the file dated {date} is identical to the file dated {of}.",
    lfP7NewMale:
      "{s:surname is|surnames are} on the {last} list and not on the {first} list; {p} " +
      "{p:man bears|men bear} {s:it|them}.",
    lfP7NewFemale:
      "{s:surname is|surnames are} on the {last} list and not on the {first} list; {p} " +
      "{p:woman bears|women bear} {s:it|them}.",
    lfP7GoneMale:
      "{s:surname was|surnames were} on the {first} list and {s:is|are} not on the {last} list; " +
      "on the {first} list, {p} {p:man bore|men bore} {s:it|them}.",
    lfP7GoneFemale:
      "{s:surname was|surnames were} on the {first} list and {s:is|are} not on the {last} list; " +
      "on the {first} list, {p} {p:woman bore|women bore} {s:it|them}.",
    lfP7NotZero:
      "Not on a list is not zero: the publisher does not publish surnames borne by one person.",
    lfP7TopMale: "The male list's most common surnames: {first}\u00a0→\u00a0{last}",
    lfP7TopFemale: "The female list's most common surnames: {first}\u00a0→\u00a0{last}",
    lfP7TopAbsent: "not on the {first} list",
    lfP7Top10Male:
      "The ten most common surnames on the male list are the same, in the same order, as on " +
      "the {first} list.",
    lfP7Top10Female:
      "The ten most common surnames on the female list are the same, in the same order, as on " +
      "the {first} list.",
    lfP7Top10ChangedMale:
      "The ten most common surnames on the male list are not the same, in the same order, as " +
      "on the {first} list.",
    lfP7Top10ChangedFemale:
      "The ten most common surnames on the female list are not the same, in the same order, as " +
      "on the {first} list.",
    lfP7Foot:
      "The 2019 files describe their contents in fewer words than the later ones. We read them as " +
      "the same list: people with their current surname. We show what changed, not why.",
    contactLink: "Contact",
    privacyLink: "Privacy",
    reportLink: "Report a problem",
    reportSubject: "Name Atlas, report",
    reportBodyPage: "Page",
    reportBodyWhat: "What is wrong or missing",
    reportBodySource: "Source, if you know one",
    termsLink: "Terms",
    contactHeading: "Contact",
    contactIntro:
      "Name Atlas is run by one person. Write through the form below: the message goes straight to the inbox, and the reply to the address you give.",
    contactTopicsLead: "Write if:",
    contactTopics: [
      "a figure, meaning or source on a surname page is wrong or missing (name the surname and, if you can, the source);",
      "you want to exercise your rights over personal data, or report a breach of a source's rights;",
      "you have found a security problem with the site.",
    ],
    contactReportHint:
      "Every surname page and the comparison page has a “Report a problem” link that opens this form with the surname and the page address filled in.",
    contactNoPromise:
      "Every message is read, but no reply time is promised. A report of an error does not change the page at once: the source is checked first.",
    // The contact form (sends through `/api/contact`) and the footer's groups.
    contactFormLabel: "Contact form",
    contactName: "Name",
    contactEmail: "Your email",
    contactTopic: "Topic",
    contactTopicOptions: [
      "An error in the data",
      "Personal data or a source's rights",
      "Security",
      "Working together",
      "Something else",
    ],
    contactMessage: "Message",
    contactTrap: "Leave this field empty",
    contactSend: "Send message",
    contactSending: "Sending…",
    contactSent: "Thank you, your message is sent. The reply will go to the address you gave.",
    contactInvalid: "Give a valid email address and write a message (up to 5,000 characters).",
    contactFailed: "The message could not be sent. Try again in a moment.",
    contactUnavailable: "Sending from the form is not switched on yet. Try again later.",
    contactPrivacyNote:
      "The site does not store your message: it only reaches the Name Atlas inbox.",
    footerExplore: "Explore",
    footerRead: "Read",
    footerSite: "The site",
    footerFollow: "Follow",
    footerCtaTitle: "Something look wrong? Have a question?",
    footerCtaAction: "Write to us",
    footerTop: "Back to top",
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

/* --- localities with the same name (TASK-090, ADR-0025 §2.7) ------------- */

/** The register's kinds, by TASK-039's classification of SIMC's `RM`. */
export function localityKindLabel(kind: LocalityKind, lang: Lang): string {
  const t = UI[lang];
  return kind === "CITY" ? t.placesCity : kind === "VILLAGE" ? t.placesVillage : t.placesOther;
}

/** "gm. Stoszowice, pow. ząbkowicki, woj. DOLNOŚLĄSKIE": the register's names, as written. */
export function localityAdminLine(entry: LocalityEntry, lang: Lang): string {
  return lang === "pl"
    ? `gm. ${entry.gmina}, pow. ${entry.powiat}, woj. ${entry.voivodeship}`
    : `gmina ${entry.gmina}, powiat ${entry.powiat}, ${entry.voivodeship} voivodeship`;
}

/** "miejscowość" / "miejscowości", "locality" / "localities", for a count. */
export function localitiesNoun(n: number, lang: Lang): string {
  if (lang === "pl") return n === 1 ? "miejscowość" : "miejscowości";
  return n === 1 ? "locality" : "localities";
}

/**
 * The chapter's statement: the register, the count and the register's own
 * date. It names a coincidence of names and nothing more; the warning line
 * that follows it says so.
 */
export function localitiesSentence(
  section: LocalitiesSection,
  surname: string,
  lang: Lang,
): string | null {
  if (section.state !== "READY" || section.total === null || section.reference_date === null) {
    return null;
  }
  const date = formatDate(section.reference_date, lang);
  if (section.total === 0) {
    return terminate(
      lang === "pl"
        ? `Rejestr TERYT nie wymienia miejscowości o nazwie ${surname} (stan na ${date})`
        : `The TERYT register lists no locality named ${surname} (as of ${date})`,
    );
  }
  const count = formatInteger(section.total, lang);
  const noun = localitiesNoun(section.total, lang);
  return terminate(
    lang === "pl"
      ? `Rejestr TERYT wymienia ${count} ${noun} o nazwie ${surname} (stan na ${date})`
      : `The TERYT register lists ${count} ${noun} named ${surname} (as of ${date})`,
  );
}

/** "i jeszcze 3" / "and 3 more": what a shortened list leaves out. */
export function localitiesMore(n: number, lang: Lang): string {
  const count = formatInteger(n, lang);
  return lang === "pl" ? `i jeszcze ${count}` : `and ${count} more`;
}
