# TASK-114 — A recorded purchase lifts the free tree's 5-person cap

- **Status:** IMPLEMENTED 2026-10-05 (`docs/progress/2026-10-05-tree-paid-tier.md`).
- **Requested by:** the project owner, 2026-10-05: connect `FamilyDeps.hasPaidTier` to the purchases test-mode checkout records.
- **Decision:** D-025 and ADR-0037 §2.1: any paid tier (28,99, 89,99 or 199 zł; the 800 zł tier is not sold) unlocks the tree beyond 5 people. Purchases are one-time payments, so a recorded purchase never expires. No new ADR.
- **Depends on:** TASK-112 (the cap, `FamilyDeps.hasPaidTier`), TASK-111 (`accounts.purchases`, migration 0036, `createPurchases`), both on `main` @ `de39642`.
- **Model guidance:** implementation session.

## 1. Goal

An account with a recorded purchase can add a sixth person, and more, to a tree it owns. An account without one still cannot. Checkout and the tree both stay dark behind their existing flags.

## 2. Facts (checked on `main` @ `de39642`, 2026-10-05)

1. `createFamily` takes `hasPaidTier`, and `addPerson` asks it about the tree's **owner** (TASK-112). `apps/web/src/lib/family-runtime.ts` does not pass it, so every account gets `noPaidTier`.
2. `accounts.purchases` (migration 0036) has one row per paid Checkout Session. Its tier can only be `smaller`, `couple` or `family`, and `livemode` must be false, so only test-mode rows can exist. `user_id` becomes null when the account is deleted.
3. The family service and the checkout runtime both run on the **accounts pool**, which logs in as `nameatlas_app`. That role has `SELECT, INSERT, UPDATE, DELETE` on every table in schema `accounts`, through `ops/vm/accounts-roles.sql` (lines 43 and 46, the grant and the default privileges). The family service sets no other role. It only sets `app.user_id` and `app.invitation`.
4. `@name-atlas/family` does not depend on `@name-atlas/accounts`, and `apps/web` depends on both.
5. Task numbers on `main` and in open pull requests (#108, #132) end at 113. No migration is needed.

## 3. In scope

1. `packages/accounts`: `Purchases.hasPurchase(userId)`, true when any purchase row names the account.
2. `apps/web/src/lib/family-runtime.ts`: pass `hasPaidTier: (userId) => purchases.hasPurchase(userId)`, with the purchases store on the same accounts pool. The family package gets the function through its deps and does not import the accounts package.
3. Integration test: wired the same way, as `nameatlas_app`, an owner with a recorded purchase saves a sixth person and an owner without one gets `PERSON_LIMIT`.
4. Docs: `docs/contracts/tree.md` (the `hasPaidTier` line), ADR-0037's "Implemented by" line, `STATUS.md`, and a progress record.

## 4. Out of scope

- Turning on checkout, accounts or the tree in production, or setting any variable.
- New UI. The full-tree message appears only on `?status=person-limit`, which `addPerson` never answers for a paid owner, so it stays as it is.
- Matches up to second cousins: no matching exists (TASK-112 §2.4).
- A stored tier or entitlement table, refunds, and the 800 zł tier.

## 5. Acceptance criteria

- **AC-1** With a recorded purchase for the tree's owner, a sixth `addPerson` saves the person.
- **AC-2** Without one, it answers `PERSON_LIMIT` and saves nothing.
- **AC-3** The purchase is read as `nameatlas_app`, on the pool the family service uses.
- **AC-4** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm check:ids` and `pnpm test:integration` (against a real PostgreSQL 16 with PostGIS 3) pass.
