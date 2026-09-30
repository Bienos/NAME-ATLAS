#!/usr/bin/env tsx
/**
 * PESEL resource import CLI (TASK-004 §6 item 7).
 *
 *   pnpm --filter @name-atlas/sources run import-pesel \
 *     --resource 1148808 \
 *     --file /path/to/nazwiska_meskie.csv \
 *     --metadata /path/to/resource-metadata.json \
 *     [--sha256 <expected>]
 *
 * Downloads nothing. The file must already be on disk — acquisition is
 * manual and outside this process (TASK-004 §8).
 *
 * `--sha256` defaults to the official checksum recorded for the resource in
 * `fixtures/pesel/source-manifest.json`. Pass it explicitly when importing
 * an excerpt (a test fixture has its own, different checksum).
 *
 * Exits non-zero on any failure so a failed import is never mistaken for a
 * successful one.
 */
import { readFile } from "node:fs/promises";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { findPeselEdition } from "../src/registry.js";
import { importPeselResource } from "../src/importer.js";
import { parseSliceSpec } from "../src/slice.js";
import type { ReconciliationReport } from "../src/import-result.js";

interface Args {
  readonly resource: string;
  readonly file: string;
  readonly metadata: string;
  readonly sha256: string | undefined;
  readonly slice: string | undefined;
}

function parseArgs(argv: readonly string[]): Args {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined || !arg.startsWith("--")) {
      continue;
    }
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
      "usage: import-pesel --resource <id> --file <csv> --metadata <json> [--sha256 <hex>] " +
        "[--slice top:N|prefix:A-F]",
    );
  }
  return {
    resource,
    file,
    metadata,
    sha256: values.get("sha256"),
    slice: values.get("slice"),
  };
}

function printReport(report: ReconciliationReport): void {
  console.log(`[import] resource            ${report.resourceId}`);
  console.log(`[import] rows read           ${report.rowsRead}`);
  if (report.rowsExcludedBySlice > 0) {
    console.log(`[import] rows excluded       ${report.rowsExcludedBySlice} (by --slice)`);
    console.log(
      "[import]   this resource is now an INCOMPLETE universe: counts are true, " +
        "rank and rarity are withheld",
    );
  }
  if (report.rowsNotInCurrentRegister > 0) {
    console.log(
      `[import] rows not written    ${report.rowsNotInCurrentRegister} (an edition's surnames absent from the current register)`,
    );
  }
  console.log(`[import] rows imported       ${report.rowsImported}`);
  console.log(`[import] rows quarantined    ${report.rowsQuarantined}`);
  for (const [reason, count] of Object.entries(report.quarantinedByReason)) {
    console.log(`[import]   ${reason}: ${count}`);
  }
  console.log(`[import] surnames created    ${report.surnamesCreated}`);
  console.log(`[import] surnames reused     ${report.surnamesReused}`);
  console.log(`[import] snapshots written   ${report.snapshotsWritten}`);
  console.log(`[import] values written      ${report.valuesWritten}`);
  console.log(`[import] mixed-script rows   ${report.mixedScriptRows.length} (imported, flagged)`);
  for (const row of report.mixedScriptRows) {
    console.log(`[import]   line ${row.line}: ${row.surname} — MIXED_SCRIPT_REVIEW persisted`);
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

  const bytes = await readFile(args.file);
  const rawPayload: unknown = JSON.parse(await readFile(args.metadata, "utf8"));

  const config = loadDbConfig();
  const pool = createPool(config);
  const db = createDb(pool);

  try {
    const outcome = await importPeselResource(db, {
      resource,
      bytes,
      expectedSha256: args.sha256 ?? resource.official_sha256,
      rawPayload,
      ...(args.slice === undefined ? {} : { slice: parseSliceSpec(args.slice) }),
    });

    switch (outcome.kind) {
      case "IMPORTED":
        console.log(`[import] IMPORTED source_record ${outcome.sourceRecordId}`);
        if (outcome.supersededSourceRecordId) {
          console.log(`[import] superseded          ${outcome.supersededSourceRecordId}`);
        }
        printReport(outcome.report);
        break;
      case "ALREADY_IMPORTED":
        console.log(
          `[import] ALREADY IMPORTED — identical bytes already stored as ` +
            `source_record ${outcome.sourceRecordId}. Nothing written.`,
        );
        printReport(outcome.report);
        break;
      case "FAILED":
        console.error(`[import] FAILED (${outcome.reason}): ${outcome.message}`);
        for (const row of outcome.quarantined) {
          console.error(`[import]   line ${row.line}: ${row.surname} — ${row.reason}`);
        }
        if (outcome.report) {
          printReport(outcome.report);
        }
        process.exitCode = 1;
        break;
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[import] unexpected error:", err);
  process.exitCode = 1;
});
