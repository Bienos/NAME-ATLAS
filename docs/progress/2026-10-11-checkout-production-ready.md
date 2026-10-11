# 2026-10-11 — Checkout made ready for real payments (TASK-179)

**Changed.** The owner asked to "make checkout production ready first". ADR-0052 (proposed) records the decision; D-054 records what needs counsel.

- `apps/web/src/lib/checkout-config.ts`: `checkoutMode` returns `test`, `live` or null. Live needs `CHECKOUT_LIVE` exactly `1` and a live key (`isLiveKey`); a key of the other mode turns checkout off. `mayBuy`: every signed-in account in live mode, a listed tester in test mode. `WITHDRAWAL_CONSENT` (version `v1`, Polish and English) is the statement every buy form carries.
- `checkout-runtime.ts`: carries the mode and the accounts' mailer; live mode without a mailer is off.
- `checkout-routes.ts`: `/api/checkout` refuses a form without the statement's current version (`?checkout=consent`) before calling Stripe. The webhook ignores events of the other mode; records a session only with the statement's version (and, live, its PaymentIntent); sends the purchase confirmation once (`receiptDue` / `markReceiptSent`; a mail failure answers 500 so Stripe retries); revokes on `charge.refunded` refunded in full and on `charge.dispute.created`, by PaymentIntent; a partial refund is logged only.
- `stripe.ts`: the session's metadata carries `lang` and `withdrawal_consent`.
- `checkout-section.tsx`: `ConsentField` (required, unticked) in every form; live-mode heading, lede and button without "test". `offer-page.tsx` (`BuyForm`), `offer-text.ts`, `full-name-compare-page.tsx` and `account-page.tsx` pass the mode; `globals.css` styles `.checkout-consent`.
- `packages/accounts`: `PaidCheckout` takes `paymentIntentId` and `withdrawalConsent`; `Purchases` gains `receiptDue`, `markReceiptSent` and `revoke`; `listForUser` and `hasPurchaseOf` skip revoked purchases; `purchaseMail` in `mail-text.ts`.
- `packages/db/migrations/0048_purchases_live.ts`: `payment_intent_id` (unique when present), `withdrawal_consent`, `receipt_sent_at`, `revoked_at` and `revoked_reason`; a live row must carry the statement and the PaymentIntent; `purchases_test_only` dropped. Its down refuses while a live or revoked purchase is stored.
- Tests: `checkout-config.test.ts`, `checkout-routes.test.ts`, `checkout-section.test.ts`, `stripe.test.ts`, `mail-text.test.ts`, `migrator.test.ts`, and `tests/integration/src/accounts.test.ts` (a live purchase, its receipt, its revocation, the PaymentIntent's uniqueness, 0048's down), `family.test.ts`, `canonical-key-v2.test.ts` and `extensions.test.ts` (the migration list).
- Docs: ADR-0052, D-054, `tasks/179-checkout-production-ready.md`, `docs/CODEMAP.md`, `STATUS.md`.

**Verified** (this session, on the branch's working tree).

- `pnpm typecheck`: no errors. `pnpm lint`: exit 0. `pnpm format:check`: `All matched files use Prettier code style!` `pnpm check:ids`: `every task, ADR, migration and decision number is used once`.
- `pnpm test`: exit 0; web 1377 tests, accounts 52, db 15, truth 449, sources 615, the other packages as before, all passed.
- `pnpm test:integration` with `TEST_DATABASE_URL` against a local PostgreSQL 16 with PostGIS 3 (Testcontainers has no Docker daemon here): 50 files, 551 tests passed, exit 0. A first run failed 2 tests that list every migration by name (`canonical-key-v2.test.ts`, `extensions.test.ts`); both now name 0048.

**Not verified.** `pnpm test:golden` and `pnpm test:e2e` were not run. GitHub Actions still starts no job (STATUS.md). No real or test payment was made through Stripe; no email was sent through Resend. Migration 0048 is not on the VM. No production variable was set and no webhook endpoint registered. The statement's wording and the confirmation's content have had no legal review (D-054).
