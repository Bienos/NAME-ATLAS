# 2026-09-30 — TASK-039: the TERYT localities import (TERC + SIMC)

Scope authority: `tasks/039-teryt-localities-import.md`, written and implemented in this change. The project owner asked on 2026-09-30 to "start the TERYT localities import".

**Base:** `claude/jolly-faraday-uas99n` at `7a1f934` (pull request #25, TASK-038), not `main`. #25 was open and unmerged, and this task needs its `pl_teryt` source row. `origin/main` (`ea03941`) is an ancestor of that base. When the task started, #25 was the only open pull request and TASK-039, migration `0023` and D-023 were free.

## Acquired

GUS's official "Pliki pełne" page (`eteryt.stat.gov.pl`) answered from this sandbox on 2026-09-30. Both "wersja urzędowa" files were downloaded through the page's own postback. `fixtures/teryt/source-manifest.json` records every value below, plus the HTTP headers and both terms pages' SHA-256.

| | TERC | SIMC |
|---|---|---|
| Retrieved (UTC) | 2026-09-30T01:26:22Z | 2026-09-30T01:26:29Z |
| Zip | `TERC_Urzedowy_2026-09-30.zip`, 132,136 bytes, `0bd7d74b…` | `SIMC_Urzedowy_2026-09-30.zip`, 3,349,858 bytes, `14b2d9ae…` |
| CSV member | 205,660 bytes, `557edb28…` | 5,566,752 bytes, `316c6446…` |
| Data rows | 4,360 | 101,865 |
| `STAN_NA` | 2026-01-01, every row | 2026-01-01, every row |

- The TERC CSV is byte-identical to the 2026-09-18 file (`fixtures/teryt/voivodeship-terc-correspondence.json`, `file_used_sha256`).
- For SIMC, the 2026-09-18 zip's CSV hash was never recorded, so whether its bytes are identical is **not verified**.
- The committed fixtures are excerpts, 14 real lines each, byte for byte. They are chosen to cover every hierarchy case and the two SIMC names with literal quotes (`Mazewo Dworskie"A"`, `Mazewo Dworskie"B"`). The full files are not committed (`INVENTORY.md` §3).

**Terms**, read on 2026-09-30. Both agree with `docs/canonical/12` §2.1:

- `api.stat.gov.pl/Home/TerytApi`: "Service and data are available free of charge", to public administration and commercial entities.
- eTERYT "Formy i zasady udostępniania": "Rejestr terytorialny TERYT jest jawny." TERC, SIMC and ULIC "udostępniane są bezpłatnie wszystkim użytkownikom", including "pobieranie zbiorów pełnych".

Neither page states attribution wording, so the catalogue's fail-closed `attribution_required = true` stands. Nothing is rendered, so it has no effect yet.

## Changed

- **Migration `0023_administrative_memberships.ts`** (new): `docs/canonical/11` §5.4's table. It has child and parent places, an `admin_membership_type` enum, `valid_from`/`valid_to`, `source_record_id`, and `verification_status` (reusing `evidence_verification_status`). It is UNIQUE on child, parent, type and `valid_from`, and a CHECK stops a place being its own parent. `packages/db/src/generated/db.ts` is regenerated.
- **`packages/sources/src/teryt/`** (new), re-exported from `@name-atlas/sources`:
  - `plan.ts`: parses and checks both files into a plan. It is pure and applies no CSV quoting. Row defects are quarantined, never guessed.
  - `importer.ts`: `importTerytRegisters`, the gate and the one write transaction.
  - `manifest.ts`: reads the manifest.
  - `plan.test.ts`: 41 tests.
- **`packages/sources/bin/import-teryt.ts`**, plus the scripts `import-teryt` (package) and `import:teryt` (root).
- **`packages/sources/src/importer.ts`**: `rightsRefusal`'s parameter type now asks only for the two fields it reads, so a profile read from the database can be passed. Its behaviour is unchanged.
- **`tests/integration/src/teryt-localities.test.ts`**: 17 tests. `extensions.test.ts` and `canonical-key-v2.test.ts` list the new migration and table. `packages/db/src/migrator.test.ts` lists the new migration.
- **Fixtures**: `fixtures/teryt/source-manifest.json`, `terc-urzedowy-excerpt-2026-09-30.csv` and `simc-urzedowy-excerpt-2026-09-30.csv`.
- **Docs**:
  - `tasks/039-teryt-localities-import.md`;
  - D-023 in `docs/DECISIONS_NEEDED.md`: `TERYT` versus `TERYT_TERC`, non-blocking;
  - the TERYT row in `docs/sources/INVENTORY.md`;
  - `docs/CODEMAP.md`;
  - `STATUS.md`.

No dependency or lockfile change. TASK-011's seeder, the PESEL and regional importers, the catalogue and `docs/canonical/` are unchanged.

## The production-status gap

`rightsRefusal` reads only `automated_access` and `review_status`. This connector adds its own gate, recorded in task §4 item 3. It reads `pl_teryt`'s row and default rights profile from the database, not from code, and refuses:

- an unregistered source;
- anything `rightsRefusal` refuses;
- any `production_status` other than `APPROVED` or `LEGAL_REVIEW_REQUIRED`.

TERYT is `LEGAL_REVIEW_REQUIRED` and passes, because that status closes public and paid surfaces and this import renders nothing. `rightsRefusal` itself still does not read `production_status`. A future connector needs the same gate.

## Verified

Docker is unavailable in this sandbox. `postgresql-16-postgis-3` was installed with apt, and a local cluster was started: PostgreSQL 16.13, PostGIS 3.4.2. The database suites ran against it through the `TEST_DATABASE_URL` fallback.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | passed; lockfile unchanged |
| `pnpm typecheck` | passed |
| `pnpm lint` | passed |
| `pnpm format:check` | passed |
| `pnpm check:ids` | passed |
| `pnpm test` (with `DATABASE_URL` unset) | passed: 1,131 tests, 41 of them new |
| `pnpm db:migrate` (fresh local database) | 0001–0023 applied |
| `pnpm db:generate-types`, then `git diff --exit-code -- packages/db/src/generated` against the staged file | 25 tables introspected; no diff |
| `pnpm test:integration` | passed: 26 files, 310 tests, 17 of them new |
| `pnpm test:golden` | passed: 4 files, 364 tests |
| `pnpm build` | passed |

`pnpm test` first ran with `DATABASE_URL` exported and pointing at a migrated database. One `apps/web` test then failed: `surname-prefix/route.test.ts`, "answers a failure with the error envelope …", which expects no usable database. With `DATABASE_URL` unset, it and the rest passed. TASK-038 recorded the same thing. Nothing in `apps/web` changed.

### AC-10: the full files, on a local database

These are the full 2026-09-30 CSV members, run on a fresh database with 0001–0023 applied and `pnpm seed:sources` run.

1. `pnpm import:teryt` before `seed:sources` failed with `SOURCE_NOT_REGISTERED`, exit 1.
2. On one database, the full files were imported with no TASK-011 places present. The run took 21 s and created 16 voivodeships. The re-run returned `ALREADY_IMPORTED`, exit 0.
3. On a second fresh database, TASK-011's `seedVoivodeshipPlaces` ran first ("created 16"). Then:

| | Result |
|---|---|
| TERC rows read / SIMC rows read | 4,360 / 101,865 |
| Voivodeships reused / created | 16 / 0 |
| Powiats / gminas created | 380 / 2,479 |
| TERC gmina parts, recorded but not places (`RODZ` 4, 5, 8, 9) | 1,485 |
| Localities created | 101,865, of which 47,388 are parts of another locality |
| … `VILLAGE` / `CITY` / `OTHER` | 43,641 / 1,026 / 57,198 |
| Places, names and external ids created | 104,724 each |
| Memberships created | 104,724 |
| Source records created | 106,227 (2 file records + 4,360 + 101,865 row records) |
| Second run | `ALREADY_IMPORTED`; `REGION` places still 16 |

Spot checks, by SQL on the first database:

- `Sadlno` (SIMC `1061995`) chains to `Ząbkowice Śląskie` (`CITY`), then to gmina `0224053`, powiat `0224` and voivodeship `02`.
- `Mazewo Dworskie"A"` is stored with its quotes.
- Every place except the 16 voivodeships has exactly one parent.

**Size.** On the first database, the six tables written hold 190 MB after the import:

| Table | Size |
|---|---|
| `source_records` | 90 MB |
| `administrative_memberships` | 23 MB |
| `knowledge_entities` | 22 MB |
| `entity_external_ids` | 21 MB |
| `place_names` | 21 MB |
| `places` | 13 MB |

The whole database is 207 MB. That is 38% of the hosted free plan's 500 MB.

## Not done

- **The hosted Supabase database was not loaded.** That is out of scope (task §6). The measured 190 MB matters to TASK-035's parked plan.
- ULIC, WMRODZ, geometry, GeoNames and historical names are out of scope. So is applying a later register state: a different file state is refused with `REFRESH_NOT_SUPPORTED`.
- No place is linked to any surname, distribution value, claim or page.

## Not verified

- The integration and golden suites against the pinned `postgis/postgis` image. Docker is unavailable here; CI runs it.
- Whether the 2026-09-18 SIMC CSV equals the 2026-09-30 one (see above).
- That `RM` codes other than the 12 observed never occur. Any other value is quarantined, never guessed.
