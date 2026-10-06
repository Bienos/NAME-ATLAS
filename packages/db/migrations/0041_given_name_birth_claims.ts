import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Claims on the first names given to children, by year (TASK-137, ADR-0043),
 * derived from ADR-0042's lists (`given_name_birth_lists`,
 * `given_name_birth_counts`, 0040).
 *
 * - `claim_type` gains `GIVEN_NAME_BIRTH_COUNT` (the publisher's count on one
 *   list), `GIVEN_NAME_BIRTH_RANK` (the competition rank on that list) and
 *   `GIVEN_NAME_BIRTH_TREND` (rising, steady or falling, D-044 §6).
 * - Runs reuse `BASIC_GIVEN_NAME` (0038).
 * - All three are `SHARED` in scope, as the given-name entities and 0038's
 *   claims are: a statistic about a name as a word, never about a person.
 *
 * The new enum values are compared as text in the constraint: PostgreSQL
 * refuses to use a value added by `ALTER TYPE … ADD VALUE` in the transaction
 * that added it (see 0025, 0031, 0038).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'GIVEN_NAME_BIRTH_COUNT'`.execute(db);
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'GIVEN_NAME_BIRTH_RANK'`.execute(db);
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'GIVEN_NAME_BIRTH_TREND'`.execute(db);
  await sql`
    ALTER TABLE claims ADD CONSTRAINT claims_given_name_birth_scope
      CHECK (
        claim_type::text NOT IN (
          'GIVEN_NAME_BIRTH_COUNT', 'GIVEN_NAME_BIRTH_RANK', 'GIVEN_NAME_BIRTH_TREND'
        )
        OR scope = 'SHARED'
      )
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // PostgreSQL cannot remove a value from an enum (see 0005, 0009, 0011, 0014, 0025, 0031, 0038).
  await sql`ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_given_name_birth_scope`.execute(db);
}
