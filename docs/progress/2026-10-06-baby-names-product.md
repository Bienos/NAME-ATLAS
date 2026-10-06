# 2026-10-06 — TASK-144: the 8,99 zł baby-names product, test mode only

## What changed

- `packages/accounts`: `TREE_UNLOCK_TIERS` (`smaller`, `couple`, `family`); `Purchases.hasPurchase` ("any purchase") removed; `PurchaseTier` and `BABY_NAMES_FULL_TIERS` gain `babynames`. `apps/web/src/lib/family-runtime.ts` and `tests/integration/src/family.test.ts` use `hasPurchaseOf(userId, TREE_UNLOCK_TIERS)`.
- `checkout-config.ts`: `babynames`, 899 grosze, "Imiona dla dziecka" / "Baby names", first in `CHECKOUT_TIERS` (cheapest first), so the account page's test-mode section shows its button first and lists a purchase by its name. Tax code `txcd_10701411`, as the other tiers: Stripe's tax-category page (docs.stripe.com/tax/tax-categories, read 2026-10-06) names it "Electronically Delivered Information Services - Personal Use", "the furnishing of information by electronic means". The owner and their tax advisor still confirm it before real sales.
- Migration 0042 replaces CHECK `purchases_tier_known`; its down refuses while a `babynames` purchase is stored.
- Records: `tasks/144-baby-names-product.md`, notes in D-045 and ADR-0037 §2.1, `docs/CODEMAP.md`, `STATUS.md`.
- No public page, buy button or link changed; the baby-names page's locked card is untouched.

## Numbers

TASK-144 and migration 0042, free on `origin/main` (last: 143, 0041) and in open pull requests (none). No ADR, no D- number. `pnpm check:ids` passed.

## Verification (real results)

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | needed first: `node_modules` was missing |
| `pnpm format:check` | all files formatted (after `prettier --write` on the changed files) |
| `pnpm check:ids` | passed |
| `pnpm typecheck` | passed |
| `pnpm lint` | passed |
| `pnpm test` | `apps/web`: 94 files, 980 tests passed; `apps/admin`: 14 passed; the other packages' output was not read beyond the tail |
| `pnpm test:integration` | `TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres`, a throwaway PostgreSQL 16 cluster (`/var/tmp/pgdata`) with `postgresql-16-postgis-3` installed in this session, no Docker: 46 files, 519 tests passed. One `pool_idle_client_error` (57P01) is logged, as on earlier runs |
| `pnpm test:golden` | without a database variable: `resolution.test.ts` failed ("Could not find a working container runtime strategy"), also with my changes stashed. With the same `TEST_DATABASE_URL`: 4 files, 364 tests passed |

New or changed tests: the offer, `formatPrice`, form and webhook (accepts 899, refuses 2899 and 100) in `checkout-config.test.ts` and `checkout-routes.test.ts`; the section in `checkout-section.test.ts`; the page in `baby-names-page.test.ts`; in `accounts.test.ts` migration 0042 up and down, the constraint and `hasPurchaseOf` for `babynames` and the tree tiers; in `family.test.ts`, through the real family service, none and `babynames` leave the cap at 5 and `smaller`, `couple`, `family` lift it. `grep -rn "hasPurchase(" packages apps tests` found nothing (run after the change).

## Not verified

- `pnpm build` (about 534 prerendered pages, needs the database variables): not run here; CI runs it.
- A real Stripe test-mode payment: not made. The webhook and the session are tested with fakes only.
- Migration 0042 is not on the VM, staging or production.
