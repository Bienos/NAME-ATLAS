#!/usr/bin/env tsx
/**
 * Loads the known bearers of surnames from Wikidata (TASK-073, ADR-0030; in
 * batches since TASK-140, ADR-0044).
 *
 *   pnpm truth:bearers-load --top-rank 2000 [--limit N] [--refresh-days 30]
 *   pnpm truth:bearers-load --surname ZAREMBA
 *
 * Every surname ranked within `--top-rank` in either register list, best rank
 * first, in batches (`loadBearersInBatches`: 50, 100 or 400 surnames to a
 * Wikidata query, by rank); any rank of 301,370 or more takes every surname.
 * Each surname's summary is stored as a source record and its
 * `NOTABLE_BEARERS` claim derived, exactly as before. `--surname` asks for one
 * surname with its own two queries (`fetchWikidataBearers`), as a removal
 * request needs (ADR-0030 §2.5).
 *
 * Resumable and idempotent, as `archive-load` is: a surname queried within
 * `--refresh-days` is not queried again; a surname whose queries fail, or whose
 * answers do not parse, is logged and left for the next run; ten failures in a
 * row (ten whole batches, in batches) stop the run.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { resolveSurname } from "@name-atlas/resolver";
import {
  WikidataPacer,
  WikidataRequestError,
  WikidataShapeError,
  ensureWikidataSource,
  fetchWikidataBearers,
  fetchWikidataBearersBatch,
  storeWikidataBearers,
} from "@name-atlas/sources";
import { deriveNotableBearers, selectBearersCandidates } from "../src/bearers.js";
import { loadBearersInBatches } from "../src/bearers-batch.js";
import type { BearersCandidate } from "../src/bearers.js";
import { BEARERS_REFRESH_DAYS } from "../src/version.js";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const MAX_CONSECUTIVE_FAILURES = 10;

async function main(): Promise<void> {
  const pool = createPool(loadDbConfig());
  const db = createDb(pool);
  const startedAt = Date.now();
  try {
    const sourceId = await ensureWikidataSource(db);

    let candidates: BearersCandidate[];
    const one = flag("surname");
    if (one !== undefined) {
      const lookup = await resolveSurname(db, one);
      const resolution = lookup.kind === "RESOLUTION" ? lookup.resolution : null;
      const id = resolution?.resolution_status === "EXACT" ? resolution.resolved_surname_id : null;
      if (!resolution || !id) {
        console.error(`[bearers-load] ${one}: not an exact register surname`);
        process.exitCode = 1;
        return;
      }
      candidates = [
        {
          surname_id: id,
          display_name: resolution.resolved_canonical_display ?? one,
          best_rank: 0,
        },
      ];
    } else {
      const topRank = Number(flag("top-rank") ?? "0");
      if (!Number.isInteger(topRank) || topRank < 1) {
        console.error("[bearers-load] --top-rank N (N ≥ 1) or --surname NAME is required");
        process.exitCode = 1;
        return;
      }
      candidates = await selectBearersCandidates(db, {
        topRank,
        refreshDays: Number(flag("refresh-days") ?? String(BEARERS_REFRESH_DAYS)),
        limit: Number(flag("limit") ?? "0") || undefined,
      });
    }
    console.log(`[bearers-load] ${String(candidates.length)} surnames to query`);

    const pacer = new WikidataPacer({
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: () => Date.now(),
    });
    if (one === undefined) {
      const { tally, stopped } = await loadBearersInBatches(db, {
        sourceId,
        candidates,
        fetchBatch: (surnames) => fetchWikidataBearersBatch(surnames, pacer),
        log: (line) => console.log(`[bearers-load] ${line}`),
      });
      if (stopped) process.exitCode = 1;
      console.log(
        `[bearers-load] done in ${String(Math.round((Date.now() - startedAt) / 1000))} s: ` +
          `${String(tally.stored)} stored, ${String(tally.unchanged)} unchanged, ` +
          `${String(tally.derived)} claims derived, ${String(tally.failed)} skipped`,
      );
      return;
    }
    const tally = { stored: 0, unchanged: 0, derived: 0, failed: 0 };
    let consecutive = 0;
    for (const [index, candidate] of candidates.entries()) {
      const t0 = Date.now();
      const where = `${String(index + 1)}/${String(candidates.length)} ${candidate.display_name}`;
      try {
        const fetched = await fetchWikidataBearers(candidate.display_name, pacer);
        const stored = await storeWikidataBearers(db, {
          sourceId,
          surnameId: candidate.surname_id,
          fetched,
        });
        const derived = await deriveNotableBearers(db, candidate.surname_id);
        tally[stored.status === "STORED" ? "stored" : "unchanged"] += 1;
        if (derived.status === "DERIVED") tally.derived += 1;
        consecutive = 0;
        console.log(
          `[bearers-load] ${where}: ${stored.status.toLowerCase()}, claim ${derived.status.toLowerCase()}, ` +
            `${String(fetched.bearers.total)} people, ${String(fetched.bearers.with_death_date)} with a date of death, ` +
            `${String(fetched.bearers.bearers.length)} kept, ${String(Date.now() - t0)} ms`,
        );
      } catch (error) {
        if (!(error instanceof WikidataRequestError) && !(error instanceof WikidataShapeError)) {
          throw error;
        }
        tally.failed += 1;
        consecutive += 1;
        console.warn(`[bearers-load] ${where}: skipped, ${error.name}: ${error.message}`);
        if (consecutive >= MAX_CONSECUTIVE_FAILURES) {
          console.error(`[bearers-load] ${String(consecutive)} failures in a row; stopping`);
          process.exitCode = 1;
          break;
        }
      }
    }
    console.log(
      `[bearers-load] done in ${String(Math.round((Date.now() - startedAt) / 1000))} s: ` +
        `${String(tally.stored)} stored, ${String(tally.unchanged)} unchanged, ` +
        `${String(tally.derived)} claims derived, ${String(tally.failed)} skipped`,
    );
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[bearers-load] failed:", err);
  process.exitCode = 1;
});
