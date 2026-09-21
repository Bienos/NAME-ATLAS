import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  importPeselRegionalResource,
  importPeselResource,
  PESEL_NATIONAL_MALE_2026,
  PESEL_REGIONAL_FEMALE_2026,
  PESEL_REGIONAL_MALE_2026,
  seedVoivodeshipPlaces,
  sha256Hex,
  TERYT_PROVIDER_KEY,
} from "@name-atlas/sources";
import { deriveCurrentPopulation } from "@name-atlas/truth";

/**
 * TASK-011 — the voivodeship `Place` foundation and regional ingestion
 * against a real PostgreSQL.
 *
 * GENUINE DATA: the regional fixtures are verbatim excerpts of the official
 * resources `1148786`/`1148790` (40 and 38 rows, all 16 voivodeships); the
 * TERC codes come from `fixtures/teryt/voivodeship-terc-correspondence.json`.
 * Because the fixtures are excerpts they carry their own checksums, which is
 * why `expectedSha256` is computed rather than taken from the descriptor.
 *
 * Every count below is a count of **permanent registered residence**, never a
 * location, an origin or a share of anything (D-004, binding). This suite
 * asserts storage only: no claim, no share, no rank exists here.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readFixture = (name: string): Uint8Array =>
  readFileSync(path.join(repoRoot, "fixtures/pesel", name));
const readMetadata = (name: string): unknown =>
  JSON.parse(
    readFileSync(path.join(repoRoot, "docs/sources/acquisition/2026-09-18/metadata", name), "utf8"),
  );

const REGIONAL_MALE = readFixture("regional-male-2026-01-20.csv");
const REGIONAL_FEMALE = readFixture("regional-female-2026-01-20.csv");
const NATIONAL_MALE = readFixture("national-male-2026-01-20.csv");
const REGIONAL_MALE_PAYLOAD = readMetadata(
  "pesel_regional_2026_male_1148786.official_resource.json",
);
const REGIONAL_FEMALE_PAYLOAD = readMetadata(
  "pesel_regional_2026_female_1148790.official_resource.json",
);
const NATIONAL_MALE_PAYLOAD = readMetadata(
  "pesel_national_2026_male_1148808.official_resource.json",
);

describe("regional ingestion and the voivodeship Place foundation (TASK-011)", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  async function countOf(table: string): Promise<number> {
    const r = await sql<{ n: string }>`SELECT count(*)::text AS n FROM ${sql.table(table)}`.execute(
      db(),
    );
    return Number(r.rows[0]?.n ?? "0");
  }

  async function importRegionalMale() {
    return importPeselRegionalResource(db(), {
      resource: PESEL_REGIONAL_MALE_2026,
      bytes: REGIONAL_MALE,
      expectedSha256: sha256Hex(REGIONAL_MALE),
      rawPayload: REGIONAL_MALE_PAYLOAD,
    });
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  beforeEach(async () => {
    for (const table of [
      "evidence_dependencies",
      "citations",
      "confidence_assessments",
      "claim_evidence",
      "claims",
      "evidence_items",
      "research_runs",
      "distribution_values",
      "distribution_snapshots",
      "source_records",
      "sources",
      "rights_profiles",
      "entity_external_ids",
      "place_names",
      "places",
      "name_forms",
      "surnames",
      "knowledge_entities",
    ]) {
      await sql`DELETE FROM ${sql.table(table)}`.execute(db());
    }
  });

  it("AC-2: seeds exactly 16 voivodeship places, each with its TERYT id and no centroid", async () => {
    const report = await seedVoivodeshipPlaces(db());
    expect(report.placesCreated).toBe(16);
    expect(report.placesReused).toBe(0);
    expect(report.placeIdByTercCode.size).toBe(16);

    const places = await sql<{
      place_type: string;
      spatial_precision: string;
      entity_status: string;
      current_country_code: string | null;
      has_centroid: boolean;
    }>`
      SELECT place_type::text, spatial_precision::text, entity_status::text,
             current_country_code, centroid IS NOT NULL AS has_centroid
      FROM places
    `.execute(db());
    expect(places.rows).toHaveLength(16);
    for (const row of places.rows) {
      expect(row.place_type).toBe("REGION");
      // §5.1: a region gets no precise point on no evidence, and TERC has none.
      expect(row.spatial_precision).toBe("REGION");
      expect(row.has_centroid).toBe(false);
      expect(row.entity_status).toBe("ACTIVE");
      expect(row.current_country_code).toBe("PL");
    }

    const ids = await sql<{ external_id: string; provider_key: string; valid_from: string | null }>`
      SELECT external_id, provider_key, valid_from::text FROM entity_external_ids ORDER BY external_id
    `.execute(db());
    expect(ids.rows.map((r) => r.external_id)).toEqual([
      "02",
      "04",
      "06",
      "08",
      "10",
      "12",
      "14",
      "16",
      "18",
      "20",
      "22",
      "24",
      "26",
      "28",
      "30",
      "32",
    ]);
    for (const row of ids.rows) {
      expect(row.provider_key).toBe(TERYT_PROVIDER_KEY);
      // The register's own reference date: what the identification is as of.
      expect(row.valid_from).toBe("2026-01-01");
    }

    const names = await sql<{ name: string; name_type: string; language_code: string | null }>`
      SELECT name, name_type::text, language_code FROM place_names ORDER BY name
    `.execute(db());
    expect(names.rows).toHaveLength(16);
    for (const row of names.rows) {
      expect(row.name_type).toBe("OFFICIAL");
      expect(row.language_code).toBe("pl");
      expect(row.name).toBe(row.name.toUpperCase());
    }
  });

  it("seeding is idempotent: a second run creates nothing and re-identifies nothing", async () => {
    const first = await seedVoivodeshipPlaces(db());
    const second = await seedVoivodeshipPlaces(db());
    expect(second.placesCreated).toBe(0);
    expect(second.placesReused).toBe(16);
    expect(await countOf("places")).toBe(16);
    expect([...second.placeIdByTercCode.entries()].sort()).toEqual(
      [...first.placeIdByTercCode.entries()].sort(),
    );
  });

  it("the database refuses a second place claiming the same TERYT code", async () => {
    await seedVoivodeshipPlaces(db());
    await expect(
      sql`
        INSERT INTO entity_external_ids (entity_external_id, entity_id, provider_key, external_id)
        SELECT gen_random_uuid(), place_id, ${TERYT_PROVIDER_KEY}, '14' FROM places LIMIT 1
      `.execute(db()),
    ).rejects.toThrow(/entity_external_ids_provider_id_unique/u);
  });

  it("the database refuses a precise point on a region (canonical §5.1)", async () => {
    await seedVoivodeshipPlaces(db());
    await expect(
      sql`
        UPDATE places SET centroid = ST_SetSRID(ST_MakePoint(21.0, 52.2), 4326)::geography
        WHERE current_display_name = 'MAZOWIECKIE'
      `.execute(db()),
    ).rejects.toThrow(/places_region_has_no_precise_point/u);
  });

  it("AC-4: imports the regional fixture as REGION snapshots whose every value has a place", async () => {
    const outcome = await importRegionalMale();
    expect(outcome.kind).toBe("IMPORTED");
    if (outcome.kind !== "IMPORTED") return;

    const report = outcome.report;
    expect(report.rowsRead).toBe(40);
    expect(report.rowsImported).toBe(40);
    expect(report.rowsQuarantined).toBe(0);
    expect(report.valuesWritten).toBe(40);
    expect(report.placesReferenced).toBe(16);
    // One snapshot per surname, not per row: a snapshot is surname-scoped.
    expect(report.snapshotsWritten).toBeLessThan(report.valuesWritten);
    expect(report.snapshotsWritten).toBe(report.surnamesCreated + report.surnamesReused);

    const levels = await sql<{ geography_level: string; n: string }>`
      SELECT geography_level::text, count(*)::text AS n FROM distribution_snapshots GROUP BY 1
    `.execute(db());
    expect(levels.rows).toEqual([
      { geography_level: "REGION", n: String(report.snapshotsWritten) },
    ]);

    const values = await sql<{
      total: string;
      with_place: string;
      with_key: string;
      derived: string;
    }>`
      SELECT count(*)::text AS total,
             count(place_id)::text AS with_place,
             count(source_geography_key)::text AS with_key,
             count(rank) + count(surname_share) + count(population_denominator)
               + count(population_rate) + count(derivation_version) AS derived
      FROM distribution_values
    `.execute(db());
    expect(values.rows[0]?.total).toBe("40");
    expect(values.rows[0]?.with_place).toBe("40");
    expect(values.rows[0]?.with_key).toBe("40");
    // This task stores; it derives nothing (invariant 10).
    expect(Number(values.rows[0]?.derived)).toBe(0);
  });

  it("stores the publisher's geography string beside the resolved place, so the mapping is auditable", async () => {
    await importRegionalMale();
    const joined = await sql<{ source_geography_key: string; place_name: string; terc: string }>`
      SELECT dv.source_geography_key, p.current_display_name AS place_name, x.external_id AS terc
      FROM distribution_values dv
      JOIN places p ON p.place_id = dv.place_id
      JOIN entity_external_ids x ON x.entity_id = p.place_id AND x.provider_key = ${TERYT_PROVIDER_KEY}
      GROUP BY 1, 2, 3 ORDER BY 3
    `.execute(db());
    expect(joined.rows).toHaveLength(16);
    for (const row of joined.rows) {
      // The raw string and the place's official name agree exactly — which is
      // what the correspondence asserted, now checked through the data.
      expect(row.source_geography_key).toBe(row.place_name);
      expect(row.terc).toMatch(/^[0-9]{2}$/u);
    }
  });

  it("AC-6: every snapshot carries the registered-residence scope and the residual", async () => {
    await importRegionalMale();
    const rows = await sql<{
      universe_description: string;
      coverage_notes: string;
      comparability_group: string;
    }>`
      -- TASK-030: the resource's descriptive text is stored once on the source
      -- record rather than on every snapshot. The assertion is unchanged; only
      -- where the value is read from has moved.
      SELECT DISTINCT sr.universe_description, sr.coverage_notes, sr.comparability_group
      FROM distribution_snapshots s
      JOIN source_records sr ON sr.source_record_id = s.source_record_id
    `.execute(db());
    expect(rows.rows).toHaveLength(1);
    const row = rows.rows[0];
    // The publisher's own wording, verbatim and untranslated.
    expect(row?.universe_description).toMatch(/w podziale na województwa/u);
    expect(row?.coverage_notes).toMatch(/PERMANENT\s+REGISTERED RESIDENCE/u);
    expect(row?.coverage_notes).toMatch(/never surname origin/u);
    expect(row?.coverage_notes).toMatch(/21\.7%/u);
    expect(row?.comparability_group).toBe("pesel_2026_regional_male");
  });

  it("keeps the two sex partitions in different comparability groups, so §6.1 forbids summing", async () => {
    await importRegionalMale();
    await importPeselRegionalResource(db(), {
      resource: PESEL_REGIONAL_FEMALE_2026,
      bytes: REGIONAL_FEMALE,
      expectedSha256: sha256Hex(REGIONAL_FEMALE),
      rawPayload: REGIONAL_FEMALE_PAYLOAD,
    });
    const groups = await sql<{ comparability_group: string }>`
      SELECT DISTINCT sr.comparability_group
        FROM distribution_snapshots s
        JOIN source_records sr ON sr.source_record_id = s.source_record_id
       ORDER BY 1
    `.execute(db());
    expect(groups.rows.map((r) => r.comparability_group)).toEqual([
      "pesel_2026_regional_female",
      "pesel_2026_regional_male",
    ]);
  });

  it("AC-5: identical bytes are a no-op; changed bytes supersede rather than rewrite", async () => {
    const first = await importRegionalMale();
    if (first.kind !== "IMPORTED") throw new Error("expected IMPORTED");
    const again = await importRegionalMale();
    expect(again.kind).toBe("ALREADY_IMPORTED");
    expect(await countOf("distribution_values")).toBe(40);

    // A one-row excerpt of the same resource: different bytes, same resource id.
    const trimmed = new TextEncoder().encode(
      "Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba\r\nMAZOWIECKIE,NOWAK,5548\r\n",
    );
    const third = await importPeselRegionalResource(db(), {
      resource: PESEL_REGIONAL_MALE_2026,
      bytes: trimmed,
      expectedSha256: sha256Hex(trimmed),
      rawPayload: REGIONAL_MALE_PAYLOAD,
    });
    if (third.kind !== "IMPORTED") throw new Error("expected IMPORTED");
    expect(third.supersededSourceRecordId).toBe(first.sourceRecordId);
    const statuses = await sql<{ record_status: string; n: string }>`
      SELECT record_status::text, count(*)::text AS n FROM source_records GROUP BY 1 ORDER BY 1
    `.execute(db());
    expect(statuses.rows).toEqual([
      { record_status: "ACTIVE", n: "1" },
      { record_status: "UPDATED", n: "1" },
    ]);
  });

  it("refuses the whole resource when the checksum does not match, before parsing", async () => {
    const outcome = await importPeselRegionalResource(db(), {
      resource: PESEL_REGIONAL_MALE_2026,
      bytes: REGIONAL_MALE,
      expectedSha256: "0".repeat(64),
      rawPayload: REGIONAL_MALE_PAYLOAD,
    });
    expect(outcome.kind).toBe("FAILED");
    if (outcome.kind !== "FAILED") return;
    expect(outcome.reason).toBe("CHECKSUM_MISMATCH");
    expect(await countOf("places")).toBe(0);
    expect(await countOf("distribution_values")).toBe(0);
  });

  it("refuses a national file offered to the regional importer, and writes nothing", async () => {
    const outcome = await importPeselRegionalResource(db(), {
      resource: PESEL_REGIONAL_MALE_2026,
      bytes: NATIONAL_MALE,
      expectedSha256: sha256Hex(NATIONAL_MALE),
      rawPayload: REGIONAL_MALE_PAYLOAD,
    });
    expect(outcome.kind).toBe("FAILED");
    if (outcome.kind !== "FAILED") return;
    expect(outcome.reason).toBe("SCHEMA_VIOLATION");
    expect(await countOf("distribution_snapshots")).toBe(0);
  });

  it("writes no zero rows: an absent (surname, voivodeship) cell is simply absent", async () => {
    await importRegionalMale();
    const zeros = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM distribution_values WHERE count = 0
    `.execute(db());
    expect(zeros.rows[0]?.n).toBe("0");
    // And the fixture's surnames do not each appear in all 16 voivodeships,
    // so absence is real here rather than hypothetical.
    const perSurname = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM (
        SELECT s.surname_id FROM distribution_snapshots s
        JOIN distribution_values v USING (distribution_snapshot_id)
        GROUP BY s.surname_id HAVING count(*) < 16
      ) partial
    `.execute(db());
    expect(Number(perSurname.rows[0]?.n)).toBeGreaterThan(0);
  });

  it("AC-8: the national CURRENT_POPULATION chain does not see regional rows", async () => {
    // National first, then regional. The population claim must be unchanged.
    const national = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: NATIONAL_MALE,
      expectedSha256: sha256Hex(NATIONAL_MALE),
      rawPayload: NATIONAL_MALE_PAYLOAD,
    });
    if (national.kind !== "IMPORTED") throw new Error("national import failed");

    const surname = await sql<{ canonical_display: string }>`
      SELECT s.canonical_display FROM distribution_snapshots ds
      JOIN surnames s USING (surname_id) WHERE ds.geography_level = 'NATIONAL'
      ORDER BY 1 LIMIT 1
    `.execute(db());
    const target = surname.rows[0]?.canonical_display;
    if (!target) throw new Error("no national surname");

    const before = await deriveCurrentPopulation(db(), target);
    await importRegionalMale();
    const after = await deriveCurrentPopulation(db(), target);

    if (before.kind !== "RESULT" || after.kind !== "RESULT") {
      throw new Error("expected results");
    }
    expect(after.current_population.map((c) => c.count)).toEqual(
      before.current_population.map((c) => c.count),
    );
    // Every population observation is national: the read path selects on
    // geography_level, so a regional row can never be read as a national one.
    const regionalSeen = JSON.stringify(after.current_population).includes("REGION");
    expect(regionalSeen).toBe(false);
  });

  it("reports the regional sum without comparing it to anything (TASK-008's one invariant)", async () => {
    const outcome = await importRegionalMale();
    if (outcome.kind !== "IMPORTED") throw new Error("expected IMPORTED");
    const sql_sum = await sql<{ total: string }>`
      SELECT sum(count)::text AS total FROM distribution_values
    `.execute(db());
    expect(String(outcome.report.regionalCountSum)).toBe(sql_sum.rows[0]?.total);
    // Reported as a number only. Nothing in the outcome claims equality with a
    // national total, and no national row exists in this test at all.
    expect(JSON.stringify(outcome.report)).not.toMatch(/nationalTotal|equalsNational/u);
  });
});
