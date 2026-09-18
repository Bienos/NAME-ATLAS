import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { createDb, createMigrator, createPool } from "@name-atlas/db";
import type { DB } from "@name-atlas/db";
import type { Kysely } from "kysely";
import type { Pool } from "pg";

/**
 * Pinned PostgreSQL/PostGIS image (resolves D-005 — docs/DECISIONS_NEEDED.md).
 *
 * `postgis/postgis:16-3.4` is the official PostGIS project image, built on
 * top of the official `postgres:16` image, so it carries every contrib
 * module the stock image ships — including `pg_trgm` — in addition to
 * PostGIS. Pinned to major.minor for both PostgreSQL and PostGIS, and to
 * the exact content digest (not just the tag) so the same bytes run in
 * local development, CI and every Testcontainers-backed test.
 *
 * This exact image and digest is used everywhere PostgreSQL is needed —
 * local development, CI and Testcontainers — per TASK-001 §6 ("the same
 * PostgreSQL image everywhere").
 */
export const POSTGRES_TEST_IMAGE =
  "postgis/postgis:16-3.4@sha256:44126d872ac91993766c341e369c539e8196614321765d36a6f1bab0419a5fa5";

export interface TestDatabase {
  readonly container: StartedPostgreSqlContainer;
  readonly pool: Pool;
  readonly db: Kysely<DB>;
  /** Stops the pool and the container. Always call this in test teardown. */
  stop(): Promise<void>;
}

/**
 * Starts a fresh PostgreSQL+PostGIS container and returns a ready
 * connection. Does not run migrations — call {@link migrateTestDatabase}
 * afterwards for tests that need the schema in place.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer(POSTGRES_TEST_IMAGE).start();
  const pool = createPool({ databaseUrl: container.getConnectionUri() });
  const db = createDb(pool);

  return {
    container,
    pool,
    db,
    async stop() {
      await db.destroy();
      await container.stop();
    },
  };
}

/** Runs every pending migration against a {@link TestDatabase}. */
export async function migrateTestDatabase(database: TestDatabase): Promise<void> {
  const migrator = createMigrator(database.db);
  const { error, results } = await migrator.migrateToLatest();
  if (error) {
    throw new Error(
      `Test database migration failed: ${String(error)} (results: ${JSON.stringify(results)})`,
    );
  }
}
