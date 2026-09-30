#!/usr/bin/env tsx
/**
 * TERYT TERC + SIMC import CLI (TASK-039).
 *
 *   pnpm import:teryt --terc /path/to/TERC_Urzedowy_2026-09-30.csv \
 *                     --simc /path/to/SIMC_Urzedowy_2026-09-30.csv \
 *                     [--sha256-terc <hex>] [--sha256-simc <hex>]
 *
 * Downloads nothing. The CSV members of the official zips must already be on
 * disk, outside the repository (docs/sources/INVENTORY.md §3). The expected
 * checksums default to the full files recorded in
 * `fixtures/teryt/source-manifest.json`; pass them explicitly for any other
 * bytes. `pl_teryt` must be registered first (`pnpm seed:sources`).
 *
 * Exits non-zero on any failure so a failed import is never mistaken for a
 * successful one.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { importTerytRegisters } from "../src/teryt/importer.js";
import type { TerytReconciliationReport } from "../src/teryt/importer.js";
import { readTerytManifest, terytFileInput } from "../src/teryt/manifest.js";

function parseArgs(argv: readonly string[]): Map<string, string> {
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
  if (!values.get("terc") || !values.get("simc")) {
    throw new Error(
      "usage: import-teryt --terc <TERC csv> --simc <SIMC csv> " +
        "[--sha256-terc <hex>] [--sha256-simc <hex>]",
    );
  }
  return values;
}

function printReport(report: TerytReconciliationReport): void {
  const lines: [string, string | number | null][] = [
    ["TERC rows read", report.tercRowsRead],
    ["TERC STAN_NA", report.tercReferenceDate],
    ["SIMC rows read", report.simcRowsRead],
    ["SIMC STAN_NA", report.simcReferenceDate],
    ["voivodeships created", report.voivodeshipsCreated],
    ["voivodeships reused", report.voivodeshipsReused],
    ["powiats created", report.powiatsCreated],
    ["gminas created", report.gminasCreated],
    ["gmina parts (no place)", report.gminaComponentsNotPlaces],
    ["localities created", report.localitiesCreated],
    ["  parts of a locality", report.partsOfLocalities],
    ...Object.entries(report.localitiesByPlaceType).map(([type, n]): [string, number] => [
      `  ${type}`,
      n,
    ]),
    ["places created", report.placesCreated],
    ["names created", report.namesCreated],
    ["external ids created", report.externalIdsCreated],
    ["memberships created", report.membershipsCreated],
    ["source records created", report.sourceRecordsCreated],
  ];
  for (const [label, value] of lines) {
    console.log(`[teryt] ${label.padEnd(24)} ${String(value)}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const manifest = readTerytManifest();
  // `pnpm --filter` runs this in the package directory; a relative path
  // means relative to where the command was typed.
  const resolve = (file: string) => path.resolve(process.env.INIT_CWD ?? process.cwd(), file);
  const [tercBytes, simcBytes] = await Promise.all([
    readFile(resolve(args.get("terc") ?? "")),
    readFile(resolve(args.get("simc") ?? "")),
  ]);
  const shaTerc = args.get("sha256-terc");
  const shaSimc = args.get("sha256-simc");

  const pool = createPool(loadDbConfig());
  const db = createDb(pool);
  try {
    const outcome = await importTerytRegisters(db, {
      terc: terytFileInput(manifest, "TERC", tercBytes, shaTerc ? { expectedSha256: shaTerc } : {}),
      simc: terytFileInput(manifest, "SIMC", simcBytes, shaSimc ? { expectedSha256: shaSimc } : {}),
    });
    switch (outcome.kind) {
      case "IMPORTED":
        console.log(
          `[teryt] IMPORTED — TERC record ${outcome.fileRecordIds.TERC}, ` +
            `SIMC record ${outcome.fileRecordIds.SIMC}`,
        );
        printReport(outcome.report);
        break;
      case "ALREADY_IMPORTED":
        console.log(
          "[teryt] ALREADY IMPORTED — identical bytes already stored as " +
            `${outcome.fileRecordIds.TERC} and ${outcome.fileRecordIds.SIMC}. Nothing written.`,
        );
        break;
      case "FAILED":
        console.error(`[teryt] FAILED (${outcome.reason}): ${outcome.message}`);
        for (const row of outcome.quarantined) {
          console.error(
            `[teryt]   ${row.file} line ${row.line} ${row.id ?? "-"}: ${row.reason} — ${row.detail}`,
          );
        }
        process.exitCode = 1;
        break;
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[teryt] unexpected error:", err);
  process.exitCode = 1;
});
