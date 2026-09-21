import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The scope constraint for `SURNAME_MEANING` (TASK-022).
 *
 * Mirrors `claims_current_population_is_surname_level` from `0004`: a meaning is
 * a statement about a surname, and `docs/canonical/11` §11's scope rule belongs
 * in the schema rather than only in the service.
 *
 * **Why the `::text` cast.** `0004` could write the enum literal directly
 * because `CREATE TYPE` and the constraint were in one transaction, which
 * PostgreSQL allows. `0014` adds `SURNAME_MEANING` with `ALTER TYPE … ADD
 * VALUE`, and PostgreSQL then refuses to *use* that value until the adding
 * transaction has committed — `check_safe_enum_use` raises "unsafe use of new
 * value". The migrator runs pending migrations in one transaction, so putting
 * this in a later file does not help. Comparing `claim_type::text` to a text
 * literal never mentions the enum value at all, so the constraint can be
 * created immediately and enforces exactly the same rule. Verified by running
 * the migration, not assumed (D-011).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE claims
      ADD CONSTRAINT claims_surname_meaning_is_surname_level
      CHECK (claim_type::text <> 'SURNAME_MEANING' OR scope = 'SURNAME_LEVEL')
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_surname_meaning_is_surname_level
  `.execute(db);
}
