# 2026-10-04 — TASK-111: the free tree's 5-person cap, on the server

Branch `claude/tree-free-limits`, on `origin/main` @ `9866385` (#119). Numbers: tasks on `main` end at 110, and the open pull requests hold 103, 106, 107, 108 and 099. No open pull request adds a migration (#122 and #108 add ADRs only, and those numbers are already on `main`). So this change takes TASK-111 and migration 0034, and no ADR.

## Changed

- `packages/family/src/rules.ts`: `FREE_TREE_PERSONS_MAX = 5`, and `noPaidTier`, which answers false for every account.
- `packages/family/src/service.ts`: `FamilyDeps.hasPaidTier` (default `noPaidTier`) and `AddPersonResult`. When the tree's owner has no paid tier, `addPerson` takes the tree lock and counts the tree's rows with `family.tree_person_count`. At 5 or more it answers `{ kind: "PERSON_LIMIT", limit: 5 }` and writes nothing. `index.ts` exports the new names.
- `packages/db/migrations/0034_family_person_count.ts` (new): `family.tree_person_count(t)`, SECURITY DEFINER. It counts every row to a caller who may write the tree, and answers 0 to anyone else. An editor's own count would be short, because the select policy hides the living and declined rows from them.
- `apps/web/src/lib/tree-routes.ts`: `PERSON_LIMIT` → 303 to the tree page with `?status=person-limit`. This covers both POSTs that save a new person (`add-person` and the consent step).
- `apps/web/src/lib/tree-text.ts`: `StatusWords.offer`, an optional link label. The tree page's `person-limit` words are in Polish ("Darmowe drzewo mieści 5 osób i to drzewo jest pełne. …", "Zobacz ofertę") and in English ("A free tree holds 5 people, and this one is full. …", "See the offer").
- `apps/web/src/lib/tree-page.tsx`: a status with `offer` links to `offerPath(lang)`. There is no buy button.
- Tests: `packages/family/src/rules.test.ts`; `apps/web/src/lib/tree-routes.test.ts` (the redirect, no link attempted, words in both languages); `tree-page.test.ts` (the message and the offer link in both languages, no buy words); `tests/integration/src/family.test.ts` (three new tests: the cap for the owner and for an editor who sees nobody, with the paid-tier lift asked about the owner; two concurrent adds for the last place; the function answering 0 to a stranger).
- Tests changed because 0034 is now the newest migration: `packages/db/src/migrator.test.ts`, `tests/integration/src/extensions.test.ts` and `canonical-key-v2.test.ts` list 0034. `family-claims.test.ts` steps down to 0033 before asking for 0033's refusal. Its fixtures put more than 5 people in one tree to test the invitation window, so that suite gives the owner a paid tier through `hasPaidTier`. The cap is tested in `family.test.ts`.
- Docs: `tasks/111-tree-free-limits.md` (new), `docs/contracts/tree.md` (a new section on the free tree's limits; the GET response and its schema version are unchanged), `docs/CODEMAP.md` (the family row), `docs/DECISIONS_NEEDED.md` (D-034's line), ADR-0037's "Implemented by" line, `STATUS.md`.

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
- **Production.** Nothing was turned on. The tree stays behind `ACCOUNTS_*` and `FAMILY_TREE_ENABLED=1`, which production does not set. Migration 0034 has been applied only to the local test databases of this session.
