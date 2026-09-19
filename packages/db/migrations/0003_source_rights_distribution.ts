import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Source / rights registry and surname distribution storage (TASK-004 §6).
 *
 * Creates exactly five tables:
 *
 *   - rights_profiles       (docs/canonical/11 §9.4)  ─┐ remainder of
 *   - sources               (docs/canonical/11 §9.1)  ─┘ Migration Group A
 *   - source_records        (docs/canonical/11 §9.2)  ─┐
 *   - distribution_snapshots(docs/canonical/11 §6.1)   ├ first half of Group B
 *   - distribution_values   (docs/canonical/11 §6.2)  ─┘
 *
 * (docs/canonical/23 §9.1, §9.2.)
 *
 * Deliberately NOT created — their absence is a success condition for
 * TASK-004 (§8): evidence_items, claims, claim_evidence,
 * confidence_assessments, citations, digital_assets, places,
 * name_form_relations, entity_external_ids, research_runs.
 *
 * ── Two documented deviations, neither silent ───────────────────────────
 *
 * 1. `source_records` uniqueness. docs/canonical/11's index specification
 *    mandates `UNIQUE source_records(source_id, external_record_id)`. That
 *    cannot coexist with the supersession requirement (docs/canonical/12
 *    §9.3, ARCHITECTURE.md §10 invariant 6): a reissued annual resource
 *    must produce a NEW immutable record sharing the publisher's resource
 *    id. Resolved by ADR-0003 (docs/adr/0003-source-record-granularity.md)
 *    in favour of `(source_id, external_record_id, content_hash)`.
 *    One SourceRecord represents one resource VERSION, not one CSV row.
 *
 * 2. `distribution_values.place_id` carries no foreign key, because
 *    `places` does not exist until M3. It is nullable and null for every
 *    row TASK-004 writes (the national aggregate — docs/canonical/11 §6.2
 *    "Null only for national aggregate if snapshot header is national").
 *    The FK is added by whichever task creates `places`.
 *
 * Derived columns (`surname_share`, `population_rate`, `rank`,
 * `derivation_version`) exist because docs/canonical/11 §6.2 defines them,
 * but TASK-004 writes null to every one of them: this task stores, it does
 * not derive (ARCHITECTURE.md §10 invariant 10).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  // --- Rights enums (docs/canonical/11 §9.4) ------------------------------
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

  // --- Source enums (docs/canonical/11 §9.1, §9.2) ------------------------
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

  // --- Distribution enum (docs/canonical/11 §6.1) -------------------------
  await sql`
    CREATE TYPE geography_level AS ENUM
      ('NATIONAL', 'REGION', 'DISTRICT', 'MUNICIPALITY', 'LOCALITY', 'MIXED')
  `.execute(db);

  // --- rights_profiles (docs/canonical/11 §9.4) ---------------------------
  // Versioned and immutable once applied to a research output: changed
  // terms create a NEW profile rather than an UPDATE of this row.
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
      CONSTRAINT rights_profiles_valid_range
        CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
    )
  `.execute(db);

  // --- sources (docs/canonical/11 §9.1) -----------------------------------
  // default_rights_profile_id is NOT NULL: a source cannot exist without an
  // effective rights position (ARCHITECTURE.md §10 invariant 13).
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
      homepage_or_reference_url text,
      created_at                timestamptz             NOT NULL DEFAULT now(),
      updated_at                timestamptz             NOT NULL DEFAULT now(),
      CONSTRAINT sources_source_key_not_blank
        CHECK (length(btrim(source_key)) > 0),
      CONSTRAINT sources_not_own_parent
        CHECK (parent_source_id IS NULL OR parent_source_id <> source_id)
    )
  `.execute(db);

  // --- source_records (docs/canonical/11 §9.2) ----------------------------
  // One row per imported RESOURCE VERSION (ADR-0003), never per CSV row.
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
      CONSTRAINT source_records_content_hash_sha256
        CHECK (content_hash ~ '^[0-9a-f]{64}$'),
      CONSTRAINT source_records_not_own_predecessor
        CHECK (supersedes_source_record_id IS NULL
               OR supersedes_source_record_id <> source_record_id)
    )
  `.execute(db);

  // Idempotent re-ingestion rests on this constraint: importing identical
  // bytes for the same resource collides here and is a no-op. Deviation
  // from docs/canonical/11's index line is ADR-0003 — see the header.
  await sql`
    CREATE UNIQUE INDEX source_records_source_external_content_uq
      ON source_records (source_id, external_record_id, content_hash)
      WHERE external_record_id IS NOT NULL
  `.execute(db);
  await sql`
    CREATE INDEX source_records_source_retrieved_idx
      ON source_records (source_id, retrieved_at DESC)
  `.execute(db);

  // --- distribution_snapshots (docs/canonical/11 §6.1) --------------------
  // surname_id is NOT NULL: a snapshot is surname-scoped by construction,
  // so a dataset-global snapshot cannot be represented at all
  // (ARCHITECTURE.md §10 invariant 3).
  //
  // source_id and source_record_id are both NOT NULL here, though
  // docs/canonical/11 §6.1 allows a null source_record_id ("resource/version
  // row if useful"). For this task provenance is not optional: no
  // distribution row may exist without the exact resource version it came
  // from (TASK-004 AC-07).
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
      CONSTRAINT distribution_snapshots_universe_size_positive
        CHECK (universe_size IS NULL OR universe_size > 0)
    )
  `.execute(db);

  // One snapshot per (surname, resource version) — TASK-004 §9 invariant 11.
  await sql`
    CREATE UNIQUE INDEX distribution_snapshots_surname_record_uq
      ON distribution_snapshots (surname_id, source_record_id)
  `.execute(db);
  await sql`
    CREATE INDEX distribution_snapshots_surname_as_of_idx
      ON distribution_snapshots (surname_id, as_of_date DESC)
  `.execute(db);

  // --- distribution_values (docs/canonical/11 §6.2) -----------------------
  // place_id: no FK until `places` exists (M3) — see the header note.
  // derivation_version is required whenever any derived field is set; the
  // CHECK makes "a derived number with no recorded method" unrepresentable
  // rather than merely discouraged.
  await sql`
    CREATE TABLE distribution_values (
      distribution_value_id    uuid PRIMARY KEY,
      distribution_snapshot_id uuid        NOT NULL
                                 REFERENCES distribution_snapshots (distribution_snapshot_id),
      place_id                 uuid,
      source_geography_key     text,
      count                    bigint,
      population_denominator   bigint,
      surname_share            numeric,
      population_rate          numeric,
      rank                     integer,
      derivation_version       text,
      created_at               timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT distribution_values_count_positive
        CHECK (count IS NULL OR count > 0),
      CONSTRAINT distribution_values_denominator_positive
        CHECK (population_denominator IS NULL OR population_denominator > 0),
      CONSTRAINT distribution_values_rank_positive
        CHECK (rank IS NULL OR rank > 0),
      CONSTRAINT distribution_values_derived_requires_version
        CHECK (
          derivation_version IS NOT NULL
          OR (surname_share IS NULL AND population_rate IS NULL AND rank IS NULL)
        )
    )
  `.execute(db);

  await sql`
    CREATE INDEX distribution_values_snapshot_place_idx
      ON distribution_values (distribution_snapshot_id, place_id)
  `.execute(db);

  // The national aggregate is exactly one row per snapshot, identified by a
  // null place_id (docs/canonical/11 §6.2). Without this a second national
  // row could be inserted for the same snapshot and silently double a count.
  await sql`
    CREATE UNIQUE INDEX distribution_values_snapshot_national_uq
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
  await sql`DROP TYPE IF EXISTS source_record_status`.execute(db);
  await sql`DROP TYPE IF EXISTS source_record_type`.execute(db);
  await sql`DROP TYPE IF EXISTS source_production_status`.execute(db);
  await sql`DROP TYPE IF EXISTS source_reliability_tier`.execute(db);
  await sql`DROP TYPE IF EXISTS source_granularity`.execute(db);
  await sql`DROP TYPE IF EXISTS source_type`.execute(db);
  await sql`DROP TYPE IF EXISTS rights_review_status`.execute(db);
  await sql`DROP TYPE IF EXISTS cache_permission`.execute(db);
  await sql`DROP TYPE IF EXISTS rights_permission`.execute(db);
}
