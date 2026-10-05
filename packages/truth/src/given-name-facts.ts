/**
 * A first name's facts for the full-name report (TASK-124, ADR-0041): its
 * active `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` claims (TASK-122), each
 * with its confidence and citation, per list, on one surface.
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

/**
 * A frozen report's first-name facts, checked field by field; null when the
 * value is not what {@link readGivenNameFacts} writes. A page renders only
 * what this returns.
 */
export function parseGivenNameFacts(value: unknown): GivenNameFacts | null {
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
  return {
    given_name: { id: name["id"], display_name: name["display_name"] },
    state,
    lists: parsed,
  };
}
