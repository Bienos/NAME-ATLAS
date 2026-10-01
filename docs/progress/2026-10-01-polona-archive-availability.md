# 2026-10-01 — TASK-054: Polona archive availability on the surname page

Scope authority: `tasks/054-polona-archive-availability.md`. Decisions: ADR-0024 (resolves D-021 items 1 and 4) and ADR-0023 (the two products and prices; nothing of the purchase is built).

## What changed

- `PRODUCT.md` §6: two one-time products in PLN, "Raport nazwiska" at 24.99 zł and "Badanie eksperckie" at 149.99 zł, replacing "no tiers" (ADR-0023). `docs/DECISIONS_NEEDED.md`: D-021 resolved.
- `packages/sources/src/polona/inventory.ts` (new, pure): the eight requests one surname takes, always with the surname quoted, and the summary built from the answers. `fetch.ts` (new): one request at a time, at least 1 s apart, a 30 s timeout, three tries with back-off of 5 s then 20 s, and the user agent `NameAtlas/1.0 (surname research; +…/pl/kontakt)`. `source.ts` (new): the `pl_polona` source and its rights profile (every dimension allowed, attribution "Polona, Biblioteka Narodowa"), and the summary stored as one `INDEX_ENTRY` source record per surname. `search.ts`: an envelope parser and single-hit parsers, so a hit with a rights statement the vocabulary lacks is withheld instead of failing the whole response.
- `fixtures/polona-inventory/`: ZAREMBA's eight responses as Polona served them on 2026-10-01, pinned by SHA-256.
- `packages/db/migrations/0025_archive_availability.ts`: the `ARCHIVE_AVAILABILITY` claim type, `SURNAME_LEVEL` only. Generated types updated. 0024 is left to #43.
- `packages/truth/src/archive.ts` (new): derive, read, project and select. The read finds the claim by its key and compares the type as text, so a database that has not run 0025 answers `NOT_SEARCHED` instead of erroring. `bin/archive-load.ts` (new): `pnpm truth:archive-load`.
- `packages/contracts/src/surname-result.ts`: schema 1.8, the `archive` section and its refinements. `docs/contracts/surname-result.md` records it.
- `apps/web/src/lib/result-view.tsx`, `messages.ts`, `sections.ts`, `app/globals.css`: the chapter "Gdzie pojawia się w dawnych drukach?" / "Where does it appear in old print?", fifth after the meaning, with its caveat, pages by period, places and quoted pages. `surname-page.tsx` logs `archive_state`.
- `ops/vm/archive.sh` (new), `ops/vm/status.sh`, `ops/vm/README.md`, `ops/vm/request` (comment only), `.github/workflows/register-vm.yml`: the `archive` step.
- Tests: `inventory.test.ts` (new), contract tests, `result-view.test.ts` (chapter tests, fixtures to 1.8), the other web fixtures, `migrator.test.ts`, `tests/integration/src/archive-availability.test.ts` (new), and the integration tests that pin the schema version, the migration list or the `claim_type` values.

## Observed while building it

- Polona's date filter is `temporalFilters.dates.startRange`/`endRange`. `date`, `DATE` and `metadata.date` were not accepted.
- Unquoted, `KOWALSKA-NOWAK` matched 507,536 pages; quoted, 3.
- `item-view/{id}?page=121` showed the scan the search calls page 122, with ZAREMBA on it. Example links use `pageNumber − 1`.
- One served hit carried "Uznanie Autorstwa 3.0 Polska" under "Zawartość chroniona - licencja ograniczona". The vocabulary does not have it, so it is withheld and counted.

## Verification (run 2026-10-01, on this branch)

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`: each exit 0; lint printed no warning.
- `pnpm test`: exit 0. 1,540 tests in 13 packages, among them `packages/sources` 558, `packages/truth` 341, `packages/contracts` 110 and `apps/web` 344. The first run failed one test, `migrator.test.ts`, which pins the migration list; 0025 was added to it.
- `pnpm build`: exit 0.
- Against a local PostgreSQL (`postgis/postgis:16-3.4` in Docker): `pnpm db:migrate` applied 0025. The PESEL fixture register was seeded through the importer's library API by a throwaway script that is not committed. `pnpm truth:archive-load --surname NOWAK` against Polona itself printed "stored, claim derived, 8237 records, 160571 pages, 3 examples (0 withheld), 7316 ms"; a second run printed "unchanged, claim unchanged". KOWALSKI: 5385 records, 193864 pages, 7319 ms. WÓJCIK: 5239 records, 52037 pages, 7286 ms.
- `TEST_DATABASE_URL=… pnpm test:integration` against that server: exit 0, 27 files, 316 tests passed, 6 of them new in `archive-availability.test.ts`. The first full run failed three tests that pin the migration list or the `claim_type` values (`canonical-key-v2`, `current-rank`, `extensions`); 0025 and `ARCHIVE_AVAILABILITY` were added to them. `canonical-key-v2` now also runs 0025's `down` and re-applies it.
- `TEST_DATABASE_URL=… pnpm test:golden`: exit 0, 4 files, 364 tests passed.
- Postgres, by hand: on an enum without the value, `ct::text = 'ARCHIVE_AVAILABILITY'` returned 0 rows and `ct = 'ARCHIVE_AVAILABILITY'` raised `invalid input value for enum`. That is why the read compares as text.
- Read with headless Chromium at 1440 × 900 and 390 × 844 against `next dev` and the local database: `/pl/nazwisko/nowak`'s archive chapter, its sentence, caveat, bars, places and three examples, with no horizontal overflow at either width.
- `bash -n` on `archive.sh` and `status.sh`; the workflow parses as YAML.

## Not verified

- `archive.sh` and the `archive` workflow step have not run on the VM. shellcheck and actionlint were not available in this session.
- Polona's behaviour over thousands of surnames: rate limits, outages and rights statements not yet seen. The loader reports each.
- Browsers other than Chromium.
