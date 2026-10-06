#!/usr/bin/env tsx
/**
 * Derives `GIVEN_NAME_BIRTH_COUNT`, `GIVEN_NAME_BIRTH_RANK` and
 * `GIVEN_NAME_BIRTH_TREND` from the stored lists of first names given to
 * children (TASK-137, ADR-0043), for every name or for one: `--name ZOFIA`.
 * Idempotent: a claim that stands is reused, and a second run writes nothing.
 * A rank is refused, never computed, for a list that is not the complete
 * official file.
 *
 *   pnpm truth:derive-given-name-births
 *   pnpm truth:derive-given-name-births -- --name ZOFIA
 *   pnpm truth:derive-given-name-births -- --limit 1000 --concurrency 4
 *
 * It writes: `DATABASE_URL` must be a role that may insert claims.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { deriveAllBirthNames, deriveBirthName } from "../src/given-name-births.js";

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
    const outcome = await deriveBirthName(db, name);
    console.log(JSON.stringify(outcome, null, 2));
    if (outcome.kind !== "DERIVED") process.exitCode = 1;
  } else {
    const started = Date.now();
    const tally = await deriveAllBirthNames(db, {
      concurrency,
      ...(limit === undefined ? {} : { limit }),
      onProgress: (n) => {
        if (n % 1_000 === 0) console.error(`[given-name-births] ${n} names`);
      },
    });
    console.log(JSON.stringify(tally, null, 2));
    console.error(`[given-name-births] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
} finally {
  await db.destroy();
}
