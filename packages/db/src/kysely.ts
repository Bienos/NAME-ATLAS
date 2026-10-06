import { Kysely, PostgresDialect } from "kysely";
import type { PostgresPool } from "kysely";
import type { DB } from "./generated/db.js";

/**
 * Creates the typed Kysely instance over an existing pg Pool, or over a pool
 * whose checkouts wait their turn (`queueCheckouts`, TASK-132).
 */
export function createDb(pool: PostgresPool): Kysely<DB> {
  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool }),
  });
}
