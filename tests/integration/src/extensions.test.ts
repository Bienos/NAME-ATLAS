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
      "0005_current_rank",
      "0006_canonical_key_v2",
      "0007_script_flags",
      "0008_pesel_rights_decision",
      "0009_rarity_context",
      "0010_places_core",
      "0011_current_distribution",
      "0012_surname_trigram_index",
      "0013_runtime_outbox",
      "0014_surname_meaning",
      "0015_surname_meaning_scope",
      "0016_citations_per_source_record",
      "0017_surname_slug_lookup_index",
      "0018_surname_slugs",
      "0019_snapshot_profile_to_source_record",
      "0020_surname_fold_prefix_index",
      "0021_current_rank_top_index",
      "0022_universe_evidence_lookup_index",
    ]);
    for (const migration of migrations) {
      expect(migration.executedAt).toBeInstanceOf(Date);
    }
  });

  it("creates exactly the identity, source/rights/distribution, truth-layer and lineage tables, and nothing else", async () => {
    // Kysely's own bookkeeping, the tables PostGIS itself creates in
    // `public`, TASK-003's three identity tables plus its one view,
    // TASK-004's five source/rights/distribution tables, and TASK-005's six
    // truth-layer tables.
    //
    // TASK-011 added `places`, `place_names` and `entity_external_ids`: the
    // voivodeship Place foundation D-004's adoption required, pulled forward
    // from M3 for exactly that reason and no wider.
    //
    // Anything beyond this set is an accidental table. TASK-009 added
    // `evidence_dependencies`, which TASK-005 had excluded: D-011 resolved
    // that a derived claim needs the lineage docs/canonical/14 §30 specifies,
    // because a rank has two differently-roled inputs. Still excluded, and
    // still owned by a later task — digital_assets, places,
    // name_form_relations, research_module_runs, runtime_outbox.
    const expected = [
      { table_name: "citations", table_type: "BASE TABLE" },
      { table_name: "claim_evidence", table_type: "BASE TABLE" },
      { table_name: "claims", table_type: "BASE TABLE" },
      { table_name: "confidence_assessments", table_type: "BASE TABLE" },
      { table_name: "distribution_snapshots", table_type: "BASE TABLE" },
      { table_name: "distribution_values", table_type: "BASE TABLE" },
      { table_name: "entity_external_ids", table_type: "BASE TABLE" },
      { table_name: "evidence_dependencies", table_type: "BASE TABLE" },
      { table_name: "evidence_items", table_type: "BASE TABLE" },
      { table_name: "geography_columns", table_type: "VIEW" },
      { table_name: "geometry_columns", table_type: "VIEW" },
      { table_name: "knowledge_entities", table_type: "BASE TABLE" },
      { table_name: "kysely_migration", table_type: "BASE TABLE" },
      { table_name: "kysely_migration_lock", table_type: "BASE TABLE" },
      { table_name: "name_forms", table_type: "BASE TABLE" },
      { table_name: "place_names", table_type: "BASE TABLE" },
      { table_name: "places", table_type: "BASE TABLE" },
      { table_name: "research_runs", table_type: "BASE TABLE" },
      { table_name: "resolvable_name_forms", table_type: "VIEW" },
      { table_name: "rights_profiles", table_type: "BASE TABLE" },
      { table_name: "runtime_outbox", table_type: "BASE TABLE" },
      { table_name: "source_records", table_type: "BASE TABLE" },
      { table_name: "sources", table_type: "BASE TABLE" },
      { table_name: "spatial_ref_sys", table_type: "BASE TABLE" },
      { table_name: "surname_slugs", table_type: "BASE TABLE" },
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
