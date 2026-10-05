# TASK-121 — First-name counts and ranks as claims (`GIVEN_NAME_POPULATION`, `GIVEN_NAME_RANK`)

- **Status:** IMPLEMENTED 2026-10-05 (`docs/progress/2026-10-05-given-name-claims.md`); migration 0038 is not applied on the VM, and nothing is derived on production.
- **Number:** 121, migration 0038. `main` holds TASK-120 and migration 0037; there is no open pull request on 2026-10-05.
- **Requested by:** the project owner, 2026-10-05: "build the first-name counts", after D-043 (#145) made the full-name report a paid part of the 28,99 zł tier.
- **Design:** ADR-0032 §6: "`GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` are the next task, through the same evidence → claim → confidence → citation chain as the surname claims." No new ADR; this task carries that sentence out.
- **Model guidance:** implementation session.

## 1. Goal

For every first name the register holds (TASK-078), state how many living people carry it on each PESEL list, and its place on that list, as claims with evidence, confidence and a citation, exactly as surnames have them. This is the full-name report's first derived fact. Nothing is shown.

## 2. Facts (2026-10-05)

1. TASK-078 imported the 2026-01-20 first-name lists into `given_names` (71,433 names) and `given_name_counts` (one row per name per list), and derived nothing.
2. Full import, recorded in `docs/progress/2026-10-03-given-name-ingestion.md`:

   | List | Resource | Rows | Names stored | People |
   |---|---|---:|---:|---:|
   | Male | 1159669 | 46,202 | 46,197 (5 placeholder rows) | 21,461,731 (placeholders' 1,063 left out) |
   | Female | 1159670 | 28,786 | 28,781 (5 placeholder rows) | 22,589,516 (143 left out) |

3. The importer stores no list total, so the placeholders' people are not in the database. A share or "1 in X" over the publisher's whole universe cannot be derived from what is stored.
4. Surname ranks are competition ranks within one source record, refused by the completeness gate unless the imported bytes are the official file and every row is stored (`completeness.ts`, TASK-009). The fixtures are excerpts, so a rank is refused there by construction.
5. `research_run_type` has no given-name value, and the claim types have none. Each surname claim type has a scope check (0004, 0015, 0024).

## 3. In scope

- **Migration 0038.** `claim_type` gains `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK`, and `research_run_type` gains `BASIC_GIVEN_NAME`. A check requires both claim types to be at `SHARED` scope, as the given-name entities are (TASK-078).
- **The registry.** Each given-name descriptor gains `official_name_row_count` (46,197 and 28,781): the stored rows a complete import has, from fact 2.
- **`packages/truth/src/given-name.ts`.** `deriveGivenName(db, name)` and `deriveAllGivenNames(db)`. Per name and per active list:
  - **The count.** The source-native chain of `derive.ts`: research run (`BASIC_GIVEN_NAME`), evidence (`OFFICIAL_DATASET_FIELD`), claim `GIVEN_NAME_POPULATION` (the count, the list's date and comparability group), claim evidence, confidence, and citation (`resource:{id}`).
  - **The rank.** It passes `assessUniverseCompleteness` against the official checksum and `official_name_row_count`, or is refused with the gate's reason. Then it is a competition rank over the list's stored names (`buildRankTable`, `rankInTable`), with the universe evidence, derived evidence, `COUNT` and `UNIVERSE` dependencies, claim `GIVEN_NAME_RANK` (rank, universe size, ties policy), confidence and citation.
  - **Idempotent.** An ACTIVE claim with the same key is reused. One research run per name, only when something is written.
  - **Lists apart.** Two lists are never summed. A placeholder is never a name. A flagged form gets its claims; a surface must leave it out (ADR-0032 §4).
- **`pnpm truth:derive-given-names`** (all names, or `-- --name NAME`).
- **Tests** on the excerpts, and the full files run out of band.

## 4. Out of scope

- A share, "1 in X" or any figure over the publisher's total (fact 3); second names; earlier editions.
- A contract, a page, the resolver, meanings, the full-name report itself.
- Applying 0038 on the VM and deriving on production.

## 5. Acceptance criteria

- AC-1: a name on both lists gets a count claim per list, `SHARED`, dated, cited and assessed. A claim at another scope is refused by the database.
- AC-2: deriving again writes nothing.
- AC-3: a rank over an excerpt is refused with the gate's reason, and no rank claim is written.
- AC-4: a placeholder is not found as a name; a flagged form gets its count.
- AC-5: the register-wide run derives a count for every stored row. On the full official files it also derives every rank, with ANNA and PIOTR first on their lists and the universe sizes 28,781 and 46,197.

## 6. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test`, `db:migrate`, `db:generate-types` (no diff), `test:integration`, `test:golden`, `build`, `e2e:seed`, `test:e2e`. Out of band: the two official files downloaded and checked against the registry checksums, imported, and `pnpm truth:derive-given-names` run over them.
