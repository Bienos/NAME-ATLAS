import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * A trigram index on the Polish-diacritic-folded surname key, for
 * suggest-as-you-type (`docs/contracts/surname-prefix.md`).
 *
 * People type `wisn` for WIŚNIEWSKI. The resolver's fold for that is
 * `polishDiacriticFold` (`docs/canonical/13` §6.1) — retrieval only, never
 * identity — and this is the same fold as SQL: the nine lower-case Polish
 * letters to their base letters. `canonical_key` is already case-folded, so
 * the upper-case letters never reach it. The integration suite asserts the two
 * folds agree letter for letter.
 *
 * `translate` with constant arguments over a `text` column is `IMMUTABLE`, as
 * an index expression must be. A `LIKE 'wisn%'` over the same expression can
 * use a `gin_trgm_ops` index, which is why this is GIN and not a btree: a btree
 * serves a prefix `LIKE` only under the `C` collation or `text_pattern_ops`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX surnames_fold_key_trgm
      ON surnames USING GIN ((translate(canonical_key, 'ąćęłńóśźż', 'acelnoszz')) gin_trgm_ops)
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX surnames_fold_key_trgm`.execute(db);
}
