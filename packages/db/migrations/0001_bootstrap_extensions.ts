import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Bootstrap migration — Migration Group A precursor (docs/canonical/23 §9).
 *
 * Enables the two PostgreSQL extensions the architecture requires from the
 * first migration onward (ADR-0001, ADR-0002; docs/canonical/23 §12):
 *
 *   - postgis  — geography model (docs/canonical/11 §5), spatial logic
 *                deferred, but the extension is enabled early;
 *   - pg_trgm  — trigram candidate generation for surname resolution
 *                (docs/canonical/13), used starting at M2.
 *
 * TASK-001 constraint: this is the ONLY migration in this task. It creates
 * no domain table. Canonical domain tables (Migration Groups A/B) belong
 * to TASK-004 and TASK-005.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS postgis`.execute(db);
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP EXTENSION IF EXISTS pg_trgm`.execute(db);
  await sql`DROP EXTENSION IF EXISTS postgis`.execute(db);
}
