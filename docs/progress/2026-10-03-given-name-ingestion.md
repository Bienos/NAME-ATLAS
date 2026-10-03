# TASK-075 — The PESEL given-name lists, imported

The first phase of the full-name report design: the register holds the 2026-01-20 first-name counts for living people. It is built on #79's branch, so migration 0029 follows #76's 0028. Nothing is deployed, derived or shown.

## What changed

- **ADR-0030 (proposed):** given names are a second name type, kept apart from surnames, with given-name-scoped counts. Placeholders are never names, doubtful forms are flagged, and there is no claim yet.
- **Migration 0029:** `GIVEN_NAME` in `entity_type` and `source_granularity`; `given_names` (canonical key unique, `form_review`); `given_name_counts` (one per name and source record, count ≥ 2). The generated database types were regenerated with `pnpm db:generate-types`.
- **`packages/sources/src/given-names/`:** registry (source `pl_pesel_given_names`, a CC0 profile, two descriptors pinned to the bytes), parser, importer and index. `pnpm import:given-names` is the CLI.
- **Fixtures:**
  - `fixtures/pesel-given-names/`: genuine excerpts of 23 and 21 lines, with a manifest;
  - `docs/sources/acquisition/2026-10-03/metadata/`: the publisher's resource objects, saved as served;
  - `docs/sources/pesel-given-names.md`.
- **Tests:**
  - `packages/sources/src/given-names/parser.test.ts`: three tests.
  - `tests/integration/src/given-name-ingestion.test.ts`: five tests.
    - Changed bytes, a blocked profile and the wrong list are refused with nothing written.
    - Placeholders are reported and left out, and the three doubtful forms are flagged.
    - The same bytes are a no-op.
    - MARIA is one identity with 566,902 on the female list and 55 on the male.
    - The surname register is untouched.

## Verification, 2026-10-03

Local PostgreSQL 16 with PostGIS.

| Command | Result |
|---|---|
| `pnpm db:migrate` on an empty database | 0001–0029 applied |
| `pnpm import:given-names` on the **full** male file (1159669) | IMPORTED: 46,202 rows, 21,462,794 people; 46,197 names, 170 flagged; placeholders `BRAK DANYCH` 1,001, `BRAK IMIENIA` 30, `-` 17, `BRAK` 13, `XXX` 2; 3.8 s |
| the same on the full female file (1159670) | IMPORTED: 28,786 rows, 22,589,659 people; 28,781 names (25,236 new, 3,545 shared with the male list), 17 flagged; placeholders 143 people |
| the female file again | ALREADY_IMPORTED |
| stored sums per list (SQL) | male 46,197 counts, 21,461,731 people (= 21,462,794 − 1,063); female 28,781 counts, 22,589,516 people (= 22,589,659 − 143); 71,433 given names, 187 flagged |
| concentration (Python, on the same bytes) | top 200: male 92.7%, female 93.5%; top 300: 94.8%, 96.1%; top 1,000: 97.4%, 98.6% |


### Checks

| Command | Result |
|---|---|
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm` | exit 0 |
| `pnpm test` | exit 0 (sources: three new parser tests; db: the migration list now ends at 0029) |
| `pnpm test:integration` | exit 0; 34 files, 408 tests (five new) |
| `pnpm test:golden` | exit 0; 364 tests |

Five existing tests pinned the newest migration or the table list. `extensions.test.ts` and `migrator.test.ts` now list 0029 and the two tables. `accounts.test.ts`, `canonical-key-v2.test.ts` and `family.test.ts` step off 0029 before the refusal they test, as #67 did when 0028 arrived.

## Not verified

- **Production:** the import has not run there. Migration 0029 runs with the next deploy that carries it.
- **What is left:** no claim, page or resolver exists for given names.
- **The placeholder list** is exact strings read from these two files. A later edition may add others, and a row that is a placeholder but not on the list would be stored as a name.
