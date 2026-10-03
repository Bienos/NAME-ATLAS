# TASK-066 — The family tree, the core: schema, package and contract, dark

- **Status:** IMPLEMENTED 2026-10-01 on `claude/sweet-feynman-wisze8`; record: `docs/progress/2026-10-01-family-tree-core.md`.
- **Requested by:** the project owner, 2026-10-01: the tree's design chosen from the mockups; "do it now, we review later" after answering ADR-0029's decisions.
- **Decision:** ADR-0029 (accepted for build the same day), which builds on ADR-0027 (accounts) and ADR-0026 §2.5.
- **Depends on:** TASK-061 (accounts core), on `main`. **Going live depends on** TASK-049 (an off-host, restore-tested backup), TASK-062 and TASK-063 (accounts live) and the terms version that carries the clause on living people: none of these is in this task.
- **Model guidance:** implementation session. Privacy-sensitive: review the policies adversarially.

## 1. Goal

A tested library that can create a tree, write its people and their parentage, share it with another account, hide the living from a member by rule, and answer the contract's `tree` object, over a schema the register's role cannot read and whose rows a caller who may not open the tree cannot see, even with SQL of their own. Nothing calls it from the site, and nothing in production changes.

## 2. Facts (checked on `main` @ `fd6a871`, 2026-10-01)

- Schema `accounts` and role `nameatlas_app` exist (migration 0027, `ops/vm/accounts-roles.sql`). The role holds no table of `public`. The web app has a second pool for it, created only when `ACCOUNTS_DATABASE_URL` is set.
- `ARCHITECTURE.md` §7: the public surname cache must never contain a user ↔ family association. `docs/canonical/19` §10: an unknown living status is protected as living.
- No table, package or contract for a tree exists. ADR-0028 and D-025 are taken by #65, and D-026 by #66 (merged during this task; the decisions were renumbered D-027 to D-031 on rebase); the next free migration is `0028`, the next free task `065`.

## 3. In scope

- **Migration `0028_family_schema`:** schema `family` with `trees`, `persons`, `parentage`, `members` and `audit_events`; the constraints of ADR-0029 §2.2; row-level security on every table, keyed on `app.user_id`, with SECURITY DEFINER helpers; `hidden_living_count`. Its `down` refuses while any tree exists.
- **`ops/vm/accounts-roles.sql`:** the same grants for `family` as for `accounts`.
- **`packages/family`** (`@name-atlas/family`): the typed schema, the pure rules (`checkPerson`, `treatedAsLiving`, `wouldCycle`, `parentCount`) and the service: create, list, read and export a tree, delete it; add, update and delete a person; set and remove a parent; set the root; add and remove a member and set whether they see the living. Every call is one transaction that sets `app.user_id` first.
- **`packages/contracts/src/tree.ts`** and `docs/contracts/tree.md`: the `tree` object, schema 1.0.
- **Tests:** unit tests for the rules and the contract; an integration test over a real PostgreSQL as `nameatlas_app` for every flow, the policies by direct SQL, the read-only role's refusal, the cascades and the down refusal. Migration pins in the three files that list them.

## 4. Out of scope

- Pages, routes and the session check (the next tasks). `apps/web` is untouched.
- Invitations, claims, suppression, verification (ADR-0029 §2.6), documents (D-027), the deceased match index, GEDCOM.
- The place resolution for `places` (the route's job, over the read-only pool).
- Running the roles file on the VM (TASK-063).

## 5. Acceptance criteria

- **AC-1.** A tree is created for its caller only; a person is stored as checked and trimmed; a death year makes the status `DECEASED`; an unknown status is `treated_as_living` (integration).
- **AC-2.** A parent link carries a role; a third parent, a loop and a self-link are refused by name; a link that exists takes the new role (unit and integration).
- **AC-3.** A parent from another tree is refused by the service (`NOT_FOUND`: it cannot see the person) and by the insert policy when the SQL names both ids (integration).
- **AC-4.** A stranger gets `NOT_FOUND` from every read and write, and direct SQL as the app role returns no row with no user set or the stranger set, and the tree's rows with the owner set (integration).
- **AC-5.** A member without `sees_living` receives only the deceased, the links between them, `hidden_living_count`, no members and no notes; a viewer's writes answer `FORBIDDEN`; the owner's `setSeesLiving` opens the rest; a member cannot change it (integration).
- **AC-6.** Audit rows carry kinds and ids and no name; the app role can neither update nor delete one (integration).
- **AC-7.** As `nameatlas_web`, a `family` table and a `family` function are refused (integration).
- **AC-8.** Deleting a tree removes everything in it; deleting the owner's account removes their trees and leaves a member's own (integration).
- **AC-9.** `0028` down refuses with a tree stored and changes nothing (integration).
- **AC-10.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:integration` and `test:golden` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
TEST_DATABASE_URL=… pnpm test:integration && pnpm test:golden
```
