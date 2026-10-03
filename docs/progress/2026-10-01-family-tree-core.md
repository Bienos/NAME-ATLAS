# 2026-10-01 — TASK-066: the family tree, the core: schema, package and contract, dark

Branch `claude/sweet-feynman-wisze8`, built on `main` @ `fd6a871` (#64). Task file: `tasks/065-family-tree-core.md`. Decision: ADR-0029, accepted for build the same day after the owner answered D-028 ("never"), D-029 ("make it paid"), D-030 ("ok") and D-031 ("it's ok"), and said "do it now, we review later"; D-027 stays open.

## Why

The owner chose the tree's design from the mockups and asked how to store and use it. ADR-0029 answers; this is the part with no page in it: the schema with its policies, the rules, the service and the contract, so the pages have something already reviewed to call. Nothing on the site calls it, and no environment variable changes, so production behaves as before.

## What changed

- **Migration `0028_family_schema`:** schema `family` with `trees`, `persons` (constraints: names 1–120, years 1000–2100, death not before birth, a death year forces `DECEASED`, a seven-digit SIMC code), `parentage` (child, parent, role; not self), `members` (role, `sees_living`), `audit_events` (kinds and ids, no name, `person_id` without a foreign key). Row-level security on all five, keyed on `app.user_id` through SECURITY DEFINER helpers (`current_user_id`, `is_owner`, `can_read`, `can_write`, `sees_living`, `tree_of`, `person_visible`, `hidden_living_count`): a living or unknown person is invisible to a member whose `sees_living` is off, a parent must be in the child's tree, audit rows take no update or delete. `down` refuses while a tree exists.
- **`ops/vm/accounts-roles.sql`:** the same grants on `family` as on `accounts` for `nameatlas_app`; the read-only role gets nothing.
- **`packages/family`** (new, `@name-atlas/family`, depends on `@name-atlas/db` and the repository's `kysely`; no new dependency): `schema.ts` (the tables typed by hand, `createFamilyDb` on the accounts pool), `rules.ts` (`checkPerson`, `treatedAsLiving`, `wouldCycle`, `parentCount`), `service.ts` (`createTree`, `listTrees`, `getTree`, `exportTree`, `deleteTree`, `addPerson`, `updatePerson`, `deletePerson`, `setParent`, `removeParent`, `setRoot`, `addMember`, `removeMember`, `setSeesLiving`; each call one transaction that sets `app.user_id` first; a policy refusal answers `FORBIDDEN`, an unreadable tree `NOT_FOUND`).
- **`packages/contracts/src/tree.ts`** and **`docs/contracts/tree.md`:** the `tree` object, schema 1.0, with the living rule refined in the schema; `places` is the route's to fill.
- **Tests:** `rules.test.ts` (9), `tree.test.ts` (3), `tests/integration/src/family.test.ts` (10, as `nameatlas_app` with the roles file executed). Migration pins in `migrator.test.ts`, `extensions.test.ts` and `canonical-key-v2.test.ts` gain `0028`. `accounts.test.ts`'s two assertions that assumed `0027` was the top of the stack and that no foreign key touched `accounts` now say what holds: `0028` steps off first, nothing crosses `public`'s boundary, and the only references into `accounts` come from `family`.
- **Renumbered again on the second rebase (2026-10-02):** `main` @ `b48bd61` (#69) had taken TASK-065 for the landing, so this task is TASK-066 in every file that names it; its number was free on `main` and in the open pull requests at that moment (ADR-0027 reserves 064 for the card download).
- **Renumbered on rebase:** `main` @ `0a1e869` (#66, TASK-062) had taken D-026 for the product's name and domain, so the five decisions this work raised became D-027 (documents), D-028 (retention), D-029 (paid), D-030 (verification) and D-031 (a relative who declines), in every file that names them.
- **`packages/truth/src/list-facts/crowd.test.ts`** (unrelated code, fixed because CI drew its failure on this pull request's first run): the property "agree with the rationals to double precision on random lists" compared `shareWithoutNamesake` to a helper that kept 40 decimal *places*, so a share near 1e-30 had ten significant digits and one near 1e-40 was zero, and it bounded the share's error at a flat 1e-15 although `exp` of a log near −45 carries about |log| ulps. Whether a run failed depended on fast-check's seed: 11 of 30,000 random lists broke the flat bound, and CI drew `[33, 58]`, n = 21 (1.03e-15). The helper now keeps 20 significant digits in exponent form, and the bound follows |ln share| with an absolute floor at 1e-300. Measured after the change: 0 failures in 90,000 random lists over three seeds, worst error at 0.77 of the bound; the file's 18 tests passed five runs in a row. `expectedDistinct` never exceeded 2.2e-16 and its bound is unchanged.
- **`tasks/drafts/tree-pages.md`** (new, unnumbered): the next task, the tree pages, drafted at the owner's "ok lets go" while this pull request awaited its merge; it is numbered when it starts.
- `tests/integration/package.json` (the new dependency), `pnpm-lock.yaml` (the new workspace package), `docs/CODEMAP.md` (a row), `docs/contracts/README.md`, `docs/DECISIONS_NEEDED.md` (D-028 to D-031 resolved), ADR-0029 (status and the answers), `STATUS.md`.

## Verification

Run on 2026-10-01 after the last edit, on this container with PostgreSQL 16 and PostGIS installed locally (no Docker; `pg_ctlcluster 16 main start`):

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm build` — exit 0.
- `pnpm test` — exit 0 (the full suite; the new unit tests included).
- `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm test:integration` — exit 0: 31 files, 376 tests passed (`family.test.ts` 10 of them). The first run failed 2 in `accounts.test.ts` for the two reasons above; both assertions were changed as described and the suite rerun.
- `TEST_DATABASE_URL=… pnpm test:golden` — exit 0: 4 files, 364 tests passed.
- One mutation made by hand and reverted: the `persons_select` policy without its living clause. `family.test.ts` then failed AC-5 (the viewer saw "Andrzej") and, downstream, AC-6; the file was restored and compared byte for byte.

## Not verified

- `ops/vm/accounts-roles.sql` on the production VM and through PgBouncer: it ran on a stock PostgreSQL 16 here. Whether `SET LOCAL` through PgBouncer's transaction mode behaves as PostgreSQL documents is what the VM run (TASK-063) will show.
- Migration `0028` on the production database: it runs with the next deploy's migrate step and stays empty and unread.
- Anything a browser touches: there is no page, route or cookie in this change.
- The restore drill of TASK-049 does not yet compare the `family` schema (ADR-0029 §4).
