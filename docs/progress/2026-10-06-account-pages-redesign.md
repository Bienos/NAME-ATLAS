# 2026-10-06 — TASK-153: the account pages on Brand System v1, and the account dashboard

Branch `claude/happy-bell-luges7`, built on `origin/main` at `3d12f1a` (#177 merged) and rebased onto `61ae8b1` on 2026-10-07. Task: `tasks/153-account-pages-redesign.md`. Built as TASK-149; renumbered TASK-153 at the rebase, since `main` took 149 (#178, reverted by #180), 150 and 151, and open pull request #183 holds 152. Requested by the owner: a creative redesign of the sign-in page, then a fuller account screen (plan, purchases, account state, searches).

## Changed

- `packages/accounts/src/service.ts`: `accountSummary(userId)`, one read: `created_at`, `last_sign_in_at`, whether a `GOOGLE` identity exists, and the count of sessions not yet expired. Null for an id with no complete account. Type `AccountSummary`, exported from the package.
- `apps/web/src/lib/account-overview.ts` (new):
  - `loadAccountOverview` runs the summary, the purchases and the trees at once. A failed read is `null` for that fact alone.
  - `planOf` derives the plan from the purchases with `TREE_UNLOCK_TIERS` and `BABY_NAMES_FULL_TIERS`, the tiers `hasPurchaseOf` checks. Unreadable purchases make an unknown plan, not a free one.
- `apps/web/src/lib/account-dashboard.tsx` (new): the account step. It shows a header with a monogram, the plan chip and the date the account was made, then figures for plan, trees, purchases and live sessions. Its panels are:
  - the plan, with what the tree and the baby names allow;
  - a surname search (the site's `SearchForm`) and shortcuts;
  - the trees, with the free tree's room on the reader's own trees;
  - the purchases with a total, or test-mode checkout's section when checkout is on;
  - sign-in and security;
  - the deletion.
- `apps/web/src/lib/account-form.tsx` (new): `Field`, `Form` and `Send`, moved from `account-page.tsx` so both views use them. `Send` draws an arrow, hidden from screen readers.
- `apps/web/src/lib/account-page.tsx`: the sign-in steps are a form card beside an art panel (`AuthArt`). The card's contents, forms and their order are as before. `AccountPage` reads the overview on the account step and passes the purchases it read to the checkout section, which used to read them itself. `main` carries `account-page` instead of `account`, so the old rules the tree's pages share do not apply.
- `apps/web/src/lib/account-text.ts`: each step's eyebrow, the art panel's words and the dashboard's words, in Polish and English.
- `apps/web/src/lib/checkout-section.tsx`: the lede no longer says a purchase unlocks nothing (untrue since TASK-114 and TASK-141). It points to the plan panel. The section is a dashboard panel.
- `apps/web/src/app/globals.css`: a new block scoped to `.account-shell` with Brand System v1 tokens. The old `.account…` rules are unchanged for the tree's pages. Motion is off under `prefers-reduced-motion`.
- Tests:
  - `apps/web/src/lib/account-dashboard.test.ts` (new, 16 tests).
  - `tests/integration/src/accounts.test.ts`: two tests for `accountSummary`.
- `STATUS.md`, `docs/CODEMAP.md`, `docs/brand/MIGRATION_GUIDE.md`: the lines this change touches.

## Verified

Each command was run from the repository root unless noted. The results below are from the tree rebased onto `61ae8b1` (2026-10-07); the same commands had also passed on `3d12f1a`.

- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0.
- `pnpm format:check`: exit 0, "All matched files use Prettier code style!".
- `pnpm check:ids`: exit 0, "every task, ADR, migration and decision number is used once".
- `pnpm --filter web test`: 97 files, 1043 tests passed. The 40 existing tests of `account-page.test.ts`, `checkout-section.test.ts` and `account-nav.test.ts` pass unchanged.
- `pnpm --filter @name-atlas/accounts test`: 6 files, 50 tests passed.
- `npx vitest run src/accounts.test.ts` in `tests/integration`, against PostgreSQL in Testcontainers (the Docker daemon started for the run): 43 of 43 passed. The first run failed 1 test because the test's own `UPDATE` set a session's expiry before its creation, which `sessions_expiry_after_creation` refuses. The test now back-dates both. The query was not changed.
- The look was checked on a temporary dev-only route rendering `AccountView` with invented data, since deleted. Playwright drove Chromium at 1440 × 1000 and 390 × 844. The states checked were sign-in, sign-in with an error, confirm, and the dashboard paid, free (in English), unreadable and with checkout. Each had 0 px of horizontal overflow. After the rebase, sign-in and the dashboard were checked again at both widths: unchanged, 0 px of overflow. The only console message was a hydration warning from Playwright's own caret-hiding style on inputs; a run without screenshots had none.

## Not verified

- The account step through the real route with a live session, a database and the runtimes. The loader is tested with fakes and `accountSummary` against PostgreSQL. `AccountPage`'s wiring of the two was checked by typecheck only.
- The end-to-end suite (`pnpm test:e2e`) and the integration suite beyond `accounts.test.ts` were not run.
- Browsers other than Chromium.
- No search history is kept, by decision (task §4). Keeping one is the owner's call, since the privacy notice would change.
