#!/usr/bin/env tsx
/**
 * Onomastic source import CLI (TASK-022, ADR-0008).
 *
 *   pnpm --filter @name-atlas/sources run import-onomastics \
 *     --file /path/to/work.json \
 *     [--url https://…] \
 *     [--allow-synthetic]
 *
 * Downloads nothing: the file must already be on disk. There is no connector
 * for a specialist onomastic source and `docs/canonical/12` line 764 is why —
 * IJP PAN is **PARTNER P0**, "no production cache without agreement".
 *
 * `--allow-synthetic` imports a file marked `"synthetic": true`. Only use it for
 * the committed test fixtures. Without it such a file is refused, so a fixture
 * of invented etymology cannot become a production claim by accident.
 *
 * Importing stores; it does not derive. Run `pnpm demo:surname-meaning` after,
 * or the worker's derivation job.
 *
 * Exits non-zero on any refusal, so a refused import is never mistaken for a
 * successful one.
 */
import { readFile } from "node:fs/promises";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { importOnomasticSource } from "../src/onomastics.js";

function arg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function main(): Promise<void> {
  const file = arg("file");
  if (!file) {
    process.stderr.write(
      "usage: import-onomastics --file <path> [--url <u>] [--allow-synthetic]\n",
    );
    process.exit(2);
  }

  const bytes = await readFile(file);
  const db = createDb(createPool(loadDbConfig()));
  try {
    const outcome = await importOnomasticSource(db, {
      bytes,
      sourceUrl: arg("url"),
      allowSynthetic: process.argv.includes("--allow-synthetic"),
    });

    if (outcome.kind === "REFUSED") {
      process.stderr.write(`REFUSED (${outcome.reason_code})\n`);
      for (const problem of outcome.problems) process.stderr.write(`  - ${problem}\n`);
      process.exit(1);
    }
    if (outcome.kind === "ALREADY_IMPORTED") {
      process.stdout.write(
        `ALREADY_IMPORTED — identical bytes are already stored as source record ` +
          `${outcome.source_record_id}; nothing was written\n`,
      );
      return;
    }
    process.stdout.write(
      `IMPORTED — source ${outcome.source_id}, record ${outcome.source_record_id}, ` +
        `${String(outcome.entries)} entries stored\n`,
    );
  } finally {
    await db.destroy();
  }
}

await main();
