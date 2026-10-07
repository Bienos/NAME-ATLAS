# TASK-153 — The account pages on Brand System v1, and the account dashboard

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-account-pages-redesign.md`).
- **Requested by:** the project owner, 2026-10-06, in a Claude Code session: "can you redesign me login page in cool creative way please", then, during the work, "oraz rozbuduj ekran dla Konto niech zawiera wiecej informacji moze wyszkuiwania tez stan konto czy premium co kupil etc" ("and expand the Account screen: more information, maybe searches too, the account's state, whether premium, what was bought, etc.").
- **Decision:** ADR-0046 (Brand System v1; this task is one of its bounded page migrations). No new ADR, no migration, no D-number.
- **Numbers:** TASK 153. Built as TASK-149 on `main` @ `3d12f1a`; renumbered when rebased onto `main` @ `61ae8b1` (2026-10-07), where TASK-149 (#178, reverted by #180), 150 and 151 are used and open pull request #183 holds 152.
- **Model guidance:** implementation session.

## 1. Goal

The sign-in pages look and feel like Name Atlas on Brand System v1, and the account page tells a signed-in reader where they stand: their plan, what they bought, their trees, how they sign in, with a search to hand.

## 2. Facts (2026-10-06, `main` @ `3d12f1a`)

1. The account's pages are `account-page.tsx` (TASK-062, TASK-084), plain HTML forms, styled by the old dusk rules shared with the tree's pages (`.account`, `.account-status`, `.account-check`, `.account-links`, `.account-danger`, `.account-form`).
2. A purchase is a one-time payment that never expires. `TREE_UNLOCK_TIERS` lifts the tree's 5-person cap and `BABY_NAMES_FULL_TIERS` holds the full baby-names figures (`packages/accounts/src/purchases.ts`). Only test-mode purchases can be stored (migration 0036).
3. The checkout section's lede said "A purchase does not unlock anything yet", which TASK-114 and TASK-141 made untrue.
4. No search is stored for an account: no table, no column, no log.

## 3. In scope

- The six sign-in steps: a form card beside an art panel (contour field, Atlas Point, a stamp, one line per section the site has), Atlas Blue action and focus, motion off under reduced motion. No script; every form, field, token and `next` behaves as before.
- The account step as a dashboard: profile header, figures, the plan (from the purchases, with what each section allows), a surname search and shortcuts, the trees, the purchases, sign-in and security, the deletion.
- One read in `@name-atlas/accounts`: `accountSummary` (when the account was made, the last sign-in, whether Google is linked, live sessions).
- The checkout section's lede made true.
- Tests: unit tests for the plan, the loader and both views; an integration test for `accountSummary`.

## 4. Out of scope

- Keeping a search history: it would be new personal data held for an account, which needs the privacy notice changed and the owner's decision (ADR-0027). The dashboard says plainly that none is kept.
- Any migration, any change to what a tier unlocks, any real payment (ADR-0023 §2.5).
- The tree's pages, which keep the old shared rules.

## 5. Acceptance criteria

1. Every existing test of the account pages passes unchanged.
2. A figure that cannot be read is shown as not available, never as zero, an empty list or a free plan.
3. The plan claims exactly what `hasPurchaseOf` with `TREE_UNLOCK_TIERS` and `BABY_NAMES_FULL_TIERS` allows.
4. A spent or missing link still shows no form.
5. No horizontal scroll at 390 px; the layout is checked at 1440 px and 390 px.
6. `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm check:ids` and the web and accounts tests pass; the accounts integration test passes against PostgreSQL.

## 6. Verification

```
pnpm lint
pnpm typecheck
pnpm format:check
pnpm check:ids
pnpm --filter web test
pnpm --filter @name-atlas/accounts test
cd tests/integration && npx vitest run src/accounts.test.ts
```
