import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * `ARCHIVE_AVAILABILITY` (TASK-054, ADR-0024).
 *
 * `docs/canonical/11` §11 lists it as "Surname | collection/source/count |
 * FACT | Source registry/search output | VERIFIED within searched scope". The
 * enums it needs already exist: `epistemic_type` carries `FACT`,
 * `evidence_type` carries `AUTHORITATIVE_INDEX`, and `confidence_status`
 * carries `VERIFIED` (0004). So this migration adds one enum value and one
 * constraint, as 0014 and 0015 did for `SURNAME_MEANING`.
 *
 * Numbered 0025 because 0024 is TASK-051's (#43), whose migration is not on
 * `main` yet (`AGENTS.md` §11: numbers come from `main` and open pull requests).
 *
 * The constraint compares `claim_type::text`, not the enum literal: PostgreSQL
 * refuses to use a value added by `ALTER TYPE … ADD VALUE` in the transaction
 * that added it, and the migrator runs pending migrations in one transaction
 * (see 0015's note).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'ARCHIVE_AVAILABILITY'`.execute(db);
  await sql`
    ALTER TABLE claims
      ADD CONSTRAINT claims_archive_availability_is_surname_level
      CHECK (claim_type::text <> 'ARCHIVE_AVAILABILITY' OR scope = 'SURNAME_LEVEL')
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // PostgreSQL cannot remove a value from an enum (see 0005, 0009, 0011, 0014).
  await sql`
    ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_archive_availability_is_surname_level
  `.execute(db);
}
