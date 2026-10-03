# TASK-077 — Load the well-known bearers in production: a `bearers` Register VM step

- **Status:** IMPLEMENTED 2026-10-03 on `claude/wonderful-gates-ffvsn2`; record: `docs/progress/2026-10-03-bearers-vm-step.md`. **Not run on the production VM.**
- **Requested by:** the project owner, 2026-10-03: "load the Wikidata bearers first". Asked whether this session should run the step, the owner chose to build it only and trigger it themselves.
- **Decision:** ADR-0030 (the source and the claim); ADR-0017 and `ops/vm/README.md` (the VM).
- **Depends on:** TASK-073 (the loader and the claim) and TASK-054 (`archive.sh`, whose pattern this follows), on `main` @ `4dce85f`.

## 1. Goal

One Register VM step, `bearers`, that applies the pending migrations to the production database and starts `pnpm truth:bearers-load --top-rank 2000` there in a systemd unit, as `archive` does for Polona.

## 2. Facts (checked on `main` @ `4dce85f`, 2026-10-03)

1. `main` has migrations 0027, `0028_family_schema` (#67) and `0029_notable_bearers` (#84). Neither 0028 nor 0029 has run on the production database: no VM step has run since, and a Vercel deploy runs no migration. `pnpm db:migrate` on the VM applies both, in order.
2. 0028 creates schema `family` with no grant to any role; `ops/vm/accounts-roles.sql` grants it to `nameatlas_app` when the `accounts` step next runs. Nothing in production reads it (the tree's pages are off behind `FAMILY_TREE_ENABLED`).
3. An earlier version of this change renamed 0029 to 0030 so that an unmerged 0028 could still follow it. #67's merge put 0028 on `main` first, and #81 now numbers its migrations 0030 and 0031, so the rename was dropped.
4. This session cannot reach the production database; the Register VM workflow is how a load runs there.
5. The surname pages are `force-dynamic` and read the claim by key and as text, so loaded claims show without a redeploy.

## 3. In scope

- `ops/vm/bearers.sh`, on `archive.sh`'s pattern: unpack, install, migrate, check the claim type and the web role's reads, start `name-atlas-bearers-load`, return. It refuses while the register build, the archive load or the change-over-time batch runs.
- `archive.sh` and `accounts.sh` refuse while the bearers load runs; `status.sh` reports it.
- `register-vm.yml`: the `bearers` step, and the web-role connection after it printing the `NOTABLE_BEARERS` count.
- `ops/vm/README.md`, `docs/CODEMAP.md`, `STATUS.md`, the progress record.

## 4. Out of scope

- Running the step (the owner triggers it).
- Any change to the loader, the claim, the migrations or the pages.

## 5. Acceptance criteria

- **AC-1.** `bearers.sh` parses, and `pnpm check:vm` passes.
- **AC-2.** `register-vm.yml` accepts `bearers` by `workflow_dispatch` and runs only `bearers.sh` for it.
- **AC-3.** `pnpm typecheck`, `lint`, `format:check`, `check:ids` and `test` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm check:vm && pnpm test
```
