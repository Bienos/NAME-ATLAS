import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The free tree's cap (TASK-111, ADR-0037 §2.1): a tree whose owner has no
 * paid tier holds at most 5 people, so adding a person first counts the
 * tree's rows. The `persons_select` policy hides the living from an editor
 * whose `sees_living` is off, and a declined row from everyone but the owner,
 * so a count as the caller would be short. This function counts every row,
 * for a caller who may write the tree, and answers nothing else.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE FUNCTION family.tree_person_count(t uuid) RETURNS integer
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT CASE
          WHEN NOT family.can_write(t) THEN 0
          ELSE (SELECT count(*)::int FROM family.persons WHERE tree_id = t)
        END
      $$
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP FUNCTION IF EXISTS family.tree_person_count(uuid)`.execute(db);
}
