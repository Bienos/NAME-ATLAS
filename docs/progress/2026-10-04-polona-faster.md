# 2026-10-04 — TASK-097: Polona's requests at least 250 ms apart, and a restart for a running archive load

**Task:** `tasks/097-polona-faster.md`. **Decision:** ADR-0036, amending ADR-0024 §2.2's interval. **Numbers:** TASK-097 and ADR-0036, the next free on `main` (task 094, ADR-0034) and in the open pull requests (TASK-095 in #102 and #104, TASK-096 in #106, ADR-0035 in #104). **Requested by:** the project owner, "Go faster", then "4× (0.25 s gap)", for the Polona pass over the top 10,000 started at 15:47 UTC (`archive` run 37214248808), which ran at about 8 s a surname: 1,154 of 10,575 at 18:21 UTC.

## What changed

- `packages/sources/src/polona/fetch.ts`: `POLONA_MIN_INTERVAL_MS` 1000 → 250; the header cites ADR-0036. Requests stay one at a time; timeout, retries (5 s, then 20 s) and user agent unchanged.
- `packages/sources/src/polona/inventory.test.ts`: the pacer test's name; it already asserts the gap against the constant.
- `ops/vm/archive.sh`: an optional third argument `restart`: with it an active `name-atlas-archive-load` is stopped (and must reach `inactive` or `failed`) before the commit is unpacked and the unit started again; without it the script leaves a running load alone, as before; any other value fails before the unit is touched. Comments and the closing line give the new pace.
- `.github/workflows/register-vm.yml`: input `restart_archive` (boolean, default false), passed as `restart` to `archive.sh`; the header lists it.
- `docs/adr/0036-polona-request-interval.md` (new); `docs/adr/0024-polona-archive-availability.md`: one "Amended by" line in its header.
- `ops/vm/README.md`, `STATUS.md` (also its Production lines for the meanings, bearers and archive runs of 2026-10-04, recorded on #98).

## Verification

Run on 2026-10-04 in this container, on `claude/polona-faster` from `main` @ `f4fcb8f`:

- `pnpm --filter @name-atlas/sources test` — 16 files, 594 tests, exit 0.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` — exit 0.
- `pnpm check:ids` — "every task, ADR, migration and decision number is used once", exit 0.
- `pnpm check:vm` — "13 scripts parse, and 5 dumps exclude private rows …", exit 0.
- `bash -n ops/vm/archive.sh` — ok; the workflow file parses as YAML.

## Not verified

- `shellcheck` is not installed here; not run.
- The restart path of `archive.sh` has not run on the VM; it runs when the owner restarts the load after merge.
- How fast Polona answers at four requests a second, and whether it rate-limits: not known until the restarted load runs.
