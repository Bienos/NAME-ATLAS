# 2026-10-07 — TASK-162: no end date on the baby-names free card

## What changed

- `apps/web/src/lib/baby-names-page.tsx`: `BabyFreeWindow` no longer shows the window's end; `freeUntilText` and the card's `until` prop removed.
- `apps/web/src/lib/baby-names-text.ts`: `freeUntil` removed from both languages.
- `apps/web/src/lib/baby-names-page.test.ts`: the window test asserts that no end date is on the card.
- D-051 amended in `docs/DECISIONS_NEEDED.md`; `STATUS.md`; `tasks/162-baby-names-free-no-end-date.md`.

## Production facts observed in this session (2026-10-07)

- #192 (TASK-160) merged as `d6846be`; Vercel's production branch is still `main`.
- `BABY_NAMES_FREE_UNTIL` = `2026-11-07T23:59:00+01:00` added to the Vercel project's production environment at the owner's request ("month time"), then production deployment `dpl_2MHsoGWBzFVSNLdCgaFLX1kVq1RF` was created from `d6846be` so the variable applies.

## Verification (run in this session)

- `pnpm format:check`: "All matched files use Prettier code style!"
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm lint`: exit 0. `pnpm typecheck`: exit 0.
- `pnpm --filter ./apps/web test`: 108 files, 1204 tests passed.

## Not verified

- The card on name-atlas.pl after this change's deployment, signed in.
