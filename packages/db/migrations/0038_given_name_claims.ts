import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Given-name claims (TASK-121, ADR-0032 §6): how many people carry a first
 * name on one PESEL list, and its rank on that list.
 *
 * - `claim_type` gains `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK`.
 * - `research_run_type` gains `BASIC_GIVEN_NAME`: a given name is not a
 *   surname, so its runs are not `BASIC_SURNAME` ones (`docs/canonical/11`
 *   §22.1 lists "later FAMILY", so the type is meant to grow).
 * - Both claim types are `SHARED` in scope, as the given-name entities are
 *   (TASK-078): a statistic about a name as a word, never about a person,
 *   a family or a surname (ADR-0032 §1).
 *
 * The new enum values are compared as text in the constraint: PostgreSQL
 * refuses to use a value added by `ALTER TYPE … ADD VALUE` in the transaction
 * that added it (see 0025, 0031).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'GIVEN_NAME_POPULATION'`.execute(db);
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'GIVEN_NAME_RANK'`.execute(db);
  await sql`ALTER TYPE research_run_type ADD VALUE IF NOT EXISTS 'BASIC_GIVEN_NAME'`.execute(db);
  await sql`
    ALTER TABLE claims ADD CONSTRAINT claims_given_name_scope
      CHECK (
        claim_type::text NOT IN ('GIVEN_NAME_POPULATION', 'GIVEN_NAME_RANK')
        OR scope = 'SHARED'
      )
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // PostgreSQL cannot remove a value from an enum (see 0005, 0009, 0011, 0014, 0025, 0031).
  await sql`ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_given_name_scope`.execute(db);
}
