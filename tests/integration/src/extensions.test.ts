import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { createMigrator } from "@name-atlas/db";
import { sql } from "kysely";

/**
 * TASK-001 §7/§8: Testcontainers starts PostgreSQL, migrations apply from
 * an empty database, postgis and pg_trgm are asserted present, teardown
 * is clean.
 *
 * This is the real end-to-end proof for D-005 (docs/DECISIONS_NEEDED.md):
 * the pinned image is used, the bootstrap migration runs against it from
 * scratch, and both extensions are confirmed enabled — not asserted by
 * eye, by this test.
 */
describe("bootstrap migration against a real PostgreSQL container", () => {
  let database: TestDatabase | undefined;

  function requireDatabase(): TestDatabase {
    if (!database) {
      throw new Error("Test database was not started — see beforeAll failure above.");
    }
    return database;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 120_000);

  afterAll(async () => {
    // startTestDatabase() may have thrown before assigning `database` (for
    // example if the container image could not be pulled) — don't mask
    // that failure with a second, unrelated one here.
    await database?.stop();
  });

  it("enables postgis and pg_trgm", async () => {
    const result = await sql<{ extname: string }>`
      SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm')
      ORDER BY extname
    `.execute(requireDatabase().db);

    expect(result.rows.map((row) => row.extname)).toEqual(["pg_trgm", "postgis"]);
  });

  it("records every migration as applied exactly once, in order", async () => {
    const migrator = createMigrator(requireDatabase().db);
    const migrations = await migrator.getMigrations();

    expect(migrations.map((m) => m.name)).toEqual([
      "0001_bootstrap_extensions",
      "0002_identity_core",
      "0003_source_rights_distribution",
      "0004_truth_layer",
    ]);
    for (const migration of migrations) {
      expect(migration.executedAt).toBeInstanceOf(Date);
    }
  });

  it("creates exactly the identity, source/rights/distribution and truth-layer tables, and nothing else", async () => {
    // Kysely's own bookkeeping, the tables PostGIS itself creates in
    // `public`, TASK-003's three identity tables plus its one view,
    // TASK-004's five source/rights/distribution tables, and TASK-005's six
    // truth-layer tables.
    //
    // Anything beyond this set is an accidental table. In particular
    // nothing from TASK-005 §8's excluded list — digital_assets, places,
    // name_form_relations, evidence_dependencies, research_module_runs,
    // runtime_outbox — may appear here until the task that owns it adds it.
    const expected = [
      { table_name: "citations", table_type: "BASE TABLE" },
      { table_name: "claim_evidence", table_type: "BASE TABLE" },
      { table_name: "claims", table_type: "BASE TABLE" },
      { table_name: "confidence_assessments", table_type: "BASE TABLE" },
      { table_name: "distribution_snapshots", table_type: "BASE TABLE" },
      { table_name: "distribution_values", table_type: "BASE TABLE" },
      { table_name: "evidence_items", table_type: "BASE TABLE" },
      { table_name: "geography_columns", table_type: "VIEW" },
      { table_name: "geometry_columns", table_type: "VIEW" },
      { table_name: "knowledge_entities", table_type: "BASE TABLE" },
      { table_name: "kysely_migration", table_type: "BASE TABLE" },
      { table_name: "kysely_migration_lock", table_type: "BASE TABLE" },
      { table_name: "name_forms", table_type: "BASE TABLE" },
      { table_name: "research_runs", table_type: "BASE TABLE" },
      { table_name: "resolvable_name_forms", table_type: "VIEW" },
      { table_name: "rights_profiles", table_type: "BASE TABLE" },
      { table_name: "source_records", table_type: "BASE TABLE" },
      { table_name: "sources", table_type: "BASE TABLE" },
      { table_name: "spatial_ref_sys", table_type: "BASE TABLE" },
      { table_name: "surnames", table_type: "BASE TABLE" },
    ];

    const result = await sql<{ table_name: string; table_type: string }>`
      SELECT table_name, table_type FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `.execute(requireDatabase().db);

    expect(result.rows).toEqual(expected);
  });

  it("makes T0 unique by construction: surnames.canonical_key carries a UNIQUE constraint", async () => {
    const result = await sql<{ conname: string; contype: string }>`
      SELECT conname, contype FROM pg_constraint
      WHERE conrelid = 'surnames'::regclass AND contype = 'u'
    `.execute(requireDatabase().db);

    expect(result.rows.map((row) => row.conname)).toEqual(["surnames_canonical_key_key"]);
  });
});
