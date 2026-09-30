#!/usr/bin/env tsx
/**
 * Batch derivation of `SURNAME_DISTRIBUTION_SHIFT` over the register (TASK-046).
 *
 *   pnpm truth:derive-shift [--limit N] [--concurrency C] [--recheck]
 *
 * One claim per surname and list, for every surname that is on at least two of
 * a list's stored editions (ADR-0020). A surname on one edition only is not a
 * candidate: one edition is a count, and the derivation would refuse it.
 *
 * Which editions are stored is asked of the database once, at the start
 * (`loadOfficialEditions`): an `ACTIVE` source record whose content hash is the
 * registry's. An edition that is not loaded is not a point. So the run is
 * correct on a database that holds some of the editions, and the claims it
 * writes change, by a new claim key that supersedes the old one, when another
 * is loaded and the run is repeated.
 *
 * Resumable, and asked of the claims table rather than tracked in a file: a
 * surname is skipped while every list it is a candidate on already has an
 * `ACTIVE` claim with one point per loaded edition of that list. `--recheck`
 * lifts the skip and offers every candidate again, which is what to pass after
 * re-importing an edition; the derivation is idempotent, so what has not changed
 * writes nothing. Ordered by `surname_id`, so "where it got to" is a position.
 *
 * It is heavy: about 830,000 claims on the real register, each a research run,
 * one evidence item per known point, a derived item with its dependencies, the
 * claim, its confidence and its citation, in one transaction per claim.
 * One surname failing is counted and named and the run continues.
 */
import { sql } from "kysely";
import type { Kysely } from "kysely";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import type { DB } from "@name-atlas/db";
import {
  SHIFT_ROLES,
  deriveDistributionShiftFor,
  loadOfficialEditions,
  registryShiftEditions,
} from "../src/shift.js";
import type { LoadedEdition, ShiftEditionSet, ShiftRole } from "../src/shift.js";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const limit = Number(flag("limit") ?? "0") || Number.POSITIVE_INFINITY;
const concurrency = Math.max(1, Math.min(32, Number(flag("concurrency") ?? "8")));
const recheck = process.argv.includes("--recheck");
const BATCH = 2_000;

/** A surname as the derivation wants it: read straight from the table, not resolved from its spelling again. */
interface Row {
  readonly surname_id: string;
  readonly canonical_display: string;
  readonly canonical_key: string;
  readonly primary_script: string;
}

/**
 * The next batch of candidate surnames, ordered by id.
 *
 * `recordIds[i]` is a stored edition's source record and `roles[i]` the list it
 * belongs to. A candidate is on two or more records of one list; it is skipped
 * unless some such list lacks an up-to-date claim.
 */
async function nextBatch(
  db: Kysely<DB>,
  after: string | null,
  recordIds: readonly string[],
  roles: readonly ShiftRole[],
): Promise<readonly Row[]> {
  const rows = await sql<Row>`
    SELECT s.surname_id::text AS surname_id, s.canonical_display, s.canonical_key,
           s.primary_script::text AS primary_script
      FROM surnames s
     WHERE s.entity_status = 'ACTIVE'
       ${after === null ? sql`` : sql`AND s.surname_id > ${after}::uuid`}
       AND EXISTS (
         SELECT 1
           FROM (
             SELECT m.role, count(DISTINCT ds.source_record_id) AS n
               FROM distribution_snapshots ds
               JOIN unnest(${[...recordIds]}::uuid[], ${[...roles]}::text[])
                      AS m(source_record_id, role)
                 ON m.source_record_id = ds.source_record_id
              WHERE ds.surname_id = s.surname_id
              GROUP BY m.role
           ) e
          WHERE e.n >= 2
            ${
              recheck
                ? sql``
                : sql`AND NOT EXISTS (
                    SELECT 1 FROM claims c
                     WHERE c.subject_entity_id = s.surname_id
                       AND c.claim_type::text = 'SURNAME_DISTRIBUTION_SHIFT'
                       AND c.claim_status = 'ACTIVE'
                       AND c.structured_value->>'role' = e.role
                       AND jsonb_array_length(c.structured_value->'points') =
                           (SELECT count(*) FROM unnest(${[...roles]}::text[]) r WHERE r = e.role)
                  )`
            }
       )
     ORDER BY s.surname_id
     LIMIT ${BATCH}
  `.execute(db);
  return rows.rows;
}

/** The stored editions as two parallel arrays: the record, and the list it is an edition of. */
function recordsByRole(
  set: ShiftEditionSet,
  loaded: ReadonlyMap<string, LoadedEdition>,
): { recordIds: string[]; roles: ShiftRole[] } {
  const recordIds: string[] = [];
  const roles: ShiftRole[] = [];
  for (const role of SHIFT_ROLES) {
    for (const edition of set[role].editions) {
      const store = loaded.get(edition.resource_id);
      if (!store) continue;
      recordIds.push(store.source_record_id);
      roles.push(role);
    }
  }
  return { recordIds, roles };
}

async function main(): Promise<void> {
  const db = createDb(createPool(loadDbConfig()));
  const set = registryShiftEditions();
  const loaded = await loadOfficialEditions(db, set);
  const { recordIds, roles } = recordsByRole(set, loaded);
  for (const role of SHIFT_ROLES) {
    const n = roles.filter((r) => r === role).length;
    console.log(
      `[shift] ${role}: ${String(n)} of ${String(set[role].editions.length)} editions stored`,
    );
  }

  const started = Date.now();
  let done = 0;
  let created = 0;
  let failed = 0;
  let after: string | null = null;

  try {
    while (done < limit && recordIds.length > 0) {
      const batch = await nextBatch(db, after, recordIds, roles);
      if (batch.length === 0) break;

      for (let i = 0; i < batch.length; i += concurrency) {
        const slice = batch.slice(i, i + concurrency);
        await Promise.all(
          slice.map(async (row) => {
            try {
              const result = await deriveDistributionShiftFor(db, row, {
                editions: set,
                loadedEditions: loaded,
              });
              if (result.kind === "RESULT") {
                created += result.distribution_shift.filter((c) => c.created).length;
              }
            } catch (cause: unknown) {
              failed += 1;
              console.error(
                `[shift] FAILED ${row.canonical_display}: ${
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
            `[shift] ${String(done)} surnames | ${String(created)} claims written | ` +
              `${rate.toFixed(1)}/s | ${String(failed)} failed`,
          );
        }
        if (done >= limit) break;
      }
      after = batch[batch.length - 1]?.surname_id ?? null;
    }

    const seconds = (Date.now() - started) / 1000;
    console.log(
      `[shift] finished ${String(done)} surnames, ${String(created)} claims written, ` +
        `in ${seconds.toFixed(1)}s | failed ${String(failed)}`,
    );
    if (failed > 0) process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

await main();
