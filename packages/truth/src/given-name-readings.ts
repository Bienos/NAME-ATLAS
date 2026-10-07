import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";

/**
 * Readings of two first names' meanings (TASK-156, ADR-0047 §2.4): the text a
 * model wrote from the two names' `GIVEN_NAME_MEANING` claims, stored once per
 * unordered pair of names, the two claims read and the prompt version
 * (migration 0047, `given_name_readings`).
 *
 * This module stores and finds; it writes nothing itself and judges nothing.
 * The web app builds the prompt, calls the model, checks the text and decides
 * whether to store it. A row is immutable: the table refuses `UPDATE` and
 * `DELETE`. A superseded claim gives the pair a new row; the old one stays.
 */

export interface ReadingSide {
  readonly given_name_id: string;
  readonly claim_id: string;
}

/** The pair as the table orders it: `a` first by its id as text, each claim with its name. */
export interface ReadingKey {
  readonly a: ReadingSide;
  readonly b: ReadingSide;
  readonly prompt_version: string;
}

export interface StoredReading {
  readonly reading_id: string;
  readonly given_name_a_id: string;
  readonly given_name_b_id: string;
  readonly claim_a_id: string;
  readonly claim_b_id: string;
  readonly prompt_version: string;
  readonly model: string;
  readonly text_pl: string;
  readonly text_en: string;
  /** ISO 8601, UTC. */
  readonly created_at: string;
}

/**
 * The key of a pair, whichever way round it was asked for: `a` is the name
 * whose id sorts first as text, with its claim; the same name twice is one
 * pair of itself.
 */
export function readingKey(
  first: ReadingSide,
  second: ReadingSide,
  promptVersion: string,
): ReadingKey {
  const [a, b] = first.given_name_id <= second.given_name_id ? [first, second] : [second, first];
  return { a, b, prompt_version: promptVersion };
}

function storedOf(row: {
  reading_id: string;
  given_name_a_id: string;
  given_name_b_id: string;
  claim_a_id: string;
  claim_b_id: string;
  prompt_version: string;
  model: string;
  text_pl: string;
  text_en: string;
  created_at: Date;
}): StoredReading {
  return {
    reading_id: row.reading_id,
    given_name_a_id: row.given_name_a_id,
    given_name_b_id: row.given_name_b_id,
    claim_a_id: row.claim_a_id,
    claim_b_id: row.claim_b_id,
    prompt_version: row.prompt_version,
    model: row.model,
    text_pl: row.text_pl,
    text_en: row.text_en,
    created_at: row.created_at.toISOString(),
  };
}

/** The stored reading of the pair under these claims and this prompt version, or null. */
export async function findReading(db: Kysely<DB>, key: ReadingKey): Promise<StoredReading | null> {
  const row = await db
    .selectFrom("given_name_readings")
    .selectAll()
    .where("given_name_a_id", "=", key.a.given_name_id)
    .where("given_name_b_id", "=", key.b.given_name_id)
    .where("claim_a_id", "=", key.a.claim_id)
    .where("claim_b_id", "=", key.b.claim_id)
    .where("prompt_version", "=", key.prompt_version)
    .executeTakeFirst();
  return row === undefined ? null : storedOf(row);
}

/**
 * Stores the reading once: a second store of the same key keeps the first
 * row and returns it (`ON CONFLICT DO NOTHING`, then a read), so two readers
 * asking at once pay for two model calls at most and keep one text.
 */
export async function storeReading(
  db: Kysely<DB>,
  key: ReadingKey,
  reading: {
    readonly reading_id: string;
    readonly model: string;
    readonly text_pl: string;
    readonly text_en: string;
  },
): Promise<StoredReading> {
  const inserted = await db
    .insertInto("given_name_readings")
    .values({
      reading_id: reading.reading_id,
      given_name_a_id: key.a.given_name_id,
      given_name_b_id: key.b.given_name_id,
      claim_a_id: key.a.claim_id,
      claim_b_id: key.b.claim_id,
      prompt_version: key.prompt_version,
      model: reading.model,
      text_pl: reading.text_pl,
      text_en: reading.text_en,
    })
    .onConflict((oc) =>
      oc
        .columns([
          "given_name_a_id",
          "given_name_b_id",
          "claim_a_id",
          "claim_b_id",
          "prompt_version",
        ])
        .doNothing(),
    )
    .returningAll()
    .executeTakeFirst();
  if (inserted !== undefined) return storedOf(inserted);
  const existing = await findReading(db, key);
  if (existing === null) throw new Error("reading neither stored nor found");
  return existing;
}

/** How many readings were stored at or after `since`: the day's count behind the cost cap. */
export async function countReadingsSince(db: Kysely<DB>, since: Date): Promise<number> {
  const row = await db
    .selectFrom("given_name_readings")
    .select((eb) => eb.fn.countAll<string>().as("n"))
    .where("created_at", ">=", since)
    .executeTakeFirst();
  return Number(row?.n ?? "0");
}
