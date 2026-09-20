import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * `RARITY_CONTEXT` (TASK-014, resolving TASK-004 §14 U-6).
 *
 * Two enum values, staged the way `0005` staged `CURRENT_RANK` and the
 * dependency roles:
 *
 * - `claim_type` gains `RARITY_CONTEXT` — the derived one-in-X claim over a
 *   complete resource version (docs/canonical/11 §8, docs/canonical/14 §30).
 * - `evidence_dependency_role` gains `DENOMINATOR` — the role `0005`'s header
 *   named as the obvious next one. A rarity figure has three inputs, and the
 *   lineage records which is which: the count, the denominator, the universe.
 *
 * Tested constraint, not assumed (D-011): PostgreSQL permits `ALTER TYPE …
 * ADD VALUE` inside a migration transaction, but *using* the new value in
 * the same transaction fails with "unsafe use of new value". No row carrying
 * either value is written here.
 *
 * The denominator itself is not stored on any snapshot: `universe_size`
 * stays null (docs/canonical/11 §6.1 — stored "only if methodologically
 * valid", and the register's living-person total is unknown). What U-6
 * decided is the *published universe* — the sum of the published counts of
 * one resource — which is derived, versioned and carried as evidence.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'RARITY_CONTEXT'`.execute(db);
  await sql`ALTER TYPE evidence_dependency_role ADD VALUE IF NOT EXISTS 'DENOMINATOR'`.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // PostgreSQL cannot remove a value from an enum (see 0005). Both values
  // stay; once the claims and dependencies that carry them are gone, they
  // are inert. Nothing to do.
  await sql`SELECT 1`.execute(db);
}
