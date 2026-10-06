import type { ReactNode } from "react";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { CitationDto, SurnameResultResponse } from "@name-atlas/contracts";
import { parseGivenNameFacts } from "@name-atlas/truth";
import type {
  GivenNameMeaningFacts,
  GivenNameReportFacts,
  StoredReportVersion,
} from "@name-atlas/truth";
import {
  assessmentWord,
  changeListLabel,
  formatDate,
  formatInteger,
  formatPercentChange,
  formatShare,
  formationWord,
  partitionLabel,
  pluralForm,
} from "./messages.js";
import type { Lang } from "./messages.js";
import { reportPath } from "./report-config.js";
import { SiteShell } from "./site-shell.js";

/**
 * The report preview (TASK-120): a stored internal test report (TASK-119)
 * laid out as a dusk dossier — a cover, a contents list, nine numbered
 * chapters, a numbered bibliography and what the report does not know.
 *
 * It renders the frozen response only after the contract has validated it,
 * and derives nothing: every figure is a field of that response, every gap
 * a state or code the report froze. A response frozen under an earlier
 * contract is not shown at all; the page says so.
 *
 * A full-name report (TASK-124) adds the first name's chapter before the
 * surname's: its count and rank on each list, apart, from the facts the
 * report froze, and since TASK-147 its origin and meaning as each work states
 * them. It never shows a count of people with both names.
 */

/** What the page renders, from one stored version. */
export interface ReportPreview {
  readonly id: string;
  readonly version: number;
  readonly generatedOn: string;
  /** Null when the frozen response no longer validates (an earlier contract). */
  readonly response: SurnameResultResponse | null;
  /** The surname, or for a full-name report the first name and the surname. */
  readonly displayName: string;
  /** A full-name report's first-name facts; null for a surname report. */
  readonly givenName: GivenNameReportFacts | null;
  /** A full-name report's frozen gaps about the first name. */
  readonly givenGaps: readonly {
    readonly topic: string;
    readonly reason_code: string;
    readonly comparability_group: string | null;
  }[];
  readonly eligibility: { readonly state: string; readonly reason_codes: readonly string[] };
  readonly gaps: readonly {
    readonly dimension: string;
    readonly availability: string;
  }[];
  readonly sections: readonly {
    readonly type: string;
    readonly claims: readonly { readonly claim_id: string; readonly presentation_role: string }[];
    readonly citationIds: readonly string[];
  }[];
}

const isString = (v: unknown): v is string => typeof v === "string";
const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** The page's view of a stored version; null when its payload is not a report's. */
export function toReportPreview(stored: StoredReportVersion): ReportPreview | null {
  const payload = record(stored.payload);
  const coverage = record(payload?.["coverage"]);
  const eligibility = record(payload?.["eligibility"]);
  const displayName = coverage?.["display_name"];
  const dimensions = coverage?.["dimensions"];
  const state = eligibility?.["state"];
  const reasons = eligibility?.["reason_codes"];
  if (
    payload === null ||
    !isString(displayName) ||
    displayName === "" ||
    !Array.isArray(dimensions) ||
    !isString(state) ||
    !Array.isArray(reasons) ||
    !reasons.every(isString)
  ) {
    return null;
  }
  let givenName: GivenNameReportFacts | null = null;
  if (stored.report_type === "FULL_NAME") {
    givenName = parseGivenNameFacts(payload["given_name"]);
    if (givenName === null) return null;
  }
  const limitations = record(
    stored.sections.find((s) => s.section_type === "LIMITATIONS")?.body_payload,
  );
  const givenGaps = Array.isArray(limitations?.["given_name"])
    ? limitations["given_name"].flatMap((g) => {
        const x = record(g);
        const topic = x?.["topic"];
        const reason = x?.["reason_code"];
        const group = x?.["comparability_group"];
        return isString(topic) && isString(reason)
          ? [{ topic, reason_code: reason, comparability_group: isString(group) ? group : null }]
          : [];
      })
    : [];
  const response = surnameResultResponseSchema.safeParse(payload["response"]);
  return {
    id: stored.report_version_id,
    version: stored.version_number,
    generatedOn: stored.generated_at.slice(0, 10),
    response: response.success ? response.data : null,
    displayName:
      givenName === null ? displayName : `${givenName.given_name.display_name} ${displayName}`,
    givenName,
    givenGaps,
    eligibility: { state, reason_codes: reasons },
    gaps: dimensions.flatMap((d) => {
      const x = record(d);
      const dimension = x?.["dimension"];
      const availability = x?.["availability"];
      return isString(dimension) && isString(availability) && availability !== "STRONG"
        ? [{ dimension, availability }]
        : [];
    }),
    sections: stored.sections.map((s) => {
      const body = s.body_payload as { citation_ids?: unknown } | null;
      return {
        type: s.section_type,
        claims: s.claims,
        citationIds: Array.isArray(body?.citation_ids)
          ? body.citation_ids.filter((x): x is string => typeof x === "string")
          : [],
      };
    }),
  };
}

type Words = Readonly<Record<string, { readonly pl: string; readonly en: string }>>;
const word = (words: Words, key: string, lang: Lang): string => words[key]?.[lang] ?? key;

const SECTION_TITLES: Words = {
  GIVEN_NAME: { pl: "Imię", en: "First name" },
  ORIGIN: { pl: "Pochodzenie nazwiska", en: "Origin of the name" },
  DISTRIBUTION: { pl: "Liczebność i rozmieszczenie", en: "Numbers and distribution" },
  TIMELINE: { pl: "Zmiana w czasie", en: "Change over time" },
  ARCHIVES: { pl: "Archiwa", en: "Archives" },
  VARIANTS: { pl: "Dawne formy", en: "Historical forms" },
  PLACES: { pl: "Dawne miejsca", en: "Historical places" },
  MIGRATION: { pl: "Migracje", en: "Migration" },
  SOURCES: { pl: "Źródła", en: "Sources" },
  LIMITATIONS: { pl: "Czego nie wiemy", en: "What we don't know" },
};

const SOURCELESS: Words = {
  VARIANTS: { pl: "dawnych form nazwiska", en: "historical forms of the surname" },
  PLACES: {
    pl: "dawnych miejsc związanych z nazwiskiem",
    en: "historical places tied to the surname",
  },
  MIGRATION: { pl: "migracji nazwiska", en: "the surname's migration" },
};

const REASONS: Words = {
  NO_PREMIUM_INVENTORY: { pl: "nie ma głębszych materiałów", en: "there is no deeper material" },
  ALL_SHOWN_FREE: {
    pl: "wszystko, co jest, widać już za darmo",
    en: "everything there is already shows for free",
  },
  PAID_RIGHTS_BLOCKED: {
    pl: "prawa źródeł nie pozwalają na płatny raport",
    en: "the sources' rights do not allow a paid report",
  },
  ONE_CATEGORY_ONLY: {
    pl: "jest tylko jeden rodzaj głębszych materiałów",
    en: "there is only one kind of deeper material",
  },
  UNCONFIRMED_ONLY: {
    pl: "materiały są tylko niepotwierdzone",
    en: "the material is unconfirmed only",
  },
  COVERAGE_BELOW_STANDARD: {
    pl: "o nazwisku jest za mało danych",
    en: "there is too little data about the surname",
  },
};

const DIMENSIONS: Words = {
  POPULATION: { pl: "Liczebność", en: "Population" },
  RARITY: { pl: "Rzadkość", en: "Rarity" },
  MODERN_GEOGRAPHY: { pl: "Rozmieszczenie dziś", en: "Today's geography" },
  CHANGE_OVER_TIME: { pl: "Zmiana w czasie", en: "Change over time" },
  ETYMOLOGY: { pl: "Pochodzenie nazwiska", en: "Origin of the name" },
  ARCHIVES: { pl: "Archiwa", en: "Archives" },
  LOCALITIES: { pl: "Miejscowości o tej nazwie", en: "Localities of the same name" },
  ORIGIN: { pl: "Miejsce pochodzenia", en: "Place of origin" },
  VARIANTS: { pl: "Dawne formy", en: "Historical forms" },
  HISTORICAL_OCCURRENCES: { pl: "Dawne wzmianki", en: "Historical records" },
  HISTORICAL_PLACES: { pl: "Dawne miejsca", en: "Historical places" },
  MIGRATION: { pl: "Migracje", en: "Migration" },
};

const AVAILABILITY: Words = {
  PARTIAL: { pl: "częściowo", en: "partial" },
  NONE: { pl: "nic nie znaleziono", en: "nothing found" },
  BLOCKED_RIGHTS: { pl: "zablokowane przez prawa źródła", en: "blocked by the source's rights" },
  SOURCE_UNAVAILABLE: { pl: "źródło niedostępne", en: "source unavailable" },
  NOT_RETRIEVED: { pl: "jeszcze nie przeszukano", en: "not searched yet" },
  NOT_APPLICABLE: { pl: "nie dotyczy", en: "not applicable" },
};

const ROLES: Words = {
  HERO: { pl: "główne", en: "main" },
  SUPPORT: { pl: "uzupełniające", en: "supporting" },
  FOOTNOTE: { pl: "przypis", en: "footnote" },
  LIMITATION: { pl: "niepokazane w raporcie", en: "not shown in the report" },
};

/** Why a section shows no figures, by its state. */
const STATES: Words = {
  UNAVAILABLE: { pl: "Brak zatwierdzonych danych.", en: "No approved data." },
  RIGHTS_BLOCKED: {
    pl: "Prawa źródła nie pozwalają pokazać tego w raporcie.",
    en: "The source's rights do not allow this in the report.",
  },
  NO_SOURCED_MEANING: {
    pl: "Żadne dopuszczone dzieło onomastyczne nie objaśnia tego nazwiska.",
    en: "No admissible onomastic work explains this surname.",
  },
  NOT_SEARCHED: { pl: "Jeszcze nie przeszukano.", en: "Not searched yet." },
};

/** A full-name report's gaps about the first name, by topic. */
const GIVEN_GAPS: Words = {
  MEANING: {
    pl: "Znaczenie imienia: żadne dzieło, które wolno nam cytować (z domeny publicznej albo za bezpłatną zgodą wydawcy), nie objaśnia tego imienia.",
    en: "The name's meaning: no work we may quote (in the public domain, or with its publisher's free permission) explains this name.",
  },
  FULL_NAME_COUNT: {
    pl: "Ile osób nosi to imię i to nazwisko razem: żadne źródło nie łączy imion z nazwiskami, więc raport tego nie podaje i nie szacuje.",
    en: "How many people have this first name and this surname together: no source pairs first names with surnames, so the report neither states nor estimates it.",
  },
  COUNT: {
    pl: "Liczba osób z tym imieniem: brak zatwierdzonych danych.",
    en: "People with this first name: no approved data.",
  },
};

/** The language of origin a work states, by the code its file gives (TASK-147). */
export const ORIGINS: Words = {
  he: { pl: "hebrajskie", en: "Hebrew" },
  arc: { pl: "aramejskie", en: "Aramaic" },
  grc: { pl: "greckie", en: "Greek" },
  la: { pl: "łacińskie", en: "Latin" },
  gem: { pl: "germańskie", en: "Germanic" },
  sla: { pl: "słowiańskie", en: "Slavic" },
  lt: { pl: "litewskie", en: "Lithuanian" },
};

const COPY = {
  pl: {
    eyebrow: (v: number, d: string) => `Raport · wersja ${v} · ${d}`,
    fullEyebrow: (v: number, d: string) => `Raport imienia i nazwiska · wersja ${v} · ${d}`,
    internal: "Test wewnętrzny — ten raport nie jest sprzedawany.",
    eligible: "Kwalifikuje się do płatnego raportu.",
    notEligible: "Nie kwalifikuje się do płatnego raportu, bo",
    frozen: (d: string) => `Stan danych zamrożony ${d}; późniejsze zmiany go nie zmieniają.`,
    contents: "Spis treści",
    facts: ["twierdzenie", "twierdzenia", "twierdzeń"],
    sources: ["źródło", "źródła", "źródeł"],
    noSource: "brak źródła",
    stale:
      "Ta wersja została zamrożona według wcześniejszej umowy danych i nie da się jej już pokazać. Zbuduj nową wersję.",
    claims: "Twierdzenia w tym rozdziale",
    list: "Lista",
    people: "Liczba osób",
    asOf: "Stan na",
    oneIn: "1 na",
    rank: "Miejsce",
    leaders: "Najwięcej osób",
    from: "Od",
    to: "Do",
    change: "Zmiana",
    root: "Rdzeń",
    language: "Język",
    gloss: "Objaśnienie",
    formation: "Typ",
    work: "Dzieło",
    assessment: "Ocena",
    suppressed: "utajnione przez wydawcę",
    lowCoverage: "Regionalne listy obejmują tylko część osób z tym nazwiskiem.",
    archive: (q: string, d: string, records: string, pages: string) =>
      `Wyszukiwanie ${q} w Polonie ${d}: ${records} rekordów katalogu, ${pages} stron.`,
    archiveCaveat:
      "To trafienia wyszukiwania słowa, nie potwierdzone wzmianki o nazwisku ani o osobach.",
    sourceless: (what: string) => `Jeszcze nie przeszukano: Name Atlas nie ma źródła ${what}.`,
    retrieved: "pobrano",
    gaps: "Wymiary, których raport nie pokrywa w pełni",
    whyNot: "Dlaczego raport nie jest oferowany",
    noGaps: "Brak luk.",
    other: "English",
    rankOf: (rank: string, of: string) => `${rank} z ${of}`,
    noRank: "brak",
    listsApart:
      "Każda lista PESEL jest liczona osobno i list nie sumujemy. Miejsce: równe liczby dzielą miejsce.",
    givenGaps: "Imię",
    rankGap: (list: string) => `Miejsce na liście (${list}): brak zatwierdzonego twierdzenia.`,
    surnameNotOffered: "Dlaczego sama część o nazwisku nie byłaby oferowana",
    originMeaning: "Pochodzenie i znaczenie",
    origin: "Pochodzenie",
    meaning: "Znaczenie",
    quotation: "Słowa dzieła",
    quote: (text: string) => `„${text}”`,
    translatedBy: "przekład Name Atlas",
    translationNote:
      "Objaśnienia po angielsku przytaczamy dosłownie. Przekład na polski jest nasz (Name Atlas), dosłowny, i nie pochodzi z dzieła.",
    meaningBlocked: "Znaczenie imienia: prawa źródła nie pozwalają pokazać go w raporcie.",
  },
  en: {
    eyebrow: (v: number, d: string) => `Report · version ${v} · ${d}`,
    fullEyebrow: (v: number, d: string) => `Full-name report · version ${v} · ${d}`,
    internal: "Internal test — this report is not for sale.",
    eligible: "Eligible for a paid report.",
    notEligible: "Not eligible for a paid report, because",
    frozen: (d: string) => `Data frozen on ${d}; later changes do not alter it.`,
    contents: "Contents",
    facts: ["claim", "claims"],
    sources: ["source", "sources"],
    noSource: "no source",
    stale:
      "This version was frozen under an earlier data contract and can no longer be shown. Build a new version.",
    claims: "Claims in this chapter",
    list: "List",
    people: "People",
    asOf: "As of",
    oneIn: "1 in",
    rank: "Rank",
    leaders: "Most people",
    from: "From",
    to: "To",
    change: "Change",
    root: "Root",
    language: "Language",
    gloss: "Gloss",
    formation: "Type",
    work: "Work",
    assessment: "Assessment",
    suppressed: "suppressed by the publisher",
    lowCoverage: "The regional lists cover only part of the people with this surname.",
    archive: (q: string, d: string, records: string, pages: string) =>
      `A search for ${q} in Polona on ${d}: ${records} catalogue records, ${pages} pages.`,
    archiveCaveat:
      "These are search matches for a word, not confirmed records of the surname or of people.",
    sourceless: (what: string) => `Not searched yet: Name Atlas has no source for ${what}.`,
    retrieved: "retrieved",
    gaps: "Dimensions the report does not fully cover",
    whyNot: "Why the report is not offered",
    noGaps: "No gaps.",
    other: "Polski",
    rankOf: (rank: string, of: string) => `${rank} of ${of}`,
    noRank: "none",
    listsApart:
      "Each PESEL list is counted on its own, and the lists are never added together. Rank: equal counts share a place.",
    givenGaps: "First name",
    rankGap: (list: string) => `Rank on the list (${list}): no approved claim.`,
    surnameNotOffered: "Why the surname part alone would not be offered",
    originMeaning: "Origin and meaning",
    origin: "Origin",
    meaning: "Meaning",
    quotation: "The work's words",
    quote: (text: string) => `“${text}”`,
    translatedBy: "translated by Name Atlas",
    translationNote: "",
    meaningBlocked: "The name's meaning: the source's rights do not allow it in the report.",
  },
} as const;

/** Every citation in the response, by id. */
function citationsById(
  value: unknown,
  out = new Map<string, CitationDto>(),
): Map<string, CitationDto> {
  if (Array.isArray(value)) {
    for (const v of value) citationsById(v, out);
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "citation" && v !== null && typeof v === "object" && "id" in v) {
        const c = v as CitationDto;
        if (!out.has(c.id)) out.set(c.id, c);
      } else {
        citationsById(v, out);
      }
    }
  }
  return out;
}

/** A footnote marker into the bibliography; nothing when the citation is not in it. */
function Note({ id, numbers }: { id: string; numbers: ReadonlyMap<string, number> }) {
  const n = numbers.get(id);
  return n === undefined ? null : (
    <sup className="report-note">
      <a href={`#zrodlo-${n}`}>[{n}]</a>
    </sup>
  );
}

function Table({
  head,
  rows,
}: {
  head: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <table className="report-table">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function listName(group: string | null, lang: Lang): string {
  return partitionLabel(group, lang) ?? "—";
}

function Origin({ r, lang }: { r: SurnameResultResponse; lang: Lang }) {
  const t = COPY[lang];
  const m = r.meaning;
  if (m === null) return <p>{word(STATES, "UNAVAILABLE", lang)}</p>;
  if (m.state !== "AVAILABLE") return <p>{word(STATES, m.state, lang)}</p>;
  return (
    <>
      <Table
        head={[t.root, t.language, t.gloss, t.formation, t.work]}
        rows={m.interpretations.map((i) => [
          i.root_form ?? "—",
          i.root_language ?? "—",
          i.literal_gloss,
          formationWord(i.formation_type, lang),
          `${i.work.author_or_publisher}, ${i.work.title} (${i.work.year}), ${i.locator}`,
        ])}
      />
      {m.confidence !== null ? (
        <p className="report-assessment">
          {t.assessment}: {assessmentWord(m.confidence, lang)}
        </p>
      ) : null}
    </>
  );
}

function Distribution({
  r,
  lang,
  numbers,
}: {
  r: SurnameResultResponse;
  lang: Lang;
  numbers: ReadonlyMap<string, number>;
}) {
  const t = COPY[lang];
  const out: ReactNode[] = [];
  const pop = r.population;
  if (pop?.state === "READY") {
    out.push(
      <Table
        key="population"
        head={[t.list, t.people, t.asOf]}
        rows={pop.observations.map((o) => [
          listName(o.comparability_group, lang),
          <>
            {o.value.status === "KNOWN" && o.value.value !== null
              ? formatInteger(o.value.value, lang)
              : t.suppressed}
            <Note id={o.citation.id} numbers={numbers} />
          </>,
          formatDate(o.snapshot_date, lang),
        ])}
      />,
    );
  } else {
    out.push(<p key="population">{word(STATES, pop?.state ?? "UNAVAILABLE", lang)}</p>);
  }
  const rarity = r.rarity;
  if (rarity?.state === "READY") {
    out.push(
      <Table
        key="rarity"
        head={[t.list, t.oneIn, t.rank]}
        rows={rarity.entries.map((e) => {
          const rank = e.supporting.find((s) => s.metric === "RANK");
          return [
            listName(e.comparability_group, lang),
            <>
              {e.primary.metric === "ONE_IN_X" ? formatInteger(e.primary.value, lang) : "—"}
              <Note id={e.citation.id} numbers={numbers} />
            </>,
            rank === undefined ? "—" : formatInteger(rank.value, lang),
          ];
        })}
      />,
    );
  }
  const distribution = r.distribution;
  if (distribution?.state === "READY") {
    for (const [i, e] of distribution.entries.entries()) {
      const leaders = [...e.regions].sort((a, b) => b.count - a.count).slice(0, 5);
      out.push(
        <div key={`distribution-${i}`} className="report-block">
          <p className="report-label">
            {t.leaders} · {listName(e.comparability_group, lang)}
            <Note id={e.citation.id} numbers={numbers} />
          </p>
          <ol className="report-leaders">
            {leaders.map((p) => (
              <li key={p.display_name}>
                {p.display_name}: {formatShare(p.share_of_covered, lang)} (
                {formatInteger(p.count, lang)})
              </li>
            ))}
          </ol>
          {e.coverage_state !== "READY" ? <p>{t.lowCoverage}</p> : null}
        </div>,
      );
    }
  }
  return <>{out}</>;
}

function Timeline({
  r,
  lang,
  numbers,
}: {
  r: SurnameResultResponse;
  lang: Lang;
  numbers: ReadonlyMap<string, number>;
}) {
  const t = COPY[lang];
  const change = r.change;
  if (change?.state !== "READY") return <p>{word(STATES, change?.state ?? "UNAVAILABLE", lang)}</p>;
  return (
    <Table
      head={[t.list, t.from, t.to, t.change]}
      rows={change.entries.map((e) => [
        <>
          {changeListLabel(e.list, lang)}
          <Note id={e.citation.id} numbers={numbers} />
        </>,
        `${formatDate(e.summary.first.data_date, lang)}: ${formatInteger(e.summary.first.count, lang)}`,
        `${formatDate(e.summary.last.data_date, lang)}: ${formatInteger(e.summary.last.count, lang)}`,
        formatPercentChange(e.summary.count_change_percent, lang),
      ])}
    />
  );
}

function Archives({
  r,
  lang,
  numbers,
}: {
  r: SurnameResultResponse;
  lang: Lang;
  numbers: ReadonlyMap<string, number>;
}) {
  const t = COPY[lang];
  const a = r.archive;
  if (a?.state !== "READY" || a.query === null || a.searched_on === null) {
    return <p>{word(STATES, a?.state ?? "UNAVAILABLE", lang)}</p>;
  }
  return (
    <>
      <p>
        {t.archive(
          a.query,
          formatDate(a.searched_on, lang),
          formatInteger(a.catalogue_records ?? 0, lang),
          formatInteger(a.pages ?? 0, lang),
        )}
        {a.citation !== null ? <Note id={a.citation.id} numbers={numbers} /> : null}
      </p>
      <p className="report-caveat">{t.archiveCaveat}</p>
    </>
  );
}

function GivenName({
  facts,
  lang,
  numbers,
}: {
  facts: GivenNameReportFacts;
  lang: Lang;
  numbers: ReadonlyMap<string, number>;
}) {
  const t = COPY[lang];
  const meaning = (
    <>
      <h3>{t.originMeaning}</h3>
      <GivenNameMeaning meaning={facts.meaning} lang={lang} numbers={numbers} />
    </>
  );
  if (facts.state !== "READY") {
    return (
      <>
        <p>{word(STATES, facts.state, lang)}</p>
        {meaning}
      </>
    );
  }
  return (
    <>
      <Table
        head={[t.list, t.people, t.rank, t.asOf]}
        rows={facts.lists.map((l) => [
          listName(l.comparability_group, lang),
          <>
            {formatInteger(l.count.count, lang)}
            <Note id={l.count.citation.id} numbers={numbers} />
          </>,
          l.rank === null ? (
            t.noRank
          ) : (
            <>
              {t.rankOf(
                formatInteger(l.rank.rank, lang),
                formatInteger(l.rank.universe_size, lang),
              )}
              <Note id={l.rank.citation.id} numbers={numbers} />
            </>
          ),
          formatDate(l.snapshot_date, lang),
        ])}
      />
      <p className="report-caveat">{t.listsApart}</p>
      {meaning}
    </>
  );
}

/**
 * Each work's entry for the first name, in the work's own words (D-046): the
 * origin it states, its meaning, and on the Polish page Name Atlas's literal
 * translation of an English meaning, marked as ours.
 */
function GivenNameMeaning({
  meaning,
  lang,
  numbers,
}: {
  meaning: GivenNameMeaningFacts;
  lang: Lang;
  numbers: ReadonlyMap<string, number>;
}) {
  const t = COPY[lang];
  if (meaning.state === "RIGHTS_BLOCKED") return <p>{word(STATES, "RIGHTS_BLOCKED", lang)}</p>;
  if (meaning.state !== "READY") {
    return <p className="report-caveat">{word(GIVEN_GAPS, "MEANING", lang)}</p>;
  }
  const translated = lang === "pl" && meaning.works.some((w) => w.translation !== null);
  return (
    <>
      <Table
        head={[t.work, t.origin, t.meaning, t.quotation]}
        rows={meaning.works.map((w) => [
          <>
            {`${w.work.author_or_publisher}, ${w.work.title} (${w.work.year}), ${w.locator}`}
            <Note id={w.citation.id} numbers={numbers} />
          </>,
          w.origin === null
            ? "—"
            : `${word(ORIGINS, w.origin.code, lang)} (${t.quote(w.origin.as_printed)})`,
          w.literal_gloss === null ? (
            "—"
          ) : lang === "pl" && w.translation !== null ? (
            <>
              {t.quote(w.literal_gloss)}
              <br />
              {t.translatedBy}: {t.quote(w.translation.text)}
            </>
          ) : (
            t.quote(w.literal_gloss)
          ),
          t.quote(w.quotation),
        ])}
      />
      <p className="report-assessment">
        {t.assessment}: {assessmentWord(meaning.confidence.status, lang)}
      </p>
      {translated ? <p className="report-caveat">{t.translationNote}</p> : null}
    </>
  );
}

/** A citation's locator in words: a dataset's resource number, or the locator as written. */
function locatorWords(locator: string, lang: Lang): string {
  const resource = /^resource:(\S+)$/u.exec(locator);
  if (resource === null) return locator;
  return `${lang === "pl" ? "zasób" : "resource"} ${resource[1]}`;
}

function Bibliography({
  ids,
  citations,
  lang,
}: {
  ids: readonly string[];
  citations: ReadonlyMap<string, CitationDto>;
  lang: Lang;
}) {
  const t = COPY[lang];
  return (
    <ol className="report-bib">
      {ids.map((id, i) => {
        const c = citations.get(id);
        if (c === undefined) return null;
        const link = c.source_page_url ?? c.url;
        return (
          <li key={id} id={`zrodlo-${i + 1}`}>
            {link !== null ? <a href={link}>{c.title}</a> : c.title}
            {c.publisher !== null ? ` — ${c.publisher}` : ""}
            {c.locator !== null ? `, ${locatorWords(c.locator, lang)}` : ""}
            {c.publication_date !== null ? `, ${c.publication_date}` : ""}
            {c.retrieved_at !== null ? ` (${t.retrieved} ${c.retrieved_at.slice(0, 10)})` : ""}
            {c.terms !== null ? `. ${c.terms}` : ""}
          </li>
        );
      })}
    </ol>
  );
}

/** The chapter's body: its facts, or the state that says why there are none. */
function chapterBody(
  type: string,
  p: ReportPreview,
  lang: Lang,
  numbers: ReadonlyMap<string, number>,
  citations: ReadonlyMap<string, CitationDto>,
): ReactNode {
  const t = COPY[lang];
  const r = p.response;
  if (type === "LIMITATIONS") {
    return (
      <>
        <h3>{t.gaps}</h3>
        {p.gaps.length === 0 ? (
          <p>{t.noGaps}</p>
        ) : (
          <ul>
            {p.gaps.map((g) => (
              <li key={g.dimension}>
                {word(DIMENSIONS, g.dimension, lang)}: {word(AVAILABILITY, g.availability, lang)}
              </li>
            ))}
          </ul>
        )}
        {p.givenName !== null ? (
          <>
            <h3>{t.givenGaps}</h3>
            <ul>
              {p.givenGaps.map((g) => (
                <li key={`${g.topic}-${g.comparability_group ?? ""}`}>
                  {g.topic === "RANK"
                    ? t.rankGap(listName(g.comparability_group, lang))
                    : g.topic === "MEANING" && g.reason_code === "RIGHTS_BLOCKED"
                      ? t.meaningBlocked
                      : word(GIVEN_GAPS, g.topic, lang)}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {p.eligibility.reason_codes.length > 0 ? (
          <>
            <h3>{p.givenName === null ? t.whyNot : t.surnameNotOffered}</h3>
            <ul>
              {p.eligibility.reason_codes.map((code) => (
                <li key={code}>{word(REASONS, code, lang)}</li>
              ))}
            </ul>
          </>
        ) : null}
      </>
    );
  }
  if (type in SOURCELESS) return <p>{t.sourceless(word(SOURCELESS, type, lang))}</p>;
  if (type === "GIVEN_NAME") {
    return p.givenName === null ? null : (
      <GivenName facts={p.givenName} lang={lang} numbers={numbers} />
    );
  }
  if (r === null) return <p>{t.stale}</p>;
  switch (type) {
    case "ORIGIN":
      return <Origin r={r} lang={lang} />;
    case "DISTRIBUTION":
      return <Distribution r={r} lang={lang} numbers={numbers} />;
    case "TIMELINE":
      return <Timeline r={r} lang={lang} numbers={numbers} />;
    case "ARCHIVES":
      return <Archives r={r} lang={lang} numbers={numbers} />;
    case "SOURCES": {
      const ids = p.sections.find((s) => s.type === "SOURCES")?.citationIds ?? [];
      return <Bibliography ids={ids} citations={citations} lang={lang} />;
    }
    default:
      return null;
  }
}

/** The contents line's count: the chapter's claims, or its sources. */
function contentsCount(section: ReportPreview["sections"][number], lang: Lang): string {
  const t = COPY[lang];
  if (section.type === "SOURCES") {
    const n = section.citationIds.length;
    return `${formatInteger(n, lang)} ${pluralForm(n, t.sources, lang)}`;
  }
  if (section.type === "LIMITATIONS") return "";
  if (section.type in SOURCELESS) return t.noSource;
  const n = section.claims.length;
  return `${formatInteger(n, lang)} ${pluralForm(n, t.facts, lang)}`;
}

/** The dossier itself, without the site's shell. */
export function ReportDossier({ preview, lang }: { preview: ReportPreview; lang: Lang }) {
  const t = COPY[lang];
  const sourceIds = preview.sections.find((s) => s.type === "SOURCES")?.citationIds ?? [];
  const numbers = new Map(sourceIds.map((id, i) => [id, i + 1]));
  const citations = citationsById([preview.givenName, preview.response]);
  const date = formatDate(preview.generatedOn, lang);
  const eligible = preview.eligibility.state === "ELIGIBLE";
  const fullName = preview.givenName !== null;

  return (
    <article className="report">
      <header className="report-cover">
        <p className="report-eyebrow">
          {fullName ? t.fullEyebrow(preview.version, date) : t.eyebrow(preview.version, date)}
        </p>
        <h1 className="report-title">{preview.displayName}</h1>
        <p className="report-stamp">{t.internal}</p>
        {/* The eligibility policy judges a surname report; a full-name report's lives in its last chapter. */}
        {fullName ? null : (
          <p className="report-verdict">
            {eligible
              ? t.eligible
              : `${t.notEligible} ${preview.eligibility.reason_codes
                  .map((code) => word(REASONS, code, lang))
                  .join("; ")}.`}
          </p>
        )}
        <p className="report-frozen">{t.frozen(date)}</p>
      </header>

      <nav className="report-toc" aria-label={t.contents}>
        <h2>{t.contents}</h2>
        <ol>
          {preview.sections.map((s, i) => (
            <li key={s.type}>
              <a href={`#r-${s.type.toLowerCase()}`}>
                <span className="report-num">{i + 1}</span> {word(SECTION_TITLES, s.type, lang)}
              </a>
              <span className="report-toc-count">{contentsCount(s, lang)}</span>
            </li>
          ))}
        </ol>
      </nav>

      {preview.sections.map((s, i) => (
        <section key={s.type} id={`r-${s.type.toLowerCase()}`} className="report-chapter">
          <h2>
            <span className="report-num">{i + 1}</span> {word(SECTION_TITLES, s.type, lang)}
          </h2>
          {chapterBody(s.type, preview, lang, numbers, citations)}
          {s.claims.length > 0 ? (
            <details className="report-claims">
              <summary>{t.claims}</summary>
              <ul>
                {s.claims.map((c) => (
                  <li key={c.claim_id}>
                    <code>{c.claim_id}</code> · {word(ROLES, c.presentation_role, lang)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ))}
    </article>
  );
}

/** The preview page: the dossier in the site's quiet shell. */
export function ReportPage({ preview, lang }: { preview: ReportPreview; lang: Lang }) {
  return (
    <SiteShell
      lang={lang}
      otherPath={reportPath(preview.id, lang === "pl" ? "en" : "pl")}
      world={{ mode: "quiet" }}
      mainClassName="reading report-page"
    >
      <ReportDossier preview={preview} lang={lang} />
    </SiteShell>
  );
}
