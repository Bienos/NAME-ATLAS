import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The trigram index fuzzy candidate retrieval reads (TASK-015, per ADR-0006).
 *
 * One index, no table and no column: fuzzy candidates are a resolver value
 * object, never a row (`docs/canonical/13` §18.2 at P0).
 *
 * **GIN, not the GiST `docs/canonical/13` §23.1 names as its P0 candidate.**
 * ADR-0006 records the measurement that decided it, on the real 598,476-surname
 * table and the query this feature actually issues:
 *
 * | Index | Size | Build | Top-25 latency |
 * |---|---:|---:|---:|
 * | GiST, `ORDER BY key <-> input` | 43 MB | 6.4 s | 160 ms |
 * | GIN, `WHERE key % input` at 0.4 | 18 MB | 1.9 s | 4.9 ms |
 *
 * GiST's `<->` returns nearest neighbours with no threshold. That is the thing
 * TASK-015 §2.5 does not want: for a four-character input the nearest
 * neighbours are an alphabet walk of real surnames, and returning nothing is
 * the correct answer. A threshold is wanted, so the index that serves
 * thresholds is the right one.
 *
 * `pg_trgm` was enabled by `0001`. The index is on `canonical_key`, the
 * resolver's own search representation, because `pg_trgm` ignores non-word
 * characters when extracting trigrams and §23.2 therefore forbids delegating
 * surname token semantics to it.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX surnames_canonical_key_trgm
      ON surnames USING GIN (canonical_key gin_trgm_ops)
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX surnames_canonical_key_trgm`.execute(db);
}
