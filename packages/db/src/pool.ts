import { Pool } from "pg";
import type { DbConfig } from "./config.js";

/**
 * Creates a pooled PostgreSQL connection. One pool per process
 * (ARCHITECTURE.md §9, ADR-0002) — callers are responsible for calling
 * `pool.end()` on shutdown.
 */
export function createPool(config: DbConfig): Pool {
  return new Pool({ connectionString: config.databaseUrl });
}
