import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * `CURRENT_DISTRIBUTION` (TASK-012).
 *
 * One enum value: `claim_type` gains `CURRENT_DISTRIBUTION`, the claim
 * `docs/canonical/11` §8 lists as "Surname | place/count/rate | FACT |
 * Approved regional dataset | VERIFIED". `evidence_dependency_role` already
 * carries every role this chain needs — `COUNT`, `DENOMINATOR` and
 * `UNIVERSE` were added by `0005` and `0009` — so nothing is added here.
 *
 * No table, column or constraint. TASK-011's `0010` built the `places`
 * backbone and the regional rows already live in `distribution_snapshots` /
 * `distribution_values` with a non-null `place_id`. This claim is derived
 * from those rows; per `ARCHITECTURE.md` §10 invariant 10, a derived value is
 * a claim, not a column, so there is nothing to store but the claim itself.
 *
 * Tested constraint, not assumed (D-011): PostgreSQL permits `ALTER TYPE …
 * ADD VALUE` inside a migration transaction, but *using* the new value in
 * the same transaction fails with "unsafe use of new value". No row carrying
 * the value is written here.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'CURRENT_DISTRIBUTION'`.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // PostgreSQL cannot remove a value from an enum (see 0005, 0009). The value
  // stays; once the claims carrying it are gone it is inert. Nothing to do.
  await sql`SELECT 1`.execute(db);
}
