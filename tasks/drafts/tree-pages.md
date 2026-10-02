# DRAFT — The family tree, the pages: the dashboard, the consent step, the Rodowód view with its form, one question per screen; dark

- **Status:** DRAFT 2026-10-01, unnumbered, written while #67 (TASK-068) awaited its merge. It takes the next free task number against `main` and open pull requests when it starts, and moves to `tasks/NNN-tree-pages.md`.
- **Requested by:** the project owner, 2026-10-01: "ok lets go" after the core (TASK-068) and the chosen design (the first round of mockups: a dashboard, a consent step, the Konstelacja, Mapa and Rodowód views, a phone flow of one question per screen).
- **Decision:** ADR-0029 (§2.3 who may read, §2.4 consent, §2.5 what reads it; D-029: paid, so dark until checkout exists), ADR-0027 (the session, the terms version; §4.3 of TASK-062: a changed terms version asking for acceptance again "is not built: nothing has changed yet" — this task changes it), ADR-0021 (the look), `PRODUCT.md` §7.
- **Depends on:** TASK-068 (`@name-atlas/family`, migration 0028, the `tree` contract) and TASK-062 (the account pages, the session cookie, `accountsRuntime`), both on `main`. Going live also needs TASK-063 (#68) and TASK-049; neither is in this task.
- **Model guidance:** implementation session. Privacy-sensitive: every page reads the tree through the session's user and nothing else.

## 1. Goal

A signed-in reader can create a tree, add people one question at a time, link parents, see the pedigree, correct a person, mark a person living only after accepting the terms that say what that means, and invite nobody yet. In Polish and English, as plain HTML forms with no script, drawn in the dusk direction. **Dark:** the pages and routes exist only when accounts are on **and** `FAMILY_TREE_ENABLED=1`; otherwise there is no link and every page and route answers 404. Production does not change when this merges.

## 2. Facts to check at the start (against `main` and open pull requests)

1. `@name-atlas/family` exposes `createFamily`, `createFamilyDb`, `checkPerson`; every service call takes `userId` and runs as one transaction with `app.user_id` set (TASK-068). The contract `tree` 1.0 is in `packages/contracts/src/tree.ts`.
2. `accountsRuntime()` (TASK-062) holds the accounts pool, the service and `termsVersion`; `account-routes.ts` reads the session with `accounts.sessionFromToken` and checks `isSameSiteRequest`. The terms version recorded on an account is the date of the text the reader saw; nothing yet asks for acceptance again.
3. The family pool is the accounts pool's role and URL (`ACCOUNTS_DATABASE_URL`): one more `createFamilyDb(pool)` over the same `createPool`, never the read-only pool.
4. Place names and coordinates for the contract's `places` come from `public.places` through the read-only pool, by SIMC code, with no user id in the query (ADR-0029 §2.1.2); the TERYT place search for the form's birthplace field goes through the same pool.
5. The number of this task and of any new decision is the next free on `main` and in open pull requests at the time.

## 3. In scope

- **`apps/web/src/lib/family-config.ts`:** `familyTreeEnabled(env)`: accounts on and `FAMILY_TREE_ENABLED=1`; the paths of the pages and routes in both languages.
- **`apps/web/src/lib/family-runtime.ts`:** `createFamily` over `createFamilyDb` on the accounts pool, made on first use; `null` when off.
- **`apps/web/src/lib/tree-routes.ts`:** POST handlers over an injected service and clock, each with the same-site check and the session check of `account-routes.ts`, answering 303 to a page with a status word: create a tree, add a person (the one-question flow posts one page at a time and keeps the draft in the query, never in storage), update a person, delete a person, set a parent, remove a parent, set the root, accept the living-people terms, delete a tree.
- **Pages, both languages, no script:**
  - **the dashboard** `/pl/konto/drzewa` (`/en/account/trees`): the reader's trees as rows, the next empty parent slot of the first tree as the one question, the privacy lines ("widzisz je tylko Ty"), a "Nowe drzewo" form;
  - **the consent step**, shown once per account at the first person marked living or with no death year: the clause, one checkbox, a POST that records the new terms version on the account (ADR-0027 §2.9; this is the "changed version asks again" TASK-062 §4.3 left out);
  - **the Rodowód view** `/pl/konto/drzewa/{tree}`: the pedigree from the root, four generations, cards for people and dashed cards for empty slots, each a link to that person's form or to "add this parent"; the provenance chip (*wpisane przez Ciebie*), the living chip, the count of hidden living people when the reader is a member;
  - **one question per screen**: "Kim byli rodzice X?" → a page per parent with the fields of the design (name, surname, birth surname, year with "około", birthplace searched in TERYT, living or not) → "X jest w drzewie" with the next question;
  - **a person's form** for corrections, with deletion.
- **The terms** (`legal-text.ts`): the clause on living people (ADR-0026 §2.5, ADR-0029 §2.4.12) in the tree variant, with its own date; the privacy notice: what a tree stores, that it is private, that a member sees the living only when the owner opens it, that export and deletion exist, retention (D-028: as long as the account).
- **The header:** "Drzewa" / "Trees" beside "Konto" when the tree is on.
- **Styles:** the dusk tokens; the pedigree cards as the mockup's `.na-card-btn`, the chips as `.na-chip`.
- **Tests:** unit tests for the gate, the paths, every handler over a fake service, the next-question derivation, the pedigree layout from the contract object, the legal variants' parity; an integration test that renders the dashboard and the pedigree against a real PostgreSQL with the roles file applied, for an owner and for a member who may not see the living.

## 4. Out of scope

- The Konstelacja and Mapa views (they need script and a canvas: their own task, after this one).
- Invitations, claims, suppression, verification (ADR-0029 §2.6), export, matching, documents (D-027).
- Members at all in the pages (the schema has them; no page adds one yet).
- Anything that turns the tree on in production (D-029: it stays dark until checkout exists).

## 5. Acceptance criteria

- **AC-1.** With accounts off, or `FAMILY_TREE_ENABLED` unset, no header link, every tree page and route answers 404, and both legal documents read as before (unit).
- **AC-2.** Every tree route refuses a request that is not same-site (403) and one without a session (303 to sign-in), and passes the session's user id and nothing else to the service (unit).
- **AC-3.** The dashboard lists the trees the service returns for the session's user, with the first tree's next empty parent slot as the question, derived breadth-first from the root (unit).
- **AC-4.** Adding a person marked living, or with no death year, by an account whose terms version predates the clause sends the reader to the consent step first; after the POST that accepts, the person is saved and the account carries the new version (unit, integration).
- **AC-5.** The pedigree page draws four generations from the root with dashed empty slots, each slot a link to "add this parent" carrying the child's id and the role; a member without `sees_living` sees the deceased only and the count of hidden people (integration, as the real role).
- **AC-6.** The one-question flow saves a person only on the last POST; a reload of an intermediate page loses nothing but the draft in its own query (unit, local browser run).
- **AC-7.** No page, redirect or log line carries a name from a tree other than in the rendered page itself; the analytics path for a tree page is its route with ids replaced (unit).
- **AC-8.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:integration` and `test:golden` exit 0; the flow runs in a browser against a real PostgreSQL: sign-in, new tree, three people in three questions, the consent step, the pedigree, a correction, a deletion.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
TEST_DATABASE_URL=… pnpm test:integration && pnpm test:golden
```

Then the local run of AC-8 with `next start` and a Playwright-driven Chromium.
