# 2026-10-06 — TASK-135: first names given to children, by year, imported (2000–2025, national)

Branch `claude/task-132-given-names-by-birth-year`, from `origin/main` at `015b788` (TASK-131), rebased onto `fb83fbf` (TASK-133, #159) before review. Task: `tasks/135-given-names-by-birth-year.md`. Decision: ADR-0042 (proposed). Drafted as TASK-132; while #162 was open `main` gave 132 to #160, 133 to #159 and 134 to #163, so it is 135 (the branch keeps its first name). ADR-0042 and migration 0040 stay free on `main`. The first build step of D-044.

## Observed before the change

Read from `api.dane.gov.pl` on 2026-10-06; the objects are saved verbatim in `docs/sources/acquisition/2026-10-06/metadata/`.

- `GET /1.4/datasets/219`: "Imiona nadawane dzieciom w Polsce", `license_name: "CC0 1.0"`, institution 333, `update_frequency: "Rocznie"`. Its note: "Do roku 2012 imiona z liczbą wystąpień poniżej 5 nie były umieszczane na liście, od 2013 r. granicą tą jest liczba 2."
- `GET /1.4/datasets/219/resources?per_page=100`: 84 resources.
- Resource 21457: SHA-256 `471d8ff9…ca6a7`, 440,085 bytes, UTF-8 without a BOM, CRLF, header `Rok,Imię,Liczba,Płeć`, 24,461 rows, 8,064,304 children, `Płeć` `M` or `K`. Every year from 2000 to 2019 has both sexes. Smallest count 5 in every list to 2012 and 2 from 2013.
- The 2020–2025 national files are XLSX. Each was read from the portal's CSV (`/resources/{id}/csv` redirects to the media `.csv`; checked for 28020: same bytes). Header `IMIĘ_PIERWSZE,PŁEĆ,LICZBA_WYSTĄPIEŃ`, except 2022's two files: `IMIĘ PIERWSZE,PŁEĆ,LICZBA WYSTĄPIENIEŃ`. All UTF-8 without a BOM, CRLF, smallest count 2.
- 2019's own files, 21453 (boys, `4067efe7…`) and 21455 (girls, `4da3d4e4…`): native CSV with the yearly header. They equal 21457's 2019 rows exactly: 812 names and 199,134 boys, 823 names and 188,557 girls, every name with the same count.
- No file has a placeholder, a one-character name or a full stop. No list has a name twice.
- No new dependency: the XLSX resources were read through the portal's CSV.

## Changed

- `docs/adr/0042-given-names-by-birth-year.md` (new); one line in ADR-0032's Consequences pointing to it.
- `packages/db/migrations/0040_given_name_birth_years.ts` (new): `given_name_birth_lists` (source record, birth year, sex `MALE`/`FEMALE`, the publisher's cut-off, the file's rows and children, comparability group; one per record, year and sex) and `given_name_birth_counts` (list, given name, count ≥ 2; one per list and name), indexed by given name. `packages/db/src/generated/db.ts` regenerated with `kysely-codegen` against a migrated database: only the two tables were added. `packages/db/src/migrator.test.ts` lists 0040.
- `packages/sources/src/given-names/births-registry.ts` (new): source `pl_pesel_birth_given_names`, its CC0 rights profile (the surname profile's values, `checked_at` 2026-10-06, the dataset's own `rights_url`), `birthListPublicationThreshold` (5 to 2012, 2 from 2013), and thirteen descriptors pinned to the bytes.
- `births-parser.ts` (new): both layouts, failing closed on the header, the column count, a year or sex the resource does not hold, a non-numeric year or count, a count below the year's cut-off, an empty name, a bare LF, and a missing list. `births-parser.test.ts` (new): the parser, the cut-off and the registry's one-list-per-year-and-sex rule.
- `births-importer.ts` (new): rights gate → checksum → decode → parse → classify (placeholders reported, doubtful forms flagged, a key twice in one list refused) → one transaction: source record (superseding an older active one), lists, names, counts.
- `importer.ts` (TASK-078's): `ensureGivenNameSource` takes the source seed, and the identity step is now `ensureGivenNames`, shared by both importers. Its behaviour is unchanged: TASK-078's integration tests pass as before.
- `bin/import-given-name-births.ts` (new), `pnpm import:given-name-births`.
- `fixtures/pesel-given-name-births/` (new): four genuine excerpts and `source-manifest.json`.
- `tests/integration/src/given-name-births.test.ts` (new, 7 cases). `extensions.test.ts` and `canonical-key-v2.test.ts` list migration 0040 and its two tables.
- `docs/CODEMAP.md` (three rows), `STATUS.md`, the task file.

## Verified

PostgreSQL 16.15 with PostGIS 3.4.2 in the session container (`apt-get install postgresql-16-postgis-3`, `pg_ctlcluster 16 main start`); Docker is not available. The integration and golden suites ran through `TEST_DATABASE_URL`.

- `pnpm typecheck`: exit 0.
- `pnpm lint`: exit 0.
- `pnpm format:check`: exit 0.
- `pnpm check:ids`: exit 0.
- `pnpm test`: exit 0. sources 600 passed, truth 395, web 951, contracts 146, resolver 112, and every other package passed.
- `pnpm build`: exit 0.
- `pnpm test:integration`: first run exit 1, 3 failed and 493 passed: `extensions.test.ts` (2) and `canonical-key-v2.test.ts` (1) list every migration and table and did not yet name 0040. After adding it: exit 0, 43 files, 496 tests passed.
- `pnpm test:golden`: exit 0, 4 files, 364 tests passed.
- After the rebase onto `fb83fbf`, all eight commands again: typecheck, lint, format:check, check:ids, test (sources 600 passed), build: exit 0; `pnpm test:integration`: exit 0, 44 files, 500 tests passed; `pnpm test:golden`: exit 0, 364 tests passed.

**The full files, once, on a disposable local database** (`atlas_births`, migrated to 0040, holding nothing else): `pnpm import:given-name-births --resource {id} --file {full file} --metadata {saved object}` for all thirteen resources, each `IMPORTED`, exit 0, no placeholder and 0 flagged. Stored, per list (rows = counts stored = the file's rows; children = the sum of stored counts = the file's sum; the smallest stored count equals the cut-off in every list):

| Year | Cut-off | Boys: names | Boys: children | Girls: names | Girls: children |
|---|---|---|---|---|---|
| 2000 | 5 | 382 | 197,263 | 414 | 187,142 |
| 2001 | 5 | 403 | 191,947 | 398 | 181,975 |
| 2002 | 5 | 401 | 185,415 | 391 | 175,590 |
| 2003 | 5 | 403 | 183,215 | 415 | 173,995 |
| 2004 | 5 | 417 | 186,903 | 435 | 176,779 |
| 2005 | 5 | 424 | 192,820 | 436 | 183,112 |
| 2006 | 5 | 445 | 200,796 | 456 | 190,437 |
| 2007 | 5 | 460 | 211,946 | 495 | 201,448 |
| 2008 | 5 | 484 | 227,408 | 515 | 216,632 |
| 2009 | 5 | 484 | 230,881 | 511 | 219,811 |
| 2010 | 5 | 487 | 229,289 | 515 | 216,566 |
| 2011 | 5 | 468 | 216,221 | 506 | 204,174 |
| 2012 | 5 | 485 | 216,021 | 495 | 203,908 |
| 2013 | 2 | 995 | 207,514 | 993 | 196,714 |
| 2014 | 2 | 1,006 | 211,319 | 999 | 199,953 |
| 2015 | 2 | 1,013 | 210,571 | 1,003 | 199,267 |
| 2016 | 2 | 938 | 214,638 | 937 | 203,546 |
| 2017 | 2 | 812 | 220,634 | 863 | 209,145 |
| 2018 | 2 | 790 | 206,849 | 752 | 194,769 |
| 2019 | 2 | 812 | 199,134 | 823 | 188,557 |
| 2020 | 2 | 799 | 186,590 | 799 | 176,829 |
| 2021 | 2 | 860 | 175,132 | 822 | 165,856 |
| 2022 | 2 | 1,033 | 163,864 | 1,015 | 155,704 |
| 2023 | 2 | 984 | 145,349 | 976 | 138,666 |
| 2024 | 2 | 967 | 134,314 | 978 | 126,456 |
| 2025 | 2 | 965 | 126,404 | 939 | 119,788 |

Totals: 13 source records, 52 lists, 35,598 counts, 4,624 given names. That database held no living-register list, so every name was created by this import; on a database that already holds TASK-078's lists most of them would be reused.

Re-running 21457 and 1159538 on the same database: `ALREADY_IMPORTED`, 0 counts imported; the totals stayed 52 lists and 35,598 counts. Offering 21453 (2019 boys) as 21457: `FAILED CHECKSUM_MISMATCH`, exit 1.

## Not verified

- GitHub Actions is not starting jobs on this account (billing), so there is no CI result for this change.
- Nothing ran on staging, production or the VM: migration 0040 is not there and nothing is loaded.
- The import against a database already holding TASK-078's full living-register lists was not run; the reuse of identities is shown on the fixtures only (3 names reused).
- The portal's CSV of an XLSX resource is the portal's conversion. Its values were not compared with the XLSX cells.
