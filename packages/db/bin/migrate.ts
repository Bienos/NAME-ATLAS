#!/usr/bin/env tsx
/**
 * Migration runner CLI. Invoked as `pnpm db:migrate` from the repo root, or
 * `pnpm migrate` from this package.
 *
 * Applies every migration in ./migrations that has not yet run, in order,
 * using Kysely's Migrator (ADR-0002). Exits non-zero on any failure so CI
 * fails loudly rather than reporting a partially-applied migration set as
 * success.
 */
import { createDb } from "../src/kysely.js";
import { createMigrator } from "../src/migrator.js";
import { createPool } from "../src/pool.js";
import { loadDbConfig } from "../src/config.js";

async function main(): Promise<void> {
  const config = loadDbConfig();
  const pool = createPool(config);
  const db = createDb(pool);
  const migrator = createMigrator(db);

  const { error, results } = await migrator.migrateToLatest();

  for (const result of results ?? []) {
    const status = result.status === "Success" ? "applied" : "FAILED";
    console.log(`[migrate] ${result.migrationName}: ${status}`);
  }

  await db.destroy();

  if (error) {
    console.error("[migrate] migration run failed:", error);
    process.exitCode = 1;
    return;
  }

  if ((results ?? []).length === 0) {
    console.log("[migrate] no pending migrations");
  } else {
    console.log("[migrate] up to date");
  }
}

main().catch((err: unknown) => {
  console.error("[migrate] unexpected error:", err);
  process.exitCode = 1;
});
