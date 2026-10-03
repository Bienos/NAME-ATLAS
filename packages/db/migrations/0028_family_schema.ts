import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The family tree (TASK-066, ADR-0029): its own schema, read and written by the
 * accounts role only.
 *
 * Everything lives in schema `family`, beside `accounts` and never in `public`.
 * The register's read-only role is granted nothing here; the role that reads
 * and writes these tables is `nameatlas_app`, which holds no table of
 * `public`. The only foreign keys that leave the schema point at
 * `accounts.users`: a birthplace is a TERYT identifier string and the name as
 * typed, never a reference to `public.places`, so the register knows nothing
 * of a tree and a tree restores without it (ADR-0029 §2.1).
 *
 * - `trees`: one row per tree, owned by one account. `root_person_id` is the
 *   person the pedigree is read from ("Ty"); null until set.
 * - `persons`: what the reader wrote about one person. `living_status` holds
 *   the canonical rule in two constraints: a death year forces `DECEASED`, and
 *   nothing here infers death from an old date. `UNKNOWN` is treated as living
 *   wherever it matters, by the policies below.
 * - `parentage`: a child and a parent with a role. Relationships are rows, not
 *   father and mother columns, so a second marriage or an unknown parent needs
 *   no special case. The service keeps a child to two parents and refuses a
 *   cycle; the insert policy keeps both people in one tree.
 * - `members`: who else may open a tree, and whether they see the living.
 * - `audit_events`: the operations that change who sees what. Ids and kinds
 *   only, never a name; `person_id` has no foreign key so the event outlives
 *   the person.
 *
 * **Row-level security is the second lock** (ADR-0029 §2.3.9). The service sets
 * `app.user_id` with `set_config(…, true)` inside each transaction, which
 * PgBouncer's transaction mode keeps to that transaction. A query that names
 * the wrong tree then returns nothing. The helper functions are SECURITY
 * DEFINER so a policy on one table may look at another without the two
 * policies calling each other forever; they are owned by the build role, which
 * owns the tables and so is not subject to the policies. A living or unknown
 * person is hidden, by policy, from a member whose `sees_living` is off; the
 * count of hidden people is readable through `family.hidden_living_count`, the
 * people are not.
 *
 * Every tree-owned table cascades from the tree, and the tree from its owner's
 * account: deleting an account deletes its trees at once (ADR-0027 §2.10).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE SCHEMA IF NOT EXISTS family`.execute(db);
  await sql`CREATE TYPE family.living_status AS ENUM ('UNKNOWN', 'LIVING', 'DECEASED')`.execute(db);
  await sql`CREATE TYPE family.parent_role AS ENUM ('MOTHER', 'FATHER', 'PARENT')`.execute(db);
  await sql`CREATE TYPE family.member_role AS ENUM ('EDITOR', 'VIEWER')`.execute(db);
  await sql`
    CREATE TYPE family.audit_kind AS ENUM (
      'TREE_CREATED', 'TREE_DELETED',
      'PERSON_CREATED', 'PERSON_UPDATED', 'PERSON_DELETED', 'LIVING_STATUS_CHANGED',
      'PARENT_SET', 'PARENT_REMOVED',
      'MEMBER_ADDED', 'MEMBER_REMOVED', 'SEES_LIVING_CHANGED',
      'EXPORTED'
    )
  `.execute(db);

  await sql`
    CREATE TABLE family.trees (
      tree_id         uuid PRIMARY KEY,
      owner_user_id   uuid NOT NULL REFERENCES accounts.users (user_id) ON DELETE CASCADE,
      title           text NOT NULL,
      root_person_id  uuid,
      created_at      timestamptz NOT NULL,
      updated_at      timestamptz NOT NULL,
      CONSTRAINT trees_title_length CHECK (length(title) BETWEEN 1 AND 120)
    )
  `.execute(db);
  await sql`CREATE INDEX trees_owner_idx ON family.trees (owner_user_id)`.execute(db);

  await sql`
    CREATE TABLE family.persons (
      person_id          uuid PRIMARY KEY,
      tree_id            uuid NOT NULL REFERENCES family.trees (tree_id) ON DELETE CASCADE,
      given_names        text NOT NULL,
      surname            text NOT NULL,
      birth_surname      text,
      birth_year         integer,
      birth_year_approx  boolean NOT NULL DEFAULT false,
      birth_place_code   text,
      birth_place_text   text,
      death_year         integer,
      death_year_approx  boolean NOT NULL DEFAULT false,
      death_place_code   text,
      death_place_text   text,
      living_status      family.living_status NOT NULL DEFAULT 'UNKNOWN',
      source_note        text,
      notes              text,
      created_by         uuid REFERENCES accounts.users (user_id) ON DELETE SET NULL,
      created_at         timestamptz NOT NULL,
      updated_at         timestamptz NOT NULL,
      CONSTRAINT persons_given_names_length CHECK (length(given_names) BETWEEN 1 AND 120),
      CONSTRAINT persons_surname_length CHECK (length(surname) BETWEEN 1 AND 120),
      CONSTRAINT persons_birth_surname_length CHECK (birth_surname IS NULL OR length(birth_surname) BETWEEN 1 AND 120),
      CONSTRAINT persons_birth_year_range CHECK (birth_year IS NULL OR birth_year BETWEEN 1000 AND 2100),
      CONSTRAINT persons_death_year_range CHECK (death_year IS NULL OR death_year BETWEEN 1000 AND 2100),
      CONSTRAINT persons_death_after_birth CHECK (birth_year IS NULL OR death_year IS NULL OR death_year >= birth_year),
      -- A death year is a death: the status cannot say otherwise.
      CONSTRAINT persons_death_means_deceased CHECK (death_year IS NULL OR living_status = 'DECEASED'),
      -- A TERYT SIMC identifier: seven digits.
      CONSTRAINT persons_birth_place_code_shape CHECK (birth_place_code IS NULL OR birth_place_code ~ '^[0-9]{7}$'),
      CONSTRAINT persons_death_place_code_shape CHECK (death_place_code IS NULL OR death_place_code ~ '^[0-9]{7}$'),
      CONSTRAINT persons_place_text_length CHECK (
        (birth_place_text IS NULL OR length(birth_place_text) <= 120)
        AND (death_place_text IS NULL OR length(death_place_text) <= 120)
      ),
      CONSTRAINT persons_source_note_length CHECK (source_note IS NULL OR length(source_note) <= 500),
      CONSTRAINT persons_notes_length CHECK (notes IS NULL OR length(notes) <= 2000)
    )
  `.execute(db);
  await sql`CREATE INDEX persons_tree_idx ON family.persons (tree_id)`.execute(db);
  await sql`
    ALTER TABLE family.trees
      ADD CONSTRAINT trees_root_person_fk
      FOREIGN KEY (root_person_id) REFERENCES family.persons (person_id) ON DELETE SET NULL
  `.execute(db);

  await sql`
    CREATE TABLE family.parentage (
      child_id    uuid NOT NULL REFERENCES family.persons (person_id) ON DELETE CASCADE,
      parent_id   uuid NOT NULL REFERENCES family.persons (person_id) ON DELETE CASCADE,
      role        family.parent_role NOT NULL,
      created_at  timestamptz NOT NULL,
      PRIMARY KEY (child_id, parent_id),
      CONSTRAINT parentage_not_self CHECK (child_id <> parent_id)
    )
  `.execute(db);
  await sql`CREATE INDEX parentage_parent_idx ON family.parentage (parent_id)`.execute(db);

  await sql`
    CREATE TABLE family.members (
      tree_id      uuid NOT NULL REFERENCES family.trees (tree_id) ON DELETE CASCADE,
      user_id      uuid NOT NULL REFERENCES accounts.users (user_id) ON DELETE CASCADE,
      role         family.member_role NOT NULL,
      sees_living  boolean NOT NULL DEFAULT false,
      invited_by   uuid REFERENCES accounts.users (user_id) ON DELETE SET NULL,
      accepted_at  timestamptz NOT NULL,
      PRIMARY KEY (tree_id, user_id)
    )
  `.execute(db);
  await sql`CREATE INDEX members_user_idx ON family.members (user_id)`.execute(db);

  await sql`
    CREATE TABLE family.audit_events (
      event_id   uuid PRIMARY KEY,
      tree_id    uuid NOT NULL REFERENCES family.trees (tree_id) ON DELETE CASCADE,
      user_id    uuid REFERENCES accounts.users (user_id) ON DELETE SET NULL,
      kind       family.audit_kind NOT NULL,
      person_id  uuid,
      at         timestamptz NOT NULL
    )
  `.execute(db);
  await sql`CREATE INDEX audit_events_tree_idx ON family.audit_events (tree_id, at)`.execute(db);

  // --- Row-level security -------------------------------------------------
  await sql`
    CREATE FUNCTION family.current_user_id() RETURNS uuid
      LANGUAGE sql STABLE
      AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$
  `.execute(db);
  await sql`
    CREATE FUNCTION family.is_owner(t uuid) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM family.trees WHERE tree_id = t AND owner_user_id = family.current_user_id()
        )
      $$
  `.execute(db);
  await sql`
    CREATE FUNCTION family.can_read(t uuid) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT family.is_owner(t) OR EXISTS (
          SELECT 1 FROM family.members WHERE tree_id = t AND user_id = family.current_user_id()
        )
      $$
  `.execute(db);
  await sql`
    CREATE FUNCTION family.can_write(t uuid) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT family.is_owner(t) OR EXISTS (
          SELECT 1 FROM family.members
          WHERE tree_id = t AND user_id = family.current_user_id() AND role = 'EDITOR'
        )
      $$
  `.execute(db);
  await sql`
    CREATE FUNCTION family.sees_living(t uuid) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT family.is_owner(t) OR EXISTS (
          SELECT 1 FROM family.members
          WHERE tree_id = t AND user_id = family.current_user_id() AND sees_living
        )
      $$
  `.execute(db);
  await sql`
    CREATE FUNCTION family.tree_of(p uuid) RETURNS uuid
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$ SELECT tree_id FROM family.persons WHERE person_id = p $$
  `.execute(db);
  // Visible to the caller: readable tree, and either the person has died or the
  // caller may see the living (UNKNOWN counts as living: ADR-0029 §2.2.5).
  await sql`
    CREATE FUNCTION family.person_visible(p uuid) RETURNS boolean
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
  await sql`
    CREATE FUNCTION family.hidden_living_count(t uuid) RETURNS integer
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = family, pg_temp
      AS $$
        SELECT CASE
          WHEN NOT family.can_read(t) OR family.sees_living(t) THEN 0
          ELSE (SELECT count(*)::int FROM family.persons WHERE tree_id = t AND living_status <> 'DECEASED')
        END
      $$
  `.execute(db);

  await sql`ALTER TABLE family.trees ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`CREATE POLICY trees_select ON family.trees FOR SELECT USING (family.can_read(tree_id))`.execute(
    db,
  );
  await sql`CREATE POLICY trees_insert ON family.trees FOR INSERT WITH CHECK (owner_user_id = family.current_user_id())`.execute(
    db,
  );
  await sql`CREATE POLICY trees_update ON family.trees FOR UPDATE USING (family.is_owner(tree_id)) WITH CHECK (owner_user_id = family.current_user_id())`.execute(
    db,
  );
  await sql`CREATE POLICY trees_delete ON family.trees FOR DELETE USING (family.is_owner(tree_id))`.execute(
    db,
  );

  await sql`ALTER TABLE family.persons ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`
    CREATE POLICY persons_select ON family.persons FOR SELECT
      USING (family.can_read(tree_id) AND (living_status = 'DECEASED' OR family.sees_living(tree_id)))
  `.execute(db);
  await sql`CREATE POLICY persons_insert ON family.persons FOR INSERT WITH CHECK (family.can_write(tree_id))`.execute(
    db,
  );
  await sql`CREATE POLICY persons_update ON family.persons FOR UPDATE USING (family.can_write(tree_id)) WITH CHECK (family.can_write(tree_id))`.execute(
    db,
  );
  await sql`CREATE POLICY persons_delete ON family.persons FOR DELETE USING (family.can_write(tree_id))`.execute(
    db,
  );

  await sql`ALTER TABLE family.parentage ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`
    CREATE POLICY parentage_select ON family.parentage FOR SELECT
      USING (family.person_visible(child_id) AND family.person_visible(parent_id))
  `.execute(db);
  // Both people in one tree the caller may write: the policy keeps a parent
  // from another tree out, whatever the service does.
  await sql`
    CREATE POLICY parentage_insert ON family.parentage FOR INSERT
      WITH CHECK (
        family.can_write(family.tree_of(child_id))
        AND family.tree_of(parent_id) = family.tree_of(child_id)
      )
  `.execute(db);
  await sql`CREATE POLICY parentage_delete ON family.parentage FOR DELETE USING (family.can_write(family.tree_of(child_id)))`.execute(
    db,
  );

  await sql`ALTER TABLE family.members ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`
    CREATE POLICY members_select ON family.members FOR SELECT
      USING (user_id = family.current_user_id() OR family.is_owner(tree_id))
  `.execute(db);
  await sql`CREATE POLICY members_insert ON family.members FOR INSERT WITH CHECK (family.is_owner(tree_id))`.execute(
    db,
  );
  await sql`CREATE POLICY members_update ON family.members FOR UPDATE USING (family.is_owner(tree_id)) WITH CHECK (family.is_owner(tree_id))`.execute(
    db,
  );
  await sql`CREATE POLICY members_delete ON family.members FOR DELETE USING (family.is_owner(tree_id))`.execute(
    db,
  );

  // Audit rows are written by anyone who may read the tree and read by its
  // owner; there is no policy for UPDATE or DELETE, so the app role can do
  // neither. A tree's deletion still removes them, by the cascade, which runs
  // as the table's owner.
  await sql`ALTER TABLE family.audit_events ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`CREATE POLICY audit_select ON family.audit_events FOR SELECT USING (family.is_owner(tree_id))`.execute(
    db,
  );
  await sql`CREATE POLICY audit_insert ON family.audit_events FOR INSERT WITH CHECK (family.can_read(tree_id))`.execute(
    db,
  );
}

/**
 * A down migration must never delete a tree. With one stored it refuses and
 * changes nothing, as `0027` refuses while a user is stored; with none it
 * removes the schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  const trees = await sql<{ n: string }>`SELECT count(*)::text AS n FROM family.trees`.execute(db);
  if (Number(trees.rows[0]?.n ?? "0") > 0) {
    throw new Error(
      "refusing to drop schema family: it holds trees (ADR-0029). Delete them deliberately first.",
    );
  }
  await sql`DROP SCHEMA family CASCADE`.execute(db);
}
