# 2026-10-04 — Test-mode checkout (TASK-111)

Numbered TASK-111 and migration 0035 on rebase: `main` took TASK-109 and TASK-110 meanwhile, and open PR #128 claims migration 0034.

## What changed

- **Migration 0035** `accounts.purchases`: one row per paid Checkout Session; `checkout_session_id` unique; `tier` in (`smaller`, `couple`, `family`); `currency = 'pln'`; `livemode = false` enforced; `user_id` set to null on account deletion. Down refuses while a purchase is stored. Covered by the existing default privileges of `ops/vm/accounts-roles.sql` (unchanged).
- **`@name-atlas/accounts`**: `createPurchases` (`record`, idempotent on the session id, null user when the account is already gone; `listForUser`), `PurchasesTable` in `schema.ts`.
- **`apps/web`**: `checkout-config.ts` (gate and tiers), `stripe.ts` (Checkout Session over `fetch`, webhook signature over `node:crypto`; no new dependency), `checkout-routes.ts` (`POST /api/checkout`, `POST /api/stripe/webhook`), `checkout-runtime.ts`, `checkout-section.tsx` (on the account page), the two route modules, and `form-action 'self' https://checkout.stripe.com` in the (report-only) CSP.
- Migration lists in `packages/db/src/migrator.test.ts`, `tests/integration/src/extensions.test.ts`, `canonical-key-v2.test.ts`; purchases tests in `tests/integration/src/accounts.test.ts`.
- `tasks/111-test-mode-checkout.md`, `STATUS.md`, `docs/CODEMAP.md`.

## Verification (commands run, results as returned)

- `pnpm lint` → exit 0.
- `pnpm format:check` → first run flagged 5 new files; after `prettier --write` on them: "All matched files use Prettier code style!".
- `pnpm -r --if-present run typecheck` → exit 0 (17 projects "Done").
- `pnpm -r --if-present run test` → exit 0; `apps/web` 81 files / 853 tests passed (after rebasing onto `main` @ `9866385`), `packages/accounts` 6 / 50, `packages/db` 3 / 11, all other packages passed.
- `pnpm check:ids` → "every task, ADR, migration and decision number is used once".
- `pnpm --filter web run build` → compiled; `ƒ /api/checkout` and `ƒ /api/stripe/webhook` listed. Two warnings, both pre-existing (the `middleware` file convention; `metadataBase`).
- `npx vitest run src/accounts.test.ts src/extensions.test.ts src/canonical-key-v2.test.ts` in `tests/integration` (PostgreSQL in Docker) → 3 files, 49 tests passed, including the four TASK-111 tests.
- Against the owner's Stripe sandbox (`acct_1UMA4xDK73RoNHLW`), with a test key: `createCheckoutSession` created real sessions with and without `automatic_tax` (`cs_test_…`, URL on `checkout.stripe.com`). The created session read back from `GET /v1/checkout/sessions/{id}` carried `mode: payment`, `client_reference_id`, `amount_total: 2899`, `currency: pln`, `metadata.tier: smaller`, `livemode: false`. Wrapped in a locally signed `checkout.session.completed`, `handleStripeWebhook` answered 200 and recorded nothing while `payment_status` was `unpaid`, and recorded one purchase with it set to `paid`.

## Not verified

- **Paying on Stripe's hosted page.** Headless Chromium could not reach `checkout.stripe.com` through this environment's HTTPS proxy (`ERR_CERT_AUTHORITY_INVALID`); trusting the proxy's CA in the browser was not permitted. So no real `checkout.session.completed` event from a paid session has been delivered to the route.
- **The webhook route as Stripe calls it:** no endpoint is registered in Stripe, and the app was not served on a public address.
- **The account page's section rendered in a browser** (no database with an account was served).
- **Stripe Tax:** the sandbox's tax settings are `pending` (no head office address) with no registration, so a session with `automatic_tax` was created but calculates no tax.
- Nothing was deployed and no production variable was set.
