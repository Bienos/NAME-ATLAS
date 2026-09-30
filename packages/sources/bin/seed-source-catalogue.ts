#!/usr/bin/env tsx
/**
 * Source catalogue seed CLI (TASK-038 §6 item 2). Invoked as
 * `pnpm seed:sources` from the repo root, or `pnpm seed-sources` from this
 * package, in the style of `bin/import-pesel.ts`.
 *
 * Registers every catalogued source that is not yet in `sources`, and leaves
 * every existing row untouched. It downloads nothing.
 *
 * Exit codes: 0 when the seed ran (including when everything was already
 * registered), 1 when it was refused or failed — nothing is written then.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { formatSourceCatalogueSeedReport, seedSourceCatalogue } from "../src/catalogue/index.js";

async function main(): Promise<void> {
  const pool = createPool(loadDbConfig());
  const db = createDb(pool);
  try {
    const report = await seedSourceCatalogue(db);
    console.log("[seed-sources] source catalogue");
    console.log(formatSourceCatalogueSeedReport(report));
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[seed-sources] failed:", err);
  process.exitCode = 1;
});
