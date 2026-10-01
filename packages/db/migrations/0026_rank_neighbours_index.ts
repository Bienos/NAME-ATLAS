import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * An index for the surname's neighbours on its list (`readRankNeighbours` in
 * `@name-atlas/truth`, TASK-055): the two active rank claims just above and
 * just below a rank, on one list.
 *
 * `0021`'s index is keyed on the rank alone, and the two lists share rank
 * values. Near the foot of a list tens of thousands of surnames share a place
 * (106,813 men's surnames at two people on the 2026 list), so a scan from a
 * rare surname's rank walked past the other list's whole tie group before it
 * found a neighbour: 290–660 ms on the full register, against 2 ms for a common
 * surname. Keyed on the list first, then the rank, then the surname, the scan
 * starts in the right list and stops after two rows, and the surname id makes
 * the choice among tied surnames fixed.
 *
 * Partial on the same predicate as `0021`, for the same reason: the key prefix
 * is plain text, where `claim_type = 'CURRENT_RANK'` would name an enum value
 * added in this same transaction on a fresh database.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX claims_current_rank_list_idx
      ON claims (
        ((structured_value->'universe'->>'comparability_group')),
        ((structured_value->>'rank')::int),
        subject_entity_id
      )
      WHERE claim_key LIKE 'CURRENT_RANK|%' AND claim_status = 'ACTIVE'
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX claims_current_rank_list_idx`.execute(db);
}
