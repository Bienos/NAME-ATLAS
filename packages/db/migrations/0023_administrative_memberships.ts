import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * `AdministrativeMembership` (docs/canonical/11 §5.4), for the TERYT
 * localities import (TASK-039).
 *
 * "Place A belonged to Place/Admin Unit B during period T." Migration 0010
 * left it out on purpose, because TASK-011 had only voivodeships and nothing
 * to hang below them. The TERC/SIMC hierarchy (voivodeship → powiat → gmina
 * → locality) needs somewhere to live that is not a parent column on
 * `places`: a place's parent is a dated, sourced fact, and a place may have
 * had several over time.
 *
 * - `temporal_*` is the §15.1 extent reduced to what the register supplies,
 *   `valid_from` / `valid_to` as dates, the same shape as
 *   `entity_external_ids`.
 * - `verification_status` reuses `evidence_verification_status` (0004)
 *   rather than adding a second enum with the same values.
 * - UNIQUE on (child, parent, type, valid_from): the same membership stated
 *   twice for the same period is one fact, not two.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TYPE admin_membership_type AS ENUM
      ('ADMINISTRATIVE', 'POLITICAL', 'ECCLESIASTICAL', 'OTHER')
  `.execute(db);

  await sql`
    CREATE TABLE administrative_memberships (
      membership_id       uuid PRIMARY KEY,
      child_place_id      uuid                         NOT NULL REFERENCES places (place_id),
      parent_place_id     uuid                         NOT NULL REFERENCES places (place_id),
      membership_type     admin_membership_type        NOT NULL,
      valid_from          date,
      valid_to            date,
      source_record_id    uuid REFERENCES source_records (source_record_id),
      verification_status evidence_verification_status NOT NULL,
      created_at          timestamptz                  NOT NULL DEFAULT now(),
      CONSTRAINT administrative_memberships_not_own_parent
        CHECK (child_place_id <> parent_place_id),
      CONSTRAINT administrative_memberships_validity_ordered
        CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to),
      CONSTRAINT administrative_memberships_unique
        UNIQUE NULLS NOT DISTINCT (child_place_id, parent_place_id, membership_type, valid_from)
    )
  `.execute(db);
  await sql`
    CREATE INDEX administrative_memberships_parent_idx
      ON administrative_memberships (parent_place_id)
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS administrative_memberships`.execute(db);
  await sql`DROP TYPE IF EXISTS admin_membership_type`.execute(db);
}
