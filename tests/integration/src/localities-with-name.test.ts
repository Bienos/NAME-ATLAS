import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  importPeselResource,
  importTerytRegisters,
  PESEL_NATIONAL_MALE_2026,
  readTerytManifest,
  seedSourceCatalogue,
  seedVoivodeshipPlaces,
  sha256Hex,
  TERYT_SOURCE_KEY,
  terytFileInput,
} from "@name-atlas/sources";
import type { ImportTerytOptions } from "@name-atlas/sources";
import { localitiesSectionFor, querySurnameResult, TERYT_NOT_LOADED } from "@name-atlas/truth";
import { localitiesSectionSchema, surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-086 AC-1: the localities whose official name is the surname, read from
 * the TERYT places TASK-039 imports, in a real PostgreSQL.
 *
 * GENUINE: the two 14-line TERC and SIMC excerpts of GUS's official files
 * (STAN_NA 2026-01-01), and the PESEL national excerpt. SYNTHETIC: the surname
 * strings looked up here (JEMNA, WARSZAWA, …) are locality names used as
 * inputs, and the last block adds one invented SIMC row, `Kowalski`, to prove
 * the section through the query service; no real locality of that name is
 * asserted anywhere. TERYT is geography infrastructure: nothing here links a
 * place to a surname beyond the name (`docs/sources/INVENTORY.md` §4).
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const fixture = (name: string): Uint8Array =>
  readFileSync(path.join(repoRoot, "fixtures/teryt", name));
const TERC = fixture("terc-urzedowy-excerpt-2026-09-30.csv");
const SIMC = fixture("simc-urzedowy-excerpt-2026-09-30.csv");
const manifest = readTerytManifest();

function excerptOptions(overrides: { simc?: Uint8Array } = {}): ImportTerytOptions {
  const input = (registry: "TERC" | "SIMC", bytes: Uint8Array, own: boolean) =>
    terytFileInput(
      manifest,
      registry,
      bytes,
      own ? { expectedSha256: sha256Hex(bytes) } : { excerpt: true },
    );
  return {
    terc: input("TERC", TERC, false),
    simc: input("SIMC", overrides.simc ?? SIMC, overrides.simc !== undefined),
  };
}

function requireDatabase(database: TestDatabase | undefined): TestDatabase {
  if (!database) throw new Error("Test database was not started — see beforeAll failure above.");
  return database;
}

describe("localities with the surname's name, on the TERYT excerpt", () => {
  let database: TestDatabase | undefined;

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    await seedSourceCatalogue(database.db);
    await seedVoivodeshipPlaces(database.db);
    const imported = await importTerytRegisters(database.db, excerptOptions());
    if (imported.kind !== "IMPORTED") throw new Error(`TERYT import: ${imported.kind}`);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("lists a village with its gmina, powiat and voivodeship, dated and cited to the register", async () => {
    const db = requireDatabase(database);
    const section = await localitiesSectionFor(db.db, "JEMNA", "FREE");
    expect(localitiesSectionSchema.safeParse(section).success).toBe(true);
    expect(section.state).toBe("READY");
    expect(section.reference_date).toBe("2026-01-01");
    expect(section.total).toBe(1);
    expect(section.places.map((p) => ({ ...p, place: { ...p.place, id: "<uuid>" } }))).toEqual([
      {
        place: { id: "<uuid>", name: "Jemna", kind: "VILLAGE", teryt_simc: "0855434" },
        gmina: "Stoszowice",
        powiat: "ząbkowicki",
        voivodeship: "DOLNOŚLĄSKIE",
      },
    ]);
    expect(section.confidence).toEqual({
      status: "VERIFIED",
      methodology_code: "official_name_exact_key@locality_match@1",
    });
    expect(section.surface).toEqual({
      surface: "FREE",
      decision: "ALLOWED",
      reason_code: "RIGHTS_PERMIT_FREE_SURFACE",
    });
    expect(section.citation).toMatchObject({
      title: "TERYT",
      publisher: "GUS",
      publication_date: "2026-01-01",
      source_type: "OFFICIAL_DATASET",
      locator: "TERYT SIMC, wersja urzędowa, STAN_NA 2026-01-01",
      attribution: null,
      terms: null,
      source_page_url: "https://api.stat.gov.pl/Home/TerytApi?lang=en",
    });
    expect(section.citation?.retrieved_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u);
    expect(section.citation?.url).toContain("eteryt.stat.gov.pl");
  });

  it("lists a place once when it carries two official names with the same key", async () => {
    const db = requireDatabase(database);
    const copy = await sql<{ id: string }>`
      WITH entity AS (
        INSERT INTO knowledge_entities (entity_id, entity_type, scope, privacy_class, lifecycle_status)
        VALUES (gen_random_uuid(), 'PLACE', 'SHARED', 'PUBLIC', 'ACTIVE')
        RETURNING entity_id
      )
      INSERT INTO place_names
        (place_name_id, place_id, name, normalized_name, language_code, script, name_type, created_at)
      SELECT entity.entity_id, pn.place_id, pn.name, pn.normalized_name, pn.language_code,
             pn.script, pn.name_type, now()
        FROM place_names pn, entity
       WHERE pn.normalized_name = 'jemna' AND pn.name_type = 'OFFICIAL'
       LIMIT 1
      RETURNING place_name_id::text AS id
    `.execute(db.db);
    try {
      expect(copy.rows).toHaveLength(1);
      const section = await localitiesSectionFor(db.db, "JEMNA", "FREE");
      expect(section.total).toBe(1);
      expect(section.places).toHaveLength(1);
      expect(localitiesSectionSchema.safeParse(section).success).toBe(true);
    } finally {
      await sql`DELETE FROM place_names WHERE place_name_id = ${copy.rows[0]?.id}::uuid`.execute(
        db.db,
      );
      await sql`DELETE FROM knowledge_entities WHERE entity_id = ${copy.rows[0]?.id}::uuid`.execute(
        db.db,
      );
    }
  });

  it("matches by the resolver's canonical key: a two-word city in upper case", async () => {
    const db = requireDatabase(database);
    const section = await localitiesSectionFor(db.db, "ZĄBKOWICE ŚLĄSKIE", "FREE");
    expect(section.state).toBe("READY");
    expect(section.total).toBe(1);
    expect(section.places[0]?.place).toMatchObject({
      name: "Ząbkowice Śląskie",
      kind: "CITY",
      teryt_simc: "0984692",
    });
    expect(section.places[0]).toMatchObject({ gmina: "Ząbkowice Śląskie", powiat: "ząbkowicki" });
  });

  it("lists the city of Warsaw under its own gmina and powiat, and not its parts", async () => {
    const db = requireDatabase(database);
    const section = await localitiesSectionFor(db.db, "WARSZAWA", "FREE");
    expect(section.total).toBe(1);
    expect(section.places[0]).toMatchObject({
      place: { name: "Warszawa", kind: "CITY", teryt_simc: "0918123" },
      gmina: "Warszawa",
      powiat: "Warszawa",
      voivodeship: "MAZOWIECKIE",
    });
  });

  it("answers READY with no place for a part of a locality and for a name the register lacks", async () => {
    const db = requireDatabase(database);
    for (const name of ["SADLNO", "JELONKI", "KOSEWO WŁOŚCIAŃSKIE", "NOWAK"]) {
      const section = await localitiesSectionFor(db.db, name, "FREE");
      expect(section.state, name).toBe("READY");
      expect(section.places, name).toEqual([]);
      expect(section.total, name).toBe(0);
      expect(section.reference_date, name).toBe("2026-01-01");
      expect(section.citation?.title, name).toBe("TERYT");
      expect(localitiesSectionSchema.safeParse(section).success, name).toBe(true);
    }
  });

  it("is blocked on the SEO surface by the stored profile as TASK-038 seeds it", async () => {
    const db = requireDatabase(database);
    const section = await localitiesSectionFor(db.db, "JEMNA", "SEO");
    expect(section.state).toBe("RIGHTS_BLOCKED");
    expect(section.reason_code).toBe("REDISTRIBUTION_UNRESOLVED");
    expect(section.places).toEqual([]);
    expect(section.citation).toBeNull();
    expect(localitiesSectionSchema.safeParse(section).success).toBe(true);
  });

  it("follows the stored rights profile, not the code: metadata prohibited blocks the free surface", async () => {
    const db = requireDatabase(database);
    const { default_rights_profile_id: profileId } = await db.db
      .selectFrom("sources")
      .select("default_rights_profile_id")
      .where("source_key", "=", TERYT_SOURCE_KEY)
      .executeTakeFirstOrThrow();
    await db.db
      .updateTable("rights_profiles")
      .set({ metadata_rights: "PROHIBITED" })
      .where("rights_profile_id", "=", profileId)
      .execute();
    try {
      const section = await localitiesSectionFor(db.db, "JEMNA", "FREE");
      expect(section.state).toBe("RIGHTS_BLOCKED");
      expect(section.reason_code).toBe("METADATA_RIGHTS_PROHIBITED");
      expect(section.places).toEqual([]);
    } finally {
      await db.db
        .updateTable("rights_profiles")
        .set({ metadata_rights: "UNKNOWN" })
        .where("rights_profile_id", "=", profileId)
        .execute();
    }
    expect((await localitiesSectionFor(db.db, "JEMNA", "FREE")).state).toBe("READY");
  });
});

describe("localities before the register is loaded", () => {
  let database: TestDatabase | undefined;

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("is NOT_LOADED, with no rights known, when TERYT is not even registered", async () => {
    const db = requireDatabase(database);
    const section = await localitiesSectionFor(db.db, "JEMNA", "FREE");
    expect(section).toEqual({
      state: "NOT_LOADED",
      reference_date: null,
      places: [],
      total: null,
      confidence: null,
      citation: null,
      reason_code: TERYT_NOT_LOADED,
      surface: {
        surface: "FREE",
        decision: "CONDITIONAL",
        reason_code: "COMMERCIAL_USE_UNRESOLVED",
      },
    });
    expect(localitiesSectionSchema.safeParse(section).success).toBe(true);
  });

  it("is NOT_LOADED, on the stored profile's surface, when registered but no file is imported", async () => {
    const db = requireDatabase(database);
    await seedSourceCatalogue(db.db);
    const section = await localitiesSectionFor(db.db, "JEMNA", "FREE");
    expect(section.state).toBe("NOT_LOADED");
    expect(section.reason_code).toBe(TERYT_NOT_LOADED);
    expect(section.surface.decision).toBe("ALLOWED");
  });
});

describe("the section on the response, through the query service", () => {
  let database: TestDatabase | undefined;

  /** SYNTHETIC: one invented village, `Kowalski`, in the excerpt's gmina Stoszowice (TERC 02 24 04 2). */
  const SYNTHETIC_ROW = "02;24;04;2;01;1;Kowalski;0999999;0999999;2026-01-01\r\n";

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    await seedSourceCatalogue(database.db);
    await seedVoivodeshipPlaces(database.db);
    // The official files end with CRLF and one more empty line, which the parser
    // accepts only as framing: the row goes before it.
    const text = new TextDecoder().decode(SIMC);
    expect(text.endsWith("\r\n\r\n")).toBe(true);
    const simc = new TextEncoder().encode(`${text.trimEnd()}\r\n${SYNTHETIC_ROW}\r\n`);
    const imported = await importTerytRegisters(database.db, excerptOptions({ simc }));
    if (imported.kind !== "IMPORTED") throw new Error(`TERYT import: ${JSON.stringify(imported)}`);
    const bytes = readFileSync(path.join(repoRoot, "fixtures/pesel/national-male-2026-01-20.csv"));
    const rawPayload: unknown = JSON.parse(
      readFileSync(
        path.join(
          repoRoot,
          "docs/sources/acquisition/2026-09-18/metadata/pesel_national_2026_male_1148808.official_resource.json",
        ),
        "utf8",
      ),
    );
    await importPeselResource(database.db, {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes,
      expectedSha256: sha256Hex(bytes),
      rawPayload,
    });
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("carries the localities on a resolved surname, and the contract accepts the response", async () => {
    const db = requireDatabase(database);
    const outcome = await querySurnameResult(db.db, "KOWALSKI");
    expect(outcome.kind).toBe("OK");
    if (outcome.kind !== "OK") return;
    expect(outcome.response.schema_version).toBe("1.12");
    expect(outcome.response.status).toBe("RESOLVED");
    expect(surnameResultResponseSchema.safeParse(outcome.response).success).toBe(true);
    const localities = outcome.response.localities;
    expect(localities?.state).toBe("READY");
    expect(localities?.total).toBe(1);
    expect(localities?.places[0]).toMatchObject({
      place: { name: "Kowalski", kind: "VILLAGE", teryt_simc: "0999999" },
      gmina: "Stoszowice",
      powiat: "ząbkowicki",
      voivodeship: "DOLNOŚLĄSKIE",
    });
  });

  it("is READY with no place for a resolved surname the register does not name", async () => {
    const db = requireDatabase(database);
    const outcome = await querySurnameResult(db.db, "NOWAK");
    expect(outcome.kind).toBe("OK");
    if (outcome.kind !== "OK") return;
    expect(outcome.response.status).toBe("RESOLVED");
    expect(outcome.response.localities).toMatchObject({ state: "READY", places: [], total: 0 });
  });

  it("is null on a surname that did not resolve", async () => {
    const db = requireDatabase(database);
    const outcome = await querySurnameResult(db.db, "XQZWV");
    expect(outcome.kind).toBe("OK");
    if (outcome.kind !== "OK") return;
    expect(outcome.response.status).not.toBe("RESOLVED");
    expect(outcome.response.localities).toBeNull();
  });
});
