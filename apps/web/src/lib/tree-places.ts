import type { DB } from "@name-atlas/db";
import { canonicalKey } from "@name-atlas/resolver";
import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The birthplace field's lookup in the TERYT register (TASK-073; ADR-0029
 * §2.1.2: a birthplace is a SIMC code, resolved through the read-only pool
 * with no user id in the query).
 *
 * What the reader typed is normalised with the same `canonicalKey` the TERYT
 * import wrote `place_names.normalized_name` with (TASK-039), so a match is a
 * prefix match on that key. A locality's district (powiat) and voivodeship
 * come from `administrative_memberships` up the TERC chain, so two places of
 * one name can be told apart. The register knows nothing about who asked.
 */

export interface PlaceMatch {
  /** The seven-digit SIMC code. */
  readonly code: string;
  readonly name: string;
  readonly district: string | null;
  readonly region: string | null;
}

export const PLACE_QUERY_MIN = 2;
export const PLACE_MATCHES_MAX = 8;

const SIMC_PROVIDER = "TERYT_SIMC";
const LOCALITY_TYPES = ["CITY", "VILLAGE", "OTHER"] as const;

function likePrefix(key: string): string {
  return `${key.replace(/[\\%_]/gu, (c) => `\\${c}`)}%`;
}

export async function searchPlaces(
  db: Kysely<DB>,
  typed: string,
  limit = PLACE_MATCHES_MAX,
): Promise<readonly PlaceMatch[]> {
  const key = canonicalKey(typed);
  if (key.length < PLACE_QUERY_MIN) return [];
  const rows = await db
    .selectFrom("place_names as n")
    .innerJoin("places as p", "p.place_id", "n.place_id")
    .innerJoin("entity_external_ids as x", "x.entity_id", "p.place_id")
    .select(["p.place_id", "p.current_display_name as name", "x.external_id as code"])
    .distinct()
    .where("x.provider_key", "=", SIMC_PROVIDER)
    .where("p.place_type", "in", [...LOCALITY_TYPES])
    .where("p.entity_status", "=", "ACTIVE")
    .where("n.normalized_name", "like", likePrefix(key))
    .orderBy("p.current_display_name")
    .orderBy("x.external_id")
    .limit(limit)
    .execute();
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.place_id);
  const above = await sql<{ start: string; place_type: string; name: string }>`
    WITH RECURSIVE up AS (
      SELECT m.child_place_id AS start, m.parent_place_id AS place_id, 1 AS depth
        FROM administrative_memberships m
       WHERE m.child_place_id = ANY(${ids}::uuid[]) AND m.membership_type = 'ADMINISTRATIVE'
      UNION ALL
      SELECT up.start, m.parent_place_id, up.depth + 1
        FROM up JOIN administrative_memberships m ON m.child_place_id = up.place_id
       WHERE up.depth < 4 AND m.membership_type = 'ADMINISTRATIVE'
    )
    SELECT up.start, p.place_type::text AS place_type, p.current_display_name AS name
      FROM up JOIN places p ON p.place_id = up.place_id
     WHERE p.place_type IN ('COUNTY_DISTRICT', 'REGION')
  `.execute(db);
  const district = new Map<string, string>();
  const region = new Map<string, string>();
  for (const row of above.rows) {
    (row.place_type === "REGION" ? region : district).set(row.start, row.name);
  }
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    district: district.get(r.place_id) ?? null,
    region: region.get(r.place_id) ?? null,
  }));
}
