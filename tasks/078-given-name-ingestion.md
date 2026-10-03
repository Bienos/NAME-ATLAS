# TASK-078 — The PESEL given-name lists, imported (first names, 2026-01-20)

- **Status:** IMPLEMENTED 2026-10-03 (`docs/progress/2026-10-03-given-name-ingestion.md`). Not on production.
- **Requested by:** the project owner, 2026-10-03: "start the first-name statistics", the first phase of the full-name report design.
- **Decision:** ADR-0032 (proposed with this task).
- **Number:** 078. Drafted as 073, then 075, then 076; while this was open `main` gave 073 and 074 to #84 and #83, 075 to the blog's redesign (#86) and 076 to the tree pages (#67); #87 took 077 and #90 took 079; the localities task is 090 in #76 (#94 and #93 took 082 and 086) and the coverage assessment 080 in #79. 078 stays free on `main` and in the open pull requests on 2026-10-03. The decision is ADR-0032, since #85 claims ADR-0031; migration 0031 is unchanged: `main` took migration 0029 (#84), and #76 carries migration 0030 (the family safeguards).
- **Depends on:** #79's branch (migration 0031 must follow `main`'s 0029 and #76's 0030).
- **Model guidance:** implementation session.

## 1. Goal

The register holds the publisher's first-name counts for living people, one list per sex, as TASK-004 did for surnames. Nothing is derived and nothing is shown. The next task derives `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` from it.

## 2. Facts (read on 2026-10-03)

1. **The source:** dane.gov.pl dataset 1667, "Lista imion występujących w rejestrze PESEL", CC0 1.0, yearly. Single occurrences and deceased people are left out.
2. **The two resources:**
   - 1159669: male first names, 46,202 rows, 21,462,794 people.
   - 1159670: female first names, 28,786 rows, 22,589,659 people.
   - Both are dated 2026-01-20, are CSV with CRLF line ends and the header `IMIĘ_PIERWSZE,PŁEĆ,LICZBA_WYSTĄPIEŃ`, and have a smallest count of 2.
3. **Placeholders:** `BRAK DANYCH`, `BRAK IMIENIA`, `BRAK`, `BRAKDANYCH`, `-`, `XXX`. That is 1,063 people on the male list and 143 on the female.
4. **Doubtful forms:** 170 male and 17 female rows are one character long or contain a full stop.
5. **Keys:** under `canonicalKey` no two rows of one file collide, and no row is mixed-script.
6. **Concentration:** the 200 most common names cover 92.7% (male) and 93.5% (female) of each list's people. The top 300 cover 94.8% and 96.1%, the top 1,000 97.4% and 98.6%.

## 3. In scope

- **ADR-0032:** given names as a separate name type.
- **Migration 0031:** `GIVEN_NAME` in `entity_type` and `source_granularity`; `given_names`; `given_name_counts`.
- **`packages/sources/src/given-names/`:** the source, rights profile and descriptors; a fail-closed parser; the importer, which checks rights, then the checksum, then parses in one transaction. It is idempotent and supersedes a changed version.
- **`pnpm import:given-names`.**
- **Fixtures:** genuine excerpts, the publisher's metadata saved verbatim, unit tests and a real-database test.

## 4. Out of scope

- Claims, contracts, pages and the resolver for given names.
- Second names, earlier editions, the deceased-inclusive list and births by year.
- Meanings and name days.
- Production loading.

## 5. Acceptance criteria

- **AC-1:** changed bytes, a blocked rights profile and the wrong sex column are each refused, and nothing is written.
- **AC-2:** placeholders are reported with their counts and never stored as names; doubtful forms are stored verbatim and flagged.
- **AC-3:** a name on both lists is one identity with two counts, and the lists stay apart.
- **AC-4:** re-importing the same bytes is a no-op.
- **AC-5:** the full 2026-01-20 files import, and the stored people equal each file's total minus its placeholders.

## 6. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `test:integration`, `test:golden`; the full-file import through the CLI on a disposable database.
