# Merging `main` (#83, #84) into the pending pipeline (#76)

The owner approved the merge order on 2026-10-03: #77 into #76, then #76 into `main`. #77 was merged into #76's branch (`8d053c6`). Meanwhile `main` had taken #83 (a blog post) and #84 (well-known bearers: TASK-073, ADR-0030, migration `0029_notable_bearers`, contract 1.12). This merge brings `main` into #76.

## What changed in the merge

- **The family schema's migration is now `0030_family_schema`** (it was `0028_family_schema`).
  - **Why:** `main`'s 0029 may already be applied in production when #76 lands, and Kysely refuses to apply a migration that sorts before one already applied.
  - **What was updated:** references to the migration in code, tests and `docs/CODEMAP.md`: the roles file, the family schema types, the migration lists in `migrator.test.ts`, `extensions.test.ts` and `canonical-key-v2.test.ts`, the family and accounts tests, and a comment in `0029_notable_bearers.ts`.
  - **What was not:** the dated progress records and task files that name 0028 record what was true when they were written, and are unchanged.
- **Contract 1.12 carries both new sections:** `localities` (1.11, TASK-066) and `bearers` (1.12, TASK-073).
  - `docs/contracts/surname-result.md` numbers the localities rules 29–32 and the bearers rules 33–34, and lists both version steps.
  - A test fixture written for 1.11 now sets `bearers: null`.
- **Page and deck order:** archive, localities, well-known people, then sources and summary. Each side's own placement is kept. Two tests that counted the chapters and the deck's cards now count one more.
- **`docs/DECISIONS_NEEDED.md`:** #76's newer version, with `main`'s D-033 added above D-032. `STATUS.md` combines both sides' lines.

## Verification, 2026-10-03

Local PostgreSQL 16 with PostGIS.

| Command | Result |
|---|---|
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm` | exit 0 |
| `pnpm test` | exit 0 (after the two count fixes and the fixture fix above) |
| `pnpm build` | exit 0 |
| `pnpm test:integration` | exit 0; 33 files, 404 tests |
| `pnpm test:golden` | exit 0; 364 tests |
| `pnpm test:backup` | exit 0 |
| `pnpm db:migrate` on an empty database, then `pnpm db:generate-types` | 0001–0027, 0029, 0030 applied in that order; the generated types unchanged |

## Not verified

- Production: no migration was run.
- #67 still carries the family schema as `0028_family_schema`. It must take this numbering, or drop its copy, before it merges.

## Second merge: `main` after #67 (the family tree), 2026-10-03

`main` took #67 at `4dce85f`. It holds the family schema as `0028_family_schema` (TASK-066) and the tree pages (TASK-076). This branch carried the same schema, so the merge:

- **Keeps `main`'s `0028_family_schema` byte for byte** and deletes this branch's renamed copy, `0030_family_schema`.
- **Adds `0030_family_safeguards`** with the two schema fixes from the #76 review: the partial unique index `parentage_one_mother_or_father` and the function `family.touch_tree`. The family service is this branch's: the serialized graph edits, plus the review's fixes to `deletePerson`, `touch()` and the parent roles.
- **Adds `role-taken`** to the tree pages' status words in both languages, with a route test, so `setParent`'s `ROLE_TAKEN` answer is said plainly.
- **Renumbers the localities task to TASK-077** (`tasks/077-localities-with-the-same-name.md`): `main` gave 066 to the family core. It also drops this branch's duplicate `tasks/068-family-tree-core.md` and `tasks/drafts/tree-pages.md`, both now on `main` as 066 and 076.
- **`docs/DECISIONS_NEEDED.md`:** D-027 to D-031 from `main` go between D-032 and D-026.

| Command | Result |
|---|---|
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:backup` | exit 0 |
| `pnpm test:integration` | exit 0; 408 tests |
| `pnpm test:golden` | exit 0; 364 tests |
| `pnpm db:migrate` on an empty database, then `db:generate-types` | 0028, 0029 and 0030 applied in that order; the generated types unchanged |

## Third merge: `main` after #86 (the blog's redesign), 2026-10-03

`main` took #86 at `29b08d7` as TASK-075, and the open #87 claims TASK-077. The merge:

- **Renumbers the localities task to TASK-079** (`tasks/079-localities-with-the-same-name.md`), free on `main` and in every open pull request. The code comments, contract notes, `STATUS.md`, `docs/CODEMAP.md`, D-032's line and TASK-070 follow.
- **`STATUS.md`:** only the "Last rewritten" line conflicted.

| Command | Result |
|---|---|
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test`, `build`, `test:backup` | exit 0 |
| `pnpm test:integration` (local PostgreSQL 16) | exit 0; 408 tests |
| `pnpm test:golden` | exit 0; 364 tests |

## Fourth merge: `main` after #87 (the `bearers` VM step), 2026-10-03

`main` took #87 at `b0dd8fa` as TASK-077. Three files conflicted:

- **`.github/workflows/register-vm.yml`:** both new steps are kept, `bearers` (TASK-077) and `backup` (TASK-049 / TASK-070), in the header, the choice list and the step `case`.
- **`docs/CODEMAP.md`:** the `ops/vm/` row is this branch's, with `bearers.sh` added from `main`.
- **`STATUS.md`:** the "Last rewritten" line; the More-cards line keeps TASK-079.

`ops/vm/accounts.sh` and `ops/vm/README.md` merged without conflict.

| Command | Result |
|---|---|
| `bash -n` on every `ops/vm/*.sh` | no errors |
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test`, `test:backup` | exit 0 |
| `register-vm.yml` parsed as YAML | parses |

## Fifth merge: `main` after #85 (ADR-0031, search and editorial content), 2026-10-03

Only `STATUS.md` conflicted: the "Last rewritten" line, and the More-cards line, which keeps TASK-079 beside `main`'s new search-and-content line.

| Command | Result |
|---|---|
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test` | exit 0 |

## Sixth merge: `main` after #88 (the `accounts` step and schema `family`), 2026-10-03

#88 made the same change this branch carries for the data-load dumps (both `--exclude-table-data` flags), so after the merge their `pg_dump` lines are this branch's, unchanged. The conflicts:

- **`ops/vm/editions.sh`, `extras.sh`, `finalize.sh`, `shift.sh`:** comments only; `main`'s wording, which names schema `family`.
- **`ops/vm/accounts.sh`:** `main`'s checks: PUBLIC grants on both private schemas, and the foreign-key check across them.
- **`scripts/check-vm-dumps.sh`:** this branch's rule, so `backup.sh`'s one invocation may stream the private rows straight into age with pipefail; `main`'s header, with that exception added.
- **`STATUS.md`:** the "Last rewritten" line.

| Command | Result |
|---|---|
| `bash -n` on every `ops/vm/*.sh` and `scripts/*.sh` | no errors |
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test`, `test:backup` | exit 0; `check:vm`: 12 scripts parse, 5 dumps pass |
| `check-vm-dumps.sh` on a copy of `ops/vm` with `finalize.sh`'s `family` flag removed | exit 1, naming `finalize.sh` |
