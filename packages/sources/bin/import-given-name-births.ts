#!/usr/bin/env tsx
/**
 * Import CLI for first names given to children, by year (TASK-136, ADR-0042).
 *
 *   pnpm import:given-name-births --resource 21457 --file names.csv --metadata resource.json [--sha256 <hex>]
 *
 * Downloads nothing: the file must already be on disk. `--sha256` defaults to
 * the resource's official checksum; pass a fixture's own when importing an
 * excerpt. Exits non-zero on any failure.
 */
import { readFile } from "node:fs/promises";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { BIRTH_NAME_RESOURCES } from "../src/given-names/births-registry.js";
import { importBirthNameResource } from "../src/given-names/births-importer.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const resourceId = arg("resource");
const file = arg("file");
const metadata = arg("metadata");
if (!resourceId || !file || !metadata) {
  console.error(
    "usage: import-given-name-births --resource <id> --file <csv> --metadata <json> [--sha256 <hex>]",
  );
  process.exit(2);
}
const resource = BIRTH_NAME_RESOURCES.find((r) => r.resource_id === resourceId);
if (!resource) {
  console.error(
    `unknown resource ${resourceId}; known: ${BIRTH_NAME_RESOURCES.map((r) => r.resource_id).join(", ")}`,
  );
  process.exit(2);
}

const db = createDb(createPool(loadDbConfig()));
try {
  const outcome = await importBirthNameResource(db, {
    resource,
    bytes: new Uint8Array(await readFile(file)),
    expectedSha256: arg("sha256") ?? resource.official_sha256,
    rawPayload: JSON.parse(await readFile(metadata, "utf8")),
  });
  if (outcome.kind === "FAILED") {
    console.error(`[given-name-births] FAILED ${outcome.reason}: ${outcome.message}`);
    process.exitCode = 1;
  } else {
    const r = outcome.report;
    console.log(`[given-name-births] ${outcome.kind} resource ${r.resourceId}`);
    console.log(
      `[given-name-births] rows read       ${r.rowsRead} (${r.peopleRead} children), ` +
        `${r.namesImported} counts imported, ${r.namesCreated} new names, ${r.namesFlagged} flagged`,
    );
    for (const l of r.lists) {
      const placeholders = l.placeholders.map((p) => `${JSON.stringify(p.marker)} ${p.count}`);
      console.log(
        `[given-name-births] ${l.birthYear} ${l.sex.padEnd(6)} cut-off ${l.publicationThreshold}: ` +
          `${l.rowsRead} rows, ${l.peopleRead} children` +
          (placeholders.length > 0 ? `, placeholders ${placeholders.join(", ")}` : ""),
      );
    }
  }
} finally {
  await db.destroy();
}
