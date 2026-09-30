import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { uuidv7 } from "@name-atlas/domain";
import { SOURCE_CATALOGUE, SourceCatalogueError, seedSourceCatalogue } from "@name-atlas/sources";
import type { CatalogueEntry } from "@name-atlas/sources";

/**
 * TASK-038 §7 AC-05 to AC-11, against a real PostgreSQL.
 *
 * Every catalogue value is registry data taken from the repository's source
 * research (tasks/038 §3). No source is contacted and nothing is ingested:
 * the only rows these tests expect are `sources` and `rights_profiles`.
 */

const CATALOGUE_SIZE = SOURCE_CATALOGUE.length;

/** Tables the seed must never write (AC-09). */
const UNTOUCHED_TABLES = [
  "source_records",
  "distribution_snapshots",
  "distribution_values",
  "knowledge_entities",
  "surnames",
  "name_forms",
  "evidence_items",
  "claims",
  "citations",
  "places",
  "entity_external_ids",
] as const;

async function countRows(database: TestDatabase, table: string): Promise<number> {
  const result = await sql<{
    n: string;
  }>`SELECT count(*)::text AS n FROM ${sql.table(table)}`.execute(database.db);
  return Number(result.rows[0]?.n);
}

function requireDatabase(database: TestDatabase | undefined): TestDatabase {
  if (!database) {
    throw new Error("Test database was not started — see beforeAll failure above.");
  }
  return database;
}

describe("source catalogue seed on an empty registry", () => {
  let database: TestDatabase | undefined;

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("AC-10: refuses an invalid catalogue before writing anything", async () => {
    const db = requireDatabase(database);
    const first = SOURCE_CATALOGUE[0] as CatalogueEntry;

    await expect(seedSourceCatalogue(db.db, [first, first])).rejects.toBeInstanceOf(
      SourceCatalogueError,
    );
    expect(await countRows(db, "sources")).toBe(0);
    expect(await countRows(db, "rights_profiles")).toBe(0);
  });

  it("AC-05: the first seed inserts every source, each with its own rights profile", async () => {
    const db = requireDatabase(database);

    const report = await seedSourceCatalogue(db.db);

    expect(report.inserted).toEqual(SOURCE_CATALOGUE.map((e) => e.source.source_key));
    expect(report.existing).toEqual([]);
    expect(await countRows(db, "sources")).toBe(CATALOGUE_SIZE);
    expect(await countRows(db, "rights_profiles")).toBe(CATALOGUE_SIZE);

    const distinctProfiles = await sql<{ n: string }>`
      SELECT count(DISTINCT default_rights_profile_id)::text AS n FROM sources
    `.execute(db.db);
    expect(Number(distinctProfiles.rows[0]?.n)).toBe(CATALOGUE_SIZE);
  });

  it("AC-08: every stored row equals its catalogue entry, field by field", async () => {
    const db = requireDatabase(database);
    const rows = await db.db
      .selectFrom("sources")
      .innerJoin(
        "rights_profiles",
        "rights_profiles.rights_profile_id",
        "sources.default_rights_profile_id",
      )
      .selectAll()
      .execute();
    const byKey = new Map(rows.map((row) => [row.source_key, row]));

    for (const { source, rights } of SOURCE_CATALOGUE) {
      const row = byKey.get(source.source_key);
      expect(row, source.source_key).toBeDefined();
      if (!row) {
        continue;
      }
      expect({
        name: row.name,
        publisher: row.publisher,
        source_type: row.source_type,
        granularity: row.granularity,
        geographic_scope: row.geographic_scope,
        temporal_from: row.temporal_from,
        temporal_to: row.temporal_to,
        methodology_notes: row.methodology_notes,
        authority_tier: row.authority_tier,
        production_status: row.production_status,
        homepage_or_reference_url: row.homepage_or_reference_url,
        parent_source_id: row.parent_source_id,
      }).toEqual({
        name: source.name,
        publisher: source.publisher,
        source_type: source.source_type,
        granularity: source.granularity,
        geographic_scope: [...source.geographic_scope],
        temporal_from: null,
        temporal_to: null,
        methodology_notes: source.methodology_notes,
        authority_tier: source.authority_tier,
        production_status: source.production_status,
        homepage_or_reference_url: source.homepage_or_reference_url,
        parent_source_id: null,
      });
      expect({
        terms_version: row.terms_version,
        terms_hash: row.terms_hash,
        checked_at: new Date(row.checked_at).toISOString(),
        metadata_rights: row.metadata_rights,
        image_rights: row.image_rights,
        transcription_rights: row.transcription_rights,
        database_rights: row.database_rights,
        automated_access: row.automated_access,
        commercial_use: row.commercial_use,
        redistribution: row.redistribution,
        local_cache: row.local_cache,
        attribution_required: row.attribution_required,
        attribution_text: row.attribution_text,
        source_owner: row.source_owner,
        rights_url: row.rights_url,
        contact_required: row.contact_required,
        review_status: row.review_status,
        valid_from: row.valid_from,
        valid_to: row.valid_to,
        notes: row.notes,
      }).toEqual({
        terms_version: rights.terms_version,
        terms_hash: rights.terms_hash,
        checked_at: new Date(rights.checked_at).toISOString(),
        metadata_rights: rights.metadata_rights,
        image_rights: rights.image_rights,
        transcription_rights: rights.transcription_rights,
        database_rights: rights.database_rights,
        automated_access: rights.automated_access,
        commercial_use: rights.commercial_use,
        redistribution: rights.redistribution,
        local_cache: rights.local_cache,
        attribution_required: rights.attribution_required,
        attribution_text: rights.attribution_text,
        source_owner: rights.source_owner,
        rights_url: rights.rights_url,
        contact_required: rights.contact_required,
        review_status: rights.review_status,
        valid_from: rights.valid_from,
        valid_to: rights.valid_to,
        notes: rights.notes,
      });
    }
  });

  it("AC-09: writes nothing outside sources and rights_profiles", async () => {
    const db = requireDatabase(database);
    for (const table of UNTOUCHED_TABLES) {
      expect(await countRows(db, table), table).toBe(0);
    }
  });

  it("AC-11: every BLOCKED source is stored with automated_access PROHIBITED", async () => {
    const db = requireDatabase(database);
    const blocked = await db.db
      .selectFrom("sources")
      .innerJoin(
        "rights_profiles",
        "rights_profiles.rights_profile_id",
        "sources.default_rights_profile_id",
      )
      .select([
        "sources.source_key",
        "rights_profiles.automated_access",
        "rights_profiles.review_status",
      ])
      .where("sources.production_status", "=", "BLOCKED")
      .execute();

    expect(blocked).toHaveLength(5);
    for (const row of blocked) {
      expect(row.automated_access, row.source_key).toBe("PROHIBITED");
      expect(row.review_status, row.source_key).toBe("BLOCKED");
    }
  });

  it("stores no APPROVED status anywhere", async () => {
    const db = requireDatabase(database);
    const approved = await sql<{ n: string }>`
      SELECT count(*)::text AS n
      FROM sources JOIN rights_profiles
        ON rights_profiles.rights_profile_id = sources.default_rights_profile_id
      WHERE sources.production_status = 'APPROVED' OR rights_profiles.review_status = 'APPROVED'
    `.execute(db.db);
    expect(Number(approved.rows[0]?.n)).toBe(0);
  });

  it("AC-06: a second seed inserts nothing and changes no row", async () => {
    const db = requireDatabase(database);
    const before = await db.db.selectFrom("sources").selectAll().orderBy("source_key").execute();

    const report = await seedSourceCatalogue(db.db);

    expect(report.inserted).toEqual([]);
    expect(report.existing).toEqual(SOURCE_CATALOGUE.map((e) => e.source.source_key));
    expect(await countRows(db, "sources")).toBe(CATALOGUE_SIZE);
    expect(await countRows(db, "rights_profiles")).toBe(CATALOGUE_SIZE);
    const after = await db.db.selectFrom("sources").selectAll().orderBy("source_key").execute();
    expect(after).toEqual(before);
  });
});

describe("source catalogue seed over a pre-existing row (AC-07)", () => {
  let database: TestDatabase | undefined;

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("leaves an existing row with a catalogue key untouched and reports it", async () => {
    const db = requireDatabase(database);
    // A deliberately different, SYNTHETIC row under a real catalogue key, so
    // any overwrite by the seed would be visible.
    const rightsProfileId = uuidv7();
    await db.db
      .insertInto("rights_profiles")
      .values({
        rights_profile_id: rightsProfileId,
        checked_at: "2026-01-01T00:00:00Z",
        metadata_rights: "UNKNOWN",
        image_rights: "UNKNOWN",
        transcription_rights: "UNKNOWN",
        database_rights: "UNKNOWN",
        automated_access: "UNKNOWN",
        commercial_use: "UNKNOWN",
        redistribution: "UNKNOWN",
        local_cache: "UNKNOWN",
        attribution_required: true,
        contact_required: true,
        review_status: "LEGAL_REVIEW_REQUIRED",
        notes: "synthetic test row (TASK-038 AC-07)",
      })
      .execute();
    await db.db
      .insertInto("sources")
      .values({
        source_id: uuidv7(),
        source_key: "pl_teryt",
        name: "synthetic pre-existing row",
        source_type: "OTHER",
        granularity: "MIXED",
        geographic_scope: ["PL"],
        authority_tier: "D_TERTIARY_LEAD",
        default_rights_profile_id: rightsProfileId,
        production_status: "LEGAL_REVIEW_REQUIRED",
      })
      .execute();
    const before = await db.db
      .selectFrom("sources")
      .selectAll()
      .where("source_key", "=", "pl_teryt")
      .executeTakeFirstOrThrow();

    const report = await seedSourceCatalogue(db.db);

    expect(report.existing).toEqual(["pl_teryt"]);
    expect(report.inserted).toHaveLength(CATALOGUE_SIZE - 1);
    expect(report.inserted).not.toContain("pl_teryt");
    const after = await db.db
      .selectFrom("sources")
      .selectAll()
      .where("source_key", "=", "pl_teryt")
      .executeTakeFirstOrThrow();
    expect(after).toEqual(before);
    expect(await countRows(db, "sources")).toBe(CATALOGUE_SIZE);
    expect(await countRows(db, "rights_profiles")).toBe(CATALOGUE_SIZE);
  });
});
