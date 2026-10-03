import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Two safeguards for the family tree (ADR-0029), found by the review of #76 on
 * 2026-10-03 and first written into that branch's copy of the family schema.
 * `main` took the schema as 0028 (#67) first, so they follow it here.
 *
 * - A child has at most one mother and one father. Any number of `PARENT`
 *   rows stay within the service's limit of two parents in all.
 * - An editor's change also moves the tree's `updated_at`. The `trees_update`
 *   policy lets only the owner update a tree, so this function, and not a
 *   wider policy, sets that one column for anyone who may write the tree.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE UNIQUE INDEX parentage_one_mother_or_father
      ON family.parentage (child_id, role)
      WHERE role IN ('MOTHER', 'FATHER')
  `.execute(db);
  await sql`
    CREATE FUNCTION family.touch_tree(t uuid, at timestamptz) RETURNS void
      LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        UPDATE family.trees SET updated_at = at WHERE tree_id = t AND family.can_write(t)
      $$
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP FUNCTION IF EXISTS family.touch_tree(uuid, timestamptz)`.execute(db);
  await sql`DROP INDEX IF EXISTS family.parentage_one_mother_or_father`.execute(db);
}
