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

/** One persisted `RARITY_CONTEXT` claim, joined to what the projection needs. */
export interface PersistedRarityContext {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly one_in_x: number;
  readonly numerator: number;
  readonly denominator: number;
  readonly denominator_kind: string;
  readonly universe_label_code: string;
  readonly share: number;
  readonly supporting_rank: number | null;
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

interface RarityReadRow {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly one_in_x: string;
  readonly numerator: string;
  readonly denominator: string;
  readonly denominator_kind: string;
  readonly universe_label_code: string;
  readonly share: string;
  readonly supporting_rank: string | null;
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
 * Reads every ACTIVE `RARITY_CONTEXT` claim for a surname, one per complete
 * resource version, with its confidence, citation and the rights in force.
 * Read-only; derives nothing (TASK-014).
 */
export async function readRarityContext(
  db: Kysely<DB>,
  surnameId: string,
): Promise<PersistedRarityContext[]> {
  const result = await sql<RarityReadRow>`
    SELECT
      c.claim_id::text                                   AS claim_id,
      c.claim_key                                        AS claim_key,
      c.structured_value->>'one_in_x'                    AS one_in_x,
      c.structured_value->>'numerator'                   AS numerator,
      c.structured_value->>'denominator'                 AS denominator,
      c.structured_value->>'denominator_kind'            AS denominator_kind,
      c.structured_value->>'universe_label_code'         AS universe_label_code,
      c.structured_value->>'share'                       AS share,
      c.structured_value->>'supporting_rank'             AS supporting_rank,
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
      AND c.claim_type = 'RARITY_CONTEXT'
      AND c.claim_status = 'ACTIVE'
    ORDER BY c.claim_key
  `.execute(db);

  return result.rows.map((row) => ({
    claim_id: row.claim_id,
    claim_key: row.claim_key,
    one_in_x: Number(row.one_in_x),
    numerator: Number(row.numerator),
    denominator: Number(row.denominator),
    denominator_kind: row.denominator_kind,
    universe_label_code: row.universe_label_code,
    share: Number(row.share),
    supporting_rank: row.supporting_rank === null ? null : Number(row.supporting_rank),
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

/** One published voivodeship figure, as the claim payload stores it. */
export interface PersistedDistributionEntry {
  readonly place_id: string;
  readonly terc_code: string | null;
  readonly place_display_name: string;
  readonly source_geography_key: string | null;
  readonly count: number;
  readonly share_of_covered: number;
}

/** One persisted `CURRENT_DISTRIBUTION` claim, joined to what a DTO needs. */
export interface PersistedCurrentDistribution {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly state: string;
  readonly entries: readonly PersistedDistributionEntry[];
  readonly regions_present: number;
  readonly covered_count: number;
  readonly national_count: number | null;
  readonly coverage_ratio: number | null;
  readonly coverage_basis: string;
  readonly low_coverage_threshold: number;
  readonly universe_label_code: string;
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

interface DistributionReadRow {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly state: string;
  /** The payload's `entries` array, returned as JSON text and parsed once. */
  readonly entries: string | null;
  readonly regions_present: string;
  readonly covered_count: string;
  readonly national_count: string | null;
  readonly coverage_ratio: string | null;
  readonly coverage_basis: string;
  readonly low_coverage_threshold: string;
  readonly universe_label_code: string;
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
 * Reads every ACTIVE `CURRENT_DISTRIBUTION` claim for a surname, one per
 * complete regional resource version. Read-only; derives nothing (TASK-012).
 */
export async function readCurrentDistribution(
  db: Kysely<DB>,
  surnameId: string,
): Promise<PersistedCurrentDistribution[]> {
  const result = await sql<DistributionReadRow>`
    SELECT
      c.claim_id::text                                   AS claim_id,
      c.claim_key                                        AS claim_key,
      c.structured_value->>'state'                       AS state,
      c.structured_value->>'entries'                     AS entries,
      c.structured_value->>'regions_present'             AS regions_present,
      c.structured_value->>'covered_count'               AS covered_count,
      c.structured_value->>'national_count'              AS national_count,
      c.structured_value->>'coverage_ratio'              AS coverage_ratio,
      c.structured_value->>'coverage_basis'              AS coverage_basis,
      c.structured_value->>'low_coverage_threshold'      AS low_coverage_threshold,
      c.structured_value->>'universe_label_code'         AS universe_label_code,
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
      AND c.claim_type = 'CURRENT_DISTRIBUTION'
      AND c.claim_status = 'ACTIVE'
    ORDER BY c.claim_key
  `.execute(db);

  return result.rows.map((row) => ({
    claim_id: row.claim_id,
    claim_key: row.claim_key,
    state: row.state,
    entries: row.entries
      ? (JSON.parse(row.entries) as PersistedDistributionEntry[]).map((entry) => ({
          place_id: entry.place_id,
          terc_code: entry.terc_code,
          place_display_name: entry.place_display_name,
          source_geography_key: entry.source_geography_key,
          count: Number(entry.count),
          share_of_covered: Number(entry.share_of_covered),
        }))
      : [],
    regions_present: Number(row.regions_present),
    covered_count: Number(row.covered_count),
    national_count: row.national_count === null ? null : Number(row.national_count),
    coverage_ratio: row.coverage_ratio === null ? null : Number(row.coverage_ratio),
    coverage_basis: row.coverage_basis,
    low_coverage_threshold: Number(row.low_coverage_threshold),
    universe_label_code: row.universe_label_code,
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

// ---------------------------------------------------------------------------
// SURNAME_MEANING (TASK-022, ADR-0008)
// ---------------------------------------------------------------------------

/** One work's interpretation, as the claim payload stored it. */
export interface PersistedInterpretation {
  readonly root_form: string | null;
  readonly root_language: string | null;
  readonly literal_gloss: string;
  readonly formation_type: string;
  readonly work: {
    readonly title: string;
    readonly author_or_publisher: string;
    readonly year: number;
  };
  readonly locator: string;
}

export interface PersistedSurnameMeaning {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly interpretations: readonly PersistedInterpretation[];
  readonly supporting_works: number;
  readonly works_agree: boolean;
  readonly agreement_basis: string;
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

interface MeaningReadRow {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly interpretations: string | null;
  readonly supporting_works: string | null;
  readonly works_agree: string | null;
  readonly agreement_basis: string | null;
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
 * Reads the active `SURNAME_MEANING` claim for one surname.
 *
 * Returns an **empty array** when no claim exists, which is the ordinary case
 * and not a failure: ADR-0008 §3 makes "no sourced meaning" a first-class
 * result, and until an onomastic source is imported it is the answer for every
 * surname. The caller turns an empty array into `NO_SOURCED_MEANING`; nothing
 * here invents a placeholder.
 *
 * One claim per surname (`surnameMeaningClaimKey`), but the citation join can
 * multiply rows when several works support it, so rows are folded back to one
 * claim and the first citation is kept as the display citation. Every work's
 * own locator is already inside `interpretations`.
 */
export async function readSurnameMeaning(
  db: Kysely<DB>,
  surnameId: string,
): Promise<PersistedSurnameMeaning[]> {
  const result = await sql<MeaningReadRow>`
    SELECT
      c.claim_id::text                            AS claim_id,
      c.claim_key                                 AS claim_key,
      c.structured_value->>'interpretations'      AS interpretations,
      c.structured_value->>'supporting_works'     AS supporting_works,
      c.structured_value->>'works_agree'          AS works_agree,
      c.structured_value->>'agreement_basis'      AS agreement_basis,
      ca.status::text                             AS confidence_status,
      ca.assessment_method                        AS assessment_method,
      ca.assessment_version                       AS assessment_version,
      cit.citation_id::text                       AS citation_id,
      cit.title                                   AS citation_title,
      cit.publisher                               AS citation_publisher,
      cit.publication_date                        AS citation_publication_date,
      cit.url_or_reference                        AS citation_url,
      cit.supporting_locator                      AS citation_locator,
      src.source_type::text                       AS source_type,
      rp.attribution_text                         AS attribution_text,
      rp.terms_version                            AS terms_version,
      rp.automated_access::text                   AS automated_access,
      rp.commercial_use::text                     AS commercial_use,
      rp.redistribution::text                     AS redistribution,
      rp.metadata_rights::text                    AS metadata_rights,
      rp.review_status::text                      AS review_status
    FROM claims c
    JOIN confidence_assessments ca ON ca.claim_id = c.claim_id
    JOIN citations cit             ON cit.claim_id = c.claim_id
    JOIN sources src               ON src.source_id = cit.source_id
    JOIN rights_profiles rp        ON rp.rights_profile_id = cit.rights_profile_id
    WHERE c.subject_entity_id = ${surnameId}::uuid
      AND c.claim_type = 'SURNAME_MEANING'
      AND c.claim_status = 'ACTIVE'
    ORDER BY c.claim_key, cit.created_at
  `.execute(db);

  const byClaim = new Map<string, PersistedSurnameMeaning>();
  for (const row of result.rows) {
    if (byClaim.has(row.claim_id)) continue;
    byClaim.set(row.claim_id, {
      claim_id: row.claim_id,
      claim_key: row.claim_key,
      interpretations: row.interpretations
        ? (JSON.parse(row.interpretations) as PersistedInterpretation[])
        : [],
      supporting_works: row.supporting_works ? Number(row.supporting_works) : 0,
      works_agree: row.works_agree === "true",
      agreement_basis: row.agreement_basis ?? "",
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
    });
  }
  return [...byClaim.values()];
}
