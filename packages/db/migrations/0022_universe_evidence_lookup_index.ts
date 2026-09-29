import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * An index for the lookup of a universe's evidence item (TASK-036).
 *
 * `deriveRarityContext` (and `deriveCurrentDistribution`) reuse the evidence
 * item that describes a universe: the earliest `AUTHORITATIVE_INDEX` item on the
 * source record with no subject. `deriveCurrentRank` writes one such item per
 * ranked surname, so on a national resource there are as many of them as
 * surnames ranked. The only index was on `source_record_id`, so every lookup
 * read all of them and sorted by `created_at`. The cost grew with each surname
 * derived: 0.28 s a lookup at 28,000 items, and quadratic over the register.
 *
 * Partial on `subject_entity_id IS NULL`, so it holds the universe-level items
 * only, and keyed in the order the lookup filters and sorts, so the earliest
 * item is the first entry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX evidence_items_universe_lookup_idx
      ON evidence_items (source_record_id, evidence_type, created_at)
      WHERE subject_entity_id IS NULL
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX evidence_items_universe_lookup_idx`.execute(db);
}
