# TASK-154 — Test-mode checkout for listed testers only

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-checkout-testers.md`).
- **Requested by:** the project owner, 2026-10-07, looking at the baby-names page's locked card ("Imiona dla dziecka 8,99 zł · Wkrótce"): "ok to daj przycisk narazie zeby zobaczyc niech bedzie dla mnie" ("give me the button for now so I can see it; let it be for me").
- **Decision:** none new. ADR-0023 §2.5 (no real sale), TASK-111 (test-mode checkout, the owner's exception), D-044 §5 and D-045 (the 8,99 zł product).
- **Numbers:** TASK 154. 153 was the last on `main` (`3a82803`); open pull request #181 holds no number.
- **Model guidance:** implementation session.

## 1. Goal

The owner can try the 8,99 zł purchase end to end in test mode, and nobody else can.

## 2. Facts (`main` @ `3a82803`)

1. With `CHECKOUT_ENABLED=1`, a Stripe test key and a webhook secret, the account page offered test-mode buy buttons to **every** signed-in reader, and `/api/checkout` served any signed-in account.
2. A test-mode purchase is recorded like any other and unlocks what its tier holds (`hasPurchaseOf` does not distinguish test rows), so the test card 4242 4242 4242 4242 would give any reader the paid view for nothing.

## 3. In scope

- `CHECKOUT_TESTERS`: the addresses that may buy in test mode, comma-separated, without case. Unset or empty: nobody.
- The account page's test checkout section only for a listed account.
- `/api/checkout` answers 404 to a signed-in account not on the list, before any call to Stripe.

## 4. Out of scope

- A buy button on the baby-names page's locked card. It was attempted in this session and refused by the session's safety check, as against ADR-0023 §2.5; the card still says "Wkrótce". The owner buys from the account page instead.
- Any real payment, any change to what a tier unlocks, any Vercel variable (the owner sets them).

## 5. Acceptance criteria

1. With `CHECKOUT_TESTERS` unset or empty, no account is offered test checkout and the route answers 404 to every signed-in account.
2. A listed address matches without case and surrounding spaces, and only whole.
3. The refusal logs no address.
4. Every existing checkout and account test passes.

## 6. Verification

```
pnpm lint
pnpm typecheck
pnpm format:check
pnpm check:ids
pnpm --filter web test
```
