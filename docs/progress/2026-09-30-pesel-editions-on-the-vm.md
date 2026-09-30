# 2026-09-30 — TASK-045: every published PESEL edition importable on the VM, with the pages unchanged

Scope authority: `tasks/045-pesel-editions-on-the-vm.md`. Written as TASK-044 the same evening, renumbered when #38 (the landing's Plate VII, ADR-0019) took 044 and registered the 2020–2025 national editions for its own use. The project owner's rulings that started the build: 2019 is living persons, load it; look for a genuine 2022 women's file, then build. Branch `claude/inspiring-bohr-vten7x`, rebased onto `main` @ `61ffc49` (Merge #38).

## Changed

- `packages/sources/src/registry.ts`: `PESEL_NATIONAL_MALE_2019` (18990), `PESEL_NATIONAL_FEMALE_2019` (18989), `PESEL_REGIONAL_MALE_2025` (65049), `PESEL_REGIONAL_FEMALE_2025` (65090), with bytes fetched and pinned on 2026-09-30; `PESEL_EDITIONS` (fifteen resources, stable order); `findPeselEdition` and `isPeselEdition`; `PeselResourceDescriptor.header` (only the 2019 pair: `nazwisko,liczba`); `nationalCounterpartOf` answers for the 2026 regional pair only. `index.ts` exports them.
- `packages/sources/src/parser.ts`: `parsePeselFile(text, expectedHeader = PESEL_HEADER)`; `importer.ts` passes the descriptor's header.
- `packages/sources/src/importer.ts`, `regional-importer.ts`, `import-result.ts`: for an edition, rows whose surname the current register lacks are `rowsNotInCurrentRegister`, reported as `rows not written`, never written; no surname entity is created; both reconciliation guards count them. The CLIs print the line.
- `packages/sources/bin/import-pesel.ts`, `import-pesel-regional.ts`: accept editions (`findPeselEdition`). `fetch-pesel.ts --editions`. New `list-editions.ts`: `<id> <role> <date> <rows>` per edition, the registry's list for shell scripts.
- `packages/truth/src/derive.ts` (`loadApplicableSnapshots`) and `universe.ts` (`loadCandidates`, `loadRegionalCandidates`): editions are dropped, so population, rank, rarity and distribution come from the four current resources only.
- `scripts/import-editions.sh`: fetch and verify (`fetch-pesel --editions`), the publisher's metadata per resource (`api.dane.gov.pl/1.4/resources/<id>`, checked to be its own), import each with the right importer. Idempotent.
- `ops/vm/editions.sh`: unpacks the pushed commit into the app tree and runs `pnpm install` as `build.sh` does but without touching the register build unit or its marker; runs the script as the build user over the socket; the gate: one `ACTIVE` source record per edition with 1 to `official_row_count` values, the surname count and every `ACTIVE` claim count exactly as before the run, no surname with more than two `ACTIVE` claims of one type; then `GRANT`, `VACUUM ANALYZE`, a third dump, and the marker `/var/lib/name-atlas/editions-loaded`. Requires finalize's marker. `.github/workflows/register-vm.yml`: the `editions` step (ships the archive, like `build`), the option, and the connection test after it.
- `ops/vm/finalize.sh`: the "national values" and "regional values" checks count the four current resources' values only, so they stay true after the editions.
- `ops/vm/README.md`, `ops/vm/request`, `docs/LOCAL_DATABASE.md`, `docs/sources/pesel.md` ("Editions", with the rulings and the 38772 finding), `tasks/045-…`, `STATUS.md`.
- Tests: `registry.test.ts` (the editions list, the four new descriptors' bytes, the 2019 header, the rulings, `findPeselEdition`/`isPeselEdition`, the counterparts, unique groups and file names), `parser.test.ts` (a named header accepted, the 2019 header refused by default), `importer.test.ts` (the new report field).

## Verified

### The 2022 women's file (ruling R-2)

| Fetched 2026-09-30 | Bytes | SHA-256 | Rows | Sum | NOWAK |
|---|---:|---|---:|---:|---:|
| 38772 CSV endpoint and CSV media file | 4,141,803 | `9af26480…` (= 35279's) | 311,240 | 20,263,212 | 102,503 |
| 38772 native XLSX (`file_url`, modified 2022-05-25) | 5,785,728 | `4c8eed88…` | 311,240 | 20,263,212 | 102,503 |
| 35279 native XLSX (2021-02-02) | 5,186,584 | `25e5c5cc…` | 311,240 | 20,263,212 | 102,503 |

The XLSX files differ as files and agree in every cell: there is no 2022 women's edition. The dataset's 21 resources were listed from the API; no other 2022 women's resource exists. 38772 stays refused.

### The four new resources (bytes fetched 2026-09-30, 19:55–19:58 UTC)

| Resource | Header | Rows | Sum | Bytes | SHA-256 |
|---|---|---:|---:|---:|---|
| 18990, men 2019-06-30 (CSV endpoint) | `nazwisko,liczba` | 277,108 | 19,859,783 | 3,610,164 | `e975ecc4…` |
| 18989, women 2019-06-30 (native CSV, `file_url`; the CSV endpoint answers 302 with no body) | `nazwisko,liczba` | 297,456 | 20,249,319 | 3,993,861 | `c35e4477…` |
| 65049, regional men 2025-02-24 | the regional header | 646,100 | 16,711,881 | 16,619,443 | `4e258a32…` |
| 65090, regional women 2025-02-24 | the regional header | 694,199 | 17,420,640 | 17,891,156 | `9322fc8c…` |

The 2019 descriptions read "lista nazwisk męskich/żeńskich w rejestrze PESEL stan na 30.06.2019", verbatim in the descriptors. The 2019 sums and NOWAK's 101,473 (men) and 103,439 (women) match the candidate list's table of 2026-09-24.

### Checks on the change

| Command | Result |
|---|---|
| `pnpm typecheck` | every package "Done" |
| `pnpm test` | 15 packages, all passed: sources 537 (13 files; 525 before), truth 341, web 295, contracts 106, resolver 102, seo 18, logging 24, admin 14, queue 9, db 8, domain 7, testing 3, worker 2 |
| `pnpm format:check`, `pnpm check:ids` | "All matched files use Prettier code style!"; "every task, ADR, migration and decision number is used once" |
| `shellcheck ops/vm/*.sh scripts/import-editions.sh` (0.11.0) | no findings (`scripts/check-unique-ids.sh`, untouched, has pre-existing SC2046 warnings) |
| `actionlint .github/workflows/register-vm.yml` (1.7.x, from `actionlint-py`) | exit 0 |

### The rehearsal (AC-2), PostgreSQL 16.13 + PostGIS 3.4 from Ubuntu, this container, `C.UTF-8`

`pnpm db:migrate` (0001–0023), the four 2026 excerpts imported with their own `--sha256`, `seo:backfill-slugs`, `derive-batch --all --rank`: 44 surnames, 45 `CURRENT_POPULATION` claims (22 + 23), snapshots 1148808: 22, 1148811: 23, 1148786: 10, 1148790: 8. No rank, rarity or distribution claims: the excerpts are incomplete universes, as intended.

| Step | Result |
|---|---|
| a 2019 men's excerpt: the fixture's 20 surnames present in 2019 plus AAJMI (in 2019, not in 2026), header `nazwisko,liczba`, CRLF; `import-pesel --resource 18990 --metadata r18990.json --sha256 <excerpt>` | `IMPORTED`; rows read 21, **rows not written 1**, rows imported 20, quarantined 0, **surnames created 0**, reused 20 |
| a 2025 regional men's excerpt: 40 cells of the fixture's surnames plus one cell for AAJMI; `import-pesel-regional --resource 65049` | `IMPORTED`; rows read 41, **rows not written 1**, rows imported 40, **surnames created 0**, reused 17 |
| `derive-batch --all --rank`, then `derive-batch` | "finished 44 surnames … failed 0"; "finished 28 surnames … failed 0" |
| after | `CURRENT_POPULATION` **45**, surnames **44**, AAJMI 0 rows; snapshots now also 18990: 20 and 65049: 17; NOWAK has exactly 2 population claims; claims whose key names an edition's snapshot: **0**; national values under the 2026 records 45, under all records 65 (hence finalize's restriction) |

### The full files (the script end to end, same database)

Running when this record was first committed (the fifteen files fetched and verified at 20:14 UTC, imports under way); the table follows in the next commit.

## Not verified

- **AC-3 and AC-4, the VM run.** GitHub Actions still starts no job, and the VM's app tree (`bf3d359`) predates this change, so the `editions` step must ship this branch's archive; the workflow step does that. Neither the step nor `ops/vm/editions.sh` has run anywhere: its unpack, gate, grants and dump are written from `build.sh` and `extras.sh`, which have, and were `shellcheck`ed and `bash -n`'d only.
- **`extras.sh`'s PESEL check** after editions: it compares before and after within its own run, so a later re-run should pass; not run.
- ADR-0019 §2.2 keeps 2019 out of the landing's series. The owner's ruling that 2019 is living persons is recorded in the descriptors and STATUS; amending the ADR is a separate decision, not taken here.
