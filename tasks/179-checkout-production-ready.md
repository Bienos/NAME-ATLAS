# TASK-179 — Checkout made ready for real payments

- **Status:** IMPLEMENTED 2026-10-11 (`docs/progress/2026-10-11-checkout-production-ready.md`).
- **Requested by:** the project owner, 2026-10-11: "make checkout production ready first", after a review of what stands between the product and a paid one.
- **Decision:** ADR-0052 (proposed). D-054 is raised for what needs counsel.
- **Numbers:** TASK 179, ADR-0052, migration 0048, D-054. 178, ADR-0051, 0047 and D-053 were the last on `main` (`0fc9fd0`); no pull request was open.
- **Model guidance:** implementation session.

## 1. Goal

The code can take a real payment safely on the day the owner turns it on, and not before.

## 2. Facts (`main` @ `0fc9fd0`)

1. `checkout-config.ts` turned checkout off for any live Stripe key, and the webhook dropped every live event (TASK-111).
2. Migration 0036's `purchases_test_only` refused a live row.
3. `charge.refunded` was acknowledged and ignored (`checkout-routes.test.ts`), so a refunded buyer kept access.
4. Nothing was sent to the buyer after a purchase, and no buy form asked for the withdrawal statement a consumer contract for digital content needs.

## 3. In scope

1. A live mode: `CHECKOUT_LIVE=1` with a live key; a key of the other mode turns checkout off. Live mode lets every signed-in account buy and needs the mailer; test mode keeps `CHECKOUT_TESTERS`.
2. The webhook records only events of its configured mode.
3. The withdrawal statement as a required, unticked checkbox on every buy form (the account page and `BuyForm`), enforced by `/api/checkout`, carried in the session's metadata, required by the webhook and stored with the purchase.
4. A confirmation email per purchase, sent once, retried until sent.
5. `charge.refunded` (refunded in full) and `charge.dispute.created` revoke the purchase by its PaymentIntent; a revoked purchase unlocks nothing and is not listed.
6. Migration 0048 for the columns and checks above; ADR-0052; D-054.
7. Live-mode wording: no "test" text, the test card or "Tryb testowy" when live.

## 4. Out of scope

- Setting any Vercel variable, registering a webhook endpoint, any Stripe Dashboard change, running migration 0048 on the VM.
- Invoices (faktura, KSeF), an admin view, partial-refund handling beyond logging.
- The terms' and privacy notice's purchase sections (D-040, D-041, D-054).
- Any price, tier or entitlement change; selling the 800 zł tier.

## 5. Acceptance criteria

1. With `CHECKOUT_LIVE` unset, a live key turns checkout off; with `CHECKOUT_LIVE=1`, a test key turns it off; live mode needs the flag, a live key, the webhook secret, accounts and the mailer.
2. In live mode any signed-in account may buy; in test mode only a listed tester.
3. `/api/checkout` refuses a request without the statement's current version and calls nobody.
4. The webhook ignores events of the other mode, sessions without the statement, and live sessions without a PaymentIntent.
5. The confirmation is sent once per purchase in the buyer's language with the statement word for word; a mail failure answers 500 and leaves it due.
6. A full refund or a dispute revokes; a partial refund does not; a revoked purchase answers `false` to `hasPurchaseOf` and is not listed.
7. The database refuses a live row without the statement or the PaymentIntent, and 0048 refuses to go down while a live or revoked purchase is stored.
8. Every existing checkout, account and family test passes.

## 6. Verification

```
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm test
pnpm test:integration   (TEST_DATABASE_URL against PostgreSQL 16 + PostGIS)
pnpm build
```
