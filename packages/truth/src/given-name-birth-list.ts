/**
 * One published birth-name list, a page of it, for the baby-names list page
 * (TASK-146, D-047): the active `GIVEN_NAME_BIRTH_COUNT` and
 * `GIVEN_NAME_BIRTH_RANK` claims of one `given_name_birth_lists` row, ordered
 * by the rank claim, with the name's display form and, for a sex's latest
 * list, the `GIVEN_NAME_BIRTH_TREND` direction.
 *
 * Claims only: `given_name_birth_counts` and `given_name_counts` are never
 * read (ADR-0032, ADR-0043). A flagged form (`form_review`) is never listed.
 * Ranks are the claims' (competition ranks, ties share one); a name with no
 * rank claim has `rank: null`, never 0, and sorts after the ranked names.
 * The list's source is read from the claims' citations.
 *
 * One query per page, never one per name. Claim keys end with the list id
 * (ADR-0043 §1), so the query finds a list's claims through the expression
 * index of migration 0043.
 */
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type { CitationDto } from "@name-atlas/contracts";
import { evaluateSurface, sectionEligibility } from "./rights.js";
import type { EffectiveRights, Surface } from "./rights.js";
import type { BirthListInfo } from "./given-name-birth-facts.js";
import { GIVEN_NAME_BIRTH_TREND_METHOD_VERSION } from "./version.js";

export type BirthDirectionValue = "RISING" | "STEADY" | "FALLING";

export interface BirthListRow {
  readonly given_name_id: string;
  readonly display_name: string;
  readonly count: number;
  /** The claim's competition rank; null when the name has no rank claim. */
  readonly rank: number | null;
  /** The list's size as the rank claim states it; null with `rank`. */
  readonly universe_size: number | null;
  /** The trend claim's direction; null off the latest list or with no claim. */
  readonly direction: BirthDirectionValue | null;
}

export interface BirthListPage {
  /** READY, or RIGHTS_BLOCKED: the surface may not show the claims it read. */
  readonly state: "READY" | "RIGHTS_BLOCKED";
  readonly list: BirthListInfo;
  /** Rows of this page; empty unless READY. */
  readonly rows: readonly BirthListRow[];
  /** Names on the list that match the filter, all pages. */
  readonly total: number;
  /** The sources of the page's claims, each once (all names of a list share one). */
  readonly citations: readonly CitationDto[];
}

export interface BirthListOptions {
  readonly surface: Surface;
  readonly limit: number;
  readonly offset: number;
  /** Read the trend (only the sex's latest list has one) and, with `direction`, filter by it. */
  readonly withTrend: boolean;
  readonly direction: "RISING" | "FALLING" | null;
}

export interface BirthListPageRowSql {
  total: string;
  given_name_id: string;
  display_name: string;
  count: number;
  rank: number | null;
  universe_size: number | null;
  direction: string | null;
  claim_id: string;
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

/** The most rows one page may ask for. */
export const BIRTH_LIST_MAX_LIMIT = 100;

/**
 * A page of `list`. Ordered by the rank claim (names with none last), then by
 * the name's display form, then by id, so the order is stable. The claim types
 * and key parts are compared as text, so a database without migration 0041
 * finds none instead of failing.
 */
export async function readBirthListPage(
  db: Kysely<DB>,
  list: BirthListInfo,
  options: BirthListOptions,
): Promise<BirthListPage> {
  const limit = Math.min(Math.max(Math.trunc(options.limit), 0), BIRTH_LIST_MAX_LIMIT);
  const offset = Math.max(Math.trunc(options.offset), 0);
  const withTrend = options.withTrend;
  const direction = withTrend ? options.direction : null;
  const result = await sql<BirthListPageRowSql>`
    WITH base AS (
      SELECT
        cnt.claim_id                                  AS count_claim_id,
        cnt.subject_entity_id                         AS name_id,
        gn.canonical_display                          AS display_name,
        (cnt.structured_value->>'count')::int         AS count,
        (rk.structured_value->>'rank')::int           AS rank,
        (rk.structured_value->>'universe_size')::int  AS universe_size,
        tr.structured_value->>'direction'             AS direction
      FROM claims cnt
      JOIN given_names gn ON gn.given_name_id = cnt.subject_entity_id
      LEFT JOIN claims rk
        ON rk.claim_key = 'GIVEN_NAME_BIRTH_RANK|' || cnt.subject_entity_id::text || '|' || ${list.list_id}::text
       AND rk.claim_status = 'ACTIVE'
      LEFT JOIN claims tr
        ON ${withTrend}
       AND tr.claim_key LIKE 'GIVEN_NAME_BIRTH_%'
       AND split_part(tr.claim_key, '|', 1) = 'GIVEN_NAME_BIRTH_TREND'
       AND split_part(tr.claim_key, '|', 3) = ${list.list_id}::text
       AND tr.subject_entity_id = cnt.subject_entity_id
       AND tr.claim_status = 'ACTIVE'
       AND tr.method_version = ${GIVEN_NAME_BIRTH_TREND_METHOD_VERSION}
      WHERE cnt.claim_key LIKE 'GIVEN_NAME_BIRTH_%'
        AND split_part(cnt.claim_key, '|', 1) = 'GIVEN_NAME_BIRTH_COUNT'
        AND split_part(cnt.claim_key, '|', 3) = ${list.list_id}::text
        AND cnt.claim_status = 'ACTIVE'
        AND gn.form_review IS NULL
    ),
    picked AS (
      SELECT *, count(*) OVER () AS total
      FROM base
      WHERE ${direction}::text IS NULL OR direction = ${direction}::text
      ORDER BY rank ASC NULLS LAST, display_name ASC, name_id ASC
      LIMIT ${limit} OFFSET ${offset}
    )
    SELECT
      p.total::text                    AS total,
      p.name_id::text                  AS given_name_id,
      p.display_name                   AS display_name,
      p.count                          AS count,
      p.rank                           AS rank,
      p.universe_size                  AS universe_size,
      p.direction                      AS direction,
      p.count_claim_id::text           AS claim_id,
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
    FROM picked p
    JOIN citations cit      ON cit.claim_id = p.count_claim_id
    JOIN sources src        ON src.source_id = cit.source_id
    JOIN rights_profiles rp ON rp.rights_profile_id = cit.rights_profile_id
    ORDER BY p.rank ASC NULLS LAST, p.display_name ASC, p.name_id ASC, cit.citation_id
  `.execute(db);
  return assembleBirthListPage(list, result.rows, options.surface);
}

/** The rows and citations of a page, and its rights decision; pure, exported for tests. */
export function assembleBirthListPage(
  list: BirthListInfo,
  rows: readonly BirthListPageRowSql[],
  surface: Surface,
): BirthListPage {
  const rights = rows.map((r): EffectiveRights => ({
    automated_access: r.automated_access,
    commercial_use: r.commercial_use,
    redistribution: r.redistribution,
    metadata_rights: r.metadata_rights,
    review_status: r.review_status,
  }));
  const [first] = rights;
  if (first !== undefined) {
    const eligibility = sectionEligibility(evaluateSurface(first, surface), rights, surface);
    if (eligibility.decision === "BLOCKED") {
      return { state: "RIGHTS_BLOCKED", list, rows: [], total: 0, citations: [] };
    }
  }
  const names = new Map<string, BirthListRow>();
  const citations = new Map<string, CitationDto>();
  for (const r of rows) {
    // A claim cited to two records comes as two rows: one name, both citations.
    if (!names.has(r.claim_id)) {
      names.set(r.claim_id, {
        given_name_id: r.given_name_id,
        display_name: r.display_name,
        count: r.count,
        rank: r.rank,
        universe_size: r.rank === null ? null : r.universe_size,
        direction:
          r.direction === "RISING" || r.direction === "STEADY" || r.direction === "FALLING"
            ? r.direction
            : null,
      });
    }
    const key = `${r.citation_title}|${r.citation_locator ?? r.citation_id}`;
    if (!citations.has(key)) {
      citations.set(key, {
        id: r.citation_id,
        title: r.citation_title,
        publisher: r.citation_publisher,
        publication_date: r.citation_publication_date,
        source_type: r.source_type,
        locator: r.citation_locator,
        url: r.citation_url,
        attribution: r.attribution_text,
        terms: r.terms_version,
        retrieved_at: r.citation_retrieved_at,
        source_page_url: r.citation_source_page_url,
      });
    }
  }
  const [firstRow] = rows;
  return {
    state: "READY",
    list,
    rows: [...names.values()],
    total: firstRow === undefined ? 0 : Number(firstRow.total),
    citations: [...citations.values()],
  };
}
