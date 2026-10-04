import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Deleting a claimant's account releases their claims (ADR-0029 §2.6.22).
 *
 * `0033` made `family.persons.claimed_by_user_id` reference `accounts.users`
 * with `ON DELETE SET NULL`, beside CHECK `persons_claim_pair` (the claimant
 * and `claimed_at` are both set or both null) and
 * `persons_hidden_only_when_claimed`. The foreign key's action nulls the
 * claimant alone, so the check rejects the row and the whole `DELETE FROM
 * accounts.users` fails: a person who had confirmed their card in someone
 * else's tree could not delete their account.
 *
 * A deleted account leaves every tree it had a card in, as `release_claim`
 * does for one: before the user row goes, each claimed row returns to the
 * owner's note (claimant, `claimed_at` and the hidden fields cleared), the
 * address the claim came from is suppressed in that tree, and the release is
 * an audit event. The event carries no user id, because that account no
 * longer exists. The function runs as the build role, which owns both
 * schemas' tables, as `release_claim` does; nobody may call it directly.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE FUNCTION family.release_claims_of_deleted_user() RETURNS trigger
      LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
      DECLARE
        released record;
        at timestamptz := now();
      BEGIN
        FOR released IN
          UPDATE family.persons x
            SET claimed_by_user_id = NULL, claimed_at = NULL, hidden_fields = '{}', updated_at = at
            WHERE x.claimed_by_user_id = OLD.user_id
            RETURNING x.person_id, x.tree_id
        LOOP
          INSERT INTO family.suppressions (tree_id, address_hash, created_at)
            SELECT i.tree_id, i.address_hash, at FROM family.invitations i
            WHERE i.person_id = released.person_id AND i.answer = 'ME'
            ORDER BY i.answered_at DESC LIMIT 1
            ON CONFLICT DO NOTHING;
          INSERT INTO family.audit_events (event_id, tree_id, user_id, kind, person_id, at)
            VALUES (gen_random_uuid(), released.tree_id, NULL, 'CLAIM_RELEASED', released.person_id, at);
        END LOOP;
        RETURN OLD;
      END
      $$
  `.execute(db);
  await sql`REVOKE ALL ON FUNCTION family.release_claims_of_deleted_user() FROM PUBLIC`.execute(db);
  await sql`
    CREATE TRIGGER users_release_claims
      BEFORE DELETE ON accounts.users
      FOR EACH ROW EXECUTE FUNCTION family.release_claims_of_deleted_user()
  `.execute(db);
}

/** Restores `0033`'s shape: a claimant's account cannot be deleted again. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TRIGGER users_release_claims ON accounts.users`.execute(db);
  await sql`DROP FUNCTION family.release_claims_of_deleted_user()`.execute(db);
}
