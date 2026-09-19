/**
 * Read-only lookup of already-derived `CURRENT_POPULATION` claims (TASK-006).
 *
 * `deriveCurrentPopulation` in `derive.ts` **writes** — it creates the claim,
 * evidence, assessment and citation on first call. A read path must not
 * trigger that (TASK-006 AC-03, §15 U-3), so this module exists: it reads
 * what derivation already persisted, and reports absence honestly when
 * nothing has been derived yet.
 *
 * Absence is never a zero. An empty result means "no claim exists", which
 * the caller must surface as its own state (`ARCHITECTURE.md` §10
 * invariant 4).
 *
 * One `SELECT`, no transaction, no write. The statement is a `sql` template
 * rather than a query-builder chain because it joins on a JSON field the
 * claim payload carries; expressing that through the builder obscures it
 * without making it safer. `surnameId` is the only interpolated value and is
 * bound as a parameter.
 */
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type { EffectiveRights } from "./rights.js";

/** One persisted claim, with everything a projection needs. */
export interface PersistedCurrentPopulation {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly count: number;
  readonly snapshot_date: string;
  readonly country_code: string;
  readonly source_population_scope: string;
  readonly coverage_notes: string | null;
  readonly comparability_group: string | null;
  readonly confidence_status: string;
  readonly assessment_method: string;
  readonly assessment_version: string;
  readonly citation_id: string;
  readonly citation_title: string;
  readonly citation_publisher: string | null;
  readonly citation_publication_date: string | null;
  readonly citation_url: string | null;
  readonly citation_locator: string | null;
  readonly source_type: string;
  readonly attribution_text: string | null;
  readonly terms_version: string | null;
  readonly rights: EffectiveRights;
}

interface ReadRow {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly count: string;
  readonly snapshot_date: string;
  readonly country_code: string;
  readonly source_population_scope: string;
  readonly coverage_notes: string | null;
  readonly comparability_group: string | null;
  readonly confidence_status: string;
  readonly assessment_method: string;
  readonly assessment_version: string;
  readonly citation_id: string;
  readonly citation_title: string;
  readonly citation_publisher: string | null;
  readonly citation_publication_date: string | null;
  readonly citation_url: string | null;
  readonly citation_locator: string | null;
  readonly source_type: string;
  readonly attribution_text: string | null;
  readonly terms_version: string | null;
  readonly automated_access: string;
  readonly commercial_use: string;
  readonly redistribution: string;
  readonly metadata_rights: string;
  readonly review_status: string;
}

/**
 * Reads every ACTIVE `CURRENT_POPULATION` claim for a surname, in a stable
 * order, with its confidence, citation and the rights in force.
 *
 * Returns `[]` when nothing has been derived.
 */
export async function readCurrentPopulation(
  db: Kysely<DB>,
  surnameId: string,
): Promise<PersistedCurrentPopulation[]> {
  const result = await sql<ReadRow>`
    SELECT
      c.claim_id::text                                   AS claim_id,
      c.claim_key                                        AS claim_key,
      c.structured_value->>'count'                       AS count,
      c.structured_value->>'snapshot_date'               AS snapshot_date,
      c.structured_value->>'country_code'                AS country_code,
      c.structured_value->>'source_population_scope'     AS source_population_scope,
      s.coverage_notes                                   AS coverage_notes,
      s.comparability_group                              AS comparability_group,
      ca.status::text                                    AS confidence_status,
      ca.assessment_method                               AS assessment_method,
      ca.assessment_version                              AS assessment_version,
      cit.citation_id::text                              AS citation_id,
      cit.title                                          AS citation_title,
      cit.publisher                                      AS citation_publisher,
      cit.publication_date                               AS citation_publication_date,
      cit.url_or_reference                               AS citation_url,
      cit.supporting_locator                             AS citation_locator,
      src.source_type::text                              AS source_type,
      rp.attribution_text                                AS attribution_text,
      rp.terms_version                                   AS terms_version,
      rp.automated_access::text                          AS automated_access,
      rp.commercial_use::text                            AS commercial_use,
      rp.redistribution::text                            AS redistribution,
      rp.metadata_rights::text                           AS metadata_rights,
      rp.review_status::text                             AS review_status
    FROM claims c
    JOIN confidence_assessments ca ON ca.claim_id = c.claim_id
    JOIN citations cit             ON cit.claim_id = c.claim_id
    JOIN sources src               ON src.source_id = cit.source_id
    JOIN rights_profiles rp        ON rp.rights_profile_id = cit.rights_profile_id
    JOIN distribution_snapshots s
      ON s.distribution_snapshot_id = (c.structured_value->>'distribution_snapshot_id')::uuid
    WHERE c.subject_entity_id = ${surnameId}::uuid
      AND c.claim_type = 'CURRENT_POPULATION'
      AND c.claim_status = 'ACTIVE'
    ORDER BY c.claim_key
  `.execute(db);

  return result.rows.map((row) => ({
    claim_id: row.claim_id,
    claim_key: row.claim_key,
    count: Number(row.count),
    snapshot_date: row.snapshot_date,
    country_code: row.country_code,
    source_population_scope: row.source_population_scope,
    coverage_notes: row.coverage_notes,
    comparability_group: row.comparability_group,
    confidence_status: row.confidence_status,
    assessment_method: row.assessment_method,
    assessment_version: row.assessment_version,
    citation_id: row.citation_id,
    citation_title: row.citation_title,
    citation_publisher: row.citation_publisher,
    citation_publication_date: row.citation_publication_date,
    citation_url: row.citation_url,
    citation_locator: row.citation_locator,
    source_type: row.source_type,
    attribution_text: row.attribution_text,
    terms_version: row.terms_version,
    rights: {
      automated_access: row.automated_access,
      commercial_use: row.commercial_use,
      redistribution: row.redistribution,
      metadata_rights: row.metadata_rights,
      review_status: row.review_status,
    },
  }));
}
