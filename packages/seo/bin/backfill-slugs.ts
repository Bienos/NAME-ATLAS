#!/usr/bin/env tsx
/**
 * Slug backfill CLI (TASK-027, ADR-0010).
 *
 *   pnpm seo:backfill-slugs
 *
 * Idempotent: safe to run after every import, and running it twice changes
 * nothing. Exits non-zero if any surname's stored address no longer matches its
 * display form, because that is a 301 somebody has to decide about and not
 * something a backfill may do quietly.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { backfillSlugs } from "../src/backfill.js";

async function main(): Promise<void> {
  const pool = createPool(loadDbConfig());
  const db = createDb(pool);
  try {
    const started = Date.now();
    const report = await backfillSlugs(db, {
      onProgress: (done) => {
        if (done % 50_000 === 0) console.log(`[slugs] ${String(done)} surnames scanned`);
      },
    });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);

    console.log(`[slugs] surnames scanned   ${String(report.surnames)}`);
    console.log(`[slugs] addresses created  ${String(report.created)}`);
    console.log(`[slugs]   of those suffixed ${String(report.suffixed)}`);
    console.log(`[slugs] already correct    ${String(report.unchanged)}`);
    console.log(`[slugs] unaddressable      ${String(report.unaddressable.length)}`);
    for (const display of report.unaddressable.slice(0, 10)) {
      console.log(`[slugs]   no slug for ${JSON.stringify(display)}`);
    }
    console.log(`[slugs] elapsed            ${seconds}s`);

    if (report.stale.length > 0) {
      console.error(`[slugs] ${String(report.stale.length)} stored addresses are now stale:`);
      for (const s of report.stale.slice(0, 20)) {
        console.error(`[slugs]   ${s.surname_id}  stored ${s.stored}  computes ${s.computed}`);
      }
      console.error(
        "[slugs] retiring an address is a 301 and a decision (ADR-0010 §4); nothing was rewritten",
      );
      process.exitCode = 1;
    }
  } finally {
    await db.destroy();
  }
}

await main();
