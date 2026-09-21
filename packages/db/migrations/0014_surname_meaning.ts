import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * `SURNAME_MEANING` (TASK-022, ADR-0008).
 *
 * `docs/canonical/11` §8 lists it as "Surname | meaning/root | INTERPRETATION |
 * Scholarly onomastic evidence | LIKELY/POSSIBLE/CONFLICTING". Every enum it
 * needs already exists: `epistemic_type` carries `INTERPRETATION` (0004),
 * `evidence_type` carries `SCHOLARLY_SOURCE` (0004), and `confidence_status`
 * carries `LIKELY`, `POSSIBLE` and `CONFLICTING` (0004). So this migration adds
 * one enum value and one constraint.
 *
 * The constraint mirrors `claims_current_population_is_surname_level`: a meaning
 * is a statement about a surname, so the scope is fixed in the schema rather
 * than trusted to the service. A constraint is added rather than a table because
 * per `ARCHITECTURE.md` §10 invariant 10 a derived value is a claim, not a
 * column — the root form, language, gloss and formation type live in the claim's
 * `structured_value`, and `MeaningInterpretation` (`docs/canonical/11` §7.2) is
 * deliberately not built while nothing queries by root (TASK-022 §3).
 *
 * Tested constraint, not assumed (D-011): PostgreSQL permits `ALTER TYPE … ADD
 * VALUE` inside a migration transaction but not *using* the new value in the
 * same transaction. The CHECK below only names the value in an expression that
 * is not evaluated against any row at creation time, because the table is
 * empty of `SURNAME_MEANING` rows by construction — the value did not exist a
 * statement ago.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'SURNAME_MEANING'`.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // PostgreSQL cannot remove a value from an enum (see 0005, 0009, 0011).
  await sql`SELECT 1`.execute(db);
}
