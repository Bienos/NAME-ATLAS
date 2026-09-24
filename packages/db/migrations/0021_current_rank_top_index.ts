import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * An index for the home page's "most common surnames" (`mostCommonSurnames` in
 * `@name-atlas/truth`), which reads the active `CURRENT_RANK` claims with a
 * small rank.
 *
 * Without it that read scans every claim — 828,262 population claims alone on
 * the owner's database — on every home page view. Partial, so it holds only
 * active rank claims, and keyed on the rank exactly as the query writes it:
 * `(structured_value->>'rank')::int`. A text-to-integer cast is `IMMUTABLE`, as
 * an index expression must be.
 *
 * The predicate names rank claims by their **key prefix**, not by
 * `claim_type = 'CURRENT_RANK'`. That enum value is added by `0005` with
 * `ALTER TYPE … ADD VALUE`, and on a fresh database every migration runs in
 * one transaction, where PostgreSQL refuses a value added in the same
 * transaction ("unsafe use of new value"). Casting the enum to text does not
 * help: `enum_out` is `STABLE`, and an index predicate must be `IMMUTABLE`. The
 * key prefix is plain text, and `currentRankClaimKey` defines it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX claims_current_rank_value_idx
      ON claims (((structured_value->>'rank')::int))
      WHERE claim_key LIKE 'CURRENT_RANK|%' AND claim_status = 'ACTIVE'
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX claims_current_rank_value_idx`.execute(db);
}
