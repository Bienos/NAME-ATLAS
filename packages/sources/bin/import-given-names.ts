#!/usr/bin/env tsx
/**
 * PESEL given-name list import CLI (TASK-078, ADR-0031).
 *
 *   pnpm import:given-names --resource 1159669 --file first-male.csv --metadata resource.json [--sha256 <hex>]
 *
 * Downloads nothing: the file must already be on disk. `--sha256` defaults to
 * the resource's official checksum; pass a fixture's own when importing an
 * excerpt. Exits non-zero on any failure.
 */
import { readFile } from "node:fs/promises";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { GIVEN_NAME_RESOURCES_2026 } from "../src/given-names/registry.js";
import { importGivenNameResource } from "../src/given-names/importer.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const resourceId = arg("resource");
const file = arg("file");
const metadata = arg("metadata");
if (!resourceId || !file || !metadata) {
  console.error(
    "usage: import-given-names --resource <id> --file <csv> --metadata <json> [--sha256 <hex>]",
  );
  process.exit(2);
}
const resource = GIVEN_NAME_RESOURCES_2026.find((r) => r.resource_id === resourceId);
if (!resource) {
  console.error(
    `unknown resource ${resourceId}; known: ${GIVEN_NAME_RESOURCES_2026.map((r) => r.resource_id).join(", ")}`,
  );
  process.exit(2);
}

const db = createDb(createPool(loadDbConfig()));
try {
  const outcome = await importGivenNameResource(db, {
    resource,
    bytes: new Uint8Array(await readFile(file)),
    expectedSha256: arg("sha256") ?? resource.official_sha256,
    rawPayload: JSON.parse(await readFile(metadata, "utf8")),
  });
  if (outcome.kind === "FAILED") {
    console.error(`[given-names] FAILED ${outcome.reason}: ${outcome.message}`);
    process.exitCode = 1;
  } else {
    const r = outcome.report;
    console.log(`[given-names] ${outcome.kind} resource ${r.resourceId}`);
    console.log(`[given-names] rows read          ${r.rowsRead} (${r.peopleRead} people)`);
    console.log(
      `[given-names] names imported     ${r.namesImported} (${r.namesCreated} new, ${r.namesReused} reused, ${r.namesFlagged} flagged for review)`,
    );
    for (const p of r.placeholders) {
      console.log(`[given-names] placeholder        ${JSON.stringify(p.marker)} ${p.count} people`);
    }
  }
} finally {
  await db.destroy();
}
