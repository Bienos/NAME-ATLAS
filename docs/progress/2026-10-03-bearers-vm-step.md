# 2026-10-03 — TASK-077: a `bearers` Register VM step

Scope authority: `tasks/077-bearers-vm-step.md`. The owner chose to have the step built and to trigger it themselves.

## What changed

- `ops/vm/bearers.sh` (new), on `archive.sh`'s pattern: unpack the pushed commit, `pnpm install`, `pnpm db:migrate`, check that `claim_type` has `NOTABLE_BEARERS`, grant and check the web role's reads of `public`, then start the unit `name-atlas-bearers-load` (`pnpm truth:bearers-load --top-rank 2000`; ten failures in a row stop it, it restarts after ten minutes, at most six times in 12 hours) and return. `/var/lib/name-atlas/bearers/loaded` is written only when a pass completes. It refuses before `finalize`, and while the register build, the archive load or the change-over-time batch runs.
- `ops/vm/archive.sh` refuses while the bearers load runs; `ops/vm/accounts.sh` lists it among the units it waits for; `ops/vm/status.sh` reports it under "bearers load".
- `.github/workflows/register-vm.yml`: the `bearers` choice and step; the web-role connection runs after it and prints the active `NOTABLE_BEARERS` count.
- `ops/vm/README.md`, `docs/CODEMAP.md`, `STATUS.md`, the task file.
- The first version of this change (#87's first commit) renamed migration 0029 to 0030, while 0028 was still unmerged. #67 then merged 0028 onto `main`, and #81 moved its own migrations to 0030 and 0031; the rename would now collide, so it was dropped and the branch rebuilt on `main` @ `4dce85f`.

## What the first run will also do

`pnpm db:migrate` applies every pending migration: 0028 (schema `family`, granted to no role until the `accounts` step next runs `accounts-roles.sql`) and 0029.

## Verification (run 2026-10-03 on this branch, `main` @ `4dce85f` underneath)

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`: each exit 0.
- `pnpm check:vm`: "10 scripts parse, and all 4 pg_dump invocations exclude the rows of schema accounts". `bash -n ops/vm/bearers.sh` exit 0. The workflow file loads as YAML (`python3 yaml.safe_load`).
- `pnpm test`: exit 0 (among them `packages/truth` 375, `packages/sources` 585, `packages/family` 9, `apps/web` 652).
- Against a fresh local PostgreSQL 16 with PostGIS 3: `TEST_DATABASE_URL=… pnpm test:integration` exit 0, 33 files, 387 tests. It migrates through 0028 and 0029 in order, as the VM's migrate will.

## Not verified

- `bearers.sh` and the workflow step have not run anywhere: they need the VM. The first `bearers` run is the test. `shellcheck` is not installed here and was not run.
- How long the load takes over the surnames ranked within 2,000, and whether the Wikidata Query Service limits it from the VM's address.
