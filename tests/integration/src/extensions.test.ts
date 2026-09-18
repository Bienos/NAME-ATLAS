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

  it("records the bootstrap migration as applied exactly once", async () => {
    const migrator = createMigrator(requireDatabase().db);
    const migrations = await migrator.getMigrations();

    expect(migrations).toHaveLength(1);
    expect(migrations[0]?.name).toBe("0001_bootstrap_extensions");
    expect(migrations[0]?.executedAt).toBeInstanceOf(Date);
  });

  it("creates no domain table (TASK-001 is foundation-only)", async () => {
    // Excludes Kysely's own migration bookkeeping tables and the tables
    // PostGIS itself creates in `public` (geography_columns,
    // geometry_columns, spatial_ref_sys) — verified against a real
    // migrated database that these are the only five tables the bootstrap
    // migration produces. Anything beyond that set is an accidental
    // domain table and TASK-001 must not create one.
    const knownNonDomainTables = [
      "kysely_migration",
      "kysely_migration_lock",
      "geography_columns",
      "geometry_columns",
      "spatial_ref_sys",
    ];

    const result = await sql<{ table_name: string }>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `.execute(requireDatabase().db);

    const unexpectedTables = result.rows
      .map((row) => row.table_name)
      .filter((name) => !knownNonDomainTables.includes(name));

    expect(unexpectedTables).toEqual([]);
  });
});
