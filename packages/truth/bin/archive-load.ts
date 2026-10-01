#!/usr/bin/env tsx
/**
 * Loads Polona's archive availability for the most common surnames (TASK-054,
 * ADR-0024).
 *
 *   pnpm truth:archive-load --top-rank 2000 [--limit N] [--refresh-days 90]
 *   pnpm truth:archive-load --surname ZAREMBA
 *
 * For each surname ranked within `--top-rank` in either register list, best
 * rank first: ask Polona (`fetchPolonaInventory`, eight paced requests), store
 * the summary as a source record, and derive the `ARCHIVE_AVAILABILITY` claim.
 *
 * Resumable and idempotent. A surname searched within `--refresh-days` is not
 * searched again, so an interrupted run continues where it stopped. A surname
 * whose requests fail, or whose responses do not parse, is logged and left for
 * the next run; nothing half-read is stored. Ten failures in a row stop the run,
 * since that is Polona being down rather than one surname's problem.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { resolveSurname } from "@name-atlas/resolver";
import {
  PolonaPacer,
  PolonaRequestError,
  PolonaShapeError,
  ensurePolonaSource,
  fetchPolonaInventory,
  storePolonaInventory,
} from "@name-atlas/sources";
import { deriveArchiveAvailability, selectArchiveCandidates } from "../src/archive.js";
import type { ArchiveCandidate } from "../src/archive.js";
import { ARCHIVE_REFRESH_DAYS } from "../src/version.js";

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
    const sourceId = await ensurePolonaSource(db);

    let candidates: ArchiveCandidate[];
    const one = flag("surname");
    if (one !== undefined) {
      const lookup = await resolveSurname(db, one);
      const resolution = lookup.kind === "RESOLUTION" ? lookup.resolution : null;
      const id = resolution?.resolution_status === "EXACT" ? resolution.resolved_surname_id : null;
      if (!resolution || !id) {
        console.error(`[archive-load] ${one}: not an exact register surname`);
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
        console.error("[archive-load] --top-rank N (N ≥ 1) or --surname NAME is required");
        process.exitCode = 1;
        return;
      }
      candidates = await selectArchiveCandidates(db, {
        topRank,
        refreshDays: Number(flag("refresh-days") ?? String(ARCHIVE_REFRESH_DAYS)),
        limit: Number(flag("limit") ?? "0") || undefined,
      });
    }
    console.log(`[archive-load] ${String(candidates.length)} surnames to search`);

    const pacer = new PolonaPacer({
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: () => Date.now(),
    });
    const tally = { stored: 0, unchanged: 0, derived: 0, failed: 0 };
    let consecutive = 0;
    for (const [index, candidate] of candidates.entries()) {
      const t0 = Date.now();
      const where = `${String(index + 1)}/${String(candidates.length)} ${candidate.display_name}`;
      try {
        const fetched = await fetchPolonaInventory(candidate.display_name, pacer);
        const stored = await storePolonaInventory(db, {
          sourceId,
          surnameId: candidate.surname_id,
          fetched,
        });
        const derived = await deriveArchiveAvailability(db, candidate.surname_id);
        tally[stored.status === "STORED" ? "stored" : "unchanged"] += 1;
        if (derived.status === "DERIVED") tally.derived += 1;
        consecutive = 0;
        console.log(
          `[archive-load] ${where}: ${stored.status.toLowerCase()}, claim ${derived.status.toLowerCase()}, ` +
            `${String(fetched.inventory.catalogue_records)} records, ${String(fetched.inventory.pages)} pages, ` +
            `${String(fetched.inventory.examples.length)} examples (${String(fetched.inventory.examples_withheld)} withheld), ` +
            `${String(Date.now() - t0)} ms`,
        );
      } catch (error) {
        if (!(error instanceof PolonaRequestError) && !(error instanceof PolonaShapeError)) {
          throw error;
        }
        tally.failed += 1;
        consecutive += 1;
        console.warn(`[archive-load] ${where}: skipped, ${error.name}: ${error.message}`);
        if (consecutive >= MAX_CONSECUTIVE_FAILURES) {
          console.error(`[archive-load] ${String(consecutive)} failures in a row; stopping`);
          process.exitCode = 1;
          break;
        }
      }
    }
    console.log(
      `[archive-load] done in ${String(Math.round((Date.now() - startedAt) / 1000))} s: ` +
        `${String(tally.stored)} stored, ${String(tally.unchanged)} unchanged, ` +
        `${String(tally.derived)} claims derived, ${String(tally.failed)} skipped`,
    );
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[archive-load] failed:", err);
  process.exitCode = 1;
});
