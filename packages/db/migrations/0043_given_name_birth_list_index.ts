import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * An index to read one birth-name list's claims (TASK-146, D-047, ADR-0043 §1).
 *
 * Every `GIVEN_NAME_BIRTH_COUNT`, `_RANK` and `_TREND` claim key names its list
 * (`TYPE|{given_name_id}|{list_id}`, a trend's third part is its latest list),
 * and the list page reads all the claims of one list in one query. The keys
 * are not searchable by suffix: with `claims_active_claim_key_uq` alone the
 * planner filters every ACTIVE claim of every kind (`EXPLAIN`, TASK-146 §4).
 * This index is on the key's type and list parts, partial on the birth
 * claims, so that query reads only that list's claims.
 *
 * Partial on a text prefix, as 0021 and 0026 are: the claim types are enum
 * values added in 0041, and a predicate that names them cannot be created in
 * the transaction that adds them on a fresh database.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX claims_given_name_birth_list_idx
      ON claims ((split_part(claim_key, '|', 1)), (split_part(claim_key, '|', 3)))
      WHERE claim_key LIKE 'GIVEN_NAME_BIRTH_%' AND claim_status = 'ACTIVE'
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX claims_given_name_birth_list_idx`.execute(db);
}
