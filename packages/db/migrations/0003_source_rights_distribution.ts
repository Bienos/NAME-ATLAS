import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Source registry, rights registry and surname distribution storage
 * (TASK-004 §6 item 1).
 *
 * Creates exactly five tables and the enums they need:
 *
 *   - rights_profiles       (docs/canonical/11 §9.4) — completes Group A
 *   - sources               (docs/canonical/11 §9.1) — completes Group A
 *   - source_records        (docs/canonical/11 §9.2) — Group B, first half
 *   - distribution_snapshots(docs/canonical/11 §6.1) — Group B, first half
 *   - distribution_values   (docs/canonical/11 §6.2) — Group B, first half
 *
 * Deliberately NOT created (TASK-004 §8): digital_assets, evidence_items,
 * claims, claim_evidence, confidence_assessments, citations, places,
 * place_names, place_geometries, administrative_memberships,
 * name_form_relations, entity_external_ids, research_runs,
 * research_module_runs, runtime_outbox. No code in this task reads or
 * writes any of them.
 *
 * Two deliberate narrowings of the canonical field specification, each
 * because this task's acceptance criteria require the database itself to
 * enforce what a convention would otherwise only promise:
 *
 *   - distribution_snapshots.source_record_id is NOT NULL, although
 *     docs/canonical/11 §6.1 marks it nullable ("Resource/version row if
 *     useful"). TASK-004 AC-07 requires provenance to be complete before
 *     any distribution row can exist, "enforced by NOT NULL foreign keys,
 *     not by convention". Widening it back to nullable is a trivial
 *     follow-up migration for whichever source first produces a snapshot
 *     with no resource-level record.
 *   - distribution_values.place_id is a plain nullable uuid with no foreign
 *     key, because `places` does not exist yet (M3 builds it). The FK is
 *     added by whichever task creates that table. Until then every value
 *     this project writes is the national aggregate, where the column is
 *     null by canonical design.
 *
 * Column omitted for the same reason TASK-003 omitted its two:
 *
 *   - rights_profiles has no `terms_text` column of any kind. Publisher
 *     terms text is retained only where lawful (docs/canonical/11 §9.4
 *     `terms_hash`: "Snapshot hash where terms text is retained lawfully"),
 *     and nothing in this project retains any. `terms_hash` exists and is
 *     null.
 *
 * What is NOT expressed as a CHECK constraint, on purpose, because the
 * statement is true of this task's data but not of the schema:
 *
 *   - `count >= 2`. The PESEL suppression floor of 2 is a property of one
 *     source, not of distribution data. docs/canonical/11 §6.2's critical
 *     rule allows a stored zero "where the dataset's coverage supports a
 *     true zero conclusion", so a schema-wide floor would forbid a lawful
 *     future value. The CHECK here only forbids a negative count, which is
 *     meaningless for every source. TASK-004 §9 invariants 3 and 4 are
 *     asserted as queries against a real database instead.
 *   - `geography_level = 'NATIONAL'`. True of every snapshot this task
 *     writes; false of the regional resources a later task may adopt.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  // --- Enumerated domains -------------------------------------------------
  // Members and spellings are taken verbatim from the canonical field
  // specifications; nothing is added, renamed or dropped here.

  // docs/canonical/11 §9.1 `Source`
  await sql`
    CREATE TYPE source_type AS ENUM (
      'OFFICIAL_DATASET',
      'ARCHIVE',
      'DIGITAL_LIBRARY',
      'ACADEMIC',
      'DICTIONARY',
      'PUBLICATION',
      'COMMERCIAL_DATABASE',
      'COMMUNITY_INDEX',
      'OTHER'
    )
  `.execute(db);
  await sql`
    CREATE TYPE source_granularity AS ENUM
      ('SURNAME', 'PERSON', 'PLACE', 'DOCUMENT', 'MIXED')
  `.execute(db);
  await sql`
    CREATE TYPE source_reliability_tier AS ENUM (
      'A_PRIMARY_OFFICIAL',
      'B_AUTHORITATIVE_INDEX',
      'C_SCHOLARLY_SECONDARY',
      'D_TERTIARY_LEAD'
    )
  `.execute(db);
  await sql`
    CREATE TYPE source_production_status AS ENUM (
      'APPROVED',
      'PARTNERSHIP_REQUIRED',
      'LEGAL_REVIEW_REQUIRED',
      'BLOCKED',
      'DEPRECATED'
    )
  `.execute(db);

  // docs/canonical/11 §9.2 `SourceRecord`
  await sql`
    CREATE TYPE source_record_type AS ENUM (
      'DATA_ROW',
      'DOCUMENT',
      'PAGE',
      'INDEX_ENTRY',
      'ARTICLE',
      'BOOK_ITEM',
      'API_OBJECT',
      'OTHER'
    )
  `.execute(db);
  await sql`
    CREATE TYPE source_record_status AS ENUM
      ('ACTIVE', 'UPDATED', 'WITHDRAWN', 'INACCESSIBLE')
  `.execute(db);

  // docs/canonical/11 §9.4 `RightsProfile`
  await sql`
    CREATE TYPE rights_permission AS ENUM
      ('ALLOWED', 'CONDITIONAL', 'PROHIBITED', 'UNKNOWN')
  `.execute(db);
  await sql`
    CREATE TYPE cache_permission AS ENUM
      ('ALLOWED', 'LIMITED', 'PROHIBITED', 'UNKNOWN')
  `.execute(db);
  await sql`
    CREATE TYPE rights_review_status AS ENUM
      ('APPROVED', 'CONDITIONAL', 'LEGAL_REVIEW_REQUIRED', 'BLOCKED', 'EXPIRED')
  `.execute(db);

  // docs/canonical/11 §6.1 `DistributionSnapshot`
  await sql`
    CREATE TYPE geography_level AS ENUM
      ('NATIONAL', 'REGION', 'DISTRICT', 'MUNICIPALITY', 'LOCALITY', 'MIXED')
  `.execute(db);

  // --- rights_profiles (docs/canonical/11 §9.4) ---------------------------
  // Versioned and immutable once applied to a research output: changed terms
  // create a new profile rather than an UPDATE. Nothing in this project
  // updates a row here.
  await sql`
    CREATE TABLE rights_profiles (
      rights_profile_id    uuid PRIMARY KEY,
      terms_version        text,
      terms_hash           text,
      checked_at           timestamptz          NOT NULL,
      metadata_rights      rights_permission    NOT NULL,
      image_rights         rights_permission    NOT NULL,
      transcription_rights rights_permission    NOT NULL,
      database_rights      rights_permission    NOT NULL,
      automated_access     rights_permission    NOT NULL,
      commercial_use       rights_permission    NOT NULL,
      redistribution       rights_permission    NOT NULL,
      local_cache          cache_permission     NOT NULL,
      attribution_required boolean              NOT NULL,
      attribution_text     text,
      source_owner         text,
      rights_url           text,
      contact_required     boolean              NOT NULL,
      review_status        rights_review_status NOT NULL,
      valid_from           date,
      valid_to             date,
      notes                text,
      created_at           timestamptz          NOT NULL DEFAULT now(),
      CONSTRAINT rights_profiles_validity_ordered
        CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to),
      CONSTRAINT rights_profiles_attribution_text_requires_requirement
        CHECK (attribution_text IS NULL OR attribution_required)
    )
  `.execute(db);

  // --- sources (docs/canonical/11 §9.1) -----------------------------------
  // default_rights_profile_id is NOT NULL by canonical design: a source
  // without effective default rights must not exist (TASK-004 §9
  // invariant 13 is therefore structural, not a convention).
  await sql`
    CREATE TABLE sources (
      source_id                 uuid PRIMARY KEY,
      parent_source_id          uuid REFERENCES sources (source_id),
      source_key                text                    NOT NULL UNIQUE,
      name                      text                    NOT NULL,
      publisher                 text,
      source_type               source_type             NOT NULL,
      granularity               source_granularity      NOT NULL,
      geographic_scope          text[]                  NOT NULL,
      temporal_from             date,
      temporal_to               date,
      methodology_notes         text,
      authority_tier            source_reliability_tier NOT NULL,
      default_rights_profile_id uuid                    NOT NULL
                                  REFERENCES rights_profiles (rights_profile_id),
      production_status         source_production_status NOT NULL,
      homepage_or_reference_url  text,
      created_at                timestamptz             NOT NULL DEFAULT now(),
      updated_at                timestamptz             NOT NULL DEFAULT now(),
      CONSTRAINT sources_source_key_not_blank
        CHECK (length(btrim(source_key)) > 0),
      CONSTRAINT sources_name_not_blank
        CHECK (length(btrim(name)) > 0),
      CONSTRAINT sources_geographic_scope_not_empty
        CHECK (cardinality(geographic_scope) > 0),
      CONSTRAINT sources_not_own_parent
        CHECK (parent_source_id IS NULL OR parent_source_id <> source_id),
      CONSTRAINT sources_temporal_range_ordered
        CHECK (temporal_from IS NULL OR temporal_to IS NULL OR temporal_from <= temporal_to)
    )
  `.execute(db);

  // --- source_records (docs/canonical/11 §9.2) ----------------------------
  // One row per concrete retrieved object. Immutable after insert except to
  // set record_status = 'UPDATED' when superseded (TASK-004 §9 invariant 8).
  //
  // The UNIQUE key is what makes re-ingestion of identical bytes a no-op
  // rather than a duplicate: the same source, the same native resource id
  // and the same content hash can exist only once.
  await sql`
    CREATE TABLE source_records (
      source_record_id            uuid PRIMARY KEY,
      source_id                   uuid                 NOT NULL
                                    REFERENCES sources (source_id),
      external_record_id          text,
      external_parent_id          text,
      record_type                 source_record_type   NOT NULL,
      source_url                  text,
      raw_payload                 jsonb,
      raw_text_ref                text,
      content_hash                text                 NOT NULL,
      retrieved_at                timestamptz          NOT NULL,
      source_modified_at          timestamptz,
      rights_profile_id           uuid REFERENCES rights_profiles (rights_profile_id),
      record_status               source_record_status NOT NULL,
      supersedes_source_record_id uuid REFERENCES source_records (source_record_id),
      created_at                  timestamptz          NOT NULL DEFAULT now(),
      CONSTRAINT source_records_content_hash_is_sha256_hex
        CHECK (content_hash ~ '^[0-9a-f]{64}$'),
      CONSTRAINT source_records_does_not_supersede_itself
        CHECK (supersedes_source_record_id IS NULL
               OR supersedes_source_record_id <> source_record_id),
      CONSTRAINT source_records_unique_version
        UNIQUE (source_id, external_record_id, content_hash)
    )
  `.execute(db);

  await sql`CREATE INDEX source_records_source_id_idx ON source_records (source_id)`.execute(db);
  await sql`
    CREATE INDEX source_records_external_record_id_idx
      ON source_records (source_id, external_record_id)
  `.execute(db);

  // --- distribution_snapshots (docs/canonical/11 §6.1) --------------------
  // Surname-scoped by construction: surname_id is NOT NULL, so a
  // dataset-global snapshot cannot exist (ARCHITECTURE.md §10 invariant 3,
  // TASK-004 §9 invariant 1).
  //
  // A snapshot describes one surname within one dataset/methodology/time
  // scope and implies nothing about comparability with another snapshot —
  // comparability_group is what states that, and two snapshots in different
  // groups may not be compared quantitatively.
  await sql`
    CREATE TABLE distribution_snapshots (
      distribution_snapshot_id uuid PRIMARY KEY,
      surname_id               uuid            NOT NULL
                                 REFERENCES surnames (surname_id),
      source_id                uuid            NOT NULL
                                 REFERENCES sources (source_id),
      source_record_id         uuid            NOT NULL
                                 REFERENCES source_records (source_record_id),
      as_of_date               date,
      dataset_version          text,
      geography_level          geography_level NOT NULL,
      universe_description     text            NOT NULL,
      universe_size            bigint,
      surname_total_count      bigint,
      methodology_key          text            NOT NULL,
      comparability_group      text,
      coverage_notes           text,
      created_at               timestamptz     NOT NULL DEFAULT now(),
      CONSTRAINT distribution_snapshots_universe_description_not_blank
        CHECK (length(btrim(universe_description)) > 0),
      CONSTRAINT distribution_snapshots_methodology_key_not_blank
        CHECK (length(btrim(methodology_key)) > 0),
      CONSTRAINT distribution_snapshots_universe_size_non_negative
        CHECK (universe_size IS NULL OR universe_size >= 0),
      CONSTRAINT distribution_snapshots_surname_total_count_non_negative
        CHECK (surname_total_count IS NULL OR surname_total_count >= 0),
      CONSTRAINT distribution_snapshots_one_per_surname_and_record
        UNIQUE (surname_id, source_record_id)
    )
  `.execute(db);

  await sql`
    CREATE INDEX distribution_snapshots_surname_id_idx
      ON distribution_snapshots (surname_id)
  `.execute(db);
  await sql`
    CREATE INDEX distribution_snapshots_source_record_id_idx
      ON distribution_snapshots (source_record_id)
  `.execute(db);

  // --- distribution_values (docs/canonical/11 §6.2) ----------------------
  // Stored: raw count, denominator, source scope key, place mapping.
  // Derived (surname_share, population_rate, rank): only ever written
  // together with derivation_version, which the CHECK below enforces so a
  // derived number can never appear without the method that produced it.
  //
  // place_id IS NULL means the national aggregate, and is only meaningful
  // when the snapshot header is national. The partial UNIQUE index makes
  // "at most one national aggregate per snapshot" structural.
  await sql`
    CREATE TABLE distribution_values (
      distribution_value_id    uuid PRIMARY KEY,
      distribution_snapshot_id uuid    NOT NULL
                                 REFERENCES distribution_snapshots (distribution_snapshot_id),
      place_id                 uuid,
      source_geography_key     text,
      count                    bigint,
      population_denominator   bigint,
      surname_share            numeric,
      population_rate          numeric,
      rank                     integer,
      derivation_version       text,
      CONSTRAINT distribution_values_count_non_negative
        CHECK (count IS NULL OR count >= 0),
      CONSTRAINT distribution_values_population_denominator_positive
        CHECK (population_denominator IS NULL OR population_denominator > 0),
      CONSTRAINT distribution_values_rank_positive
        CHECK (rank IS NULL OR rank >= 1),
      CONSTRAINT distribution_values_derived_fields_need_derivation_version
        CHECK (
          (surname_share IS NULL AND population_rate IS NULL AND rank IS NULL)
          OR derivation_version IS NOT NULL
        )
    )
  `.execute(db);

  await sql`
    CREATE INDEX distribution_values_snapshot_id_idx
      ON distribution_values (distribution_snapshot_id)
  `.execute(db);
  await sql`
    CREATE UNIQUE INDEX distribution_values_one_national_aggregate_per_snapshot
      ON distribution_values (distribution_snapshot_id)
      WHERE place_id IS NULL
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS distribution_values`.execute(db);
  await sql`DROP TABLE IF EXISTS distribution_snapshots`.execute(db);
  await sql`DROP TABLE IF EXISTS source_records`.execute(db);
  await sql`DROP TABLE IF EXISTS sources`.execute(db);
  await sql`DROP TABLE IF EXISTS rights_profiles`.execute(db);
  await sql`DROP TYPE IF EXISTS geography_level`.execute(db);
  await sql`DROP TYPE IF EXISTS rights_review_status`.execute(db);
  await sql`DROP TYPE IF EXISTS cache_permission`.execute(db);
  await sql`DROP TYPE IF EXISTS rights_permission`.execute(db);
  await sql`DROP TYPE IF EXISTS source_record_status`.execute(db);
  await sql`DROP TYPE IF EXISTS source_record_type`.execute(db);
  await sql`DROP TYPE IF EXISTS source_production_status`.execute(db);
  await sql`DROP TYPE IF EXISTS source_reliability_tier`.execute(db);
  await sql`DROP TYPE IF EXISTS source_granularity`.execute(db);
  await sql`DROP TYPE IF EXISTS source_type`.execute(db);
}
