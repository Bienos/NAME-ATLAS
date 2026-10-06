# 2026-10-05 — TASK-140: famous bearers for every surname, in batches

Branch `claude/eager-gauss-c6d5tu`, on top of TASK-125 (`efe59ce`), itself on `origin/main` at `4aa1c04`. Task: `tasks/140-famous-bearers-in-batches.md`; decision: ADR-0044. Requested by the owner: "do famous people for everyone but do it quicker".

## Observed before the change

- Production holds `NOTABLE_BEARERS` for 2,723 surnames, those ranked within 2,000 on either list: Register VM `status` run 37217149747 (2026-10-04 16:32 UTC) read the load as `done in 8875 s: 2723 stored, 0 unchanged, 2723 claims derived, 0 skipped`, 254.9 MB memory peak; the disk at 44 of 145 GB; 11.9 GB of memory. On 2026-10-05 the page for WOJTYLA (#28,271) said Wikidata had not been asked.
- The loader asked one or two queries per surname at least a second apart (`WIKIDATA_MIN_INTERVAL_MS = 1000`): 3.26 s a surname measured, so every surname would take about 7 days at the floor and 22 at that pace.
- The workflow's `bearers` step called `bearers.sh` without a rank, so 2,000 was the only limit it could run.
- Ranked from the 2026-01-20 lists (downloaded, SHA-256 equal to `fixtures/pesel/source-manifest.json`): 2,723 surnames within 2,000, 13,298 within 10,000, 66,516 within 50,000, 598,476 in all; the worst rank is 301,370.

## Measured against the Wikidata Query Service (2026-10-05, one query at a time, the loader's user agent)

- The raw people query for ZAREMBA, KOWALSKA, WOJTYLA, BRZOZA, KUROPATWA and ŻMUDA-TRZEBIATOWSKI one by one and as one batch: the same people for each (68, 426, 1, 12, 1, 1 rows).
- The loader's own code (`fetchWikidataBearersBatch` against `fetchWikidataBearers`) on 30 surnames: NOWAK, ZAREMBA, KOWALSKA and nine from each of the bands 2,001–10,000, 10,001–50,000 and below 50,000. All 30 summaries identical (NOWAK 451 people, ADRIAN 44, ALBIN 25, the long tail mostly 0); the batch took 4.4 s for all 30.
- Batches through the loader's fetcher, details and pacing included: 50 surnames ranked 2,001–10,000 in 5.0 and 2.2 s; 200 ranked 10,001–50,000 in 17.4 and 35.8 s (hence 100 a batch there, against the service's 60 s limit); 400 below 50,000 in 3.9, 11.9, 4.5, 5.4 and 2.1 s. No failures. 29–57 of each 400 in the tail had somebody.
- Raw batch queries of 25–1,000 surnames: 1.3–29.7 s, up to 5,904 rows.

From these: about 212 batches of 50, 532 of 100 and 1,330 of 400, roughly 4–6 hours for every surname. It is an estimate from samples; the load has not run.

## Changed

- `packages/sources/src/wikidata/bearers.ts`: `wikidataBearersBatchQuery` (the people query over many labels, `BIND(STR(?label) AS ?key)`, `GROUP BY ?person ?key`; the one-surname query is unchanged), `batchBearers` (each surname's rows by its own labels, a person once, then the exact-name test; a bad row fails only its surnames), `wikidataDetailsById` and `summariseCandidates` (the summary builder both paths use; `summariseWikidataBearers` now calls it).
- `packages/sources/src/wikidata/fetch.ts`: `POST` for batch queries; a batch query out of time (`TimeoutException`, or no answer in 60 s) is thrown as `tooLarge` without a retry; `fetchWikidataBearersBatch` (split in halves on that or on an answer cut off, details in groups of whole surnames up to `WIKIDATA_DETAILS_PER_QUERY` = 200, outcomes in input order, digests `bearers_batch` and `details_batch`).
- `packages/truth/src/bearers-batch.ts` (new): `bearersBatchSize` (50 / 100 / 400 by the first surname's rank), `bearersBatches`, `loadBearersInBatches` (the next batch fetched while this one is stored and derived; `MAX_FAILED_BATCHES` = 10). `bin/bearers-load.ts` uses it for `--top-rank`; `--surname` is unchanged.
- `ops/vm/bearers.sh`: a third argument `restart` (stop a running load, start it on the pushed commit); comments. `.github/workflows/register-vm.yml`: `top_rank` validated and passed to `bearers.sh`, and a `restart_bearers` input. `ops/vm/README.md`.
- ADR-0044 (accepted, amends ADR-0030 §2.2).
- Tests: `packages/sources/src/wikidata/batch.test.ts` (new, 9), `packages/truth/src/bearers-batch.test.ts` (new, 4), one case in `tests/integration/src/notable-bearers.test.ts`.

## Verification

All run in this container on the final tree:

| Command | Result |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | "All matched files use Prettier code style!" |
| `pnpm check:ids` | "every task, ADR, migration and decision number is used once" |
| `pnpm check:vm` | "14 scripts parse, and 6 dumps exclude private rows or stream them directly into age" |
| `pnpm test` | exit 0; sources 603 (594 before), truth 399 (395 before), web 927, the rest green |
| `pnpm test:integration` | exit 0; 39 files / 478 tests (477 before, plus the batched load against a real PostgreSQL), the pinned `postgis/postgis:16-3.4` image under Testcontainers |
| `pnpm test:golden` | exit 0; 4 files / 364 tests |
| `pnpm build` | exit 0 |
| `pnpm e2e:seed` then `pnpm test:e2e` | 10 passed (desktop and phone), against a fresh `postgis/postgis:16-3.4` seeded from the fixtures |

Local database cost, out of band: `loadBearersInBatches` stored and derived 2,000 synthetic surnames with nobody in 13.1 s on a fresh `postgis/postgis:16-3.4` container, 6.5 ms a surname. The VM wrote change-over-time claims at about 160 surnames a second (status run 37217149747), so its writing should hide behind the next batch's query.

## Not verified

- The load has not run on the VM: GitHub Actions starts no job on the account at present (every Register VM run since 19:31 UTC on 2026-10-04 failed in seconds with no runner), and the step is the owner's. The 4–6 hour figure is an estimate.
- Nothing measured the service's behaviour over a whole pass (rate limits after hours of batches); the loader honours `Retry-After` and stops after ten failed batches in a row.
- `ops/vm/bearers.sh`'s `restart` path was only parsed (`bash -n` through `pnpm check:vm`), not run.

## Landed

On 2026-10-06 commit `879cc7e` from `claude/eager-gauss-c6d5tu` was cherry-picked onto `origin/main` @ `023061e` (#167) and renumbered TASK-126 → TASK-140 and ADR-0042 → ADR-0044: `main` holds TASK-126 (the sitemap fix, #152) and ADR-0042 (first names given to children by year, #162). The branch's two earlier commits, `efe59ce` and `4bb7105`, were not taken: they are the diacritic spelling pointer, merged separately as TASK-131 (#151). Nothing in `879cc7e` uses them. `register-vm.yml` and `ops/vm/README.md` conflicted with #150 (TASK-125, the `bearers` step's `top_rank`) and #159 (TASK-133, the `given-names` step): #150's `top_rank` validation is kept once, this change adds `restart_bearers` and the batch mode beside it, and the `given-names` step is unchanged. In `ops/vm/README.md` the list of steps that refuse while a bearers load runs gains `given-names`, which does. In `STATUS.md` "Last rewritten" names this change, the well-known bearers bullet keeps `main`'s text and gains one sentence for this change, and the Actions bullet is `main`'s. Checks on the landed tree: `yaml.safe_load` parses `register-vm.yml` (`bearers` and `given-names` steps, `top_rank` input, `restart_bearers` boolean); `bash -n ops/vm/bearers.sh` passes; `pnpm exec prettier --check` on the changed non-shell files passes; `pnpm check:ids` passes; `pnpm check:vm` passes ("15 scripts parse"); `vitest run src/wikidata/` in `packages/sources` passes (2 files, 33 tests) and `vitest run src/bearers-batch.test.ts` in `packages/truth` passes (1 file, 4 tests); `pnpm typecheck` and `pnpm lint` exit 0. Not run here: the integration suite (`notable-bearers.test.ts` needs a local PostgreSQL), golden tests, the build and Playwright; `actionlint` is not installed. GitHub Actions still starts no jobs (CI on `main` @ `023061e`, created 12:37 UTC, failed within seconds). The load has not been run on the VM.
