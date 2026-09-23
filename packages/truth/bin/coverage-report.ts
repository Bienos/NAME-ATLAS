#!/usr/bin/env tsx
/**
 * Prints the coverage report (`src/coverage.ts`) as Markdown.
 *
 *   pnpm coverage:report > coverage.md
 *
 * Read-only. Against the full register it performs about five indexed claim
 * lookups per surname, so expect it to take a little while.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { coverageMarkdown, coverageReport } from "../src/coverage.js";

const db = createDb(createPool(loadDbConfig()));
try {
  const started = Date.now();
  const report = await coverageReport(db);
  console.log(`# Name Atlas — evidence coverage (${new Date().toISOString().slice(0, 10)})\n`);
  console.log(coverageMarkdown(report));
  console.error(`[coverage] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
} finally {
  await db.destroy();
}
