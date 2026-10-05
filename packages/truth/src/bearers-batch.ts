import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { storeWikidataBearers } from "@name-atlas/sources";
import type { WikidataBatchOutcome } from "@name-atlas/sources";
import { deriveNotableBearers } from "./bearers.js";
import type { BearersCandidate } from "./bearers.js";

/**
 * The bearers load in batches (TASK-140, ADR-0044): every surname of a rank
 * selection, many to a Wikidata query instead of one, each stored and derived
 * exactly as one surname is (`storeWikidataBearers`, `deriveNotableBearers`).
 *
 * The next batch is asked for while this one is written, so the database's
 * work overlaps Wikidata's; queries themselves stay one at a time, since a
 * batch's queries run in order and the next batch starts only when this one
 * has its answers. Resumable as the one-by-one load is: a surname that fails
 * is logged and left for the next run, which `selectBearersCandidates` gives
 * it again.
 */

/**
 * How many surnames go into one batch, by the best rank of the batch's first:
 * a common surname has more people in Wikidata, so fewer go together. Measured
 * against the query service on 2026-10-05, details queries and pacing
 * included: 50 surnames ranked 2,001–10,000 in 2–5 s; 200 ranked
 * 10,001–50,000 in 17–36 s, too near the service's 60 s limit, hence 100; 400
 * ranked below 50,000 in 2–12 s. A batch that runs out of time is split anyway
 * (`fetchWikidataBearersBatch`).
 */
export function bearersBatchSize(bestRank: number): number {
  if (bestRank <= 10_000) return 50;
  if (bestRank <= 50_000) return 100;
  return 400;
}

/** Consecutive batches in which every surname failed, after which the load stops. */
export const MAX_FAILED_BATCHES = 10;

/** The candidates in batches, in order, each batch's size set by its first surname. */
export function bearersBatches(
  candidates: readonly BearersCandidate[],
  sizeFor: (bestRank: number) => number = bearersBatchSize,
): readonly (readonly BearersCandidate[])[] {
  const batches: BearersCandidate[][] = [];
  let at = 0;
  while (at < candidates.length) {
    const first = candidates[at];
    if (first === undefined) break;
    const size = Math.max(1, sizeFor(first.best_rank));
    batches.push(candidates.slice(at, at + size));
    at += size;
  }
  return batches;
}

export interface BearersLoadTally {
  stored: number;
  unchanged: number;
  derived: number;
  failed: number;
}

export async function loadBearersInBatches(
  db: Kysely<DB>,
  input: {
    readonly sourceId: string;
    readonly candidates: readonly BearersCandidate[];
    readonly fetchBatch: (surnames: readonly string[]) => Promise<readonly WikidataBatchOutcome[]>;
    readonly sizeFor?: (bestRank: number) => number;
    readonly log?: (line: string) => void;
  },
): Promise<{ readonly tally: BearersLoadTally; readonly stopped: boolean }> {
  const log = input.log ?? (() => undefined);
  const batches = bearersBatches(input.candidates, input.sizeFor);
  const total = input.candidates.length;
  const tally: BearersLoadTally = { stored: 0, unchanged: 0, derived: 0, failed: 0 };
  const ask = (batch: readonly BearersCandidate[]) =>
    input.fetchBatch(batch.map((c) => c.display_name));

  let done = 0;
  let failedInARow = 0;
  let next = batches[0] === undefined ? null : ask(batches[0]);
  for (const [b, batch] of batches.entries()) {
    const t0 = Date.now();
    const outcomes = await (next as Promise<readonly WikidataBatchOutcome[]>);
    const following = batches[b + 1];
    next = following === undefined ? null : ask(following);
    // A rejected next batch must not go unhandled while this one is written.
    next?.catch(() => undefined);
    const fetchedIn = Date.now() - t0;

    if (outcomes.length !== batch.length) {
      throw new Error(
        `a batch of ${String(batch.length)} came back with ${String(outcomes.length)}`,
      );
    }
    let failedHere = 0;
    for (const [i, candidate] of batch.entries()) {
      const outcome = outcomes[i];
      done += 1;
      const where = `${String(done)}/${String(total)} ${candidate.display_name}`;
      if (outcome === undefined || outcome.surname !== candidate.display_name) {
        throw new Error(`${where}: the batch answered for ${outcome?.surname ?? "nobody"}`);
      }
      if ("error" in outcome) {
        tally.failed += 1;
        failedHere += 1;
        log(`${where}: skipped, ${outcome.error.name}: ${outcome.error.message}`);
        continue;
      }
      const stored = await storeWikidataBearers(db, {
        sourceId: input.sourceId,
        surnameId: candidate.surname_id,
        fetched: outcome.fetched,
      });
      const derived = await deriveNotableBearers(db, candidate.surname_id);
      tally[stored.status === "STORED" ? "stored" : "unchanged"] += 1;
      if (derived.status === "DERIVED") tally.derived += 1;
      const people = outcome.fetched.bearers;
      log(
        `${where}: ${stored.status.toLowerCase()}, claim ${derived.status.toLowerCase()}, ` +
          `${String(people.total)} people, ${String(people.with_death_date)} with a date of death, ` +
          `${String(people.bearers.length)} kept`,
      );
    }
    log(
      `batch ${String(b + 1)}/${String(batches.length)}: ${String(batch.length)} surnames, ` +
        `${String(failedHere)} skipped, ${String(fetchedIn)} ms waiting for its answers, ` +
        `${String(Date.now() - t0)} ms in all`,
    );
    failedInARow = failedHere === batch.length ? failedInARow + 1 : 0;
    if (failedInARow >= MAX_FAILED_BATCHES) {
      log(`${String(failedInARow)} batches in a row failed entirely; stopping`);
      await next?.catch(() => undefined);
      return { tally, stopped: true };
    }
  }
  return { tally, stopped: false };
}
