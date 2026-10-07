/**
 * A first name's facts for the full-name report (TASK-124, ADR-0041): its
 * active `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` claims (TASK-122), each
 * with its confidence and citation, per list, on one surface; and its
 * `GIVEN_NAME_MEANING` claim (TASK-147), each work's entry with its citation.
 *
 * It reads claims only, never `given_name_counts`: a page or a report shows a
 * given name through its claims (ADR-0032, consequences; ADR-0001). The two
 * lists stay apart and are never summed. A list with no rank claim has no
 * rank, never a zero. Nothing here is a count of people with a first name and
 * a surname together (ADR-0032 §7, D-033).
 */
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { citationSchema } from "@name-atlas/contracts";
import type { CitationDto } from "@name-atlas/contracts";
import type {
  BirthListInfo,
  BirthNameFacts,
  BirthSex,
  BirthSexFigures,
  BirthTrendFigure,
  BirthYearFigures,
} from "./given-name-birth-facts.js";
import { evaluateSurface, sectionEligibility } from "./rights.js";
import type { EffectiveRights, Surface } from "./rights.js";

export interface GivenNameConfidence {
  readonly status: string;
  readonly methodology_code: string;
}

export interface GivenNameCountFact {
  readonly claim_id: string;
  readonly count: number;
  readonly confidence: GivenNameConfidence;
  readonly citation: CitationDto;
}

export interface GivenNameRankFact {
  readonly claim_id: string;
  readonly rank: number;
  readonly universe_size: number;
  readonly ties_policy: string;
  readonly confidence: GivenNameConfidence;
  readonly citation: CitationDto;
}

/** One PESEL list's facts about the name. */
export interface GivenNameListFacts {
  readonly comparability_group: string;
  readonly snapshot_date: string;
  readonly count: GivenNameCountFact;
  /** Null when no rank claim stands for this list (refused by the gate, or not derived). */
  readonly rank: GivenNameRankFact | null;
}

/** What one work states about the name (TASK-147): its own words, and D-046's two additions. */
export interface GivenNameMeaningWork {
  readonly work: {
    readonly title: string;
    readonly author_or_publisher: string;
    readonly year: number;
  };
  /** The name as the work prints it. */
  readonly printed_form: string;
  /** The language of origin: a code to compare by, and the work's own words. */
  readonly origin: { readonly code: string; readonly as_printed: string } | null;
  /** The work's meaning, verbatim, in the work's language. */
  readonly literal_gloss: string | null;
  /** A literal Polish translation of the gloss, by Name Atlas (D-046 §2). */
  readonly translation: {
    readonly language: string;
    readonly text: string;
    readonly by: string;
  } | null;
  readonly locator: string;
  /** The work's sentence or line, verbatim. */
  readonly quotation: string;
  readonly citation: CitationDto;
}

/**
 * The name's origin and meaning: READY with each work's entry; NO_SOURCE when
 * no admissible work explains the name; RIGHTS_BLOCKED when the surface may
 * not show the claim it has.
 */
export type GivenNameMeaningFacts =
  | {
      readonly state: "READY";
      readonly claim_id: string;
      readonly confidence: GivenNameConfidence;
      readonly works: readonly GivenNameMeaningWork[];
    }
  | { readonly state: "NO_SOURCE" | "RIGHTS_BLOCKED" };

export interface GivenNameFacts {
  readonly given_name: { readonly id: string; readonly display_name: string };
  /**
   * READY when at least one list's count is shown; UNAVAILABLE when the name
   * has no active count claim; RIGHTS_BLOCKED when the surface may not show
   * the claims it has.
   */
  readonly state: "READY" | "UNAVAILABLE" | "RIGHTS_BLOCKED";
  readonly lists: readonly GivenNameListFacts[];
}

/**
 * The first name's facts a full-name report freezes: the counts, the meaning
 * (TASK-147), and the name as one given to children (TASK-155).
 */
export interface GivenNameReportFacts extends GivenNameFacts {
  /**
   * The name's origin and meaning, apart from the counts' state. A version
   * frozen under `full_name_report@0` has none, and reads as NO_SOURCE: no
   * work could be quoted then.
   */
  readonly meaning: GivenNameMeaningFacts;
  /**
   * The name as a first name given to children, each year from 2000, boys and
   * girls apart (D-044; ADR-0037 as amended by D-044). Null in a version
   * frozen before `full_name_report@2`, which did not freeze them.
   */
  readonly births: BirthNameFacts | null;
}

/** `structured_value` of the two claim types, as TASK-122 writes them. */
interface CountValue {
  readonly count: number;
  readonly snapshot_date: string;
  readonly comparability_group: string;
}
interface RankValue {
  readonly rank: number;
  readonly universe_size: number;
  readonly ties_policy: string;
  readonly comparability_group: string;
}

interface FactRow {
  claim_id: string;
  claim_type: string;
  payload: string;
  confidence_status: string;
  assessment_method: string;
  assessment_version: string;
  citation_id: string;
  citation_title: string;
  citation_publisher: string | null;
  citation_publication_date: string | null;
  citation_url: string | null;
  citation_locator: string | null;
  citation_retrieved_at: string | null;
  citation_source_page_url: string | null;
  source_type: string;
  attribution_text: string | null;
  terms_version: string | null;
  automated_access: string;
  commercial_use: string;
  redistribution: string;
  metadata_rights: string;
  review_status: string;
}

/**
 * The name's facts as `surface` may show them. The claims are compared as
 * text, never by enum literal, so a database without migration 0038 finds
 * none instead of failing.
 */
export async function readGivenNameFacts(
  db: Kysely<DB>,
  givenName: { readonly id: string; readonly display_name: string },
  surface: Surface,
): Promise<GivenNameFacts> {
  const result = await sql<FactRow>`
    SELECT
      c.claim_id::text                 AS claim_id,
      c.claim_type::text               AS claim_type,
      c.structured_value::text         AS payload,
      ca.status::text                  AS confidence_status,
      ca.assessment_method             AS assessment_method,
      ca.assessment_version            AS assessment_version,
      cit.citation_id::text            AS citation_id,
      cit.title                        AS citation_title,
      cit.publisher                    AS citation_publisher,
      cit.publication_date             AS citation_publication_date,
      cit.url_or_reference             AS citation_url,
      cit.supporting_locator           AS citation_locator,
      to_char(cit.accessed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                                       AS citation_retrieved_at,
      src.homepage_or_reference_url    AS citation_source_page_url,
      src.source_type::text            AS source_type,
      rp.attribution_text              AS attribution_text,
      rp.terms_version                 AS terms_version,
      rp.automated_access::text        AS automated_access,
      rp.commercial_use::text          AS commercial_use,
      rp.redistribution::text          AS redistribution,
      rp.metadata_rights::text         AS metadata_rights,
      rp.review_status::text           AS review_status
    FROM claims c
    JOIN confidence_assessments ca ON ca.claim_id = c.claim_id
    JOIN citations cit             ON cit.claim_id = c.claim_id
    JOIN sources src               ON src.source_id = cit.source_id
    JOIN rights_profiles rp        ON rp.rights_profile_id = cit.rights_profile_id
    WHERE c.subject_entity_id = ${givenName.id}::uuid
      AND c.claim_type::text IN ('GIVEN_NAME_POPULATION', 'GIVEN_NAME_RANK')
      AND c.claim_status = 'ACTIVE'
    ORDER BY c.structured_value->>'comparability_group', c.claim_type::text, c.claim_id
  `.execute(db);

  const counts = result.rows.filter((r) => r.claim_type === "GIVEN_NAME_POPULATION");
  if (counts.length === 0) return { given_name: givenName, state: "UNAVAILABLE", lists: [] };

  const rights: EffectiveRights[] = result.rows.map((r) => ({
    automated_access: r.automated_access,
    commercial_use: r.commercial_use,
    redistribution: r.redistribution,
    metadata_rights: r.metadata_rights,
    review_status: r.review_status,
  }));
  const [first] = rights;
  if (first === undefined) return { given_name: givenName, state: "UNAVAILABLE", lists: [] };
  const eligibility = sectionEligibility(evaluateSurface(first, surface), rights, surface);
  if (eligibility.decision === "BLOCKED") {
    return { given_name: givenName, state: "RIGHTS_BLOCKED", lists: [] };
  }

  const ranks = new Map(
    result.rows
      .filter((r) => r.claim_type === "GIVEN_NAME_RANK")
      .map((r) => {
        const value = JSON.parse(r.payload) as RankValue;
        return [value.comparability_group, { row: r, value }] as const;
      }),
  );
  const lists = counts.map((row): GivenNameListFacts => {
    const value = JSON.parse(row.payload) as CountValue;
    const rank = ranks.get(value.comparability_group);
    return {
      comparability_group: value.comparability_group,
      snapshot_date: value.snapshot_date,
      count: {
        claim_id: row.claim_id,
        count: value.count,
        confidence: confidenceOf(row),
        citation: citationOf(row),
      },
      rank:
        rank === undefined
          ? null
          : {
              claim_id: rank.row.claim_id,
              rank: rank.value.rank,
              universe_size: rank.value.universe_size,
              ties_policy: rank.value.ties_policy,
              confidence: confidenceOf(rank.row),
              citation: citationOf(rank.row),
            },
    };
  });
  return { given_name: givenName, state: "READY", lists };
}

interface MeaningRow extends FactRow {
  citation_source_record_id: string | null;
}

/**
 * The name's active `GIVEN_NAME_MEANING` claim as `surface` may show it: each
 * work's entry from the claim, with that work's citation. Compared as text,
 * so a database without migration 0044 finds none.
 */
export async function readGivenNameMeaning(
  db: Kysely<DB>,
  givenNameId: string,
  surface: Surface,
): Promise<GivenNameMeaningFacts> {
  const result = await sql<MeaningRow>`
    SELECT
      c.claim_id::text                 AS claim_id,
      c.claim_type::text               AS claim_type,
      c.structured_value::text         AS payload,
      ca.status::text                  AS confidence_status,
      ca.assessment_method             AS assessment_method,
      ca.assessment_version            AS assessment_version,
      cit.citation_id::text            AS citation_id,
      cit.source_record_id::text       AS citation_source_record_id,
      cit.title                        AS citation_title,
      cit.publisher                    AS citation_publisher,
      cit.publication_date             AS citation_publication_date,
      cit.url_or_reference             AS citation_url,
      cit.supporting_locator           AS citation_locator,
      to_char(cit.accessed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                                       AS citation_retrieved_at,
      src.homepage_or_reference_url    AS citation_source_page_url,
      src.source_type::text            AS source_type,
      rp.attribution_text              AS attribution_text,
      rp.terms_version                 AS terms_version,
      rp.automated_access::text        AS automated_access,
      rp.commercial_use::text          AS commercial_use,
      rp.redistribution::text          AS redistribution,
      rp.metadata_rights::text         AS metadata_rights,
      rp.review_status::text           AS review_status
    FROM claims c
    JOIN LATERAL (
      SELECT * FROM confidence_assessments a
       WHERE a.claim_id = c.claim_id ORDER BY a.assessed_at DESC LIMIT 1
    ) ca ON true
    JOIN citations cit             ON cit.claim_id = c.claim_id
    JOIN sources src               ON src.source_id = cit.source_id
    JOIN rights_profiles rp        ON rp.rights_profile_id = cit.rights_profile_id
    WHERE c.subject_entity_id = ${givenNameId}::uuid
      AND c.claim_type::text = 'GIVEN_NAME_MEANING'
      AND c.claim_status = 'ACTIVE'
    ORDER BY cit.citation_id
  `.execute(db);
  const [first] = result.rows;
  if (first === undefined) return { state: "NO_SOURCE" };
  const rights: EffectiveRights[] = result.rows.map((r) => ({
    automated_access: r.automated_access,
    commercial_use: r.commercial_use,
    redistribution: r.redistribution,
    metadata_rights: r.metadata_rights,
    review_status: r.review_status,
  }));
  const eligibility = sectionEligibility(evaluateSurface(rights[0]!, surface), rights, surface);
  if (eligibility.decision === "BLOCKED") return { state: "RIGHTS_BLOCKED" };

  const citations = new Map(
    result.rows.map((r) => [r.citation_source_record_id ?? "", citationOf(r)] as const),
  );
  const value = record(JSON.parse(first.payload));
  const entries = Array.isArray(value?.["interpretations"]) ? value["interpretations"] : [];
  const works = entries.flatMap((entry): GivenNameMeaningWork[] => {
    const x = record(entry);
    const citation = citations.get(String(x?.["source_record_id"] ?? ""));
    if (x === null || citation === undefined) return [];
    const work = workFrom({ ...x, citation });
    return work === null ? [] : [work];
  });
  if (works.length === 0) return { state: "NO_SOURCE" };
  return { state: "READY", claim_id: first.claim_id, confidence: confidenceOf(first), works };
}

function confidenceOf(row: FactRow): GivenNameConfidence {
  return {
    status: row.confidence_status,
    methodology_code: `${row.assessment_method}@${row.assessment_version}`,
  };
}

function citationOf(row: FactRow): CitationDto {
  return {
    id: row.citation_id,
    title: row.citation_title,
    publisher: row.citation_publisher,
    publication_date: row.citation_publication_date,
    source_type: row.source_type,
    locator: row.citation_locator,
    url: row.citation_url,
    attribution: row.attribution_text,
    terms: row.terms_version,
    retrieved_at: row.citation_retrieved_at,
    source_page_url: row.citation_source_page_url,
  };
}

// ---------------------------------------------------------------------------
// Reading them back from a frozen report
// ---------------------------------------------------------------------------

const isString = (v: unknown): v is string => typeof v === "string" && v !== "";
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

function confidenceFrom(v: unknown): GivenNameConfidence | null {
  const x = record(v);
  return x !== null && isString(x["status"]) && isString(x["methodology_code"])
    ? { status: x["status"], methodology_code: x["methodology_code"] }
    : null;
}

function citationFrom(v: unknown): CitationDto | null {
  const parsed = citationSchema.safeParse(v);
  return parsed.success ? parsed.data : null;
}

function listFrom(v: unknown): GivenNameListFacts | null {
  const x = record(v);
  const count = record(x?.["count"]);
  if (x === null || count === null) return null;
  const group = x["comparability_group"];
  const date = x["snapshot_date"];
  const countConfidence = confidenceFrom(count["confidence"]);
  const countCitation = citationFrom(count["citation"]);
  if (
    !isString(group) ||
    !isString(date) ||
    !isString(count["claim_id"]) ||
    !isCount(count["count"]) ||
    countConfidence === null ||
    countCitation === null
  ) {
    return null;
  }
  let rank: GivenNameRankFact | null = null;
  if (x["rank"] !== null) {
    const r = record(x["rank"]);
    const rankConfidence = confidenceFrom(r?.["confidence"]);
    const rankCitation = citationFrom(r?.["citation"]);
    if (
      r === null ||
      !isString(r["claim_id"]) ||
      !isCount(r["rank"]) ||
      !isCount(r["universe_size"]) ||
      !isString(r["ties_policy"]) ||
      rankConfidence === null ||
      rankCitation === null
    ) {
      return null;
    }
    rank = {
      claim_id: r["claim_id"],
      rank: r["rank"],
      universe_size: r["universe_size"],
      ties_policy: r["ties_policy"],
      confidence: rankConfidence,
      citation: rankCitation,
    };
  }
  return {
    comparability_group: group,
    snapshot_date: date,
    count: {
      claim_id: count["claim_id"],
      count: count["count"],
      confidence: countConfidence,
      citation: countCitation,
    },
    rank,
  };
}

const isText = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/** One work's entry, checked field by field; null when it is not one. */
function workFrom(v: unknown): GivenNameMeaningWork | null {
  const x = record(v);
  const work = record(x?.["work"]);
  const citation = citationFrom(x?.["citation"]);
  if (
    x === null ||
    work === null ||
    citation === null ||
    !isText(work["title"]) ||
    !isText(work["author_or_publisher"]) ||
    !Number.isInteger(work["year"]) ||
    !isText(x["printed_form"]) ||
    !isText(x["locator"]) ||
    !isText(x["quotation"])
  ) {
    return null;
  }
  let origin: GivenNameMeaningWork["origin"] = null;
  if (x["origin"] !== null && x["origin"] !== undefined) {
    const o = record(x["origin"]);
    if (o === null || !isText(o["code"]) || !isText(o["as_printed"])) return null;
    origin = { code: o["code"], as_printed: o["as_printed"] };
  }
  const gloss = x["literal_gloss"];
  if (gloss !== null && gloss !== undefined && !isText(gloss)) return null;
  let translation: GivenNameMeaningWork["translation"] = null;
  if (x["translation"] !== null && x["translation"] !== undefined) {
    const t = record(x["translation"]);
    if (t === null || !isText(t["language"]) || !isText(t["text"]) || !isText(t["by"])) {
      return null;
    }
    translation = { language: t["language"], text: t["text"], by: t["by"] };
  }
  if (origin === null && !isText(gloss)) return null;
  return {
    work: {
      title: work["title"],
      author_or_publisher: work["author_or_publisher"],
      year: work["year"] as number,
    },
    printed_form: x["printed_form"],
    origin,
    literal_gloss: isText(gloss) ? gloss : null,
    translation,
    locator: x["locator"],
    quotation: x["quotation"],
    citation,
  };
}

/** A frozen meaning; absent (a `full_name_report@0` version) reads as NO_SOURCE. */
function meaningFrom(v: unknown): GivenNameMeaningFacts | null {
  if (v === undefined) return { state: "NO_SOURCE" };
  const x = record(v);
  const state = x?.["state"];
  if (x === null) return null;
  if (state === "NO_SOURCE" || state === "RIGHTS_BLOCKED") return { state };
  const confidence = confidenceFrom(x["confidence"]);
  const works = x["works"];
  if (
    state !== "READY" ||
    !isString(x["claim_id"]) ||
    confidence === null ||
    !Array.isArray(works) ||
    works.length === 0
  ) {
    return null;
  }
  const parsed = works.map(workFrom);
  if (!parsed.every((w): w is GivenNameMeaningWork => w !== null)) return null;
  return { state, claim_id: x["claim_id"], confidence, works: parsed };
}

const BIRTH_SEX_VALUES: readonly unknown[] = ["MALE", "FEMALE"];
const isBirthSex = (v: unknown): v is BirthSex => BIRTH_SEX_VALUES.includes(v);
const isYear = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 1900 && (v as number) <= 2999;
const isCountOrNull = (v: unknown): v is number | null => v === null || isCount(v);
const isNumberOrNull = (v: unknown): v is number | null =>
  v === null || (typeof v === "number" && Number.isFinite(v));

/** A frozen list's description; null when none was stored, undefined when it is not one. */
function birthListFrom(v: unknown): BirthListInfo | null | undefined {
  if (v === null) return null;
  const x = record(v);
  if (
    x === null ||
    !isString(x["list_id"]) ||
    !isYear(x["birth_year"]) ||
    !isBirthSex(x["sex"]) ||
    !isCount(x["publication_threshold"]) ||
    !isCount(x["people_sum"])
  ) {
    return undefined;
  }
  return {
    list_id: x["list_id"],
    birth_year: x["birth_year"],
    sex: x["sex"],
    publication_threshold: x["publication_threshold"],
    people_sum: x["people_sum"],
  };
}

/** One frozen year of one sex; undefined when it is not one. */
function birthYearFrom(v: unknown): BirthYearFigures | undefined {
  const x = record(v);
  if (x === null || !isYear(x["birth_year"])) return undefined;
  const list = birthListFrom(x["list"]);
  if (list === undefined) return undefined;
  let count: BirthYearFigures["count"] = null;
  if (x["count"] !== null) {
    const c = record(x["count"]);
    const citation = citationFrom(c?.["citation"]);
    if (
      c === null ||
      citation === null ||
      !isString(c["claim_id"]) ||
      !isCount(c["count"]) ||
      !isCountOrNull(c["share_per_million"]) ||
      !isCountOrNull(c["one_in"])
    ) {
      return undefined;
    }
    count = {
      claim_id: c["claim_id"],
      count: c["count"],
      share_per_million: c["share_per_million"],
      one_in: c["one_in"],
      citation,
    };
  }
  let rank: BirthYearFigures["rank"] = null;
  if (x["rank"] !== null) {
    const r = record(x["rank"]);
    const citation = citationFrom(r?.["citation"]);
    if (
      r === null ||
      citation === null ||
      !isString(r["claim_id"]) ||
      !isCount(r["rank"]) ||
      !isCount(r["universe_size"])
    ) {
      return undefined;
    }
    rank = {
      claim_id: r["claim_id"],
      rank: r["rank"],
      universe_size: r["universe_size"],
      citation,
    };
  }
  // A figure stands on a stored list of its own year.
  if (list === null ? count !== null || rank !== null : list.birth_year !== x["birth_year"]) {
    return undefined;
  }
  return { birth_year: x["birth_year"], list, count, rank };
}

/** A frozen trend; null when none stood, undefined when it is not one. */
function birthTrendFrom(v: unknown): BirthTrendFigure | null | undefined {
  if (v === null) return null;
  const x = record(v);
  const cited = x?.["citations"];
  const direction = x?.["direction"];
  if (
    x === null ||
    !isString(x["claim_id"]) ||
    (direction !== "RISING" && direction !== "STEADY" && direction !== "FALLING") ||
    !isYear(x["latest_year"]) ||
    !isYear(x["earlier_year"]) ||
    !isCount(x["window_years"]) ||
    typeof x["change_percent"] !== "number" ||
    !Number.isFinite(x["change_percent"]) ||
    !isNumberOrNull(x["latest_share_per_million"]) ||
    !isNumberOrNull(x["earlier_share_per_million"]) ||
    !Array.isArray(cited) ||
    cited.length === 0
  ) {
    return undefined;
  }
  const citations = cited.map(citationFrom);
  if (!citations.every((c): c is CitationDto => c !== null)) return undefined;
  return {
    claim_id: x["claim_id"],
    direction,
    latest_year: x["latest_year"],
    earlier_year: x["earlier_year"],
    window_years: x["window_years"],
    change_percent: x["change_percent"],
    latest_share_per_million: x["latest_share_per_million"],
    earlier_share_per_million: x["earlier_share_per_million"],
    citations,
  };
}

/** One frozen sex's figures; undefined when they are not. */
function birthSexFrom(v: unknown): BirthSexFigures | undefined {
  const x = record(v);
  if (x === null || !isBirthSex(x["sex"])) return undefined;
  const latest = x["latest"] === null ? null : birthYearFrom(x["latest"]);
  const trend = birthTrendFrom(x["trend"]);
  let history: BirthYearFigures[] | null = null;
  if (x["history"] !== null) {
    if (!Array.isArray(x["history"])) return undefined;
    const years = x["history"].map(birthYearFrom);
    if (!years.every((y): y is BirthYearFigures => y !== undefined)) return undefined;
    history = years;
  }
  if (latest === undefined || trend === undefined) return undefined;
  // Every list a sex's figures stand on is of that sex.
  const sex = x["sex"];
  if (
    ![latest, ...(history ?? [])].every((y) => y === null || y.list === null || y.list.sex === sex)
  ) {
    return undefined;
  }
  return { sex, latest, trend, history };
}

/**
 * The frozen figures as a name given to children. Absent (a version frozen
 * before `full_name_report@2`) reads as none; null when they are not what
 * `readBirthNameFacts` writes.
 */
function birthsFrom(v: unknown): { readonly births: BirthNameFacts | null } | null {
  if (v === undefined) return { births: null };
  const x = record(v);
  const name = record(x?.["given_name"]);
  const state = x?.["state"];
  const sexes = x?.["sexes"];
  if (
    x === null ||
    name === null ||
    !isString(name["id"]) ||
    !isString(name["display_name"]) ||
    (state !== "READY" && state !== "NOT_ON_ANY_LIST" && state !== "RIGHTS_BLOCKED") ||
    !Array.isArray(sexes)
  ) {
    return null;
  }
  const parsed = sexes.map(birthSexFrom);
  if (!parsed.every((s): s is BirthSexFigures => s !== undefined)) return null;
  if ((state === "READY") !== parsed.length > 0) return null;
  return {
    births: {
      given_name: { id: name["id"], display_name: name["display_name"] },
      state,
      sexes: parsed,
    },
  };
}

/**
 * A frozen report's first-name facts, checked field by field; null when the
 * value is not what {@link readGivenNameFacts}, {@link readGivenNameMeaning}
 * and `readBirthNameFacts` write. A page renders only what this returns.
 */
export function parseGivenNameFacts(value: unknown): GivenNameReportFacts | null {
  const x = record(value);
  const name = record(x?.["given_name"]);
  const state = x?.["state"];
  const lists = x?.["lists"];
  if (
    x === null ||
    name === null ||
    !isString(name["id"]) ||
    !isString(name["display_name"]) ||
    (state !== "READY" && state !== "UNAVAILABLE" && state !== "RIGHTS_BLOCKED") ||
    !Array.isArray(lists)
  ) {
    return null;
  }
  const parsed = lists.map(listFrom);
  if (!parsed.every((l): l is GivenNameListFacts => l !== null)) return null;
  if ((state === "READY") !== parsed.length > 0) return null;
  const meaning = meaningFrom(x["meaning"]);
  if (meaning === null) return null;
  const births = birthsFrom(x["births"]);
  if (births === null || (births.births !== null && births.births.given_name.id !== name["id"])) {
    return null;
  }
  return {
    given_name: { id: name["id"], display_name: name["display_name"] },
    state,
    lists: parsed,
    meaning,
    births: births.births,
  };
}
