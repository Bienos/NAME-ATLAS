# 2026-10-04 — TASK-112: the free tree's 5-person cap, on the server

Branch `claude/tree-free-limits`, first on `origin/main` @ `9866385` (#119) as TASK-111 with migration 0034. Before merging, `origin/main` @ `254c93c` was merged in: #128 had taken migration 0034 on `main`, and open pull request #130 holds TASK-111 and migration 0035. So this change is renumbered TASK-112 with migration 0035, and adds no ADR. It takes 0035, not 0036, because it merges first and the migrator refuses a migration that sorts before one already applied; #130 has to move to 0036 when it next merges `main`.

## Changed

- `packages/family/src/rules.ts`: `FREE_TREE_PERSONS_MAX = 5`, and `noPaidTier`, which answers false for every account.
- `packages/family/src/service.ts`: `FamilyDeps.hasPaidTier` (default `noPaidTier`) and `AddPersonResult`. When the tree's owner has no paid tier, `addPerson` takes the tree lock and counts the tree's rows with `family.tree_person_count`. At 5 or more it answers `{ kind: "PERSON_LIMIT", limit: 5 }` and writes nothing. `index.ts` exports the new names.
- `packages/db/migrations/0035_family_person_count.ts` (new): `family.tree_person_count(t)`, SECURITY DEFINER. It counts every row to a caller who may write the tree, and answers 0 to anyone else. An editor's own count would be short, because the select policy hides the living and declined rows from them.
- `apps/web/src/lib/tree-routes.ts`: `PERSON_LIMIT` → 303 to the tree page with `?status=person-limit`. This covers both POSTs that save a new person (`add-person` and the consent step).
- `apps/web/src/lib/tree-text.ts`: `StatusWords.offer`, an optional link label. The tree page's `person-limit` words are in Polish ("Darmowe drzewo mieści 5 osób i to drzewo jest pełne. …", "Zobacz ofertę") and in English ("A free tree holds 5 people, and this one is full. …", "See the offer").
- `apps/web/src/lib/tree-page.tsx`: a status with `offer` links to `offerPath(lang)`. There is no buy button.
- Tests: `packages/family/src/rules.test.ts`; `apps/web/src/lib/tree-routes.test.ts` (the redirect, no link attempted, words in both languages); `tree-page.test.ts` (the message and the offer link in both languages, no buy words); `tests/integration/src/family.test.ts` (three new tests: the cap for the owner and for an editor who sees nobody, with the paid-tier lift asked about the owner; two concurrent adds for the last place; the function answering 0 to a stranger).
- Tests changed because 0035 is now the newest migration: `packages/db/src/migrator.test.ts`, `tests/integration/src/extensions.test.ts` and `canonical-key-v2.test.ts` list 0035. `family-claims.test.ts` steps down to 0033 before asking for 0033's refusal. Its fixtures put more than 5 people in one tree to test the invitation window, so that suite gives the owner a paid tier through `hasPaidTier`. The cap is tested in `family.test.ts`.
- Docs: `tasks/112-tree-free-limits.md` (new), `docs/contracts/tree.md` (a new section on the free tree's limits; the GET response and its schema version are unchanged), `docs/CODEMAP.md` (the family row), `docs/DECISIONS_NEEDED.md` (D-034's line), ADR-0037's "Implemented by" line, `STATUS.md`.

## Verified (run locally on this branch, 2026-10-04)

- `pnpm lint`: exit 0, no findings.
- `pnpm typecheck`: exit 0.
- `pnpm test`: exit 0. `apps/web`: 78 files, 830 tests passed. `packages/family`: 12 tests passed. Every other package's suite passed.
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- Integration: `TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres pnpm exec vitest run` in `tests/integration`, against a local PostgreSQL 16.14 with PostGIS 3 installed in this session. Result: 37 files, 442 tests passed. Before the test fixes above, the same run failed 2 tests in `family-claims.test.ts` (the cap refused their fixtures' sixth person) and 2 tests that list the migrations in order. That shows the cap is live by default.
- Not run: GitHub Actions, which is not starting jobs on this account. Also not run: the web app in a browser, and anything in production.

## Not done, and why

- **Matches beyond second cousins.** Nothing limits them, because no tree matching exists. There is no match index, no proposal, no link between two trees, and no contract field for a match (ADR-0029 §2.18: "neither door is in the first release"). Within one tree, a degree of kinship could be worked out from `parentage` and `root_person_id`. Between two trees it could not: nothing stores which person in one tree is the same as a person in another. The task that builds matching must apply the limit. It also needs a definition the decisions do not give yet: what "up to second cousins" is counted from (for example, a shared ancestor no further up than the reader's great-grandparents).
- **Number of trees.** No limit has been decided (D-034), so a free account can make several trees of 5 people each.
- **Entitlement storage.** No tier is stored anywhere. Checkout will supply `hasPaidTier` when it exists (ADR-0023 §2.5).
- **Production.** Nothing was turned on. The tree stays behind `ACCOUNTS_*` and `FAMILY_TREE_ENABLED=1`, which production does not set. Migration 0035 has been applied only to the local test databases of this session.

## Re-verified after the renumbering (2026-10-05)

After merging `origin/main` @ `254c93c` and renumbering to TASK-112 and migration 0035:

- `pnpm lint`: exit 0. `pnpm typecheck`: exit 0.
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm test`: exit 0 (`apps/web` 845, `packages/family` 12, `packages/db` 11; every other suite passed).
- `pnpm test:integration` with `TEST_DATABASE_URL` on a local PostgreSQL 16.14 with PostGIS 3: 37 files, 443 tests passed.
