#!/usr/bin/env tsx
/**
 * First-name meaning file import CLI (TASK-147, ADR-0045).
 *
 *   pnpm import:given-name-meanings --file sources/given-name-meanings/buryan-1933.json \
 *     [--file sources/given-name-meanings/yonge-1884.json] [--allow-synthetic]
 *
 * Downloads nothing: each file is already on disk. Importing stores; it does
 * not derive. Run `pnpm truth:derive-given-name-meanings` after every file is
 * imported.
 *
 * Exits non-zero on any refusal, so a refused import is never mistaken for a
 * successful one.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { importGivenNameMeanings } from "../src/given-names/meanings.js";

/** Every `--file`, from where the command was typed (pnpm runs this in the package). */
function files(): string[] {
  const from = process.env["INIT_CWD"] ?? process.cwd();
  const out: string[] = [];
  process.argv.forEach((value, i) => {
    const next = process.argv[i + 1];
    if (value === "--file" && next !== undefined) out.push(path.resolve(from, next));
  });
  return out;
}

async function main(): Promise<void> {
  const paths = files();
  if (paths.length === 0) {
    process.stderr.write("usage: import-given-name-meanings --file <path> [--file <path>…]\n");
    process.exit(2);
  }

  const db = createDb(createPool(loadDbConfig()));
  try {
    for (const path of paths) {
      const outcome = await importGivenNameMeanings(db, {
        bytes: await readFile(path),
        allowSynthetic: process.argv.includes("--allow-synthetic"),
      });
      if (outcome.kind === "REFUSED") {
        process.stderr.write(`${path}: REFUSED (${outcome.reason_code})\n`);
        for (const problem of outcome.problems) process.stderr.write(`  - ${problem}\n`);
        process.exitCode = 1;
        continue;
      }
      if (outcome.kind === "ALREADY_IMPORTED") {
        process.stdout.write(
          `${path}: ALREADY_IMPORTED — record ${outcome.source_record_id}; nothing was written\n`,
        );
        continue;
      }
      process.stdout.write(
        `${path}: IMPORTED — source ${outcome.source_id}, record ${outcome.source_record_id}, ` +
          `${String(outcome.entries)} entries` +
          (outcome.supersedes_source_record_id
            ? `; it replaces record ${outcome.supersedes_source_record_id}, now UPDATED`
            : "") +
          "\n",
      );
    }
  } finally {
    await db.destroy();
  }
}

await main();
