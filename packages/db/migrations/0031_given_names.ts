import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Given names, a second name type kept apart from surnames (ADR-0031, TASK-078).
 *
 * - `given_names`: one identity per written form under the resolver's
 *   canonical key, as `surnames` has. No column joins it to a surname.
 * - `given_name_counts`: the publisher's count for one given name in one
 *   source record (one list: a sex and a name position). Given-name-scoped,
 *   so `DistributionSnapshot` stays surname-scoped (`ARCHITECTURE.md` §10).
 *   No zero is stored: the lists leave out single occurrences, and an absent
 *   name has no row.
 *
 * Numbered 0031: `main` gave 0029 to the well-known bearers (#84), and #76's
 * family safeguards are 0030 (`AGENTS.md` §11). The new enum values
 * are compared as text in the constraints below: PostgreSQL refuses to use a
 * value added by `ALTER TYPE … ADD VALUE` in the transaction that added it
 * (see 0025).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'GIVEN_NAME'`.execute(db);
  await sql`ALTER TYPE source_granularity ADD VALUE IF NOT EXISTS 'GIVEN_NAME'`.execute(db);

  await sql`
    CREATE TABLE given_names (
      given_name_id          uuid PRIMARY KEY
                               REFERENCES knowledge_entities (entity_id),
      canonical_display      text        NOT NULL,
      canonical_key          text        NOT NULL UNIQUE,
      canonical_key_version  text        NOT NULL,
      primary_script         text        NOT NULL,
      -- A form a surface must not show until reviewed (ADR-0031 §4).
      form_review            text,
      created_at             timestamptz NOT NULL DEFAULT now(),
      updated_at             timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT given_names_canonical_display_not_blank
        CHECK (length(btrim(canonical_display)) > 0),
      CONSTRAINT given_names_canonical_key_not_blank
        CHECK (length(canonical_key) > 0),
      CONSTRAINT given_names_primary_script_iso15924
        CHECK (primary_script ~ '^[A-Z][a-z]{3}$'),
      CONSTRAINT given_names_form_review_known
        CHECK (form_review IS NULL OR form_review = 'INITIAL_OR_ABBREVIATION')
    )
  `.execute(db);

  await sql`
    CREATE TABLE given_name_counts (
      given_name_count_id  uuid PRIMARY KEY,
      given_name_id        uuid    NOT NULL REFERENCES given_names (given_name_id),
      source_record_id     uuid    NOT NULL REFERENCES source_records (source_record_id),
      count                integer NOT NULL,
      created_at           timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT given_name_counts_one_per_record UNIQUE (given_name_id, source_record_id),
      -- The publisher leaves out single occurrences; a lower value is a shape change.
      CONSTRAINT given_name_counts_published_minimum CHECK (count >= 2)
    )
  `.execute(db);
  await sql`
    CREATE INDEX given_name_counts_source_record_idx ON given_name_counts (source_record_id)
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // PostgreSQL cannot remove a value from an enum (see 0005, 0009, 0011, 0014, 0025).
  await sql`DROP TABLE IF EXISTS given_name_counts`.execute(db);
  await sql`DROP TABLE IF EXISTS given_names`.execute(db);
}
