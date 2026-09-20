#!/usr/bin/env tsx
/**
 * PESEL import CLI (TASK-004 §6 item 7). Invoked as `pnpm import:pesel` from
 * the repo root, or `pnpm import-pesel` from this package, in the style of
 * `packages/db/bin/migrate.ts`.
 *
 * It imports bytes that are ALREADY ON DISK. It never downloads: acquisition
 * of the official resources is manual and outside this process
 * (TASK-004 §4 precondition 7).
 *
 * Every provenance value is an explicit argument rather than a default,
 * because a wrong silent default here would attach real provenance to the
 * wrong bytes. In particular `--expected-sha256` is always given by the
 * operator: the registry's checksums belong to the full official resources,
 * and the repository's committed fixtures are excerpts of them, so this CLI
 * will not quietly pair one with the other (TASK-004 §12 rule 1).
 *
 * Exit codes: 0 when the run imported or found the bytes already imported,
 * 1 when it refused, aborted or failed — so a quarantine is a loud failure in
 * a shell or a CI job, not a silent zero.
 */
import { readFile } from "node:fs/promises";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import {
  PESEL_RESOURCE_ROLES,
  PESEL_SOURCE_REGISTRY,
  formatPeselImportReport,
  importPeselResource,
  isPeselResourceRole,
} from "../src/pesel/index.js";
import type { PeselResourceMetadata } from "../src/pesel/index.js";

function usage(): string {
  const reference = PESEL_RESOURCE_ROLES.map((role) => {
    const resource = PESEL_SOURCE_REGISTRY.resources[role];
    return (
      `  ${role}: resource ${resource.resource_id}, ` +
      `sha256 ${resource.official_csv_sha256}, retrieved ${resource.official_retrieved_at}`
    );
  }).join("\n");

  return [
    "Usage:",
    "  pnpm import-pesel --role=<role> --file=<path> --expected-sha256=<hex> \\",
    "                    --metadata=<path> --retrieved-at=<iso8601>",
    "",
    "Arguments (all required):",
    `  --role              one of: ${PESEL_RESOURCE_ROLES.join(", ")}`,
    "  --file              path to the CSV resource bytes already on disk",
    "  --expected-sha256   SHA-256 the bytes must hash to, lowercase hex",
    "  --metadata          path to the publisher's own resource-metadata JSON",
    "                      response, stored verbatim as SourceRecord.raw_payload",
    "  --retrieved-at      when those bytes were retrieved from the publisher",
    "",
    "Reference values for the FULL official resources.",
    "These are not the checksums of any fixture excerpt in this repository:",
    reference,
  ].join("\n");
}

function parseArgs(argv: readonly string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (const token of argv) {
    // `pnpm run <script> -- --flag=…` forwards the bare `--` separator to the
    // script, so skip it rather than rejecting an invocation that is correct.
    if (token === "--") {
      continue;
    }
    const match = /^--([a-z0-9-]+)=(.*)$/u.exec(token);
    if (!match) {
      throw new Error(`unrecognised argument ${JSON.stringify(token)}`);
    }
    const [, key, value] = match as unknown as [string, string, string];
    args.set(key, value);
  }
  return args;
}

function required(args: Map<string, string>, key: string): string {
  const value = args.get(key);
  if (value === undefined || value.trim() === "") {
    throw new Error(`--${key} is required`);
  }
  return value;
}

/**
 * Narrows a parsed JSON document to something storable in a `jsonb` column.
 *
 * A metadata capture must be a JSON object: a bare string or number would
 * store as a JSON scalar and silently lose the publisher's response.
 */
function asResourceMetadata(value: unknown, path: string): PeselResourceMetadata {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must contain a JSON object (the publisher's metadata response)`);
  }
  return value as PeselResourceMetadata;
}

function parseRetrievedAt(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`--retrieved-at is not a valid date: ${JSON.stringify(value)}`);
  }
  return parsed;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.has("help") || args.size === 0) {
    console.log(usage());
    return;
  }

  const role = required(args, "role");
  if (!isPeselResourceRole(role)) {
    throw new Error(
      `--role must be one of: ${PESEL_RESOURCE_ROLES.join(", ")} (got ${JSON.stringify(role)})`,
    );
  }
  const filePath = required(args, "file");
  const expectedSha256 = required(args, "expected-sha256");
  const metadataPath = required(args, "metadata");
  const retrievedAt = parseRetrievedAt(required(args, "retrieved-at"));

  const bytes = new Uint8Array(await readFile(filePath));
  const metadataText = await readFile(metadataPath, "utf8");
  const resourceMetadata = asResourceMetadata(JSON.parse(metadataText), metadataPath);

  const pool = createPool(loadDbConfig());
  const db = createDb(pool);
  try {
    const report = await importPeselResource(db, {
      role,
      bytes,
      expectedSha256,
      resourceMetadata,
      retrievedAt,
    });
    console.log(`[import-pesel] ${filePath}`);
    console.log(formatPeselImportReport(report));

    if (report.disposition === "ABORTED_QUARANTINE") {
      console.error(
        "[import-pesel] ABORTED: rows could not be attached to exactly one surname. " +
          "Nothing was written. Each row and its reason is listed below.",
      );
      for (const row of report.quarantined) {
        console.error(
          `[import-pesel]   line ${String(row.line)}: ${row.reason} ` +
            `${JSON.stringify(row.raw)}${
              row.candidateSurnameIds.length > 0
                ? ` candidates: ${row.candidateSurnameIds.join(", ")}`
                : ""
            }`,
        );
      }
      process.exitCode = 1;
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[import-pesel] failed:", err);
  process.exitCode = 1;
});
