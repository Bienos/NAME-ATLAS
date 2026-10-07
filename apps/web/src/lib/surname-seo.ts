import type { SurnameResultResponse } from "@name-atlas/contracts";
import { formatDate, formatInteger, pluralPl, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { distinctCitations, publishableFamilies } from "./seo.js";
import type { ValueFamily } from "./seo.js";

/**
 * The surname page's words for search engines and answer engines (TASK-123;
 * `docs/canonical/21` §63–§68).
 *
 * Every function here is pure and reads only the validated payload. The title
 * names only the dimensions the page can publish (§67's truth rule: no map, no
 * "mapa"), and the answer sentence states only counts the page shows, each with
 * its date, the two register lists side by side and never added up
 * (`ARCHITECTURE.md` §10). The page renders the same sentence under its `<h1>`,
 * so the description a search result quotes is text the reader can see.
 */

/** The page's `<h1>`: the snapshot's eyebrow and the surname (§63). */
export function surnameHeading(display: string, lang: Lang): string {
  return `${UI[lang].searchLabel} ${display}`;
}

const TITLE_TOPICS = {
  pl: {
    meaningWhere: "znaczenie, pochodzenie i występowanie",
    meaningCount: "znaczenie, pochodzenie i liczba osób",
    meaning: "znaczenie i pochodzenie",
    countWhere: "ile osób je nosi i gdzie występuje",
    count: "ile osób je nosi",
    where: "gdzie występuje",
  },
  en: {
    meaningWhere: "meaning, origin and distribution",
    meaningCount: "meaning, origin and how many people have it",
    meaning: "meaning and origin",
    countWhere: "how many people have it and where",
    count: "how many people have it",
    where: "where it is found",
  },
} as const;

/**
 * The page's title (§66), from the value families it can publish. Meaning and
 * origin only with `ONOMASTICS`, where and distribution only with `GEOGRAPHY`,
 * how many only with `CURRENT_STATS`; with none of them, the name alone.
 */
export function surnameTitle(
  display: string,
  families: readonly ValueFamily[],
  lang: Lang,
): string {
  const has = (family: ValueFamily): boolean => families.includes(family);
  const topics = TITLE_TOPICS[lang];
  const topic = has("ONOMASTICS")
    ? has("GEOGRAPHY")
      ? topics.meaningWhere
      : has("CURRENT_STATS")
        ? topics.meaningCount
        : topics.meaning
    : has("CURRENT_STATS")
      ? has("GEOGRAPHY")
        ? topics.countWhere
        : topics.count
      : has("GEOGRAPHY")
        ? topics.where
        : null;
  const name = lang === "pl" ? `Nazwisko ${display}` : `${display} surname`;
  return topic === null ? `${name} | Name Atlas` : `${name} | ${topic} | Name Atlas`;
}

/** "A i B", "A, B i C"; "A and B". */
function joinList(parts: readonly string[], lang: Lang): string {
  if (parts.length <= 1) return parts.join("");
  const last = parts[parts.length - 1] ?? "";
  return `${parts.slice(0, -1).join(", ")} ${lang === "pl" ? "i" : "and"} ${last}`;
}

/** Who a list counts, by its comparability group, as `partitionLabel` reads it. */
function counted(value: number, group: string | null, lang: Lang): string {
  const n = formatInteger(value, lang);
  if (group?.endsWith("_male")) {
    return `${n} ${lang === "pl" ? pluralPl(value, "mężczyzna", "mężczyzn", "mężczyzn") : value === 1 ? "man" : "men"}`;
  }
  if (group?.endsWith("_female")) {
    return `${n} ${lang === "pl" ? pluralPl(value, "kobieta", "kobiety", "kobiet") : value === 1 ? "woman" : "women"}`;
  }
  return `${n} ${lang === "pl" ? pluralPl(value, "osoba", "osoby", "osób") : value === 1 ? "person" : "people"}`;
}

/**
 * The strongest voivodeship, only when every list with a ready distribution has
 * one, untied, on the counts' own date, and they all name the same one. The
 * snapshot's tie rule applies: a tie is a sort artefact, not a fact. No share is
 * given here, because each list's share is of its own covered set.
 */
function strongestRegion(
  response: SurnameResultResponse,
  date: string | null,
  lang: Lang,
): string | null {
  const distribution = response.distribution;
  if (date === null || distribution?.state !== "READY") return null;
  const ready = distribution.entries.filter((entry) => entry.coverage_state === "READY");
  if (ready.length === 0) return null;
  const names = new Set<string>();
  for (const entry of ready) {
    const [top, second] = entry.regions;
    if (top === undefined || entry.snapshot_date !== date) return null;
    if (second !== undefined && second.count >= top.count) return null;
    names.add(top.display_name);
  }
  const [only] = [...names];
  return names.size === 1 && only !== undefined
    ? `${UI[lang].heroStrongestRegion}: ${only}.`
    : null;
}

/**
 * The answer-first sentence (§64): how many people the register lists with the
 * surname, per list, with the list's date; then the strongest voivodeship where
 * there is one. `null` when the page has no count to state. A value the source
 * does not publish is left out, never written as zero.
 */
export function answerSentence(
  response: SurnameResultResponse,
  display: string,
  lang: Lang,
): string | null {
  const population = response.population;
  if (population?.state !== "READY") return null;
  const known = population.observations.flatMap((o) =>
    o.value.value === null
      ? []
      : [{ value: o.value.value, group: o.comparability_group, date: o.snapshot_date }],
  );
  if (known.length === 0) return null;
  const dates = [...new Set(known.map((k) => k.date))];
  const sentences = dates.map((date) => {
    const parts = known.filter((k) => k.date === date).map((k) => counted(k.value, k.group, lang));
    const on = formatDate(date, lang);
    return lang === "pl"
      ? `Liczba osób o nazwisku ${display} w rejestrze PESEL na dzień ${on}: ${joinList(parts, lang)}.`
      : `People with the surname ${display} in the PESEL register on ${on}: ${joinList(parts, lang)}.`;
  });
  const where = strongestRegion(response, dates.length === 1 ? (dates[0] ?? null) : null, lang);
  return [...sentences, ...(where === null ? [] : [where])].join(" ");
}

/**
 * The meta description (§68): the answer, then what else the page holds, named
 * only when it holds it.
 */
export function surnameDescription(
  response: SurnameResultResponse,
  display: string,
  lang: Lang,
): string {
  const t = UI[lang];
  const answer =
    answerSentence(response, display, lang) ??
    (response.population?.state === "RIGHTS_BLOCKED"
      ? t.heroRightsBlocked
      : response.population?.reason_code === "NOT_DERIVED_YET"
        ? t.heroNotDerived
        : t.heroNoCount);
  const families = publishableFamilies(response);
  const items: string[] = [];
  if (families.includes("GEOGRAPHY")) {
    items.push(lang === "pl" ? "mapę województw" : "the map by voivodeship");
  }
  if (families.includes("ONOMASTICS")) {
    items.push(lang === "pl" ? "znaczenie nazwiska" : "the surname's meaning");
  }
  if (distinctCitations(response) > 0) {
    items.push(lang === "pl" ? "źródła danych" : "the sources");
  }
  if (items.length === 0) return answer;
  return `${answer} ${lang === "pl" ? "Zobacz" : "See"} ${joinList(items, lang)}.`;
}
