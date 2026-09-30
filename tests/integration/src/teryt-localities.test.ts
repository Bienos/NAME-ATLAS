import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  importTerytRegisters,
  readTerytManifest,
  seedSourceCatalogue,
  seedVoivodeshipPlaces,
  sha256Hex,
  TERYT_PROVIDER_KEY,
  TERYT_SIMC_PROVIDER_KEY,
  TERYT_SOURCE_KEY,
  terytFileInput,
} from "@name-atlas/sources";
import type { ImportTerytOptions, TerytImportOutcome } from "@name-atlas/sources";

/**
 * TASK-039 AC-02 to AC-09, against a real PostgreSQL.
 *
 * GENUINE DATA: the two fixtures are 14-line excerpts of GUS's official
 * TERC and SIMC files of 2026-09-30 (STAN_NA 2026-01-01), copied byte for
 * byte; `fixtures/teryt/source-manifest.json` records them. Because they are
 * excerpts they carry their own checksums, which the manifest also records.
 *
 * TERYT is geography infrastructure: nothing here links a place to a surname.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const fixture = (name: string): Uint8Array =>
  readFileSync(path.join(repoRoot, "fixtures/teryt", name));
const TERC = fixture("terc-urzedowy-excerpt-2026-09-30.csv");
const SIMC = fixture("simc-urzedowy-excerpt-2026-09-30.csv");
const manifest = readTerytManifest();

function excerptOptions(
  overrides: { terc?: Uint8Array; simc?: Uint8Array } = {},
): ImportTerytOptions {
  const input = (registry: "TERC" | "SIMC", bytes: Uint8Array, own: boolean) =>
    terytFileInput(
      manifest,
      registry,
      bytes,
      own ? { expectedSha256: sha256Hex(bytes) } : { excerpt: true },
    );
  return {
    terc: input("TERC", overrides.terc ?? TERC, overrides.terc !== undefined),
    simc: input("SIMC", overrides.simc ?? SIMC, overrides.simc !== undefined),
  };
}

/** Every table an import could touch, plus the ones it must never touch (AC-09). */
const TABLES = [
  "knowledge_entities",
  "source_records",
  "places",
  "place_names",
  "entity_external_ids",
  "administrative_memberships",
  "sources",
  "rights_profiles",
  "surnames",
  "distribution_snapshots",
  "distribution_values",
  "evidence_items",
  "claims",
  "citations",
] as const;

async function counts(database: TestDatabase): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const table of TABLES) {
    const result = await sql<{
      n: string;
    }>`SELECT count(*)::text AS n FROM ${sql.table(table)}`.execute(database.db);
    out[table] = Number(result.rows[0]?.n);
  }
  return out;
}

function requireDatabase(database: TestDatabase | undefined): TestDatabase {
  if (!database) {
    throw new Error("Test database was not started — see beforeAll failure above.");
  }
  return database;
}

function expectFailure(outcome: TerytImportOutcome, reason: string): void {
  expect(outcome.kind).toBe("FAILED");
  if (outcome.kind === "FAILED") {
    expect(outcome.reason).toBe(reason);
  }
}

/** The SIMC excerpt without Jemna, which nothing hangs from: a different, still valid, file state. */
function simcWithoutJemna(): Uint8Array {
  const text = new TextDecoder().decode(SIMC);
  const without = text.replace("02;24;04;2;01;1;Jemna;0855434;0855434;2026-01-01\r\n", "");
  expect(without).not.toBe(text);
  return new TextEncoder().encode(without);
}

describe("TERYT import: the gate and fail-closed paths write nothing", () => {
  let database: TestDatabase | undefined;

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("AC-02: refuses when pl_teryt is not registered", async () => {
    const db = requireDatabase(database);
    const before = await counts(db);
    expectFailure(await importTerytRegisters(db.db, excerptOptions()), "SOURCE_NOT_REGISTERED");
    expect(await counts(db)).toEqual(before);
  });

  it("AC-02: refuses a production status that is not APPROVED or LEGAL_REVIEW_REQUIRED", async () => {
    const db = requireDatabase(database);
    await seedSourceCatalogue(db.db);
    const source = await db.db
      .selectFrom("sources")
      .select(["production_status", "default_rights_profile_id"])
      .where("source_key", "=", TERYT_SOURCE_KEY)
      .executeTakeFirstOrThrow();
    // TASK-038 registers it as LEGAL_REVIEW_REQUIRED.
    expect(source.production_status).toBe("LEGAL_REVIEW_REQUIRED");

    const before = await counts(db);
    for (const status of ["PARTNERSHIP_REQUIRED", "BLOCKED", "DEPRECATED"] as const) {
      await db.db
        .updateTable("sources")
        .set({ production_status: status })
        .where("source_key", "=", TERYT_SOURCE_KEY)
        .execute();
      expectFailure(
        await importTerytRegisters(db.db, excerptOptions()),
        "PRODUCTION_STATUS_BLOCKED",
      );
    }
    await db.db
      .updateTable("sources")
      .set({ production_status: "LEGAL_REVIEW_REQUIRED" })
      .where("source_key", "=", TERYT_SOURCE_KEY)
      .execute();
    expect(await counts(db)).toEqual(before);
  });

  it("AC-02: refuses a rights profile that prohibits automated access", async () => {
    const db = requireDatabase(database);
    const { default_rights_profile_id: profileId } = await db.db
      .selectFrom("sources")
      .select("default_rights_profile_id")
      .where("source_key", "=", TERYT_SOURCE_KEY)
      .executeTakeFirstOrThrow();
    const before = await counts(db);
    await db.db
      .updateTable("rights_profiles")
      .set({ automated_access: "PROHIBITED" })
      .where("rights_profile_id", "=", profileId)
      .execute();
    expectFailure(await importTerytRegisters(db.db, excerptOptions()), "RIGHTS_BLOCKED");
    await db.db
      .updateTable("rights_profiles")
      .set({ automated_access: "ALLOWED" })
      .where("rights_profile_id", "=", profileId)
      .execute();
    expect(await counts(db)).toEqual(before);
  });

  it("AC-03: refuses bytes whose checksum is not the expected one", async () => {
    const db = requireDatabase(database);
    const before = await counts(db);
    const options = excerptOptions();
    const outcome = await importTerytRegisters(db.db, {
      ...options,
      simc: { ...options.simc, expectedSha256: "0".repeat(64) },
    });
    expectFailure(outcome, "CHECKSUM_MISMATCH");
    expect(await counts(db)).toEqual(before);
  });

  it("AC-04: a quarantined row aborts the whole import and is reported", async () => {
    const db = requireDatabase(database);
    const before = await counts(db);
    const bad = new TextEncoder().encode(
      new TextDecoder().decode(SIMC).replace("02;24;04;2;01;1;Jemna;", "02;24;04;2;97;1;Jemna;"),
    );
    const outcome = await importTerytRegisters(db.db, excerptOptions({ simc: bad }));
    expectFailure(outcome, "QUARANTINED_ROWS");
    if (outcome.kind === "FAILED") {
      expect(outcome.quarantined).toEqual([
        {
          file: "SIMC",
          line: 2,
          id: "0855434",
          reason: "UNKNOWN_LOCALITY_KIND",
          detail: 'RM "97"',
        },
      ]);
    }
    expect(await counts(db)).toEqual(before);
  });

  it("AC-04: a whole-file defect is a schema violation", async () => {
    const db = requireDatabase(database);
    const before = await counts(db);
    const outcome = await importTerytRegisters(
      db.db,
      excerptOptions({ terc: new Uint8Array([...TERC, 0xff]) }),
    );
    expectFailure(outcome, "SCHEMA_VIOLATION");
    expect(await counts(db)).toEqual(before);
  });

  it("AC-05: with no TASK-011 places, the voivodeships are created from TERC", async () => {
    const db = requireDatabase(database);
    const outcome = await importTerytRegisters(db.db, excerptOptions());
    expect(outcome.kind).toBe("IMPORTED");
    if (outcome.kind === "IMPORTED") {
      expect(outcome.report.voivodeshipsCreated).toBe(2);
      expect(outcome.report.voivodeshipsReused).toBe(0);
      expect(outcome.report.placesCreated).toBe(23);
    }
  });
});

describe("TERYT import on the excerpt, with TASK-011's voivodeships present", () => {
  let database: TestDatabase | undefined;
  let first: TerytImportOutcome | undefined;
  let voivodeshipIds: ReadonlyMap<string, string> = new Map();

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    await seedSourceCatalogue(database.db);
    voivodeshipIds = (await seedVoivodeshipPlaces(database.db)).placeIdByTercCode;
    first = await importTerytRegisters(database.db, excerptOptions());
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("AC-05: imports, and the reconciliation report balances", () => {
    expect(first?.kind).toBe("IMPORTED");
    if (first?.kind !== "IMPORTED") return;
    expect(first.report).toEqual({
      tercRowsRead: 14,
      simcRowsRead: 14,
      tercReferenceDate: "2026-01-01",
      simcReferenceDate: "2026-01-01",
      voivodeshipsCreated: 0,
      voivodeshipsReused: 2,
      powiatsCreated: 3,
      gminasCreated: 4,
      gminaComponentsNotPlaces: 5,
      localitiesCreated: 14,
      partsOfLocalities: 4,
      localitiesByPlaceType: { VILLAGE: 6, CITY: 2, OTHER: 6 },
      placesCreated: 21,
      namesCreated: 21,
      externalIdsCreated: 21,
      membershipsCreated: 21,
      sourceRecordsCreated: 30,
    });
  });

  it("AC-06: reuses the voivodeship places rather than duplicating them", async () => {
    const db = requireDatabase(database);
    const rows = await db.db
      .selectFrom("entity_external_ids")
      .select(["external_id", "entity_id"])
      .where("provider_key", "=", TERYT_PROVIDER_KEY)
      .where(sql<boolean>`length(external_id) = 2`)
      .execute();
    expect(rows).toHaveLength(16);
    const regions = await db.db
      .selectFrom("places")
      .select((eb) => eb.fn.countAll<string>().as("n"))
      .where("place_type", "=", "REGION")
      .executeTakeFirstOrThrow();
    expect(Number(regions.n)).toBe(16);
  });

  it("AC-05: a part of a town hangs from the town, the gmina, the powiat and TASK-011's voivodeship", async () => {
    const db = requireDatabase(database);
    const chain = await sql<{ name: string; place_type: string; ext: string; place_id: string }>`
      WITH RECURSIVE chain AS (
        SELECT p.place_id, 0 AS depth
        FROM entity_external_ids e JOIN places p ON p.place_id = e.entity_id
        WHERE e.provider_key = ${TERYT_SIMC_PROVIDER_KEY} AND e.external_id = '1061995'
        UNION ALL
        SELECT m.parent_place_id, c.depth + 1
        FROM chain c JOIN administrative_memberships m ON m.child_place_id = c.place_id
      )
      SELECT p.current_display_name AS name, p.place_type, p.place_id,
             e.provider_key || ':' || e.external_id AS ext
      FROM chain c
      JOIN places p ON p.place_id = c.place_id
      JOIN entity_external_ids e ON e.entity_id = p.place_id
      ORDER BY c.depth
    `.execute(db.db);
    expect(chain.rows.map((r) => [r.name, r.place_type, r.ext])).toEqual([
      ["Sadlno", "OTHER", "TERYT_SIMC:1061995"],
      ["Ząbkowice Śląskie", "CITY", "TERYT_SIMC:0984692"],
      ["Ząbkowice Śląskie", "MUNICIPALITY", "TERYT:0224053"],
      ["ząbkowicki", "COUNTY_DISTRICT", "TERYT:0224"],
      ["DOLNOŚLĄSKIE", "REGION", "TERYT:02"],
    ]);
    expect(chain.rows[4]?.place_id).toBe(voivodeshipIds.get("02"));
  });

  it("AC-05: a Warsaw district hangs from Warszawa's gmina, not from a TERC district place", async () => {
    const db = requireDatabase(database);
    const parent = await db.db
      .selectFrom("entity_external_ids as child")
      .innerJoin("administrative_memberships as m", "m.child_place_id", "child.entity_id")
      .innerJoin("entity_external_ids as parent", "parent.entity_id", "m.parent_place_id")
      .select([
        "parent.provider_key",
        "parent.external_id",
        "m.membership_type",
        "m.verification_status",
      ])
      .where("child.provider_key", "=", TERYT_SIMC_PROVIDER_KEY)
      .where("child.external_id", "=", "0988780")
      .executeTakeFirstOrThrow();
    expect(parent).toEqual({
      provider_key: TERYT_PROVIDER_KEY,
      external_id: "1465011",
      membership_type: "ADMINISTRATIVE",
      verification_status: "MACHINE_EXTRACTED",
    });
    // TERC's RODZ 4/5/8/9 components are recorded, not places.
    const component = await db.db
      .selectFrom("entity_external_ids")
      .select("external_id")
      .where("provider_key", "=", TERYT_PROVIDER_KEY)
      .where("external_id", "in", ["0224054", "0224055", "1414044", "1414045", "1465028"])
      .execute();
    expect(component).toEqual([]);
    const recorded = await db.db
      .selectFrom("source_records")
      .select("external_record_id")
      .where("external_record_id", "=", "TERC:1465028")
      .execute();
    expect(recorded).toHaveLength(1);
  });

  it("AC-05: names are official, verbatim, and cite their row's source record", async () => {
    const db = requireDatabase(database);
    const name = await db.db
      .selectFrom("entity_external_ids as e")
      .innerJoin("place_names as n", "n.place_id", "e.entity_id")
      .innerJoin("source_records as r", "r.source_record_id", "n.source_record_id")
      .innerJoin("sources as s", "s.source_id", "r.source_id")
      .select([
        "n.name",
        "n.name_type",
        "n.language_code",
        "r.record_type",
        "r.external_record_id",
        "r.external_parent_id",
        "r.raw_payload",
        "r.content_hash",
        "s.source_key",
      ])
      .where("e.provider_key", "=", TERYT_SIMC_PROVIDER_KEY)
      .where("e.external_id", "=", "0120230")
      .executeTakeFirstOrThrow();
    const line = '14;14;04;5;01;1;Mazewo Dworskie"A";0120230;0120230;2026-01-01';
    expect(name).toMatchObject({
      name: 'Mazewo Dworskie"A"',
      name_type: "OFFICIAL",
      language_code: "pl",
      record_type: "DATA_ROW",
      external_record_id: "SIMC:0120230",
      source_key: TERYT_SOURCE_KEY,
      content_hash: sha256Hex(new TextEncoder().encode(line)),
    });
    expect(name.external_parent_id).toMatch(/^SIMC_Urzedowy@[0-9a-f]{12}$/u);
    expect(name.raw_payload).toMatchObject({
      text: line,
      fields: { RM: "01", RODZ_GMI: "5", SYMPOD: "0120230", STAN_NA: "2026-01-01" },
    });
  });

  it("AC-05: every new place has one name, one TERYT id, a parent and no point", async () => {
    const db = requireDatabase(database);
    const orphans = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM places p
      WHERE p.place_type <> 'REGION'
        AND (
          (SELECT count(*) FROM place_names n WHERE n.place_id = p.place_id) <> 1
          OR (SELECT count(*) FROM entity_external_ids e WHERE e.entity_id = p.place_id) <> 1
          OR (SELECT count(*) FROM administrative_memberships m WHERE m.child_place_id = p.place_id) <> 1
          OR p.centroid IS NOT NULL
        )
    `.execute(db.db);
    expect(orphans.rows[0]?.n).toBe("0");
  });

  it("AC-09: writes nothing about surnames, distributions, evidence or claims", async () => {
    const db = requireDatabase(database);
    const c = await counts(db);
    for (const table of [
      "surnames",
      "distribution_snapshots",
      "distribution_values",
      "evidence_items",
      "claims",
      "citations",
    ]) {
      expect(c[table]).toBe(0);
    }
  });

  it("AC-07: a second import of the same bytes is ALREADY_IMPORTED and changes nothing", async () => {
    const db = requireDatabase(database);
    const before = await counts(db);
    const again = await importTerytRegisters(db.db, excerptOptions());
    expect(again.kind).toBe("ALREADY_IMPORTED");
    if (again.kind === "ALREADY_IMPORTED" && first?.kind === "IMPORTED") {
      expect(again.fileRecordIds).toEqual(first.fileRecordIds);
    }
    expect(await counts(db)).toEqual(before);
  });

  it("AC-08: a different file state is refused, with nothing written", async () => {
    const db = requireDatabase(database);
    const before = await counts(db);
    const outcome = await importTerytRegisters(db.db, excerptOptions({ simc: simcWithoutJemna() }));
    expectFailure(outcome, "REFRESH_NOT_SUPPORTED");
    expect(await counts(db)).toEqual(before);
  });
});

describe("TERYT import: a stored voivodeship that disagrees with TERC", () => {
  let database: TestDatabase | undefined;

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    await seedSourceCatalogue(database.db);
    await seedVoivodeshipPlaces(database.db);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("AC-06: fails with EXISTING_PLACE_CONFLICT and writes nothing", async () => {
    const db = requireDatabase(database);
    const { entity_id: placeId } = await db.db
      .selectFrom("entity_external_ids")
      .select("entity_id")
      .where("provider_key", "=", TERYT_PROVIDER_KEY)
      .where("external_id", "=", "14")
      .executeTakeFirstOrThrow();
    await db.db
      .updateTable("places")
      .set({ current_display_name: "Mazowieckie" })
      .where("place_id", "=", placeId)
      .execute();
    const before = await counts(db);
    expectFailure(await importTerytRegisters(db.db, excerptOptions()), "EXISTING_PLACE_CONFLICT");
    expect(await counts(db)).toEqual(before);
  });
});
