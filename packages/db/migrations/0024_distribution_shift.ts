import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * `SURNAME_DISTRIBUTION_SHIFT` (TASK-046, ADR-0020).
 *
 * One enum value: `claim_type` gains `SURNAME_DISTRIBUTION_SHIFT`, the claim
 * `docs/canonical/14` §13.5 names for how a surname's distribution moved. Here
 * it is a surname's national count across the editions of one published list.
 * `evidence_dependency_role` already carries `COUNT`, and `evidence_type`
 * already carries `OFFICIAL_DATASET_FIELD` and `DERIVED_STATISTIC`, so nothing
 * else is added to the enums.
 *
 * One constraint, mirroring `claims_current_population_is_surname_level`
 * (`0004`) and `claims_surname_meaning_is_surname_level` (`0015`): the claim is
 * surname scope, in the schema and not only in the service. It compares
 * `claim_type::text`, as `0015` does, so the new enum value is never *used* in
 * the transaction that adds it (PostgreSQL refuses that, D-011).
 *
 * No table and no column: a derived value is a claim, not a column
 * (`ARCHITECTURE.md` §10 invariant 10).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'SURNAME_DISTRIBUTION_SHIFT'`.execute(db);
  await sql`
    ALTER TABLE claims
      ADD CONSTRAINT claims_surname_distribution_shift_is_surname_level
      CHECK (claim_type::text <> 'SURNAME_DISTRIBUTION_SHIFT' OR scope = 'SURNAME_LEVEL')
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // PostgreSQL cannot remove a value from an enum (see 0005, 0009, 0011). The
  // value stays and is inert once the claims carrying it are gone. The
  // constraint goes.
  await sql`
    ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_surname_distribution_shift_is_surname_level
  `.execute(db);
}
