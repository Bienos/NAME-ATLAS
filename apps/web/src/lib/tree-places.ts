import type { DB } from "@name-atlas/db";
import { canonicalKey } from "@name-atlas/resolver";
import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The birthplace field's lookup in the TERYT register (TASK-076; ADR-0029
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

/** A locality of the register with the district and the voivodeship above it (TASK-092). */
export interface PlaceRegion {
  /** The seven-digit SIMC code. */
  readonly code: string;
  readonly name: string;
  readonly district: string | null;
  /** The voivodeship, with its two-digit TERC code as `voivodeship-geometry.ts` keys the map; null when the chain does not reach one. */
  readonly region: { readonly code: string; readonly name: string } | null;
}

const TERC_PROVIDER = "TERYT";

/**
 * The localities behind a tree's `place_codes`, each with its district and
 * voivodeship, for the Mapa view (TASK-092). A code the register does not
 * know is left out; the register knows nothing about who asked.
 */
export async function placeRegions(
  db: Kysely<DB>,
  codes: readonly string[],
): Promise<readonly PlaceRegion[]> {
  const wanted = [...new Set(codes.filter((code) => /^[0-9]{7}$/u.test(code)))];
  if (wanted.length === 0) return [];
  const rows = await sql<{
    code: string;
    name: string;
    place_type: string | null;
    above: string | null;
    terc: string | null;
  }>`
    WITH RECURSIVE loc AS (
      SELECT p.place_id, x.external_id AS code, p.current_display_name AS name
        FROM places p
        JOIN entity_external_ids x ON x.entity_id = p.place_id
       WHERE x.provider_key = ${SIMC_PROVIDER} AND x.external_id = ANY(${wanted}::text[])
         AND p.entity_status = 'ACTIVE'
    ), up AS (
      SELECT m.child_place_id AS start, m.parent_place_id AS place_id, 1 AS depth
        FROM administrative_memberships m
       WHERE m.child_place_id IN (SELECT place_id FROM loc) AND m.membership_type = 'ADMINISTRATIVE'
      UNION ALL
      SELECT up.start, m.parent_place_id, up.depth + 1
        FROM up JOIN administrative_memberships m ON m.child_place_id = up.place_id
       WHERE up.depth < 4 AND m.membership_type = 'ADMINISTRATIVE'
    )
    SELECT loc.code, loc.name, a.place_type::text AS place_type, a.current_display_name AS above, rx.external_id AS terc
      FROM loc
      LEFT JOIN up ON up.start = loc.place_id
      LEFT JOIN places a ON a.place_id = up.place_id AND a.place_type IN ('COUNTY_DISTRICT', 'REGION')
      LEFT JOIN entity_external_ids rx ON rx.entity_id = a.place_id AND rx.provider_key = ${TERC_PROVIDER}
     ORDER BY loc.code
  `.execute(db);
  const byCode = new Map<
    string,
    { name: string; district: string | null; region: PlaceRegion["region"] }
  >();
  for (const row of rows.rows) {
    const entry = byCode.get(row.code) ?? { name: row.name, district: null, region: null };
    if (row.place_type === "COUNTY_DISTRICT" && row.above !== null) entry.district = row.above;
    if (
      row.place_type === "REGION" &&
      row.above !== null &&
      row.terc !== null &&
      /^[0-9]{2}$/u.test(row.terc)
    ) {
      entry.region = { code: row.terc, name: row.above };
    }
    byCode.set(row.code, entry);
  }
  return [...byCode.entries()].map(([code, entry]) => ({ code, ...entry }));
}
