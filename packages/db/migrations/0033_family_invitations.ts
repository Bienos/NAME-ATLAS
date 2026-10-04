import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Invitations and claims (TASK-094, ADR-0029 §2.6.20–23).
 *
 * A living person in a tree starts as the owner's note. The owner may send
 * that person one mail, naming the owner and nothing of the person; the
 * person signs in, sees their own row and nothing else, and answers. "To ja"
 * claims the row; the other two answers end contact.
 *
 * - `persons` gain `claimed_by_user_id` and `claimed_at` (one account per
 *   row, one row per tree per account), `contact_declined` (the row is the
 *   owner's alone from then on; D-031) and `hidden_fields` (what the claimant
 *   keeps from everyone else: the birth year, the birthplace, the birth
 *   surname; the others see that a field is hidden, never what it holds).
 * - `invitations`: one row per mail, keyed by the SHA-256 of its token as
 *   `accounts.email_tokens` are, with the SHA-256 of the address so the answer
 *   can suppress it, and the answer once given. The address itself is not
 *   stored (§2.6.20). One pending invitation per person.
 * - `suppressions`: the address hashes a tree may not invite again.
 *
 * **Who may read what, by policy.** A claimant reads and updates their own
 * row, and reads the names of its parents; the holder of a pending
 * invitation, carried in the transaction as `app.invitation` (the token's
 * hash), reads the same. Neither can read the tree, its other people or its
 * members: `trees_select` is unchanged, and nothing here widens it. An owner
 * or editor can no longer update a row someone else has claimed (the
 * relationships are rows of `parentage`, which they still write). A declined
 * row is read by the owner alone.
 *
 * **Two SECURITY DEFINER functions are the only way a claim changes.**
 * `answer_invitation` spends the token and claims, declines or suppresses;
 * `release_claim` lets the claimant leave. They run as the build role, which
 * owns the tables, so the app role needs no UPDATE policy on `invitations`
 * and no way to set `claimed_by_user_id` by hand.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE family.persons
      ADD COLUMN claimed_by_user_id uuid REFERENCES accounts.users (user_id) ON DELETE SET NULL,
      ADD COLUMN claimed_at timestamptz,
      ADD COLUMN contact_declined boolean NOT NULL DEFAULT false,
      ADD COLUMN hidden_fields text[] NOT NULL DEFAULT '{}',
      ADD CONSTRAINT persons_claim_pair CHECK ((claimed_by_user_id IS NULL) = (claimed_at IS NULL)),
      ADD CONSTRAINT persons_hidden_fields_known
        CHECK (hidden_fields <@ ARRAY['birth_year', 'birth_place', 'birth_surname']::text[]),
      ADD CONSTRAINT persons_hidden_only_when_claimed
        CHECK (claimed_by_user_id IS NOT NULL OR hidden_fields = '{}')
  `.execute(db);
  await sql`
    CREATE UNIQUE INDEX persons_one_claim_per_tree
      ON family.persons (tree_id, claimed_by_user_id)
      WHERE claimed_by_user_id IS NOT NULL
  `.execute(db);

  await sql`CREATE TYPE family.invitation_answer AS ENUM ('ME', 'NOT_ME', 'NO_CONTACT')`.execute(
    db,
  );
  await sql`ALTER TYPE family.audit_kind ADD VALUE IF NOT EXISTS 'INVITATION_SENT'`.execute(db);
  await sql`ALTER TYPE family.audit_kind ADD VALUE IF NOT EXISTS 'PERSON_CLAIMED'`.execute(db);
  await sql`ALTER TYPE family.audit_kind ADD VALUE IF NOT EXISTS 'CLAIM_RELEASED'`.execute(db);
  await sql`ALTER TYPE family.audit_kind ADD VALUE IF NOT EXISTS 'CONTACT_DECLINED'`.execute(db);

  await sql`
    CREATE TABLE family.invitations (
      invitation_id  uuid PRIMARY KEY,
      tree_id        uuid NOT NULL REFERENCES family.trees (tree_id) ON DELETE CASCADE,
      person_id      uuid NOT NULL REFERENCES family.persons (person_id) ON DELETE CASCADE,
      token_hash     text NOT NULL UNIQUE,
      address_hash   text NOT NULL,
      sent_by        uuid REFERENCES accounts.users (user_id) ON DELETE SET NULL,
      sent_at        timestamptz NOT NULL,
      expires_at     timestamptz NOT NULL,
      answered_at    timestamptz,
      answer         family.invitation_answer,
      answered_by    uuid REFERENCES accounts.users (user_id) ON DELETE SET NULL,
      CONSTRAINT invitations_answer_pair CHECK ((answered_at IS NULL) = (answer IS NULL)),
      CONSTRAINT invitations_hash_shape CHECK (token_hash ~ '^[0-9a-f]{64}$' AND address_hash ~ '^[0-9a-f]{64}$')
    )
  `.execute(db);
  await sql`CREATE INDEX invitations_tree_sent_idx ON family.invitations (tree_id, sent_at)`.execute(
    db,
  );
  await sql`CREATE INDEX invitations_person_idx ON family.invitations (person_id, sent_at)`.execute(
    db,
  );
  await sql`
    CREATE UNIQUE INDEX invitations_one_pending_per_person
      ON family.invitations (person_id)
      WHERE answered_at IS NULL
  `.execute(db);

  await sql`
    CREATE TABLE family.suppressions (
      tree_id       uuid NOT NULL REFERENCES family.trees (tree_id) ON DELETE CASCADE,
      address_hash  text NOT NULL,
      created_at    timestamptz NOT NULL,
      PRIMARY KEY (tree_id, address_hash)
    )
  `.execute(db);

  // --- Who the transaction is: a claimant, or the holder of a pending invitation ---
  await sql`
    CREATE FUNCTION family.current_invitation_person() RETURNS uuid
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT person_id FROM family.invitations
        WHERE token_hash = NULLIF(current_setting('app.invitation', true), '')
          AND answered_at IS NULL AND expires_at > now()
      $$
  `.execute(db);
  // The row is the caller's own: claimed by them, or the one their pending invitation names.
  await sql`
    CREATE FUNCTION family.own_person(p uuid) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM family.persons
          WHERE person_id = p
            AND (claimed_by_user_id = family.current_user_id() OR person_id = family.current_invitation_person())
        )
      $$
  `.execute(db);
  // The caller's own row, or a parent of it (its names are the caller's to see: §2.6.21).
  await sql`
    CREATE FUNCTION family.own_card_visible(p uuid) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT family.own_person(p) OR EXISTS (
          SELECT 1 FROM family.parentage WHERE parent_id = p AND family.own_person(child_id)
        )
      $$
  `.execute(db);
  await sql`
    CREATE FUNCTION family.is_claimant(t uuid) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM family.persons WHERE tree_id = t AND claimed_by_user_id = family.current_user_id()
        )
      $$
  `.execute(db);

  // A declined row is the owner's alone, in the parentage policy too (it reads `person_visible`).
  await sql`
    CREATE OR REPLACE FUNCTION family.person_visible(p uuid) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM family.persons
          WHERE person_id = p
            AND family.can_read(tree_id)
            AND (living_status = 'DECEASED' OR family.sees_living(tree_id))
            AND (NOT contact_declined OR family.is_owner(tree_id))
        )
      $$
  `.execute(db);

  // --- Policies ---
  await sql`DROP POLICY persons_select ON family.persons`.execute(db);
  await sql`
    CREATE POLICY persons_select ON family.persons FOR SELECT
      USING (
        (
          family.can_read(tree_id)
          AND (living_status = 'DECEASED' OR family.sees_living(tree_id))
          AND (NOT contact_declined OR family.is_owner(tree_id))
        )
        OR family.own_card_visible(person_id)
      )
  `.execute(db);
  await sql`DROP POLICY persons_update ON family.persons`.execute(db);
  await sql`
    CREATE POLICY persons_update ON family.persons FOR UPDATE
      USING (
        (family.can_write(tree_id) AND claimed_by_user_id IS NULL)
        OR claimed_by_user_id = family.current_user_id()
      )
      WITH CHECK (
        (family.can_write(tree_id) AND claimed_by_user_id IS NULL)
        OR claimed_by_user_id = family.current_user_id()
      )
  `.execute(db);
  await sql`DROP POLICY parentage_select ON family.parentage`.execute(db);
  await sql`
    CREATE POLICY parentage_select ON family.parentage FOR SELECT
      USING (
        (family.person_visible(child_id) AND family.person_visible(parent_id))
        OR family.own_person(child_id)
      )
  `.execute(db);
  await sql`DROP POLICY audit_insert ON family.audit_events`.execute(db);
  await sql`
    CREATE POLICY audit_insert ON family.audit_events FOR INSERT
      WITH CHECK (family.can_read(tree_id) OR family.is_claimant(tree_id))
  `.execute(db);

  await sql`ALTER TABLE family.invitations ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`
    CREATE POLICY invitations_select ON family.invitations FOR SELECT
      USING (
        family.is_owner(tree_id)
        OR token_hash = NULLIF(current_setting('app.invitation', true), '')
      )
  `.execute(db);
  await sql`CREATE POLICY invitations_insert ON family.invitations FOR INSERT WITH CHECK (family.is_owner(tree_id))`.execute(
    db,
  );
  // An unsent mail takes its row back; an answered invitation is a record and stays.
  await sql`
    CREATE POLICY invitations_delete ON family.invitations FOR DELETE
      USING (family.is_owner(tree_id) AND answered_at IS NULL)
  `.execute(db);

  await sql`ALTER TABLE family.suppressions ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`CREATE POLICY suppressions_select ON family.suppressions FOR SELECT USING (family.is_owner(tree_id))`.execute(
    db,
  );

  // --- The answer, and leaving ---
  await sql`
    CREATE FUNCTION family.answer_invitation(h text, a family.invitation_answer, at timestamptz)
      RETURNS TABLE (outcome text, tree_id uuid, person_id uuid)
      LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
      DECLARE
        inv family.invitations%ROWTYPE;
        me uuid := family.current_user_id();
        claimed_by uuid;
      BEGIN
        IF me IS NULL THEN RETURN QUERY SELECT 'NOT_FOUND'::text, NULL::uuid, NULL::uuid; RETURN; END IF;
        SELECT * INTO inv FROM family.invitations i WHERE i.token_hash = h FOR UPDATE;
        IF NOT FOUND THEN RETURN QUERY SELECT 'NOT_FOUND'::text, NULL::uuid, NULL::uuid; RETURN; END IF;
        IF inv.answered_at IS NOT NULL THEN RETURN QUERY SELECT 'ANSWERED'::text, NULL::uuid, NULL::uuid; RETURN; END IF;
        IF inv.expires_at <= at THEN RETURN QUERY SELECT 'EXPIRED'::text, NULL::uuid, NULL::uuid; RETURN; END IF;
        IF a = 'ME' THEN
          SELECT p.claimed_by_user_id INTO claimed_by FROM family.persons p WHERE p.person_id = inv.person_id FOR UPDATE;
          IF claimed_by IS NOT NULL AND claimed_by <> me THEN
            RETURN QUERY SELECT 'ALREADY_CLAIMED'::text, NULL::uuid, NULL::uuid; RETURN;
          END IF;
          IF EXISTS (
            SELECT 1 FROM family.persons p
            WHERE p.tree_id = inv.tree_id AND p.claimed_by_user_id = me AND p.person_id <> inv.person_id
          ) THEN
            RETURN QUERY SELECT 'ALREADY_IN_TREE'::text, NULL::uuid, NULL::uuid; RETURN;
          END IF;
          UPDATE family.persons p
            SET claimed_by_user_id = me, claimed_at = at, living_status = 'LIVING', updated_at = at
            WHERE p.person_id = inv.person_id;
          INSERT INTO family.audit_events (event_id, tree_id, user_id, kind, person_id, at)
            VALUES (gen_random_uuid(), inv.tree_id, me, 'PERSON_CLAIMED', inv.person_id, at);
        ELSE
          INSERT INTO family.suppressions (tree_id, address_hash, created_at)
            VALUES (inv.tree_id, inv.address_hash, at)
            ON CONFLICT DO NOTHING;
          IF a = 'NO_CONTACT' THEN
            UPDATE family.persons p SET contact_declined = true, updated_at = at WHERE p.person_id = inv.person_id;
            INSERT INTO family.audit_events (event_id, tree_id, user_id, kind, person_id, at)
              VALUES (gen_random_uuid(), inv.tree_id, me, 'CONTACT_DECLINED', inv.person_id, at);
          END IF;
        END IF;
        UPDATE family.invitations i
          SET answered_at = at, answer = a, answered_by = me
          WHERE i.invitation_id = inv.invitation_id;
        RETURN QUERY SELECT 'OK'::text, inv.tree_id, inv.person_id;
      END
      $$
  `.execute(db);
  await sql`
    CREATE FUNCTION family.release_claim(p uuid, at timestamptz) RETURNS boolean
      LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
      DECLARE
        me uuid := family.current_user_id();
        t uuid;
      BEGIN
        IF me IS NULL THEN RETURN false; END IF;
        UPDATE family.persons x
          SET claimed_by_user_id = NULL, claimed_at = NULL, hidden_fields = '{}', updated_at = at
          WHERE x.person_id = p AND x.claimed_by_user_id = me
          RETURNING x.tree_id INTO t;
        IF NOT FOUND THEN RETURN false; END IF;
        INSERT INTO family.suppressions (tree_id, address_hash, created_at)
          SELECT i.tree_id, i.address_hash, at FROM family.invitations i
          WHERE i.person_id = p AND i.answer = 'ME'
          ORDER BY i.answered_at DESC LIMIT 1
          ON CONFLICT DO NOTHING;
        INSERT INTO family.audit_events (event_id, tree_id, user_id, kind, person_id, at)
          VALUES (gen_random_uuid(), t, me, 'CLAIM_RELEASED', p, at);
        RETURN true;
      END
      $$
  `.execute(db);
}

/**
 * Restores 0030's shape. A claim is the claimant's own act and the down
 * refuses while one is stored, as 0028 refuses while a tree is; the enum
 * values stay, as PostgreSQL cannot remove them.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  const claims = await sql<{ n: string }>`
    SELECT count(*)::text AS n FROM family.persons WHERE claimed_by_user_id IS NOT NULL
  `.execute(db);
  if (Number(claims.rows[0]?.n ?? "0") > 0) {
    throw new Error(
      "refusing to drop the claims: people have confirmed their rows (ADR-0029 §2.6).",
    );
  }
  await sql`DROP FUNCTION family.release_claim(uuid, timestamptz)`.execute(db);
  await sql`DROP FUNCTION family.answer_invitation(text, family.invitation_answer, timestamptz)`.execute(
    db,
  );
  await sql`DROP TABLE family.suppressions`.execute(db);
  await sql`DROP TABLE family.invitations`.execute(db);
  await sql`DROP POLICY audit_insert ON family.audit_events`.execute(db);
  await sql`CREATE POLICY audit_insert ON family.audit_events FOR INSERT WITH CHECK (family.can_read(tree_id))`.execute(
    db,
  );
  await sql`DROP POLICY parentage_select ON family.parentage`.execute(db);
  await sql`
    CREATE POLICY parentage_select ON family.parentage FOR SELECT
      USING (family.person_visible(child_id) AND family.person_visible(parent_id))
  `.execute(db);
  await sql`DROP POLICY persons_update ON family.persons`.execute(db);
  await sql`CREATE POLICY persons_update ON family.persons FOR UPDATE USING (family.can_write(tree_id)) WITH CHECK (family.can_write(tree_id))`.execute(
    db,
  );
  await sql`DROP POLICY persons_select ON family.persons`.execute(db);
  await sql`
    CREATE POLICY persons_select ON family.persons FOR SELECT
      USING (family.can_read(tree_id) AND (living_status = 'DECEASED' OR family.sees_living(tree_id)))
  `.execute(db);
  await sql`
    CREATE OR REPLACE FUNCTION family.person_visible(p uuid) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM family.persons
          WHERE person_id = p
            AND family.can_read(tree_id)
            AND (living_status = 'DECEASED' OR family.sees_living(tree_id))
        )
      $$
  `.execute(db);
  await sql`DROP FUNCTION family.is_claimant(uuid)`.execute(db);
  await sql`DROP FUNCTION family.own_card_visible(uuid)`.execute(db);
  await sql`DROP FUNCTION family.own_person(uuid)`.execute(db);
  await sql`DROP FUNCTION family.current_invitation_person()`.execute(db);
  await sql`DROP TYPE family.invitation_answer`.execute(db);
  await sql`DROP INDEX family.persons_one_claim_per_tree`.execute(db);
  await sql`
    ALTER TABLE family.persons
      DROP COLUMN hidden_fields,
      DROP COLUMN contact_declined,
      DROP COLUMN claimed_at,
      DROP COLUMN claimed_by_user_id
  `.execute(db);
}
