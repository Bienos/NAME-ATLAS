import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Truth layer — evidence, claims, confidence and citations (TASK-005 §6).
 *
 * Completes the chain ARCHITECTURE.md §10 invariant 1 requires:
 *
 *   Source → SourceRecord → EvidenceItem → Claim → ConfidenceAssessment → Citation
 *
 * TASK-004 built the first two links and the distribution rows beneath them;
 * this migration adds the rest, plus the audit record they hang from.
 *
 * Creates exactly six tables:
 *
 *   - research_runs           (docs/canonical/11 §22.1)
 *   - evidence_items          (docs/canonical/11 §9.5)
 *   - claims                  (docs/canonical/11 §10.1)
 *   - claim_evidence          (docs/canonical/11 §10.2)
 *   - confidence_assessments  (docs/canonical/11 §10.3)
 *   - citations               (docs/canonical/11 §10.4)
 *
 * ── Two recorded decisions this migration implements ────────────────────
 *
 * D-008 (docs/DECISIONS_NEEDED.md) — `docs/canonical/11` binds;
 * `docs/canonical/14`'s MODEL CHANGE PROPOSALS are not ratified and are not
 * built. So `evidence_type` is §9.5's 9-member enum (`OFFICIAL_DATASET_FIELD`,
 * not 14-A's `OFFICIAL_DATASET_VALUE`), `EvidenceItem` has no `directness` or
 * `extraction_*` columns, and `claim_evidence.relationship` is the
 * three-member §10.2 enum. Dataset caveats ride on the snapshot scope
 * metadata TASK-004 already persists, which is `docs/canonical/14` §29.1's
 * own second branch.
 *
 * D-009 — `created_by_run_id` is NOT NULL on both `evidence_items` and
 * `claims`, exactly as §9.5/§10.1 specify, because `research_runs` is
 * created here. `PLAN.md`'s M3 item is the asynchronous runtime (module
 * runs, outbox, queues), not this audit record, which §248 marks P0.
 *
 * ── Deliberately NOT created (TASK-005 §8) ──────────────────────────────
 *
 * evidence_dependencies, research_module_runs, runtime_outbox, places,
 * digital_assets, name_form_relations, entity_external_ids, and any
 * surface-eligibility table (that is `docs/canonical/14`'s unratified
 * proposal 14-I; eligibility is computed, not stored).
 *
 * `claim_type` intentionally carries one member. The canonical taxonomy
 * (§11) lists many more; they arrive by `ALTER TYPE … ADD VALUE` as later
 * tasks emit them — the same staging migration 0002 used for `entity_type`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  // --- Runtime audit enums (docs/canonical/11 §22.1) ----------------------
  await sql`
    CREATE TYPE research_run_type AS ENUM
      ('BASIC_SURNAME', 'PREMIUM_SURNAME', 'REPROCESS', 'QA')
  `.execute(db);
  await sql`
    CREATE TYPE research_run_status AS ENUM
      ('PENDING', 'RUNNING', 'PARTIAL', 'COMPLETE', 'FAILED', 'REVIEW_REQUIRED')
  `.execute(db);
  await sql`
    CREATE TYPE qa_status AS ENUM ('NOT_RUN', 'PASS', 'FAIL', 'REVIEW_REQUIRED')
  `.execute(db);

  // --- Evidence enums (docs/canonical/11 §9.5) ----------------------------
  await sql`
    CREATE TYPE evidence_type AS ENUM (
      'OFFICIAL_DATASET_FIELD',
      'PRIMARY_RECORD',
      'AUTHORITATIVE_INDEX',
      'SCHOLARLY_SOURCE',
      'SECONDARY_HISTORICAL_SOURCE',
      'DERIVED_STATISTIC',
      'ALGORITHMIC_SIMILARITY',
      'USER_PROVIDED',
      'OTHER'
    )
  `.execute(db);
  await sql`
    CREATE TYPE evidence_verification_status AS ENUM
      ('VERIFIED', 'REVIEWED', 'MACHINE_EXTRACTED', 'SUSPECT', 'REJECTED')
  `.execute(db);

  // --- Claim enums (docs/canonical/11 §10.1, §10.2, §11, §12) -------------
  // One member. See the header note on staged enum growth.
  await sql`CREATE TYPE claim_type AS ENUM ('CURRENT_POPULATION')`.execute(db);
  await sql`
    CREATE TYPE epistemic_type AS ENUM
      ('FACT', 'INTERPRETATION', 'HYPOTHESIS', 'UNKNOWN')
  `.execute(db);
  await sql`
    CREATE TYPE claim_lifecycle_status AS ENUM
      ('ACTIVE', 'SUPERSEDED', 'RETRACTED', 'REJECTED')
  `.execute(db);
  await sql`
    CREATE TYPE claim_evidence_relationship AS ENUM
      ('SUPPORTS', 'CONTRADICTS', 'CONTEXT')
  `.execute(db);

  // --- Confidence enums (docs/canonical/11 §10.3, §12.2) ------------------
  await sql`
    CREATE TYPE confidence_status AS ENUM (
      'VERIFIED',
      'LIKELY',
      'POSSIBLE',
      'UNCONFIRMED',
      'CONFLICTING',
      'INSUFFICIENT_DATA'
    )
  `.execute(db);
  // Distinct from rights_review_status (migration 0003): that one reviews a
  // licence, this one reviews an assessment.
  await sql`
    CREATE TYPE review_status AS ENUM
      ('AUTO', 'PENDING', 'HUMAN_APPROVED', 'HUMAN_REJECTED')
  `.execute(db);

  // --- research_runs (docs/canonical/11 §22.1) ----------------------------
  // Immutable after completion except operational metadata (§22.1 preamble).
  // prompt_manifest and model_manifest are empty objects at M1: no prompt and
  // no model exist. That is recorded, not disguised (D-009).
  await sql`
    CREATE TABLE research_runs (
      research_run_id       uuid PRIMARY KEY,
      run_type              research_run_type   NOT NULL,
      surname_id            uuid REFERENCES surnames (surname_id),
      raw_input             jsonb               NOT NULL,
      input_schema_version  text                NOT NULL,
      workflow_version      text                NOT NULL,
      connector_manifest    jsonb               NOT NULL,
      prompt_manifest       jsonb               NOT NULL,
      model_manifest        jsonb               NOT NULL,
      normalization_version text                NOT NULL,
      rights_snapshot_hash  text,
      run_status            research_run_status NOT NULL,
      qa_status             qa_status           NOT NULL,
      started_at            timestamptz         NOT NULL,
      completed_at          timestamptz,
      error_summary         jsonb,
      created_at            timestamptz         NOT NULL DEFAULT now(),
      CONSTRAINT research_runs_completed_after_started
        CHECK (completed_at IS NULL OR completed_at >= started_at)
    )
  `.execute(db);
  await sql`
    CREATE INDEX research_runs_surname_started_idx
      ON research_runs (surname_id, started_at DESC)
  `.execute(db);

  // --- evidence_items (docs/canonical/11 §9.5) ----------------------------
  // source_record_id is nullable in the canonical model ("null allowed for
  // purely derived/system evidence only if lineage is otherwise preserved").
  // TASK-005 writes only source-backed evidence, so every row it creates has
  // one; the column stays nullable to match the model rather than narrowing
  // it for a future task.
  await sql`
    CREATE TABLE evidence_items (
      evidence_item_id    uuid PRIMARY KEY,
      evidence_type       evidence_type               NOT NULL,
      source_record_id    uuid REFERENCES source_records (source_record_id),
      subject_entity_id   uuid REFERENCES knowledge_entities (entity_id),
      structured_value    jsonb                       NOT NULL,
      raw_excerpt         text,
      supporting_locator  text,
      verification_status evidence_verification_status NOT NULL,
      derivation_method   text,
      derivation_version  text,
      created_by_run_id   uuid                        NOT NULL
                            REFERENCES research_runs (research_run_id),
      created_at          timestamptz                 NOT NULL DEFAULT now(),
      -- §9.5: derivation_method is "required for derived evidence".
      CONSTRAINT evidence_items_derived_requires_method
        CHECK (
          evidence_type <> 'DERIVED_STATISTIC'
          OR (derivation_method IS NOT NULL AND derivation_version IS NOT NULL)
        )
    )
  `.execute(db);
  await sql`
    CREATE INDEX evidence_items_source_record_idx ON evidence_items (source_record_id)
  `.execute(db);
  await sql`
    CREATE INDEX evidence_items_subject_idx ON evidence_items (subject_entity_id)
  `.execute(db);

  // --- claims (docs/canonical/11 §10.1) -----------------------------------
  await sql`
    CREATE TABLE claims (
      claim_id            uuid PRIMARY KEY,
      claim_key           text                   NOT NULL,
      claim_type          claim_type             NOT NULL,
      epistemic_type      epistemic_type         NOT NULL,
      scope               evidence_scope         NOT NULL,
      subject_entity_id   uuid                   NOT NULL
                            REFERENCES knowledge_entities (entity_id),
      object_entity_id    uuid REFERENCES knowledge_entities (entity_id),
      structured_value    jsonb                  NOT NULL,
      statement_key       text,
      claim_status        claim_lifecycle_status NOT NULL,
      supersedes_claim_id uuid REFERENCES claims (claim_id),
      created_by_run_id   uuid                   NOT NULL
                            REFERENCES research_runs (research_run_id),
      method_version      text                   NOT NULL,
      created_at          timestamptz            NOT NULL DEFAULT now(),
      CONSTRAINT claims_claim_key_not_blank
        CHECK (length(btrim(claim_key)) > 0),
      CONSTRAINT claims_not_own_predecessor
        CHECK (supersedes_claim_id IS NULL OR supersedes_claim_id <> claim_id),
      -- docs/canonical/11 §11 scope constraint: CURRENT_POPULATION is
      -- SURNAME_LEVEL. Enforced in the schema, not only in the service.
      CONSTRAINT claims_current_population_is_surname_level
        CHECK (claim_type <> 'CURRENT_POPULATION' OR scope = 'SURNAME_LEVEL')
    )
  `.execute(db);

  // Re-derivation over unchanged data must not create a second live claim.
  // Partial on ACTIVE so a superseded claim keeps its key (TASK-005 §9 inv. 8).
  await sql`
    CREATE UNIQUE INDEX claims_active_claim_key_uq
      ON claims (claim_key) WHERE claim_status = 'ACTIVE'
  `.execute(db);
  await sql`
    CREATE INDEX claims_subject_type_status_idx
      ON claims (subject_entity_id, claim_type, claim_status)
  `.execute(db);

  // --- claim_evidence (docs/canonical/11 §10.2) ---------------------------
  // No numeric weight, per §10.2.
  await sql`
    CREATE TABLE claim_evidence (
      claim_id         uuid                        NOT NULL
                         REFERENCES claims (claim_id),
      evidence_item_id uuid                        NOT NULL
                         REFERENCES evidence_items (evidence_item_id),
      relationship     claim_evidence_relationship NOT NULL,
      reason_code      text,
      notes            text,
      created_at       timestamptz                 NOT NULL DEFAULT now(),
      PRIMARY KEY (claim_id, evidence_item_id, relationship)
    )
  `.execute(db);
  await sql`
    CREATE INDEX claim_evidence_evidence_idx ON claim_evidence (evidence_item_id)
  `.execute(db);

  // --- confidence_assessments (docs/canonical/11 §10.3) -------------------
  // "Assessments are versioned; do not overwrite a historical assessment when
  // evidence changes." No percentage field exists in MVP.
  await sql`
    CREATE TABLE confidence_assessments (
      confidence_assessment_id uuid PRIMARY KEY,
      claim_id                 uuid              NOT NULL
                                 REFERENCES claims (claim_id),
      status                   confidence_status NOT NULL,
      rationale                text              NOT NULL,
      evidence_set_hash        text              NOT NULL,
      assessment_method        text              NOT NULL,
      assessment_version       text              NOT NULL,
      human_review_required    boolean           NOT NULL,
      review_status            review_status     NOT NULL,
      assessed_at              timestamptz       NOT NULL,
      created_at               timestamptz       NOT NULL DEFAULT now(),
      CONSTRAINT confidence_assessments_evidence_set_hash_sha256
        CHECK (evidence_set_hash ~ '^[0-9a-f]{64}$'),
      CONSTRAINT confidence_assessments_rationale_not_blank
        CHECK (length(btrim(rationale)) > 0)
    )
  `.execute(db);
  // One assessment per claim per method version: a re-run with the same
  // method is idempotent, a new method version adds a new assessment rather
  // than overwriting history.
  await sql`
    CREATE UNIQUE INDEX confidence_assessments_claim_method_uq
      ON confidence_assessments (claim_id, assessment_method, assessment_version)
  `.execute(db);

  // --- citations (docs/canonical/11 §10.4) --------------------------------
  // "A stable, normalized reference, not merely a formatted string."
  // Formatting into PL/EN citation style is downstream and is not stored.
  await sql`
    CREATE TABLE citations (
      citation_id       uuid PRIMARY KEY,
      source_id         uuid        NOT NULL REFERENCES sources (source_id),
      source_record_id  uuid REFERENCES source_records (source_record_id),
      title             text        NOT NULL,
      publisher         text,
      publication_date  text,
      url_or_reference  text        NOT NULL,
      supporting_locator text,
      accessed_at       timestamptz,
      rights_profile_id uuid        NOT NULL
                          REFERENCES rights_profiles (rights_profile_id),
      claim_id          uuid        NOT NULL REFERENCES claims (claim_id),
      created_at        timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT citations_title_not_blank CHECK (length(btrim(title)) > 0),
      CONSTRAINT citations_url_not_blank CHECK (length(btrim(url_or_reference)) > 0)
    )
  `.execute(db);
  // One citation per claim in this task's data; re-derivation must not add a
  // second. claim_id is this project's link from the canonical Citation to
  // the proposition it supports (§10.4 carries source/record/rights but not
  // the claim reference).
  await sql`CREATE UNIQUE INDEX citations_claim_uq ON citations (claim_id)`.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS citations`.execute(db);
  await sql`DROP TABLE IF EXISTS confidence_assessments`.execute(db);
  await sql`DROP TABLE IF EXISTS claim_evidence`.execute(db);
  await sql`DROP TABLE IF EXISTS claims`.execute(db);
  await sql`DROP TABLE IF EXISTS evidence_items`.execute(db);
  await sql`DROP TABLE IF EXISTS research_runs`.execute(db);
  await sql`DROP TYPE IF EXISTS review_status`.execute(db);
  await sql`DROP TYPE IF EXISTS confidence_status`.execute(db);
  await sql`DROP TYPE IF EXISTS claim_evidence_relationship`.execute(db);
  await sql`DROP TYPE IF EXISTS claim_lifecycle_status`.execute(db);
  await sql`DROP TYPE IF EXISTS epistemic_type`.execute(db);
  await sql`DROP TYPE IF EXISTS claim_type`.execute(db);
  await sql`DROP TYPE IF EXISTS evidence_verification_status`.execute(db);
  await sql`DROP TYPE IF EXISTS evidence_type`.execute(db);
  await sql`DROP TYPE IF EXISTS qa_status`.execute(db);
  await sql`DROP TYPE IF EXISTS research_run_status`.execute(db);
  await sql`DROP TYPE IF EXISTS research_run_type`.execute(db);
}
