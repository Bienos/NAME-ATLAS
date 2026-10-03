import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * `NOTABLE_BEARERS` (TASK-073, ADR-0030): the people Wikidata names with the
 * surname, as a claim.
 *
 * `docs/canonical/11` §11 has no type for it; ADR-0030 §2.3 adds one on the
 * pattern of `ARCHIVE_AVAILABILITY`: a `FACT` about what a source's query
 * returned, `VERIFIED` within the queried scope, surname-level only. The other
 * enums it needs already exist (0004). So this migration adds one enum value
 * and one constraint, as 0025 did.
 *
 * Numbered 0029 because 0028 was the family tree's (#67, #76, #77, #79), which
 * was not on `main` yet (`AGENTS.md` §11). The family tree merged after this, as
 * 0030, so that no database is asked to apply a migration older than one it has.
 *
 * The constraint compares `claim_type::text`, not the enum literal: PostgreSQL
 * refuses to use a value added by `ALTER TYPE … ADD VALUE` in the transaction
 * that added it (see 0015's note).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'NOTABLE_BEARERS'`.execute(db);
  await sql`
    ALTER TABLE claims
      ADD CONSTRAINT claims_notable_bearers_is_surname_level
      CHECK (claim_type::text <> 'NOTABLE_BEARERS' OR scope = 'SURNAME_LEVEL')
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // PostgreSQL cannot remove a value from an enum (see 0005, 0009, 0011, 0014).
  await sql`
    ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_notable_bearers_is_surname_level
  `.execute(db);
}
