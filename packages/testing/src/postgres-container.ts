import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { createDb, createMigrator, createPool } from "@name-atlas/db";
import type { DB } from "@name-atlas/db";
import type { Kysely } from "kysely";
import type { Pool, PoolClient } from "pg";

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

/**
 * Environment variable naming an already-running PostgreSQL server to use
 * instead of starting a container. When set, each `startTestDatabase()`
 * call creates a fresh, uniquely named database on that server and drops
 * it on `stop()`, so tests still begin from an empty schema.
 *
 * This is the substitute path TASK-003 §10 anticipates for an environment
 * that cannot pull the pinned image (as the implementing sessions could
 * not — container registries were network-egress-blocked). CI leaves it
 * unset and runs the pinned container. A substitute server must itself
 * provide `postgis` and `pg_trgm`; the bootstrap migration asserts that.
 */
export const TEST_DATABASE_URL_ENV = "TEST_DATABASE_URL";

export interface TestDatabase {
  /** The Testcontainers handle; `null` when an external server is in use. */
  readonly container: StartedPostgreSqlContainer | null;
  /** Connection string for the (fresh) test database. */
  readonly connectionUri: string;
  readonly pool: Pool;
  readonly db: Kysely<DB>;
  /** Stops the pool and the container (or drops the external database). Always call this in test teardown. */
  stop(): Promise<void>;
}

/**
 * Tracks the connections a pool opens, so teardown can wait until they have
 * really closed. `pool.end()` — reached through `db.destroy()` — resolves once
 * it has asked each client to close, not once the sockets are gone. Dropping
 * the database or stopping the server inside that window sends a closing
 * client FATAL 57P01 with nothing left to handle it, and Vitest reports it as
 * an unhandled error in whichever test file happens to be running.
 */
function trackOpenConnections(pool: Pool): () => Promise<void> {
  const open = new Set<PoolClient>();
  pool.on("connect", (client) => {
    open.add(client);
    client.once("end", () => {
      open.delete(client);
    });
  });
  return async function allClosed() {
    if (open.size === 0) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const closed = [...open].map(
      (client) =>
        new Promise<void>((resolve) => {
          client.once("end", () => {
            resolve();
          });
        }),
    );
    await Promise.race([
      Promise.all(closed),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 5_000);
      }),
    ]);
    clearTimeout(timer);
  };
}

/**
 * Starts a fresh PostgreSQL+PostGIS database and returns a ready
 * connection. Does not run migrations — call {@link migrateTestDatabase}
 * afterwards for tests that need the schema in place.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const externalServer = process.env[TEST_DATABASE_URL_ENV];
  if (externalServer && externalServer.trim() !== "") {
    return startExternalTestDatabase(externalServer);
  }

  const container = await new PostgreSqlContainer(POSTGRES_TEST_IMAGE).start();
  const connectionUri = container.getConnectionUri();
  const pool = createPool({ databaseUrl: connectionUri });
  const allClosed = trackOpenConnections(pool);
  const db = createDb(pool);

  return {
    container,
    connectionUri,
    pool,
    db,
    async stop() {
      await db.destroy();
      await allClosed();
      await container.stop();
    },
  };
}

/** Creates a uniquely named empty database on an external server (see {@link TEST_DATABASE_URL_ENV}). */
async function startExternalTestDatabase(serverUri: string): Promise<TestDatabase> {
  const databaseName = `name_atlas_test_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  // Only [a-z0-9_] by construction, so the identifier is safe to interpolate.
  if (!/^[a-z0-9_]+$/u.test(databaseName)) {
    throw new Error(`refusing unsafe test database name: ${databaseName}`);
  }

  const admin = createPool({ databaseUrl: serverUri });
  await admin.query(`CREATE DATABASE "${databaseName}"`);

  const url = new URL(serverUri);
  url.pathname = `/${databaseName}`;
  const connectionUri = url.toString();
  const pool = createPool({ databaseUrl: connectionUri });
  const allClosed = trackOpenConnections(pool);
  const db = createDb(pool);

  return {
    container: null,
    connectionUri,
    pool,
    db,
    async stop() {
      await db.destroy();
      await allClosed();
      // FORCE (PostgreSQL 13+) terminates any connection a test left open —
      // e.g. a deliberately abandoned pool — so a throwaway database never
      // leaks because of one.
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin.end();
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
