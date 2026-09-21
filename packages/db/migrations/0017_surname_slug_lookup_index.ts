import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * An index for slug lookup (TASK-024, ADR-0009).
 *
 * `docs/canonical/21` §23 maps URL-unsafe punctuation to `-`, which loses which
 * character it was: the register contains surnames like `A/GADIR`, whose slug is
 * `a-gadir` and whose `canonical_key` is `a/gadir`. No reading of that slug
 * produces the key, so resolving one needs a lookup on the single thing a slug
 * and a key always agree on — their alphanumeric characters.
 *
 * Without this index that lookup is a sequential scan: 94 ms over the register's
 * 598,476 rows, on every request that reaches it, on an unbounded and
 * crawler-reachable URL space. The first version guarded the scan with
 * heuristics instead; review on 2026-09-21 showed the guards were both unsound
 * (a leading `/` is stripped along with the hyphen it would have produced) and
 * incomplete (the comparison route never applied them). An index removes the
 * cost and the heuristics together.
 *
 * `IMMUTABLE` is required of an indexed expression, and this one is:
 * `regexp_replace` with a constant pattern over a `text` column depends on
 * nothing but its input. The character class is POSIX `[:alnum:]`, which in a
 * UTF-8 database keeps Polish letters — verified: `wójcik` indexes as `wójcik`,
 * `a/gadir` as `agadir`.
 *
 * This is **not** D-019's persisted slug. It accelerates a lookup; it stores no
 * slug, enforces no `(locale, slug)` uniqueness, and resolves no collision.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX surnames_alphanumeric_key_idx
      ON surnames ((regexp_replace(canonical_key, '[^[:alnum:]]+', '', 'g')))
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS surnames_alphanumeric_key_idx`.execute(db);
}
