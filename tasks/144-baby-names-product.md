# TASK-144 — The 8,99 zł baby-names product in test-mode checkout

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-baby-names-product.md`).
- **Requested by:** the project owner, D-045 (2026-10-06): the paid view of first names given to children is a product of its own at 8,99 zł, one payment.
- **Decision:** D-045; D-044 §5 and ADR-0037 §2.1 (the product does not unlock the tree); ADR-0023 §2.5 (no real payment is sold yet). No new ADR, no new D- number.
- **Numbers:** TASK-144 (143 was the last on `main`, no open pull request), migration 0042 (0041 was the last).
- **Model guidance:** implementation session.

## 1. Goal

The 8,99 zł product can be bought in test mode and opens the baby-names page's full history, and nothing but a tier from 28,99 zł up lifts the family tree's 5-person cap.

## 2. Facts (2026-10-06)

1. `Purchases.hasPurchase(userId)` answered "any recorded purchase" and `family-runtime.ts` passed it as `hasPaidTier`, so any new product would have lifted the tree cap.
2. `BABY_NAMES_FULL_TIERS` and `hasPurchaseOf` (TASK-141) already check the tier.
3. Migration 0036's CHECK `purchases_tier_known` allows `smaller`, `couple` and `family` only.

## 3. In scope

1. `TREE_UNLOCK_TIERS`; `hasPurchase` removed; the family wiring uses `hasPurchaseOf(userId, TREE_UNLOCK_TIERS)`.
2. `babynames` in `PurchaseTier`, `CheckoutTier`, `CHECKOUT_TIERS` (899 grosze, "Imiona dla dziecka" / "Baby names") and `BABY_NAMES_FULL_TIERS`.
3. Migration 0042 (the CHECK; down refuses while a `babynames` purchase is stored).
4. Test-mode surfaces: the account page's purchases section and the webhook, behind the unchanged gate.
5. Tests, and the records: D-045 and ADR-0037 §2.1 one-line notes, `docs/CODEMAP.md`, the progress record, `STATUS.md`.

## 4. Out of scope

Live payments or a live key; production or Vercel variables; the Register VM; a buy button, price or link on any public page; the sixth tier on the offer page (needs the owner's wording); a browsable list of names; voivodeships, half-years, second names, comparing names; refunds, invoices, KSeF; the 800 zł tier.

## 5. Acceptance criteria

- **AC-1:** no code path lifts the tree cap for a `babynames` purchase; it does for `smaller`, `couple` and `family` (integration test through the family service).
- **AC-2:** `babynames` is accepted by the type, the migration's constraint, checkout and the webhook at 899 grosze only; an unknown tier or another amount is refused.
- **AC-3:** a `babynames` purchase opens the baby-names page's full history; a reader without a purchase of a listed tier still sees the locked card and no button.
- **AC-4:** with checkout off (the default), nothing changes anywhere, and no public page changed except through shared code the tests cover.
- **AC-5:** `grep -rn "hasPurchase(" packages apps tests` finds no "any purchase" entitlement.

## 6. Verification

`pnpm format:check`, `check:ids`, `typecheck`, `lint`, `test`, `test:integration`, `test:golden`, `build`.
