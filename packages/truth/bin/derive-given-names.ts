#!/usr/bin/env tsx
/**
 * Derives `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` for every stored given
 * name (TASK-121), or for one: `--name ANNA`. Idempotent: a claim that stands
 * is reused. A rank is refused, never computed, for a list whose stored names
 * are not the complete official file.
 *
 *   pnpm truth:derive-given-names
 *   pnpm truth:derive-given-names -- --name ANNA
 *   pnpm truth:derive-given-names -- --limit 1000 --concurrency 4
 *
 * It writes: `DATABASE_URL` must be a role that may insert claims.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { deriveAllGivenNames, deriveGivenName } from "../src/given-name.js";

function flag(name: string): number | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = Number(process.argv[i + 1]);
  if (!Number.isInteger(value) || value < 1) {
    console.error(`--${name} needs a positive whole number`);
    process.exit(2);
  }
  return value;
}

const nameAt = process.argv.indexOf("--name");
const name = nameAt === -1 ? undefined : process.argv[nameAt + 1]?.trim();
if (nameAt !== -1 && (name === undefined || name === "" || name.startsWith("--"))) {
  console.error("--name needs a name");
  process.exit(2);
}
const concurrency = flag("concurrency") ?? 4;
const limit = flag("limit");
const db = createDb(createPool(loadDbConfig(), { max: concurrency + 1 }));
try {
  if (name !== undefined) {
    const outcome = await deriveGivenName(db, name);
    console.log(JSON.stringify(outcome, null, 2));
    if (outcome.kind !== "DERIVED") process.exitCode = 1;
  } else {
    const started = Date.now();
    const tally = await deriveAllGivenNames(db, {
      concurrency,
      ...(limit === undefined ? {} : { limit }),
      onProgress: (n) => {
        if (n % 10_000 === 0) console.error(`[given-names] ${n} names`);
      },
    });
    console.log(JSON.stringify(tally, null, 2));
    console.error(`[given-names] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
} finally {
  await db.destroy();
}
