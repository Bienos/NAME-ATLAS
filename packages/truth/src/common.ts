/**
 * The most common surnames, **as `CURRENT_RANK` claims say** — for the home page.
 *
 * Reads claims and nothing else: no count is ordered here and no rank computed,
 * so the list is exactly as true as the rank chain that derived it
 * (`ARCHITECTURE.md` §10: presentation renders validated claims). A universe
 * with no derived rank claims yields no list, which the page renders as no
 * section — never as a list computed some other way.
 *
 * One list per rank universe (per `comparability_group`): the male and female
 * resources are separate and are never merged into one ranking
 * (TASK-004 §14 U-1).
 */
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";

export interface CommonSurname {
  readonly surname_id: string;
  readonly display_name: string;
  readonly rank: number;
}

export interface CommonSurnameList {
  readonly comparability_group: string;
  readonly snapshot_date: string | null;
  readonly items: readonly CommonSurname[];
}

/** Rank claims at or above `limit` (ties can make a list longer than `limit`). */
export async function mostCommonSurnames(
  db: Kysely<DB>,
  options: { readonly limit?: number } = {},
): Promise<CommonSurnameList[]> {
  const limit = Math.min(Math.max(1, options.limit ?? 10), 50);
  const rows = await sql<{
    surname_id: string;
    display_name: string;
    rank: number;
    comparability_group: string | null;
    snapshot_date: string | null;
  }>`
    SELECT s.surname_id,
           s.canonical_display AS display_name,
           (c.structured_value->>'rank')::int AS rank,
           c.structured_value->'universe'->>'comparability_group' AS comparability_group,
           c.structured_value->>'snapshot_date' AS snapshot_date
    FROM claims c
    JOIN surnames s ON s.surname_id = c.subject_entity_id
    WHERE c.claim_key LIKE 'CURRENT_RANK|%'   -- matches the partial index (migration 0021)
      AND c.claim_type = 'CURRENT_RANK'
      AND c.claim_status = 'ACTIVE'
      AND (c.structured_value->>'rank')::int <= ${limit}
    ORDER BY comparability_group, rank, s.canonical_key
  `.execute(db);

  const lists = new Map<string, { snapshot_date: string | null; items: CommonSurname[] }>();
  for (const r of rows.rows) {
    if (r.comparability_group === null) continue;
    const list = lists.get(r.comparability_group) ?? { snapshot_date: r.snapshot_date, items: [] };
    list.items.push({
      surname_id: r.surname_id,
      display_name: r.display_name,
      rank: Number(r.rank),
    });
    lists.set(r.comparability_group, list);
  }
  return [...lists].map(([comparability_group, l]) => ({ comparability_group, ...l }));
}
