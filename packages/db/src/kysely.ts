import { Kysely, PostgresDialect } from "kysely";
import type { Pool } from "pg";
import type { DB } from "./generated/db.js";

/** Creates the typed Kysely instance over an existing pg Pool. */
export function createDb(pool: Pool): Kysely<DB> {
  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool }),
  });
}
