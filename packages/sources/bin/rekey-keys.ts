#!/usr/bin/env tsx
/**
 * Canonical-key re-key CLI (ADR-0005, D-013).
 *
 *   pnpm --filter @name-atlas/sources run rekey-keys [--dry-run]
 *
 * Run this once against any database populated before `canonical_key_v2`.
 * It recomputes `surnames.canonical_key` and `name_forms.search_key` from
 * the display forms already stored, stamps the current version, and writes
 * nothing if two rows would collide.
 *
 * Idempotent: a second run reports zero changes. Exits non-zero on failure
 * so a refused re-key is never mistaken for a completed one.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { CANONICAL_KEY_VERSION } from "@name-atlas/resolver";
import { rekeyCanonicalKeys } from "../src/rekey.js";

async function main(): Promise<void> {
  const dryRun = process.argv.slice(2).includes("--dry-run");
  const db = createDb(createPool(loadDbConfig()));
  try {
    const outcome = await rekeyCanonicalKeys(db, { dryRun });
    if (outcome.kind === "COLLISION") {
      console.error(
        `[rekey] REFUSED — ${outcome.collisions.length} key collision(s); nothing written.`,
      );
      for (const collision of outcome.collisions) {
        console.error(`[rekey]   ${collision.key}: ${collision.displays.join(", ")}`);
      }
      process.exitCode = 1;
      return;
    }
    const report = outcome.report;
    console.log(`[rekey] target version      ${CANONICAL_KEY_VERSION}`);
    console.log(`[rekey] surnames scanned    ${report.surnamesScanned}`);
    console.log(`[rekey] surnames re-keyed   ${report.surnamesRekeyed}`);
    console.log(`[rekey] surnames stamped    ${report.surnameVersionsStamped}`);
    console.log(`[rekey] name forms scanned  ${report.nameFormsScanned}`);
    console.log(`[rekey] name forms re-keyed ${report.nameFormsRekeyed}`);
    console.log(`[rekey] name forms stamped  ${report.nameFormVersionsStamped}`);
    console.log(`[rekey] ${report.applied ? "COMMITTED" : "DRY RUN — rolled back"}`);
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[rekey] unexpected error:", err);
  process.exitCode = 1;
});
