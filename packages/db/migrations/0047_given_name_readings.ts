import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Readings of two first names' meanings (TASK-156, ADR-0047 §2.4): the text
 * a model wrote, in Polish and in English, from the two names'
 * `GIVEN_NAME_MEANING` claims and nothing else.
 *
 * - One row per unordered pair of names, the two claims it read and the
 *   prompt version; `given_name_a_id <= given_name_b_id` as text, so `a,b`
 *   and `b,a` are one row. The same name twice is allowed.
 * - Not a claim: no confidence, no citation of its own. The page shows the
 *   claims beside it, and the row names the model and the prompt version.
 * - Immutable, as report versions are (0037): a trigger refuses `UPDATE` and
 *   `DELETE`. A superseded claim gives a new row; the old one stays.
 * - About two names as words (`SHARED`, ADR-0045 §2), never about a reader:
 *   no account id, in the public database with the claims it reads.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE given_name_readings (
      reading_id       uuid PRIMARY KEY,
      given_name_a_id  uuid NOT NULL REFERENCES given_names (given_name_id) ON DELETE RESTRICT,
      given_name_b_id  uuid NOT NULL REFERENCES given_names (given_name_id) ON DELETE RESTRICT,
      claim_a_id       uuid NOT NULL REFERENCES claims (claim_id) ON DELETE RESTRICT,
      claim_b_id       uuid NOT NULL REFERENCES claims (claim_id) ON DELETE RESTRICT,
      prompt_version   text NOT NULL,
      model            text NOT NULL,
      text_pl          text NOT NULL,
      text_en          text NOT NULL,
      created_at       timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT given_name_readings_pair_ordered CHECK (
        given_name_a_id::text <= given_name_b_id::text
      ),
      CONSTRAINT given_name_readings_text_present CHECK (
        length(text_pl) > 0 AND length(text_en) > 0
      ),
      CONSTRAINT given_name_readings_once UNIQUE (
        given_name_a_id, given_name_b_id, claim_a_id, claim_b_id, prompt_version
      )
    )
  `.execute(db);
  await sql`CREATE INDEX given_name_readings_created_idx ON given_name_readings (created_at)`.execute(
    db,
  );
  await sql`
    CREATE FUNCTION refuse_given_name_reading_change() RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION 'a reading is immutable: % on % refused', TG_OP, TG_TABLE_NAME
          USING ERRCODE = 'restrict_violation';
      END
      $$
  `.execute(db);
  await sql`
    CREATE TRIGGER given_name_readings_immutable
      BEFORE UPDATE OR DELETE ON given_name_readings
      FOR EACH ROW EXECUTE FUNCTION refuse_given_name_reading_change()
  `.execute(db);
}

/** Refuses while any reading is stored: a down migration must never delete a stored reading. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  const held = await sql<{
    n: string;
  }>`SELECT count(*)::text AS n FROM given_name_readings`.execute(db);
  if (Number(held.rows[0]?.n ?? "0") > 0) {
    throw new Error("refusing to undo 0047: readings are stored (TASK-156).");
  }
  await sql`DROP TABLE given_name_readings`.execute(db);
  await sql`DROP FUNCTION refuse_given_name_reading_change()`.execute(db);
}
