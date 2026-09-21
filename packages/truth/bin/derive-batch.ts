#!/usr/bin/env tsx
/**
 * Batch derivation over the register (TASK-028).
 *
 *   pnpm truth:derive-batch [--limit N] [--concurrency C] [--all]
 *
 * Derives `CURRENT_POPULATION` and `CURRENT_DISTRIBUTION` for the surnames that
 * can carry both, which is what `docs/canonical/21` §42 needs before a page may
 * be indexed.
 *
 * **It targets the surnames that have regional evidence, not every surname.**
 * 598,476 surnames are in the register and 270,021 appear in the regional
 * resources at all; the rest are published nationally and suppressed regionally,
 * so they can never have a second value family and a page for them would be the
 * thin page §43 says to withhold. Deriving for them is not wrong — it makes
 * their page better — but it cannot make them indexable, so it is not what this
 * job is for. `--all` derives population for every surname anyway.
 *
 * Resumable: a surname that already carries both claim types is skipped, so an
 * interrupted run continues rather than restarting. Ordered by `surname_id`, so
 * "where it got to" is a position rather than a guess.
 *
 * Idempotent, because the derivations are: re-running writes nothing new.
 */
import { sql } from "kysely";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import type { DB } from "@name-atlas/db";
import type { Kysely } from "kysely";
import { deriveCurrentPopulation } from "../src/derive.js";
import { deriveCurrentDistribution } from "../src/distribution.js";
import type { UniverseSizeCache } from "../src/universe.js";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const limit = Number(flag("limit") ?? "0") || Number.POSITIVE_INFINITY;
const concurrency = Math.max(1, Math.min(32, Number(flag("concurrency") ?? "8")));
const all = process.argv.includes("--all");
const BATCH = 2_000;

interface Row {
  readonly surname_id: string;
  readonly canonical_display: string;
}

/**
 * The next batch of surnames still needing work, ordered by id.
 *
 * "Still needing work" is asked of the claims table rather than tracked in a
 * file, so a run that died and a run that never started look the same.
 */
async function nextBatch(db: Kysely<DB>, after: string | null): Promise<readonly Row[]> {
  const rows = await sql<Row>`
    SELECT s.surname_id::text AS surname_id, s.canonical_display
      FROM surnames s
     WHERE s.entity_status = 'ACTIVE'
       ${after === null ? sql`` : sql`AND s.surname_id > ${after}::uuid`}
       ${
         all
           ? sql``
           : sql`AND EXISTS (
               SELECT 1 FROM distribution_snapshots ds
                WHERE ds.surname_id = s.surname_id AND ds.geography_level = 'REGION'
             )`
       }
       AND NOT (
         EXISTS (SELECT 1 FROM claims c WHERE c.subject_entity_id = s.surname_id
                   AND c.claim_type = 'CURRENT_POPULATION' AND c.claim_status = 'ACTIVE')
         AND
         EXISTS (SELECT 1 FROM claims c WHERE c.subject_entity_id = s.surname_id
                   AND c.claim_type = 'CURRENT_DISTRIBUTION' AND c.claim_status = 'ACTIVE')
       )
     ORDER BY s.surname_id
     LIMIT ${BATCH}
  `.execute(db);
  return rows.rows;
}

async function main(): Promise<void> {
  const db = createDb(createPool(loadDbConfig()));
  // One cache for the whole run. The completeness count is 379 ms against the
  // real register and identical for every surname; without this the job spends
  // essentially all of its time re-counting the same rows.
  const cache: UniverseSizeCache = new Map();
  const started = Date.now();
  let done = 0;
  let failed = 0;
  let after: string | null = null;

  try {
    while (done < limit) {
      const batch = await nextBatch(db, after);
      if (batch.length === 0) break;

      for (let i = 0; i < batch.length; i += concurrency) {
        const slice = batch.slice(i, i + concurrency);
        await Promise.all(
          slice.map(async (row) => {
            try {
              await deriveCurrentPopulation(db, row.canonical_display, {
                universeSizeCache: cache,
              });
              if (!all) {
                await deriveCurrentDistribution(db, row.canonical_display, {
                  universeSizeCache: cache,
                });
              }
            } catch (cause: unknown) {
              failed += 1;
              // One surname failing is data, not a reason to abandon 248,000
              // others. It is counted and named, and the run continues.
              console.error(
                `[derive] FAILED ${row.canonical_display}: ${
                  cause instanceof Error ? cause.message : String(cause)
                }`,
              );
            }
          }),
        );
        done += slice.length;
        if (done % 2_000 < concurrency) {
          const rate = done / ((Date.now() - started) / 1000);
          console.log(
            `[derive] ${String(done)} done | ${rate.toFixed(1)}/s | ${String(failed)} failed`,
          );
        }
        if (done >= limit) break;
      }
      after = batch[batch.length - 1]?.surname_id ?? null;
    }

    const seconds = (Date.now() - started) / 1000;
    console.log(`[derive] finished ${String(done)} surnames in ${seconds.toFixed(1)}s`);
    console.log(`[derive] rate ${(done / seconds).toFixed(1)}/s | failed ${String(failed)}`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

await main();
