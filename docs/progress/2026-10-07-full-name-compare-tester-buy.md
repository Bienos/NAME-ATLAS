# 2026-10-07 — full-name comparison: test-mode buy button for testers

The owner reported that "Porównaj" on `/pl/porownaj/imie-i-nazwisko` shows no statistics. The page opens the result only for an account holding `fullnames` or a tier from 28,99 zł (`FULL_NAME_COMPARE_TIERS`); the locked card had no button, so a signed-in account had no way to unlock it from the page.

## What changed

- `apps/web/src/lib/full-name-compare-page.tsx`: the route reads the session's email; an account on `CHECKOUT_TESTERS`, with test-mode checkout on (`checkoutRuntime()` not null), gets the offer page's `BuyForm` for `fullnames` on the locked card in place of "Wkrótce". Everyone else sees the card unchanged. The paywall and what a purchase unlocks are unchanged.
- `apps/web/src/lib/offer-page.tsx`: `BuyForm` exported for reuse.
- `apps/web/src/lib/full-name-compare-page.test.ts`: a test that a tester gets the form (`/api/checkout`, tier `fullnames`), no "Wkrótce", and that no claim is read.

## Verification

- `pnpm --filter ./apps/web run typecheck` — passed.
- `npx vitest run` in `apps/web` — 110 files, 1256 tests passed.
- `npx eslint` and `npx prettier --check` on the three changed files — passed.

## Not verified

- Not deployed; not checked in a browser or against Stripe test mode.
- Per `STATUS.md`, production has no `CHECKOUT_ENABLED`, Stripe key or webhook, and migration 0046 (`fullnames`) is not on the VM. Until those are in place the button does not appear there and nothing can be bought, so the result stays locked on production.
- After a test purchase Stripe returns to the account page (`checkoutReturnPath`), not to the comparison.
