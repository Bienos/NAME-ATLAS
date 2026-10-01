import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { canonicalKey } from "@name-atlas/resolver";

/**
 * Two facts the deck of cards shows beside a surname (TASK-055, ADR-0025),
 * read from the active `CURRENT_RANK` claims and never computed on a page:
 *
 * - its **neighbours** on each list: up to two surnames ranked above it and two
 *   below, with their counts;
 * - its **other grammatical form**: KOWALSKI and KOWALSKA, by the fixed
 *   -ski/-cki/-dzki rule of ADR-0025 §2.5, with that form's rank and count on
 *   the other list. It is a form, and says nothing about kinship.
 *
 * Both read only rank claims, which carry `rank`, `count`,
 * `universe.comparability_group` and `snapshot_date`. Migration 0026's index,
 * keyed on the list, the rank and the surname, serves the neighbours.
 */

/** How many places above and below the surname a list shows. */
export const NEIGHBOUR_SPAN = 2;

export interface RankNeighbour {
  readonly surname_id: string;
  readonly display_name: string;
  readonly script: string;
  readonly rank: number;
  readonly count: number;
  readonly is_self: boolean;
}

export interface RankNeighbourList {
  readonly comparability_group: string;
  readonly snapshot_date: string;
  readonly entries: readonly RankNeighbour[];
}

interface NeighbourRow {
  comparability_group: string;
  snapshot_date: string;
  surname_id: string;
  display_name: string;
  script: string;
  rank: number;
  count: number;
  is_self: boolean;
}

/**
 * Per list the surname is ranked on: the surname itself, up to
 * {@link NEIGHBOUR_SPAN} surnames ranked strictly above and up to as many
 * strictly below, nearest first. A tie at the surname's own rank is not listed:
 * ties share a place, and the page says so. Where more surnames share a
 * neighbouring place than fit, which of them are listed is fixed by the surname
 * id, not ranked; they are shown in canonical-key order. Near the foot of a list
 * a place is shared by tens of thousands of surnames, so any other choice would
 * sort them all on every request.
 */
export async function readRankNeighbours(
  db: Kysely<DB>,
  surnameId: string,
): Promise<RankNeighbourList[]> {
  const rows = await sql<NeighbourRow>`
    WITH own AS (
      SELECT (c.structured_value->>'rank')::int AS rank,
             c.structured_value->'universe'->>'comparability_group' AS grp,
             c.structured_value->>'snapshot_date' AS snapshot_date
        FROM claims c
       WHERE c.subject_entity_id = ${surnameId}::uuid
         AND c.claim_key LIKE 'CURRENT_RANK|%'
         AND c.claim_status = 'ACTIVE'
    ),
    near AS (
      SELECT o.grp, o.snapshot_date, x.surname_id, x.rank, x.count, x.is_self
        FROM own o
        CROSS JOIN LATERAL (
          (SELECT c.subject_entity_id AS surname_id,
                  (c.structured_value->>'rank')::int AS rank,
                  (c.structured_value->>'count')::int AS count,
                  false AS is_self
             FROM claims c
            WHERE c.claim_key LIKE 'CURRENT_RANK|%'   -- the partial index (0026)
              AND c.claim_status = 'ACTIVE'
              AND c.structured_value->'universe'->>'comparability_group' = o.grp
              AND (c.structured_value->>'rank')::int < o.rank
            ORDER BY (c.structured_value->>'rank')::int DESC, c.subject_entity_id DESC
            LIMIT ${NEIGHBOUR_SPAN})
          UNION ALL
          (SELECT c.subject_entity_id, (c.structured_value->>'rank')::int,
                  (c.structured_value->>'count')::int, true
             FROM claims c
            WHERE c.subject_entity_id = ${surnameId}::uuid
              AND c.claim_key LIKE 'CURRENT_RANK|%'
              AND c.claim_status = 'ACTIVE'
              AND c.structured_value->'universe'->>'comparability_group' = o.grp)
          UNION ALL
          (SELECT c.subject_entity_id, (c.structured_value->>'rank')::int,
                  (c.structured_value->>'count')::int, false
             FROM claims c
            WHERE c.claim_key LIKE 'CURRENT_RANK|%'
              AND c.claim_status = 'ACTIVE'
              AND c.structured_value->'universe'->>'comparability_group' = o.grp
              AND (c.structured_value->>'rank')::int > o.rank
            ORDER BY (c.structured_value->>'rank')::int, c.subject_entity_id
            LIMIT ${NEIGHBOUR_SPAN})
        ) x
    )
    SELECT n.grp AS comparability_group, n.snapshot_date,
           n.surname_id::text AS surname_id, s.canonical_display AS display_name,
           s.primary_script AS script, n.rank, n.count, n.is_self
      FROM near n
      JOIN surnames s ON s.surname_id = n.surname_id
     ORDER BY n.grp, n.rank, s.canonical_key
  `.execute(db);

  const lists = new Map<string, { snapshot_date: string; entries: RankNeighbour[] }>();
  for (const r of rows.rows) {
    const list = lists.get(r.comparability_group) ?? {
      snapshot_date: r.snapshot_date,
      entries: [],
    };
    list.entries.push({
      surname_id: r.surname_id,
      display_name: r.display_name,
      script: r.script,
      rank: Number(r.rank),
      count: Number(r.count),
      is_self: r.is_self,
    });
    lists.set(r.comparability_group, list);
  }
  return [...lists].map(([comparability_group, l]) => ({ comparability_group, ...l }));
}

/** ADR-0025 §2.5: the only endings paired, longest first so -dzki is not read as -ki. */
const FORM_PAIRS: readonly (readonly [string, string])[] = [
  ["DZKI", "DZKA"],
  ["CKI", "CKA"],
  ["SKI", "SKA"],
];

export const OTHER_FORM_RULE = "ADJECTIVAL_SKI_CKI_DZKI";

/** The other grammatical form of a display name, or null when its ending is not paired. */
export function otherGrammaticalForm(
  displayName: string,
): { readonly form: string; readonly list: "male" | "female" } | null {
  const upper = displayName.toUpperCase();
  for (const [masculine, feminine] of FORM_PAIRS) {
    if (upper.endsWith(masculine) && upper.length > masculine.length) {
      return { form: upper.slice(0, -masculine.length) + feminine, list: "female" };
    }
    if (upper.endsWith(feminine) && upper.length > feminine.length) {
      return { form: upper.slice(0, -feminine.length) + masculine, list: "male" };
    }
  }
  return null;
}

export interface OtherForm {
  readonly surname_id: string;
  readonly display_name: string;
  readonly script: string;
  readonly comparability_group: string;
  readonly snapshot_date: string;
  readonly rank: number;
  readonly count: number;
}

/**
 * The surname's other grammatical form, when the rule pairs its ending, the
 * form is in the register, and that form is ranked on the other list (the
 * women's list for a -ski form, the men's for a -ska form). Null otherwise.
 */
export async function readOtherForm(
  db: Kysely<DB>,
  displayName: string,
): Promise<OtherForm | null> {
  const other = otherGrammaticalForm(displayName);
  if (other === null) return null;
  const result = await sql<{
    surname_id: string;
    display_name: string;
    script: string;
    comparability_group: string;
    snapshot_date: string;
    rank: number;
    count: number;
  }>`
    SELECT s.surname_id::text AS surname_id, s.canonical_display AS display_name,
           s.primary_script AS script,
           c.structured_value->'universe'->>'comparability_group' AS comparability_group,
           c.structured_value->>'snapshot_date' AS snapshot_date,
           (c.structured_value->>'rank')::int AS rank,
           (c.structured_value->>'count')::int AS count
      FROM surnames s
      JOIN claims c ON c.subject_entity_id = s.surname_id
     WHERE s.canonical_key = ${canonicalKey(other.form)}
       AND c.claim_key LIKE 'CURRENT_RANK|%'
       AND c.claim_status = 'ACTIVE'
       AND c.structured_value->'universe'->>'comparability_group' LIKE ${`%\\_${other.list}`}
     ORDER BY c.structured_value->>'snapshot_date' DESC
     LIMIT 1
  `.execute(db);
  const row = result.rows[0];
  return row === undefined ? null : { ...row, rank: Number(row.rank), count: Number(row.count) };
}
