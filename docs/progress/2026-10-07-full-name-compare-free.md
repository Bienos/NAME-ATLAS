# 2026-10-07 — the full-name comparison free for every signed-in reader (D-053)

The owner asked for the figures to show after "Porównaj" on `/pl/porownaj/imie-i-nazwisko`, for everyone. The page showed the result only to an account holding `fullnames` or a tier from 28,99 zł, and nothing can be bought on production.

## What changed

- `apps/web/src/lib/full-name-compare-config.ts`: `FULL_NAME_COMPARE_FREE` and `fullNameCompareFree()`. Free unless the variable is exactly `0`.
- `apps/web/src/lib/full-name-compare-page.tsx`: `loadFullNameCompare` takes `free`. While free, a signed-in reader gets the result without a purchase lookup, and the first names' claims are read on the FREE surface; a buyer, once it is not free, on PAID as before. Signed out is unchanged (sign-in).
- `apps/web/src/lib/full-name-compare-page.test.ts`: the switch, the free result on FREE with no purchase lookup, signed out unchanged.
- `docs/DECISIONS_NEEDED.md`: D-053. `STATUS.md`: the comparison's line.
- The branch also carries the earlier commit `0fe6358` (a test-mode buy button for `CHECKOUT_TESTERS` on the locked card, `docs/progress/2026-10-07-full-name-compare-tester-buy.md`); it shows only when the comparison is not free.

## Verification

- `pnpm --filter ./apps/web run typecheck` — passed.
- `npx vitest run` in `apps/web` — 114 files, 1345 tests passed.
- `npx eslint apps/web/src/lib/full-name-compare-*.ts*` — passed.
- `pnpm check:ids` — "every task, ADR, migration and decision number is used once".

## Not verified

- Not checked in a browser or against a database. Whether every first name has FREE-surface claims on production was not checked; a claim the FREE surface withholds shows as withheld, as on the free pages.
- Not deployed. name-atlas.pl changes only when the owner runs the Release workflow (ADR-0039).
