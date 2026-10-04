# TASK-111 — Test-mode checkout: Stripe Checkout, a signed webhook, purchases, dark behind a flag

- **Status:** IMPLEMENTED 2026-10-04, dark (`docs/progress/2026-10-04-test-mode-checkout.md`).
- **Requested by:** the project owner, 2026-10-04: "Help me get started building on Stripe … Payments, Tax", then, asked whether to write the ADR and task first or build test-mode checkout now, answered **"b, build test-mode checkout now"**.
- **Exception to the build order:** `PLAN.md` puts checkout (M6) after M5 and D-025 after an ADR replacing ADR-0026. The owner chose to build test-mode checkout first. ADR-0023 §2.4 ("checkout is built against Stripe's test mode and takes no real money") and §2.5 (no real payments before the owner's legal and tax gates) still hold, and this task keeps both.
- **Tiers:** ADR-0037 (TASK-104, merged in #119): the three sellable tiers `smaller` 28,99 zł, `couple` 89,99 zł, `family` 199 zł, with its names. The 800 zł tier is not sold (ADR-0037 §2.4: consumer terms first).
- **Model guidance:** implementation session.

## 1. Goal

A signed-in reader can buy one of the three tiers through Stripe's hosted Checkout in **test mode**, and the purchase is recorded from Stripe's signed webhook only. With the flag unset nothing changes anywhere.

## 2. In scope

1. **Migration 0035:** `accounts.purchases` (tier, Checkout Session id unique, amount, `pln`, `livemode = false` enforced, `user_id` set to null when the account is deleted). Down refuses while a purchase is stored.
2. **`@name-atlas/accounts`:** `createPurchases` (`record`, idempotent on the session id; `listForUser`).
3. **The gate** (`checkout-config.ts`): `CHECKOUT_ENABLED=1`, a **test** key in `STRIPE_SECRET_KEY` (`sk_test_`/`rk_test_`; a live key turns checkout off), `STRIPE_WEBHOOK_SECRET`, and accounts on. `STRIPE_AUTOMATIC_TAX=1` turns Stripe Tax on, off by default.
4. **`POST /api/checkout`:** same-site, signed-in, known tier → a Checkout Session (`mode: payment`, one PLN line, `tax_behavior: inclusive`, tax code `txcd_10701411`, no `payment_method_types`, API version pinned) → 303 to Stripe.
5. **`POST /api/stripe/webhook`:** signature checked over the raw body; `checkout.session.completed` and `checkout.session.async_payment_succeeded` record a paid session whose tier, user, currency and amount match; a live event is never recorded; a database failure answers 500.
6. **The account page:** a "Zakupy (tryb testowy)" / "Purchases (test mode)" section with a buy button per tier, the reader's purchases and the return's status word.
7. **CSP:** `form-action` allows `https://checkout.stripe.com` (the buy form's 303).
8. Tests: unit (gate, form, signature, both handlers), integration (the table as the app role, idempotency, the constraints, deletion, the web role's refusal, the down migration).

## 3. Out of scope

- Live payments, a live key, the owner's legal and tax gates (ADR-0023 §2.5).
- What a purchase unlocks: the tree's 5-person cap and its lift, the couple report's gate (ADR-0037 §2.6). A purchase is recorded and listed, nothing more.
- The offer page's buy buttons (it keeps ADR-0037 §2.2's "Wkrótce" until a task changes it).
- Refunds, receipts by mail, invoices and KSeF, the 800 zł tier, Stripe Tax registrations.
- Setting any of the variables in production.
