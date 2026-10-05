# 2026-10-05 — First-name counts and ranks as claims (TASK-122)

The full-name report's first derived fact (`tasks/122-given-name-claims.md`; ADR-0032 §6). The owner asked to "build the first-name counts" after D-043. Built on `main` @ `ab23f2f`. Nothing is deployed, applied on the VM or derived on production.

It was built as TASK-121, the name its first two commits use, and renumbered TASK-122 because #146 opened with TASK-121 first (`AGENTS.md` §11). Only the number changed.

## What changed

- **Migration 0038** (`packages/db/migrations/0038_given_name_claims.ts`): `claim_type` gains `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK`, and `research_run_type` gains `BASIC_GIVEN_NAME`. The check `claims_given_name_scope` holds both claim types at `SHARED`. Down drops the check; enum values stay, as in every earlier enum migration. `packages/db/src/generated/db.ts` is regenerated.
- **`packages/sources/src/given-names/registry.ts`:** `official_name_row_count` on both descriptors (46,197 male, 28,781 female), the stored rows TASK-078 observed on the full files.
- **`packages/truth/src/given-name.ts`** (new):
  - `deriveGivenName(db, name)` finds the name by its canonical key. Per active list it derives:
    - the count claim, through the source-native chain;
    - the rank claim, gated by `assessUniverseCompleteness` against the official checksum and `official_name_row_count`, as a competition rank (`buildRankTable`, `rankInTable`) with `COUNT` and `UNIVERSE` dependencies.
  - It is idempotent on the claim key, with one `BASIC_GIVEN_NAME` run per name when it writes.
  - `deriveAllGivenNames` does every name, `concurrency` at a time, with one cache of per-list row counts and rank tables.
  - `version.ts` adds `given_name_population@1` and `given_name_rank@1`.
- **`packages/truth/bin/derive-given-names.ts`**, `pnpm truth:derive-given-names` (root) and `derive-given-names` (`@name-atlas/truth`).
- **Tests:** `tests/integration/src/given-name-claims.test.ts` (6). The migration lists in `packages/db/src/migrator.test.ts`, `tests/integration/src/extensions.test.ts` and `canonical-key-v2.test.ts` include 0038.
- `tasks/122-given-name-claims.md`, `STATUS.md`, `docs/CODEMAP.md`, ADR-0032 (one consequence line).

## Verification (commands run, results as returned)

CI's `verify` job cannot run on GitHub because of the account's billing block (see #136). Its steps from `.github/workflows/ci.yml` were run locally in order on the working tree of `30913ba`. The database was PostgreSQL 16.14 with PostGIS 3.4.2: `DATABASE_URL` was a fresh `name_atlas`, and `TEST_DATABASE_URL` was the same server.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm` | exit 0 |
| `python3 scripts/test-backup.py` | exit 0, 6 tests |
| `pnpm test` | exit 0, 2,283 tests |
| `pnpm db:migrate`; `db:generate-types` and `git diff --exit-code -- packages/db/src/generated` | exit 0, no diff |
| `pnpm test:integration` | **exit 1**: 1 failed, 468 passed. `current-rank.test.ts` lists every `claim_type` value and lacked the two new ones. They were added in `8746a2c`. |
| `pnpm test:integration` on `8746a2c` | exit 0: 38 files, 469 tests, of which 6 are new in `given-name-claims.test.ts` |
| `pnpm test:golden` | exit 0: 4 files, 364 tests |
| `pnpm build` | exit 0 |
| `pnpm e2e:seed`; `pnpm test:e2e` | exit 0, 10 Playwright tests passed |

**The full official files**, out of band, in a separate database `gn_full`:

1. Both files were downloaded from dane.gov.pl, and their checksums match the registry:
   - male `1159669`: 1,095,529 bytes;
   - female `1159670`: 557,487 bytes.
2. Both were imported with `importGivenNameResource`:
   - male: 46,197 names stored, 21,461,731 people;
   - female: 28,781 names stored, 22,589,516 people;
   - 71,433 given names and 74,978 `given_name_counts` rows.

   This matches TASK-078's record.
3. `pnpm truth:derive-given-names` returned exit 0 in 181.2 s. It covered 71,433 names, with population `{derived: 74978, existing: 0, refused: 0}` and rank `{derived: 74978, existing: 0, refused: {}}`.
4. In the database after the run:
   - 74,978 `GIVEN_NAME_POPULATION` and 74,978 `GIVEN_NAME_RANK` claims;
   - every claim has a confidence assessment (all `VERIFIED`) and a citation;
   - 71,433 `BASIC_GIVEN_NAME` research runs.
5. The two rank-1 claims:

   | Name | List | Count | Rank | Universe | Ties |
   |---|---|---:|---:|---:|---|
   | PIOTR | male | 682,516 | 1 | 46,197 | `COMPETITION` |
   | ANNA | female | 1,063,756 | 1 | 28,781 | `COMPETITION` |

   ANNA also has a male-list count of 12 and PIOTR a female-list count of 3, each ranked on its own list. The lowest rank stored is 30,051.
6. A second `pnpm truth:derive-given-names` returned population and rank `{derived: 0, existing: 74978}` in 49.7 s. Claims stayed at 149,956 and research runs at 71,433.

## Not verified

- Migration 0038 on the VM, the official files on production, and a derivation there.
