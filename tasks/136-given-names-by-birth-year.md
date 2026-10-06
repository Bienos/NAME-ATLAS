# TASK-136 — First names given to children, by year, imported (2000–2025, national)

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-given-names-by-birth-year.md`). Not on staging or production.
- **Requested by:** the project owner, 2026-10-06: the first build step of D-044.
- **Decision:** ADR-0042 (proposed with this task), extending ADR-0032.
- **Number:** 136. Drafted as 132; while #162 was open `main` gave 132 to #160, 133 to #159, 134 to #163 and 135 to #164. ADR-0042 and migration 0040 stay free on `main` (`4d3b02a`).
- **Model guidance:** implementation session.

## 1. Goal

The register holds the publisher's national first-name lists of children born in each year from 2000 to 2025, one list per year and sex, each with the publisher's cut-off for its year. Nothing is derived and nothing is shown. The next task derives the yearly count and rank.

## 2. Facts (read on 2026-10-06)

1. **The source:** dane.gov.pl dataset 219, "Imiona nadawane dzieciom w Polsce", Ministry of Digital Affairs, CC0 1.0 (`license_name` in the API), 84 resources.
2. **The cut-off:** names given fewer than 5 times are left out up to 2012, fewer than 2 times from 2013. Every list's smallest count agrees.
3. **The resources imported:**

   | Resource | Years | Sex | Rows | Children |
   |---|---|---|---|---|
   | 21457 (CSV) | 2000–2019 | both | 24,461 | 8,064,304 |
   | 28020 / 28021 | 2020 | M / F | 799 / 799 | 186,590 / 176,829 |
   | 36393 / 36394 | 2021 | M / F | 860 / 822 | 175,132 / 165,856 |
   | 44825 / 44824 | 2022 | M / F | 1,033 / 1,015 | 163,864 / 155,704 |
   | 54099 / 54100 | 2023 | M / F | 984 / 976 | 145,349 / 138,666 |
   | 63900 / 63899 | 2024 | M / F | 967 / 978 | 134,314 / 126,456 |
   | 1159536 / 1159538 | 2025 | M / F | 965 / 939 | 126,404 / 119,788 |

   2020–2025 are XLSX, read through the portal's CSV endpoint. 2022's header differs from the other years'.
4. **2019:** the 2019 files 21453 and 21455 agree with 21457's 2019 rows exactly (812 and 823 names). They are not imported (ADR-0042 §3).
5. No file has a placeholder, a one-character form or a full stop.

## 3. In scope

- **ADR-0042.**
- **Migration 0040:** `given_name_birth_lists` and `given_name_birth_counts`.
- **`packages/sources/src/given-names/births-*.ts`:** the source, rights profile and thirteen descriptors; a fail-closed parser for both layouts; an importer that checks rights, then the checksum, then parses, in one transaction; idempotent, superseding a changed version. TASK-078's importer shares its source and identity steps with it.
- **`pnpm import:given-name-births`.**
- **Fixtures:** genuine excerpts, the publisher's metadata saved verbatim, unit tests and a real-database test.

## 4. Out of scope

The voivodeship files, the half-year files, second names, civil registry office files, claims (yearly count and rank), any page, checkout, and loading staging or production.

## 5. Acceptance criteria

- **AC-1:** changed bytes, a blocked rights profile, the wrong sex and the wrong header are each refused, and nothing is written.
- **AC-2:** each list stores its year, sex, the publisher's cut-off (5 to 2012, 2 from 2013), its rows and its children; a count below the cut-off is refused.
- **AC-3:** a name is one identity across years, sexes and both PESEL datasets, and the lists stay apart.
- **AC-4:** re-importing the same bytes is a no-op; a changed version supersedes the old record and keeps its lists.
- **AC-5:** every year from 2000 to 2025 is held once per sex; 2019 is not imported twice.
- **AC-6:** the thirteen full files import, and each list's stored count and children equal the file's.

## 6. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:integration`, `test:golden`; the full-file import through the CLI on a disposable local database.
