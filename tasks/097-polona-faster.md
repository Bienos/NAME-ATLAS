# TASK-097 — Polona four times faster, and a restart for a running archive load

- **Status:** IMPLEMENTED 2026-10-04 on `claude/polona-faster`; record: `docs/progress/2026-10-04-polona-faster.md`.
- **Requested by:** the project owner, 2026-10-04: "Go faster", then "4× (0.25 s gap)" for the Polona pass over the top 10,000 surnames running since 15:47 UTC.
- **Decision:** ADR-0036 (amends ADR-0024 §2.2's interval).
- **Number:** 097, the next free on `main` (up to 094) and in the open pull requests (095 in #102 and #104, 096 in #106; ADR-0035 in #104).

## 1. Goal

The Polona loader sends a request at most every 250 ms, and the owner can move a load that is already running onto the new code from the Register VM workflow.

## 2. Facts (checked on `main` @ `f4fcb8f`, 2026-10-04)

1. `POLONA_MIN_INTERVAL_MS` is 1000 in `packages/sources/src/polona/fetch.ts`; `PolonaPacer` keeps it between the starts of two requests, across surnames.
2. `ops/vm/archive.sh` exits 0 without unpacking when `name-atlas-archive-load` is active, so a running load keeps the code it started with until it ends.
3. The load is resumable: a surname searched within the last 90 days is not searched again.

## 3. In scope

- `POLONA_MIN_INTERVAL_MS` = 250; the pacer test's name.
- `archive.sh`: an optional third argument `restart` that stops a running load before unpacking; the workflow input `restart_archive` (boolean, archive only) that passes it.
- ADR-0036, ADR-0024's header line, `ops/vm/README.md`, `STATUS.md`, the progress record.

## 4. Out of scope

- Concurrency, fewer requests per surname, any change to what is stored or derived.
- Running the restart (done by the owner's request after merge, recorded on the merged pull request).

## 5. Acceptance criteria

- **AC-1.** `POLONA_MIN_INTERVAL_MS` is 250 and the pacer test asserts the gap against it.
- **AC-2.** `archive.sh` with no third argument behaves as before; with `restart` it stops an active unit and continues; anything else fails before touching the unit.
- **AC-3.** The workflow parses; `restart_archive` false passes no third argument.

## 6. Verification

```
pnpm --filter @name-atlas/sources test && pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm check:vm && bash -n ops/vm/archive.sh
```
