import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { escapeLike, outranksTypedSpelling, polishDiacriticFold } from "@name-atlas/resolver";

/**
 * The surname's other spelling (TASK-125): a surname whose canonical key has the
 * same Polish-diacritic fold and that is much more common, so that a reader on
 * WISNIEWSKI's page, who may have typed without diacritics, is shown WIŚNIEWSKI.
 *
 * Read from the active `CURRENT_RANK` claims, as the other grammatical form is
 * (`neighbours.ts`), and never computed on a page. "Much more common" is the
 * resolver's {@link outranksTypedSpelling}, the rule that orders suggest-as-you-
 * type, on each surname's largest count on one list; the two lists are never
 * added up. The fold is for retrieval, never identity (`docs/canonical/13`
 * §6.1): the two are separate register entries and nothing here relates the
 * people who bear them.
 *
 * The fold is matched over migration 0020's trigram index on the folded key.
 */

export const OTHER_SPELLING_RULE = "POLISH_DIACRITIC_FOLD";

export interface OtherSpelling {
  readonly surname_id: string;
  readonly display_name: string;
  readonly script: string;
  readonly comparability_group: string;
  readonly snapshot_date: string;
  readonly count: number;
}

/**
 * The most common surname sharing this one's folded key, on its largest list,
 * when it has at least `OTHER_SPELLING_RATIO` times this surname's largest count.
 * Null when there is none, or when this surname has no rank claim to compare.
 */
export async function readOtherSpelling(
  db: Kysely<DB>,
  surnameId: string,
  displayName: string,
): Promise<OtherSpelling | null> {
  const result = await sql<{
    surname_id: string;
    display_name: string;
    script: string;
    comparability_group: string;
    snapshot_date: string;
    count: number;
    own_count: number | null;
  }>`
    SELECT s.surname_id::text AS surname_id, s.canonical_display AS display_name,
           s.primary_script AS script,
           c.structured_value->'universe'->>'comparability_group' AS comparability_group,
           c.structured_value->>'snapshot_date' AS snapshot_date,
           (c.structured_value->>'count')::int AS count,
           (SELECT max((o.structured_value->>'count')::int)
              FROM claims o
             WHERE o.subject_entity_id = ${surnameId}::uuid
               AND o.claim_key LIKE 'CURRENT_RANK|%'
               AND o.claim_status = 'ACTIVE') AS own_count
      FROM surnames s
      JOIN claims c ON c.subject_entity_id = s.surname_id
     WHERE translate(s.canonical_key, 'ąćęłńóśźż', 'acelnoszz')
             LIKE ${escapeLike(polishDiacriticFold(displayName))} ESCAPE '\\'
       AND s.surname_id <> ${surnameId}::uuid
       AND s.entity_status = 'ACTIVE'
       AND s.merged_into_surname_id IS NULL
       AND s.script_confusable_flag = false
       AND c.claim_key LIKE 'CURRENT_RANK|%'
       AND c.claim_status = 'ACTIVE'
     ORDER BY (c.structured_value->>'count')::int DESC,
              c.structured_value->>'snapshot_date' DESC,
              s.canonical_key
     LIMIT 1
  `.execute(db);
  const row = result.rows[0];
  if (row === undefined || row.own_count === null) return null;
  const count = Number(row.count);
  if (!outranksTypedSpelling(count, Number(row.own_count))) return null;
  return {
    surname_id: row.surname_id,
    display_name: row.display_name,
    script: row.script,
    comparability_group: row.comparability_group,
    snapshot_date: row.snapshot_date,
    count,
  };
}
