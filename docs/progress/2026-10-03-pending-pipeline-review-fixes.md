# Review fixes for the pending pipeline (#76)

A review of #76 (`codex/remaining-pipeline`) on 2026-10-03 found six defects. This change fixes them on a branch cut from #76's head, with `origin/main` (`3e2e9b3`) merged in. Nothing is deployed, merged or run on the VM.

## What changed

- **Behind `main`.** #76 was built on `35f0d13`; `main` had moved to `3e2e9b3` (#74, #75). `origin/main` is merged in. The only conflict was `STATUS.md`'s "Last rewritten" line. `robots.txt/route.test.ts` mocked `siteOrigin` on `lib/surname-page.js`, where #76 no longer exports it; the mock now sits on `lib/seo.js`.
- **`deletePerson`** (`packages/family/src/service.ts`) took neither the tree lock nor the living-people check that `setParent` takes. An editor who cannot see the living could delete a deceased parent and cascade away parent links to hidden living children. It now locks the tree and answers `FORBIDDEN` unless `family.sees_living` is true.
- **`touch()`** updated `family.trees` directly, and the policy `trees_update` lets only the owner update it, so an editor's edit matched zero rows without an error and `updated_at` never moved. Migration 0028 (not yet applied anywhere) gains `family.touch_tree(t, at)`, a `SECURITY DEFINER` function that sets that one column when `can_write(t)`; `touch()` calls it. The policy is unchanged.
- **Parent roles.** A child could get two `MOTHER` or two `FATHER` links. Migration 0028 gains a partial unique index `parentage_one_mother_or_father` on `(child_id, role)` for those two roles, and `setParent` answers `ROLE_TAKEN` first. `PARENT` links are not limited beyond the existing two parents in all. `docs/contracts/tree.md` states the three rules.
- **Localities** (`packages/truth/src/localities.ts`) joined `place_names`, so a place with two official names sharing a key was listed twice, overstated `total`, and failed the contract's "listed once" check, which made the whole page UNAVAILABLE. The name match is now an `EXISTS`.
- **`ops/vm/backup-check.ts`** read the surname payload on a connection outside the exported snapshot. In snapshot mode it now reads inside a `REPEATABLE READ` transaction that begins with `SET TRANSACTION SNAPSHOT <id>` (the id is checked against `^hex-hex-digits$` first). Verify mode, on a restored database, is unchanged. `sql` is re-exported from `packages/db/src/index.ts` because the script runs from the app checkout and cannot resolve `kysely` itself.
- **`ops/vm/extras.sh`** de-duplicated surnames with the byte-wise `sort -u`, so `ZAREMBA` and `Zaremba` from two onomastic files were both counted and the gate `ACTIVE SURNAME_MEANING claims = with_meaning` could fail on a correct load. Each surname is now counted once by the display form the tool prints first.

Left as they were in #76 (reported in the review, not asked for here): the regional importer's wider catch of database errors, the sequential localities reads in `query.ts`, and the exact-text guard for `backup.sh` in `scripts/check-vm-dumps.sh`. The review also named an unused `BURYAN` variable in `extras.sh`; there is none.

## Verification, 2026-10-03

Node 22.22.0, pnpm 10.33.0, PostgreSQL 16 with PostGIS 3 installed from apt for this session (`TEST_DATABASE_URL`, one disposable database per test file).

| Command | Result |
|---|---|
| `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm check:vm` | exit 0 (`format:check` after Prettier reformatted `service.ts`) |
| `pnpm test` | exit 0; 1,871 unit tests (web 564, including the three robots tests) |
| `pnpm test:backup` | exit 0; 6 tests, mocked `pg_dump`/`age`/`rclone` |
| `pnpm test:integration` | exit 0; 32 files, 397 tests (four new, below) |
| `pnpm test:golden` | exit 0; 4 files, 364 tests |
| `pnpm build` | exit 0 |
| `shellcheck ops/vm/extras.sh` | exit 0 |

New tests: three in `tests/integration/src/family.test.ts` (one mother and one father, the editor's delete refused and then allowed, `updated_at` moves on an editor's edit) and one in `localities-with-name.test.ts` (two official names, one place). With the fixes stashed, the four fail; with them, they pass.

For the snapshot read, a throwaway script on a migrated database exported a snapshot, inserted a row on another connection, then read the table both ways: the transaction that set the snapshot saw 1 row, a plain read saw 2.

## Not verified

- `backup-check.ts` end to end (`snapshot` then `verify`) against a database holding the register: the local database had no surnames, so the sample surname could not resolve. Only the snapshot mechanics above were exercised.
- The `extras.sh` counting change was checked by `bash -n` and ShellCheck, not run.
- Migration 0028 on the production database, and everything listed as not verified in `2026-10-02-pending-pipeline.md`: the R2 upload, the PostgreSQL 17 restore drill, full SIMC.
