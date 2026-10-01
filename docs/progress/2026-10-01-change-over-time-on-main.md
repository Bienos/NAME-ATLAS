# 2026-10-01 — TASK-051 on `main`, beside TASK-054, under schema 1.9

Scope authority: `tasks/051-surname-change-over-time.md` (built in #43, whose own record is `docs/progress/2026-09-30-surname-change-over-time.md`). The project owner asked on 2026-10-01 for change over time to ship with the cards ("do a 2").

## What changed

This is a merge of `origin/claude/inspiring-bohr-vten7x` (#43 @ `051d193`) into `main` @ `93d3a05`. Nothing of TASK-051's logic was rewritten. Where both changes touched a file, both were kept:

- **Contract.** `SURNAME_RESULT_SCHEMA_VERSION` is `1.9`: #43 was 1.7 on its branch, and TASK-054 reached `main` as 1.8. The response carries `change` then `archive`, each present exactly when `RESOLVED`. `docs/contracts/surname-result.md` records 1.8 → 1.9.
- **Read path.** `querySurnameResult` returns both sections on every path.
- **Page.** The change chapter comes before meaning and archive. It takes TASK-053's `next` step like every other chapter: #43 predates the journey links, so its `Change` component gained the prop. The Polish map caption keeps `main`'s "jaśniejszy" (the dusk ramp runs dim to lit), not the branch's "ciemniejszy".
- **VM.** `register-vm.yml`, `status.sh` and the runbook carry `shift`, `shift-finish` and `archive`.
- **Decisions.** D-021 stays as `main` resolved it (ADR-0024). One line records the branch's earlier reading of 2026-09-30, option (b), as superseded. ADR-0020 is accepted, and TASK-051's header says it is on `main`.
- **Tests.** Every fixture and pin moved to 1.9. The contract test's two section blocks were rebuilt whole, after git had interleaved them. The change block's base response gained `archive: null`.
- `packages/db/src/generated/db.ts`: regenerated with `pnpm db:generate-types` from a fresh database migrated to 0025; identical to `main`'s.

## Verification (run 2026-10-01, on this branch)

- `pnpm typecheck`, `lint`, `check:ids`: each exit 0. `format:check`: exit 0 after Prettier wrapped the workflow's longer `options` list.
- `pnpm test`: exit 0, 1,608 tests.
- `TEST_DATABASE_URL=… pnpm test:integration` against a local PostgreSQL: exit 0, 28 files, 334 tests, including #43's `distribution-shift.test.ts`.
- `TEST_DATABASE_URL=… pnpm test:golden`: exit 0, 4 files, 364 tests.
- `pnpm build`: exit 0.
- The change chapter, read with headless Chromium at 1440 × 900 and 390 × 844. It was rendered through a temporary local route (removed before commit) from `result-view.test.ts`'s synthetic `CHANGE_READY` fixture, inside the site shell. It showed as chapter 04, styled by the dusk stylesheet, with no horizontal overflow at either width.

## Not verified

- The change chapter on production. The VM has held its 807,358 claims since 00:47 UTC on 2026-10-01; production shows them once this merge is deployed.
- `shift.sh` on the merged tree. It has run only from #43's branch.
