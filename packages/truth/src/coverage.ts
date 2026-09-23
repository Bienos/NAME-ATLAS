/**
 * How much of the register the truth layer can actually say something about —
 * the evidence for deciding whether a premium report is worth building
 * (`PLAN.md` M4: "do enough real surnames carry enough deeper evidence").
 *
 * Counts **active claims**, per national resource, and weights them by the
 * people who carry the surname in that resource. It decides nothing: no
 * threshold for "enough" is set here, because that is the project owner's
 * business decision. It reports.
 *
 * One table per national resource (male, female) — the two are never summed
 * (TASK-004 §14 U-1). Regional distribution is looked up against the national
 * resource's registered regional counterpart (`nationalCounterpartOf`).
 * Historical evidence is not counted because none exists yet (M3).
 */
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import {
  PESEL_NATIONAL_RESOURCES_2026,
  PESEL_REGIONAL_RESOURCES_2026,
  nationalCounterpartOf,
} from "@name-atlas/sources";

export const COVERAGE_FAMILIES = [
  "population",
  "rank",
  "rarity",
  "distribution",
  "meaning",
  "all_statistics",
  "all_five",
] as const;
export type CoverageFamily = (typeof COVERAGE_FAMILIES)[number];

export interface CoverageCell {
  readonly surnames: number;
  readonly people: number;
}

export interface CoverageBand {
  /** A count band, or `"ALL"` for the resource as a whole. */
  readonly band: string;
  readonly surnames: number;
  readonly people: number;
  readonly families: Readonly<Record<CoverageFamily, CoverageCell>>;
}

export interface ResourceCoverage {
  readonly resource_id: string;
  readonly role: string;
  /** Null when this resource's regional counterpart is not imported. */
  readonly regional_resource_id: string | null;
  readonly bands: readonly CoverageBand[];
}

/** Count bands, largest first. A count is the publisher's own, ≥ 2 by the suppression rule. */
export const COVERAGE_BANDS = ["10000+", "1000-9999", "100-999", "2-99"] as const;

export async function coverageReport(db: Kysely<DB>): Promise<ResourceCoverage[]> {
  const records = await db
    .selectFrom("source_records")
    .select(["source_record_id", "external_record_id"])
    .where("record_status", "=", "ACTIVE")
    .execute();
  const idOf = new Map(records.map((r) => [r.external_record_id, r.source_record_id]));

  const out: ResourceCoverage[] = [];
  for (const national of PESEL_NATIONAL_RESOURCES_2026) {
    const nationalId = idOf.get(national.resource_id);
    if (nationalId === undefined) continue;
    const regional = PESEL_REGIONAL_RESOURCES_2026.find(
      (r) => nationalCounterpartOf(r)?.resource_id === national.resource_id,
    );
    const regionalId = regional === undefined ? undefined : idOf.get(regional.resource_id);

    const rows = await sql<Record<string, string | number | null>>`
      WITH per_surname AS (
        SELECT v.count,
          CASE WHEN v.count >= 10000 THEN '10000+'
               WHEN v.count >= 1000 THEN '1000-9999'
               WHEN v.count >= 100 THEN '100-999'
               ELSE '2-99' END AS band,
          pop.claim_id IS NOT NULL AS population,
          rk.claim_id IS NOT NULL AS rank,
          ra.claim_id IS NOT NULL AS rarity,
          di.claim_id IS NOT NULL AS distribution,
          me.claim_id IS NOT NULL AS meaning
        FROM distribution_snapshots ds
        JOIN distribution_values v
          ON v.distribution_snapshot_id = ds.distribution_snapshot_id AND v.place_id IS NULL
        LEFT JOIN claims pop ON pop.claim_status = 'ACTIVE'
          AND pop.claim_key = 'CURRENT_POPULATION|' || ds.surname_id || '|' || ds.distribution_snapshot_id
        LEFT JOIN claims rk ON rk.claim_status = 'ACTIVE'
          AND rk.claim_key = 'CURRENT_RANK|' || ds.surname_id || '|' || ds.source_record_id
        LEFT JOIN claims ra ON ra.claim_status = 'ACTIVE'
          AND ra.claim_key = 'RARITY_CONTEXT|' || ds.surname_id || '|' || ds.source_record_id
        LEFT JOIN claims di ON di.claim_status = 'ACTIVE'
          AND di.claim_key = 'CURRENT_DISTRIBUTION|' || ds.surname_id || '|' || ${regionalId ?? ""}
        LEFT JOIN claims me ON me.claim_status = 'ACTIVE'
          AND me.claim_key = 'SURNAME_MEANING|' || ds.surname_id
        WHERE ds.source_record_id = ${nationalId}::uuid AND ds.geography_level = 'NATIONAL'
      )
      SELECT COALESCE(band, 'ALL') AS band,
        count(*) AS surnames, sum(count) AS people,
        count(*) FILTER (WHERE population) AS population_s, sum(count) FILTER (WHERE population) AS population_p,
        count(*) FILTER (WHERE rank) AS rank_s, sum(count) FILTER (WHERE rank) AS rank_p,
        count(*) FILTER (WHERE rarity) AS rarity_s, sum(count) FILTER (WHERE rarity) AS rarity_p,
        count(*) FILTER (WHERE distribution) AS distribution_s, sum(count) FILTER (WHERE distribution) AS distribution_p,
        count(*) FILTER (WHERE meaning) AS meaning_s, sum(count) FILTER (WHERE meaning) AS meaning_p,
        count(*) FILTER (WHERE population AND rank AND rarity AND distribution) AS all_statistics_s,
        sum(count) FILTER (WHERE population AND rank AND rarity AND distribution) AS all_statistics_p,
        count(*) FILTER (WHERE population AND rank AND rarity AND distribution AND meaning) AS all_five_s,
        sum(count) FILTER (WHERE population AND rank AND rarity AND distribution AND meaning) AS all_five_p
      FROM per_surname
      GROUP BY ROLLUP (band)
    `.execute(db);

    const n = (v: string | number | null | undefined) => Number(v ?? 0);
    const bands = rows.rows
      .map((r) => ({
        band: String(r["band"]),
        surnames: n(r["surnames"]),
        people: n(r["people"]),
        families: Object.fromEntries(
          COVERAGE_FAMILIES.map((f) => [f, { surnames: n(r[`${f}_s`]), people: n(r[`${f}_p`]) }]),
        ) as Record<CoverageFamily, CoverageCell>,
      }))
      .sort(
        (a, b) =>
          (a.band === "ALL" ? 99 : COVERAGE_BANDS.indexOf(a.band as never)) -
          (b.band === "ALL" ? 99 : COVERAGE_BANDS.indexOf(b.band as never)),
      );
    out.push({
      resource_id: national.resource_id,
      role: national.role,
      regional_resource_id: regionalId === undefined ? null : (regional?.resource_id ?? null),
      bands,
    });
  }
  return out;
}

/** The report as Markdown: one table per resource, shares of surnames and of people. */
export function coverageMarkdown(report: readonly ResourceCoverage[]): string {
  const pct = (part: number, whole: number) =>
    whole === 0 ? "—" : `${((100 * part) / whole).toFixed(1)}%`;
  const lines: string[] = [];
  for (const r of report) {
    lines.push(`## ${r.role} (resource ${r.resource_id})`, "");
    if (r.regional_resource_id === null) {
      lines.push("_Regional counterpart not imported: distribution cannot be present._", "");
    }
    lines.push(
      "| Count band | Surnames | People | " +
        COVERAGE_FAMILIES.map((f) => `${f}: surnames / people`).join(" | ") +
        " |",
      "|---|---:|---:|" + COVERAGE_FAMILIES.map(() => "---:").join("|") + "|",
    );
    for (const b of r.bands) {
      lines.push(
        `| ${b.band} | ${b.surnames} | ${b.people} | ` +
          COVERAGE_FAMILIES.map(
            (f) =>
              `${pct(b.families[f].surnames, b.surnames)} / ${pct(b.families[f].people, b.people)}`,
          ).join(" | ") +
          " |",
      );
    }
    lines.push("");
  }
  lines.push(
    "`all_statistics` = population + rank + rarity + distribution. `all_five` adds a sourced meaning.",
    "Historical evidence is not counted: none exists yet (M3). No threshold for 'enough' is applied.",
  );
  return lines.join("\n");
}
