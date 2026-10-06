import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * First-name meaning claims (TASK-147, ADR-0045, D-046): the origin and
 * meaning a public-domain work states for a first name.
 *
 * - `claim_type` gains `GIVEN_NAME_MEANING`, an `INTERPRETATION` claim like
 *   `SURNAME_MEANING` (ADR-0008).
 * - Runs reuse `BASIC_GIVEN_NAME` (0038).
 * - It is `SHARED` in scope, as 0038's and 0041's claims are: a statement
 *   about a name as a word, never about a person.
 *
 * The new enum value is compared as text in the constraint: PostgreSQL
 * refuses to use a value added by `ALTER TYPE … ADD VALUE` in the transaction
 * that added it (see 0025, 0031, 0038, 0041).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'GIVEN_NAME_MEANING'`.execute(db);
  await sql`
    ALTER TABLE claims ADD CONSTRAINT claims_given_name_meaning_scope
      CHECK (claim_type::text <> 'GIVEN_NAME_MEANING' OR scope = 'SHARED')
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // PostgreSQL cannot remove a value from an enum (see 0005, 0009, 0011, 0014, 0025, 0031, 0038, 0041).
  await sql`ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_given_name_meaning_scope`.execute(
    db,
  );
}
