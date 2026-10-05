# 2026-10-05 — First-name counts and ranks as claims (TASK-121)

The full-name report's first derived fact (`tasks/121-given-name-claims.md`; ADR-0032 §6). The owner asked to "build the first-name counts" after D-043. Built on `main` @ `ab23f2f`. Nothing is deployed, applied on the VM or derived on production.

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
- `tasks/121-given-name-claims.md`, `STATUS.md`, `docs/CODEMAP.md`, ADR-0032 (one consequence line).

## Verification (commands run, results as returned)

Local CI run and full-file derivation in progress; results follow in the next commit.

## Not verified

- Migration 0038 on the VM, the official files on production, and a derivation there.
