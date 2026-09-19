import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Identity core — the minimal slice of Migration Group A that exact surname
 * resolution needs (TASK-003 §6.2; docs/canonical/23 §9 stages Group A by
 * implementation need rather than building it all before proof).
 *
 * Creates exactly three tables and one view:
 *
 *   - knowledge_entities  (docs/canonical/11 §4.1)
 *   - surnames            (docs/canonical/11 §4.2)
 *   - name_forms          (docs/canonical/11 §4.3)
 *   - resolvable_name_forms — a view encoding the NameForm eligibility rule
 *
 * Deliberately NOT created (TASK-003 §5, §6.2): name_form_relations,
 * entity_external_ids, sources, rights_profiles, research_runs. No code in
 * this task reads or writes any of them.
 *
 * Column omissions, each because its target table does not exist yet and a
 * nullable column with no data in it is a trivial follow-up migration:
 *
 *   - name_forms.geographic_scope_place_id — FK to `places` (M3)
 *   - name_forms.created_by_run_id         — FK to `research_runs` (M3)
 *   - name_forms.valid_from_* / valid_to_* — the flattened TemporalExtent
 *     value object (docs/canonical/11 §15.1: 8 columns plus `precision`,
 *     `qualifier` and `calendar_system` enums). Nullable and optional in the
 *     canonical model. This task performs no temporal logic of any kind —
 *     historical ingestion is explicitly out of scope (TASK-003 §5) — so
 *     creating eleven columns and three enums nothing reads or writes would
 *     be abstraction for a future task (AGENTS.md §6). Added by whichever
 *     task first stores a temporal extent.
 *
 * The `entity_type` enum is intentionally narrow (SURNAME, NAME_FORM). The
 * canonical model lists many more members; they arrive by
 * `ALTER TYPE … ADD VALUE` as later tasks register their entity kinds. That
 * is a normal, supported PostgreSQL operation, not a redesign.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  // --- Enumerated domains (docs/canonical/11 §4.1–§4.3) -------------------
  await sql`CREATE TYPE entity_type AS ENUM ('SURNAME', 'NAME_FORM')`.execute(db);
  await sql`
    CREATE TYPE evidence_scope AS ENUM
      ('SURNAME_LEVEL', 'FAMILY_LEVEL', 'PERSON_LEVEL', 'SHARED')
  `.execute(db);
  await sql`
    CREATE TYPE privacy_class AS ENUM
      ('PUBLIC', 'INTERNAL', 'USER_PRIVATE', 'SENSITIVE_FAMILY')
  `.execute(db);
  await sql`
    CREATE TYPE entity_status AS ENUM
      ('ACTIVE', 'MERGED', 'SUPERSEDED', 'RETRACTED')
  `.execute(db);
  await sql`
    CREATE TYPE surname_status AS ENUM
      ('ACTIVE', 'AMBIGUOUS', 'MERGED', 'DEPRECATED')
  `.execute(db);
  await sql`
    CREATE TYPE name_form_type AS ENUM (
      'CANONICAL',
      'MODERN_VARIANT',
      'HISTORICAL_ATTESTED',
      'TRANSLITERATION',
      'MIGRATION_ADAPTATION',
      'LINGUISTIC_NORMALISATION',
      'SEARCH_CANDIDATE'
    )
  `.execute(db);
  await sql`
    CREATE TYPE attestation_status AS ENUM
      ('ATTESTED', 'DERIVED', 'GENERATED_CANDIDATE', 'DISPUTED')
  `.execute(db);

  // --- knowledge_entities (docs/canonical/11 §4.1) ------------------------
  // The referential-integrity layer, not a graph database. Claimable domain
  // tables use entity_id as their own primary key and foreign key here.
  await sql`
    CREATE TABLE knowledge_entities (
      entity_id        uuid PRIMARY KEY,
      entity_type      entity_type    NOT NULL,
      scope            evidence_scope NOT NULL,
      privacy_class    privacy_class  NOT NULL,
      lifecycle_status entity_status  NOT NULL,
      created_at       timestamptz    NOT NULL DEFAULT now(),
      updated_at       timestamptz    NOT NULL DEFAULT now()
    )
  `.execute(db);

  // --- surnames (docs/canonical/11 §4.2) ----------------------------------
  // canonical_key is UNIQUE: this is what makes tier T0 unique by
  // construction rather than by a runtime check (docs/canonical/13 §1.3).
  await sql`
    CREATE TABLE surnames (
      surname_id             uuid PRIMARY KEY
                               REFERENCES knowledge_entities (entity_id),
      canonical_display      text           NOT NULL,
      canonical_key          text           NOT NULL UNIQUE,
      canonical_key_version  text           NOT NULL,
      primary_script         text           NOT NULL,
      primary_locale         text,
      entity_status          surname_status NOT NULL,
      merged_into_surname_id uuid REFERENCES surnames (surname_id),
      created_at             timestamptz    NOT NULL DEFAULT now(),
      updated_at             timestamptz    NOT NULL DEFAULT now(),
      CONSTRAINT surnames_canonical_display_not_blank
        CHECK (length(btrim(canonical_display)) > 0),
      CONSTRAINT surnames_canonical_key_not_blank
        CHECK (length(canonical_key) > 0),
      CONSTRAINT surnames_primary_script_iso15924
        CHECK (primary_script ~ '^[A-Z][a-z]{3}$'),
      CONSTRAINT surnames_not_merged_into_self
        CHECK (merged_into_surname_id IS NULL OR merged_into_surname_id <> surname_id)
    )
  `.execute(db);

  // --- name_forms (docs/canonical/11 §4.3) --------------------------------
  // surname_id is nullable by canonical design: a form exists before its
  // association with a surname is accepted. The resolver treats an
  // unassociated form as ineligible (see the view below).
  await sql`
    CREATE TABLE name_forms (
      name_form_id          uuid PRIMARY KEY
                              REFERENCES knowledge_entities (entity_id),
      surname_id            uuid REFERENCES surnames (surname_id),
      form                  text               NOT NULL,
      unicode_nfc           text               NOT NULL,
      search_key            text               NOT NULL,
      normalization_version text               NOT NULL,
      script                text               NOT NULL,
      language_code         text,
      form_type             name_form_type     NOT NULL,
      attestation_status    attestation_status NOT NULL,
      created_at            timestamptz        NOT NULL DEFAULT now(),
      CONSTRAINT name_forms_form_not_blank
        CHECK (length(btrim(form)) > 0),
      CONSTRAINT name_forms_search_key_not_blank
        CHECK (length(search_key) > 0),
      CONSTRAINT name_forms_script_iso15924
        CHECK (script ~ '^[A-Z][a-z]{3}$')
    )
  `.execute(db);

  await sql`CREATE INDEX name_forms_search_key_idx ON name_forms (search_key)`.execute(db);
  await sql`CREATE INDEX name_forms_surname_id_idx ON name_forms (surname_id)`.execute(db);

  // --- resolvable_name_forms (TASK-003 §6.1, §7.4, §11) -------------------
  // The NameForm eligibility rule, enforced structurally rather than by a
  // predicate the lookup code could forget. The lookup path queries this
  // view and therefore cannot see an ineligible row at all.
  //
  // Encodes docs/canonical/11 §4.3's hard rule — SEARCH_CANDIDATE and
  // GENERATED_CANDIDATE are never usable for automatic resolution — plus
  // DISPUTED (contested) and an unaccepted association (surname_id IS NULL).
  await sql`
    CREATE VIEW resolvable_name_forms AS
      SELECT
        name_form_id,
        surname_id,
        form,
        unicode_nfc,
        search_key,
        normalization_version,
        script,
        language_code,
        form_type,
        attestation_status,
        created_at
      FROM name_forms
      WHERE surname_id IS NOT NULL
        AND form_type IN ('CANONICAL', 'MODERN_VARIANT')
        AND attestation_status IN ('ATTESTED', 'DERIVED')
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP VIEW IF EXISTS resolvable_name_forms`.execute(db);
  await sql`DROP TABLE IF EXISTS name_forms`.execute(db);
  await sql`DROP TABLE IF EXISTS surnames`.execute(db);
  await sql`DROP TABLE IF EXISTS knowledge_entities`.execute(db);
  await sql`DROP TYPE IF EXISTS attestation_status`.execute(db);
  await sql`DROP TYPE IF EXISTS name_form_type`.execute(db);
  await sql`DROP TYPE IF EXISTS surname_status`.execute(db);
  await sql`DROP TYPE IF EXISTS entity_status`.execute(db);
  await sql`DROP TYPE IF EXISTS privacy_class`.execute(db);
  await sql`DROP TYPE IF EXISTS evidence_scope`.execute(db);
  await sql`DROP TYPE IF EXISTS entity_type`.execute(db);
}
