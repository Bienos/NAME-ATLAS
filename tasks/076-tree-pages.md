# TASK-076 — The family tree, the pages: the dashboard, the consent step, the Rodowód view with its form, one question per screen; dark

- **Status:** IMPLEMENTED 2026-10-03 on the branch of #67, stacked on TASK-066 (the core, not yet merged). Drafted 2026-10-01 as `tasks/drafts/tree-pages.md`; numbered 072 on 2026-10-03 and renumbered 073 the same day (`main` took 072 for the blog's second post, #80), then 076 in the afternoon: `main` took 073 for the well-known bearers (#84) and 074 for the blog's third post (#83), #79 claims 074 and #81 claims 075, so 076 is the next free number on `main` and in the open pull requests (066 in #67 and #70, 070 in #76). Record: `docs/progress/2026-10-03-tree-pages.md`.
- **Requested by:** the project owner, 2026-10-01: "ok lets go" after the core (TASK-066) and the chosen design (the first round of mockups: a dashboard, a consent step, the Konstelacja, Mapa and Rodowód views, a phone flow of one question per screen); 2026-10-03: "ok lets go" again, to build it before #67 merges.
- **Decision:** ADR-0029 (§2.3 who may read, §2.4 consent, §2.5 what reads it; D-029: paid, so dark until checkout exists), ADR-0027 (the session, the terms version; §4.3 of TASK-062: a changed terms version asking for acceptance again "is not built: nothing has changed yet" — this task changes it), ADR-0021 (the look), `PRODUCT.md` §7.
- **Depends on:** TASK-066 (`@name-atlas/family`, migration 0028, the `tree` contract) and TASK-062 (the account pages, the session cookie, `accountsRuntime`), both on `main`. Going live also needs TASK-063 (#68) and TASK-049; neither is in this task.
- **Model guidance:** implementation session. Privacy-sensitive: every page reads the tree through the session's user and nothing else.

## 1. Goal

A signed-in reader can create a tree, add people one question at a time, link parents, see the pedigree, correct a person, mark a person living only after accepting the terms that say what that means, and invite nobody yet. In Polish and English, as plain HTML forms with no script, drawn in the dusk direction. **Dark:** the pages and routes exist only when accounts are on **and** `FAMILY_TREE_ENABLED=1`; otherwise there is no link and every page and route answers 404. Production does not change when this merges.

## 2. Facts to check at the start (against `main` and open pull requests)

1. `@name-atlas/family` exposes `createFamily`, `createFamilyDb`, `checkPerson`; every service call takes `userId` and runs as one transaction with `app.user_id` set (TASK-066). The contract `tree` 1.0 is in `packages/contracts/src/tree.ts`.
2. `accountsRuntime()` (TASK-062) holds the accounts pool, the service and `termsVersion`; `account-routes.ts` reads the session with `accounts.sessionFromToken` and checks `isSameSiteRequest`. The terms version recorded on an account is the date of the text the reader saw; nothing yet asks for acceptance again.
3. The family pool is the accounts pool's role and URL (`ACCOUNTS_DATABASE_URL`): one more `createFamilyDb(pool)` over the same `createPool`, never the read-only pool.
4. Place names and coordinates for the contract's `places` come from `public.places` through the read-only pool, by SIMC code, with no user id in the query (ADR-0029 §2.1.2); the TERYT place search for the form's birthplace field goes through the same pool.
5. The number of this task and of any new decision is the next free on `main` and in open pull requests at the time.

## 3. In scope

- **`apps/web/src/lib/family-config.ts`:** `familyTreeEnabled(env)`: accounts on and `FAMILY_TREE_ENABLED=1`. **`tree-paths.ts`:** the paths of the pages and routes in both languages, and the one-question flow's draft as a query.
- **`apps/web/src/lib/family-runtime.ts`:** `createFamily` over `createFamilyDb` on the accounts pool (which `accounts-runtime.ts` now exposes), made on first use; `null` when off.
- **`apps/web/src/lib/tree-routes.ts`:** POST handlers over an injected service, each with the same-site check and the session check of `account-routes.ts`, answering 303 to a page with a status word: create a tree, add a person (the one-question flow posts one page at a time and keeps the draft in the query, never in storage), update a person, delete a person, set a parent, remove a parent, set the root, accept the living-people terms, delete a tree. `@name-atlas/accounts` gains `acceptTerms` for the last.
- **`apps/web/src/lib/tree-load.ts`, `tree-pedigree.ts`, `tree-places.ts`:** the pages' decisions and reads, away from Next, so an integration test runs them as the real role; the Ahnentafel slots, the next question and the people outside the pedigree from the contract object; the TERYT lookup on the read-only pool.
- **Pages, both languages, no script:**
  - **the dashboard** `/pl/konto/drzewa` (`/en/account/trees`): the reader's trees as rows, the next empty parent slot of the first tree as the one question, the privacy lines ("widzisz je tylko Ty"), a "Nowe drzewo" form;
  - **the consent step**, shown once per account at the first person marked living or with no death year: the clause, one checkbox, a POST that records the new terms version on the account and then saves the person (ADR-0027 §2.9; this is the "changed version asks again" TASK-062 §4.3 left out). A sign-up made while the tree is on records the tree variant's version, so it never sees the step;
  - **the Rodowód view** `/pl/konto/drzewa/{tree}`: the pedigree from the root, four generations, cards for people and dashed cards for empty slots, each a link to that person's form or to "add this parent"; the provenance chip (*wpisane przez Ciebie*), the living chip, the count of hidden living people when the reader is a member;
  - **one question per screen**: "Kim byli rodzice X?" → a page per parent with the fields of the design (name, surname, birth surname, year with "około", birthplace searched in TERYT, living or not) → "X jest w drzewie" with the next question;
  - **a person's form** for corrections, with deletion.
- **The terms** (`legal-tree.ts` over `legal-text.ts`): the clause on living people (ADR-0026 §2.5, ADR-0029 §2.4.12) in the tree variant, with its own date (`TREE_LEGAL_UPDATED`); the privacy notice: what a tree stores, that it is private, that a member sees the living only when the owner opens it, that export and deletion exist, retention (D-028: as long as the account). The text awaits the legal review D-031 already requires before the tree goes live.
- **The header:** "Drzewa" / "Trees" beside "Konto" when the tree is on, leading to **the tree's landing page** (`/pl/drzewo-rodzinne`, `/en/family-tree`; the owner, 2026-10-03: the pages only after sign-in, and the header's link a page that explains what the tree is for, what the reader can do and why): public, static, no session; what it is, why, what you can do, who sees what, what is planned; "Twoje drzewa" (the dashboard, which asks for a sign-in) and "Załóż konto". A 404 while the tree is off.
- **Styles:** the dusk tokens; the pedigree cards (`.tree-card`, dashed when empty) and the chips (`.tree-chip`) after the mockup's `.na-card-btn` and `.na-chip`.
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

## 7. What was built against the draft

The draft's file list named `family-config.ts` for both the gate and the paths; the paths are in `tree-paths.ts` so the header, which imports the gate, stays small. The loader is its own module (`tree-load.ts`) for the integration test. The landing page (`tree-landing.tsx`) was added at the owner's request on 2026-10-03 after the first build: the header's "Drzewa" had led straight to the dashboard, which asks for a sign-in, and the owner wanted a page that explains the tree first. The same day the owner asked for it to be redesigned "so it feels alive, not like a terms page": three directions were drawn as artboards on the real tokens (Konstelacja, Horyzont, Rzeka czasu; the canvas is the owner's) and the owner chose **Horyzont**: the hero is a sample pedigree of invented people drawn as the tree pages draw one, rows of generations receding to the horizon with the sun behind the oldest, each person appearing in turn and the next question lit at an empty place; then why, what you can do (a phone frame with the question form as a picture), who sees it (the same person sealed for everyone and sharp for you), what is planned, and the two actions. The motion is the stylesheet's (timed in the hero, scroll-driven below where `animation-timeline: view()` exists), off under `prefers-reduced-motion`, and the page reads in full without script. Nothing else departs from §3 and §4.
