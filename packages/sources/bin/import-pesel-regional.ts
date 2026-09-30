#!/usr/bin/env tsx
/**
 * PESEL regional resource import CLI (TASK-011).
 *
 *   pnpm --filter @name-atlas/sources run import-pesel-regional \
 *     --resource 1148786 \
 *     --file /path/to/regional.csv \
 *     --metadata /path/to/resource-metadata.json \
 *     [--sha256 <expected>]
 *
 * Downloads nothing; the file must already be on disk. `--sha256` defaults to
 * the official checksum recorded for the resource in the registry — pass it
 * explicitly when importing a fixture excerpt, which has its own.
 *
 * Exits non-zero on any failure, so a refused import is never mistaken for a
 * completed one.
 */
import { readFile } from "node:fs/promises";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { findPeselEdition } from "../src/registry.js";
import { importPeselRegionalResource } from "../src/regional-importer.js";
import type { RegionalReconciliationReport } from "../src/import-result.js";

interface Args {
  readonly resource: string;
  readonly file: string;
  readonly metadata: string;
  readonly sha256: string | undefined;
}

function parseArgs(argv: readonly string[]): Args {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined || !arg.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`missing value for ${arg}`);
    }
    values.set(arg.slice(2), next);
    i += 1;
  }
  const resource = values.get("resource");
  const file = values.get("file");
  const metadata = values.get("metadata");
  if (!resource || !file || !metadata) {
    throw new Error(
      "usage: import-pesel-regional --resource <id> --file <csv> --metadata <json> [--sha256 <hex>]",
    );
  }
  return { resource, file, metadata, sha256: values.get("sha256") };
}

function printReport(report: RegionalReconciliationReport): void {
  console.log(`[regional] resource            ${report.resourceId}`);
  console.log(`[regional] rows read           ${report.rowsRead}`);
  if (report.rowsNotInCurrentRegister > 0) {
    console.log(
      `[regional] rows not written    ${report.rowsNotInCurrentRegister} (an edition's surnames absent from the current register)`,
    );
  }
  console.log(`[regional] rows imported       ${report.rowsImported}`);
  console.log(`[regional] rows quarantined    ${report.rowsQuarantined}`);
  for (const [reason, count] of Object.entries(report.quarantinedByReason)) {
    console.log(`[regional]   ${reason}: ${count}`);
  }
  console.log(`[regional] surnames created    ${report.surnamesCreated}`);
  console.log(`[regional] surnames reused     ${report.surnamesReused}`);
  console.log(`[regional] snapshots written   ${report.snapshotsWritten}`);
  console.log(`[regional] values written      ${report.valuesWritten}`);
  console.log(`[regional] places referenced   ${report.placesReferenced}`);
  console.log(`[regional] regional count sum  ${report.regionalCountSum} (reported, not compared)`);
  console.log(`[regional] no national row     ${report.surnamesWithoutNationalRow}`);
  console.log(
    `[regional] mixed-script rows   ${report.mixedScriptRows.length} (imported, flagged)`,
  );
  for (const row of report.mixedScriptRows) {
    console.log(`[regional]   line ${row.line}: ${row.surname} — MIXED_SCRIPT_REVIEW persisted`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const resource = findPeselEdition(args.resource);
  if (!resource) {
    throw new Error(
      `${args.resource} is not a registered PESEL resource or edition. ` +
        "Approved resources are listed in packages/sources/src/registry.ts.",
    );
  }
  if (!resource.role.startsWith("regional")) {
    throw new Error(
      `${args.resource} is a ${resource.role} resource; use import-pesel for national resources`,
    );
  }

  const bytes = await readFile(args.file);
  const rawPayload: unknown = JSON.parse(await readFile(args.metadata, "utf8"));
  const db = createDb(createPool(loadDbConfig()));
  try {
    const outcome = await importPeselRegionalResource(db, {
      resource,
      bytes,
      expectedSha256: args.sha256 ?? resource.official_sha256,
      rawPayload,
    });
    switch (outcome.kind) {
      case "IMPORTED":
        console.log(`[regional] IMPORTED source_record ${outcome.sourceRecordId}`);
        if (outcome.supersededSourceRecordId) {
          console.log(`[regional] superseded          ${outcome.supersededSourceRecordId}`);
        }
        printReport(outcome.report);
        break;
      case "ALREADY_IMPORTED":
        console.log(
          `[regional] ALREADY IMPORTED — identical bytes already stored as source_record ` +
            `${outcome.sourceRecordId}. Nothing written.`,
        );
        printReport(outcome.report);
        break;
      case "FAILED":
        console.error(`[regional] FAILED (${outcome.reason}): ${outcome.message}`);
        for (const row of outcome.quarantined) {
          console.error(`[regional]   line ${row.line}: ${row.surname} — ${row.reason}`);
        }
        if (outcome.report) printReport(outcome.report);
        process.exitCode = 1;
        break;
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[regional] unexpected error:", err);
  process.exitCode = 1;
});
