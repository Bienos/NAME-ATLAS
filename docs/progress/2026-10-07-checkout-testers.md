# 2026-10-07 — TASK-154: test-mode checkout for listed testers only

Branch `claude/happy-bell-luges7`, restarted from `origin/main` at `3a82803` after #184 merged. Task: `tasks/154-checkout-testers.md`. Requested by the owner: a buy button for the 8,99 zł baby-names product, "for me" only, to try it. The number is free on `main`; open pull request #181 holds none.

## Changed

- `apps/web/src/lib/checkout-config.ts`: `CHECKOUT_TESTERS_ENV`, `checkoutTesters` (the listed addresses, trimmed, lower-cased; empty when unset) and `isCheckoutTester`.
- `apps/web/src/lib/checkout-runtime.ts`: the runtime carries `testers`.
- `apps/web/src/lib/checkout-routes.ts`: `CheckoutRouteDeps.mayBuy`, required. `handleCheckoutPost` answers 404 to a signed-in account it refuses, before calling Stripe, and logs `checkout_refused` with no address.
- `apps/web/src/app/api/checkout/route.ts`: passes `mayBuy` from the runtime's list.
- `apps/web/src/lib/account-page.tsx`: the test checkout section only for a listed account.
- Tests: `checkout-config.test.ts` (2 new), `checkout-routes.test.ts` (1 new; the shared fake's reader is a listed tester).
- `STATUS.md`, `docs/CODEMAP.md`: the checkout lines.

Not changed: the baby-names page. A test buy button on its locked card was attempted in this session and refused by the session's safety check, as against ADR-0023 §2.5. The card still says "Wkrótce" with no button.

## Verified

Each command was run from the repository root:

- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`: exit 0 each.
- `pnpm check:ids`: exit 0, "every task, ADR, migration and decision number is used once".
- `pnpm --filter web test`: 100 files, 1081 tests passed (1078 before, and the 3 new ones).

## Not verified

- Test checkout end to end: production has no `CHECKOUT_ENABLED`, Stripe keys, webhook endpoint or `CHECKOUT_TESTERS` known to this session, and this session could not read Vercel.
