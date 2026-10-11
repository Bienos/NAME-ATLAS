# ADR-0052 — Checkout made ready for real payments, behind the owner's switch

- **Status:** Proposed 2026-10-11. Accepted when TASK-179's pull request is merged.
- **Date:** 2026-10-11
- **Deciders:** the project owner asked on 2026-10-11 to "make checkout production ready first", after a review listed what stood between the test-mode checkout of TASK-111 and a real sale.
- **Relates to:** ADR-0023 §2.4–§2.5 (going live waits on the owner's legal and tax gates), ADR-0026 and ADR-0037 (the tiers), ADR-0027 (accounts and the mailer), TASK-111 (test-mode checkout), TASK-154 (`CHECKOUT_TESTERS`), D-024 (one-time payments).
- **Amends:** TASK-111's "a live key turns checkout off" and migration 0036's `purchases_test_only`. ADR-0023 §2.5 is unchanged: the code is ready, and the switch stays the owner's.
- **Code:** `apps/web/src/lib/checkout-config.ts`, `checkout-runtime.ts`, `checkout-routes.ts`, `checkout-section.tsx`, `offer-page.tsx`, `stripe.ts`, `packages/accounts/src/purchases.ts`, `mail-text.ts`, `packages/db/migrations/0048_purchases_live.ts`.

## 1. Context

1. TASK-111 built checkout against Stripe's test mode only: a live key turned it off, the webhook acknowledged and dropped every live event, and the database refused a live row (`purchases_test_only`).
2. What a real sale of digital content to a consumer in Poland needs beyond that, and what the test build lacked:
   - the buyer's express request for immediate access and their acknowledgement that it ends the 14-day right of withdrawal (art. 38 ust. 1 pkt 13 of the consumer rights act), given before paying;
   - a confirmation of the contract on a durable medium, repeating that statement (art. 21 ust. 1);
   - a refund or a chargeback that takes back what was paid for: a refund was acknowledged and ignored, so access survived it.
3. ADR-0023 §2.5 keeps real payments off until a registered business, an approved Stripe account, the VAT and KSeF position, consumer terms and the privacy update exist. Those are not engineering tasks; this ADR does not settle them.

## 2. Decision

1. **Two modes, one switch.** Checkout runs in test mode as before, or in live mode when `CHECKOUT_LIVE` is exactly `1` and `STRIPE_SECRET_KEY` is a live key (`rk_live_` preferred, or `sk_live_`). A key of the other mode turns checkout off, so a live key set by mistake takes no payment and the flag alone does nothing. Only the owner sets `CHECKOUT_LIVE`, once ADR-0023 §2.5's gates are met.
2. **Who may buy.** Live mode: every signed-in account. Test mode: the accounts on `CHECKOUT_TESTERS` only (TASK-154), unchanged.
3. **The webhook records only its own mode.** A live event in test mode and a test event in live mode are acknowledged and ignored, so one Stripe account's two endpoints cannot cross.
4. **The withdrawal statement.** Every buy form carries one required, unticked checkbox with the statement (`WITHDRAWAL_CONSENT`, version `v1`). `/api/checkout` refuses a request without it before Stripe is called; the session carries the version in its metadata; the webhook records no session without it; the purchase stores it (`withdrawal_consent`). A live purchase must store it and its PaymentIntent (`purchases_live_complete`). A new wording takes a new version.
5. **The confirmation email.** After recording a purchase, the webhook sends a confirmation to the buyer's Checkout address in the session's language: the product, the price with VAT, the day paid in Warsaw, the statement word for word, the account link and the contact address. `receipt_sent_at` is set once it is sent; until then a retry sends it, and a mail failure answers 500 so Stripe retries. Live mode needs the mailer (Resend): without it, checkout is off.
6. **Refunds and disputes revoke.** `charge.refunded` with the charge refunded in full, and `charge.dispute.created`, revoke the purchase its PaymentIntent paid for (`revoked_at`, `revoked_reason`). A revoked purchase unlocks nothing and is not listed; its row stays as the record of the sale. A partial refund changes nothing; the owner decides such a case by hand. The Stripe Dashboard is where refunds are given.
7. **What this does not do.** No invoice (faktura) or KSeF submission, no admin view, no change to any price or tier, no sale of the 800 zł tier (a person's service, ADR-0037 §2.4), no Vercel variable set and no Stripe Dashboard change.

## 3. Why not the alternatives

- **Stripe Checkout's own terms checkbox (`consent_collection`).** It needs the terms URL set in the Dashboard and words the box as Stripe does; the statement must be the site's own, and recorded with the purchase. A checkbox in the site's form keeps both in the code and testable.
- **Relying on Stripe's own receipt email.** It states the amount, not the withdrawal statement, and is off unless the owner turns it on. The confirmation the law asks for is the site's.
- **Sending the email without recording it.** Stripe retries a webhook it did not get a 2xx for; without `receipt_sent_at` a retry would either send again or never send.
- **Keeping the database's test-only check and adding a second table for live purchases.** The entitlement checks read one table; two would double every check. The live/test separation is the configuration's, and the new check makes a live row carry what a real sale needs.

## 4. Consequences

- The site can take a real payment the day the owner sets `CHECKOUT_LIVE=1` with a live restricted key, the live webhook secret, and Resend's verified domain, and registers the live webhook endpoint for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded` and `charge.dispute.created`.
- The statement's wording, the confirmation's content and the tree-unlock tiers' treatment as digital content rather than a digital service are advised for legal review before real sales (D-054).
- Migration 0048 must be on the VM before checkout runs against it, as 0042 and 0046 must.
