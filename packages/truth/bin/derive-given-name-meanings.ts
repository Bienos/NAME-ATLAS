#!/usr/bin/env tsx
/**
 * Derives `GIVEN_NAME_MEANING` (TASK-147, ADR-0045) for every first name an
 * imported first-name meaning file holds, or for one: `--name MAŁGORZATA`.
 * Idempotent: a claim whose works are unchanged stands; one whose works
 * changed is superseded; one no file supports any more is retracted.
 *
 *   pnpm truth:derive-given-name-meanings
 *   pnpm truth:derive-given-name-meanings -- --name MAŁGORZATA
 *
 * The tally is the one JSON document on stdout. It writes: `DATABASE_URL`
 * must be a role that may insert claims.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { deriveAllGivenNameMeanings, deriveGivenNameMeaning } from "../src/given-name-meaning.js";

const nameAt = process.argv.indexOf("--name");
const name = nameAt === -1 ? undefined : process.argv[nameAt + 1]?.trim();
if (nameAt !== -1 && (name === undefined || name === "" || name.startsWith("--"))) {
  console.error("--name needs a name");
  process.exit(2);
}
const db = createDb(createPool(loadDbConfig()));
try {
  if (name !== undefined) {
    const outcome = await deriveGivenNameMeaning(db, name);
    console.log(JSON.stringify(outcome, null, 2));
    if (outcome.kind === "NOT_FOUND") process.exitCode = 1;
  } else {
    console.log(JSON.stringify(await deriveAllGivenNameMeanings(db), null, 2));
  }
} finally {
  await db.destroy();
}
