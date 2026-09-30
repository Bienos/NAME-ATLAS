# 2026-09-30 — TASK-038: every researched source registered, nothing ingested

Scope authority: `tasks/038-source-catalogue-registry.md`. It was written and implemented in this change. The project owner asked to "bring all sources to db", and chose to register every researched source as a repo seed only, and to download data where that is OK.

This session started on `claude/jolly-faraday-uas99n` at `d6f1b6c`, 119+ commits behind `main` (`AGENTS.md` §11). A first version was built on that base and never committed. The branch was then moved onto `origin/main` at `ea03941`, and everything below was rebuilt and verified there.

## Changed

- **`packages/sources/src/catalogue/`** is new, re-exported from `@name-atlas/sources`:
  - `catalogue.ts`: 96 entries. 21 are classified by `docs/canonical/12` §7. 75 are research-only: 44 from the GSA master database, 17 from the DTL maps and cards, 11 from `docs/sources/candidate-sources.md` and 3 from `docs/sources/INVENTORY.md`.
  - `validate.ts`: refuses reserved (PESEL), duplicate or malformed keys, any `APPROVED` claim, a `BLOCKED` source without `automated_access = PROHIBITED`, and a status that does not follow its §7 label. It runs before any write.
  - `seed.ts`: `seedSourceCatalogue()` runs one transaction. It is idempotent by `source_key` and never modifies an existing row.
  - `catalogue.test.ts`: 28 tests.
- **`packages/sources/bin/seed-source-catalogue.ts`**, plus the scripts `seed-sources` (package) and `seed:sources` (root).
- **`tests/integration/src/source-catalogue.test.ts`**: 8 tests.
- **`tasks/038-source-catalogue-registry.md`** (new), plus `docs/CODEMAP.md` and `STATUS.md`.

No migration, enum value, dependency or lockfile change. The PESEL importer, the onomastics importer and every rights gate are unchanged. Nothing outside `sources` and `rights_profiles` is written.

Deliberately not catalogued (task §4):

- PESEL: the importer owns it.
- Polona: its source default is D-021.
- Meaning works: ADR-0008. The onomastics importer's `ensureWork` reuses an existing row by key without reading its rights.
- Onomastica: D-022.
- Items still "to confirm", categories, and name-intelligence services.

Stored after one seed on an empty database: `LEGAL_REVIEW_REQUIRED` 82, `PARTNERSHIP_REQUIRED` 7, `BLOCKED` 5, `DEPRECATED` 2 (PRADZIAD, SEZAM). Nothing is `APPROVED`. All 75 research-only entries carry every rights dimension as `UNKNOWN`.

## Not done: importing data

Nothing was downloaded or ingested from any catalogued source:

- Every catalogued source now has a rights profile, but no legal review has been performed on any of them. Every research-only source's rights are `UNKNOWN`.
- Most of the cleared sources need tables or claim types that do not exist for them yet, and each needs its own connector task (`AGENTS.md` §3). The exception is the voivodeship `places` that TASK-011 seeded from a TERYT fixture.
- The files acquired on 2026-09-18 (GeoNames, US Census, INSEE, Statbel, Morfeusz) are not in the repository, for the size and rights reasons in `docs/sources/INVENTORY.md` §3.
- The hosted database is on the free plan, whose limit parked TASK-035 (`STATUS.md`). This task wrote nothing to it.

Observed from this sandbox on 2026-09-30 (HTTP status of the landing URL):

| Host | Status |
|---|---|
| `download.geonames.org` | 200 |
| `query.wikidata.org` | 200 |
| `vocab.getty.edu` | 200 |
| `polona.pl` | 200 |
| `services.gugik.gov.pl` | 200 |
| `www.openhistoricalmap.org` | 200 |
| `eteryt.stat.gov.pl` | 302 |
| `api.europeana.eu` | 302 |
| `api.openarchieven.nl` | 302 |
| `api.dane.gov.pl` | no response |
| `data.riksarkivet.se` | no response |

## Carried forward to any connector task

`rightsRefusal` (`packages/sources/src/importer.ts`) refuses only `automated_access = PROHIBITED` or `review_status = BLOCKED`. It does not read `sources.production_status`. A catalogued `PARTNERSHIP_REQUIRED` or research-only source has `automated_access` `UNKNOWN` or `CONDITIONAL`, so it would pass that gate. No connector exists for any of them today. Any connector for a catalogued source must also refuse unless `production_status` allows it.

## Verified

Run on `claude/jolly-faraday-uas99n` rebuilt on `origin/main` (`ea03941`). Docker is unavailable in this sandbox. The database suites therefore ran against a local PostgreSQL 16.13 + PostGIS 3.4.2 (Ubuntu `postgresql-16-postgis-3`), through the `TEST_DATABASE_URL` fallback.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | passed; lockfile unchanged |
| `pnpm typecheck` | passed |
| `pnpm lint` | passed |
| `pnpm format:check` | passed, after `prettier --write` on the new files only |
| `pnpm check:ids` | passed |
| `pnpm test` | passed: 1,090 tests, 28 of them new |
| `pnpm db:migrate` (fresh local database) | 0001–0022 applied |
| `pnpm seed:sources` | "inserted: 96, already registered, left unchanged: 0" |
| `pnpm seed:sources`, again | "inserted: 0, already registered, left unchanged: 96" |
| `pnpm db:generate-types` then `git diff --exit-code -- packages/db/src/generated` | 24 tables introspected; no diff |
| `pnpm test:integration` | passed: 25 files, 293 tests, 8 of them new |
| `pnpm test:golden` | passed: 4 files, 364 tests |
| `pnpm build` | passed |

One environment note: `pnpm test` first ran with `DATABASE_URL` exported in the shell. `apps/web`'s `surname-prefix/route.test.ts` then failed one test, "answers a failure with the error envelope …", because it expects no database. With `DATABASE_URL` unset it passed, and the full run above is that run. The change touches nothing in `apps/web`.

## Not verified

- The integration and golden suites against the pinned `postgis/postgis` image. Container registries are unreachable here; CI runs it.
- Any fact about a source beyond what the cited documents say. No source was contacted for this task, apart from the landing-page status checks above.
