# 2026-09-30 — TASK-051: each surname page shows how its count changed across the editions of its list

Scope authority: `tasks/051-surname-change-over-time.md`. Decision: `docs/adr/0020-surname-change-over-time.md` (Proposed; accepted when the owner merges this change). Requested by the project owner: "build the change over time section". The same session recorded "approve poona" as D-021 item 1, option (b) (`docs/DECISIONS_NEEDED.md`, its own commit); that decision is not part of this record.

## What changed

- **Registry** (`packages/sources/src/registry.ts`): `official_people_sum` on the eight national descriptors that a trend reads (the 2019 pair, the 2020–2025 editions, the 2026 pair) and `universe_note_code` on the 2019 pair; `PESEL_TREND_EDITIONS`: men 2019 → 2026 (8), women 2019 → 2026 without 2022 (7). The sums were computed from the downloaded files' bytes on 2026-09-30; for 2020–2026 a test compares them, and the dates and checksums, with the committed list-facts artefact.
- **Migration** `0024_distribution_shift`: one enum value, `SURNAME_DISTRIBUTION_SHIFT`, and the check that the claim is `SURNAME_LEVEL` (compares `claim_type::text`, as `0015` does).
- **Derivation** (`packages/truth/src/shift.ts`, constants in `version.ts`): one claim per surname and list. Points with the edition's own list total and one in X; `NOT_ON_LIST` for an edition without the surname, no count field; the women's 2022 duplicate as a gap; the 2019 point flagged; the two changes in integer arithmetic (per cent, one decimal, half away from zero). Only an edition whose stored bytes hash to the registry's checksum counts. Idempotent; a new edition set gets a new claim key and supersedes the old claim. Writes the run, a verified field per known point, one derived item depending on them (role `COUNT`), the claim, its confidence (the derived-statistic rule, unchanged) and one citation.
- **Batch** `packages/truth/bin/derive-shift-batch.ts` (`pnpm truth:derive-shift [--limit N] [--concurrency C] [--recheck]`): candidates are surnames on two or more stored editions of one list; a surname is skipped while every such list has an `ACTIVE` claim with one point per stored edition.
- **Read and contract**: `readDistributionShift` (text comparison on the claim type); `surname-result` 1.7 with the nullable `change` section and its refinements (`docs/contracts/surname-result.md`); `querySurnameResult` returns `READY`, `UNAVAILABLE` (`NO_CHANGE_DERIVED`, or the population's own reason where the surname has no count) or `RIGHTS_BLOCKED`, the men's list first.
- **Page**: chapter 04 "Zmiany w czasie" / "Change over time" between the map and the meaning, PL and EN: a sentence (what changed, between which editions, and what the whole list did over the same two), a table per list (date, share of that edition's list as a bar and "1 in X", count), the `NOT_ON_LIST` and gap rows, the 2019 note; `?intent=change`. Hidden where there is no claim. `sections.ts` registers it.
- **VM**: `ops/vm/shift.sh` (`start`: unpack, record what the gate must find unchanged, migrate, start the batch in the unit `name-atlas-shift-batch`; `finish`: the gate, grants, `VACUUM ANALYZE`, a dump), the workflow's `shift` and `shift-finish` steps, `status.sh` lines, `ops/vm/README.md`.
- Records: ADR-0020, TASK-051, `docs/contracts/surname-result.md`, `docs/CODEMAP.md`, `STATUS.md`.
- Existing tests touched only to follow the contract: fixtures at schema 1.7 with a `change` section; four integration test files' expected schema version; the expected `claim_type` list; the migration lists.

## Verified

Run 2026-09-30 in this session on the branch built on `main` @ `107ff65`, and run again, with the same results (web 326 tests after #46's and #47's additions), after `main` moved to `3a43bc8` (#45, which took TASK-046–050, so this task was renumbered from 046 to 051) and again to `35aa48d` (#46, #47) and was merged in each time:

| Command | Result |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | all matched files use Prettier code style |
| `pnpm check:ids` | "every task, ADR, migration and decision number is used once" |
| `pnpm test` | db 8, domain 7, contracts 119, logging 24, testing 3, resolver 102, queue 9, seo 18, sources 542, truth 369, worker 2, admin 14, web 315 passed |
| `pnpm test:integration` (`TEST_DATABASE_URL` = local PostgreSQL 16 with PostGIS) | 27 files, 328 tests passed. The first run failed one test, which lists `claim_type` exactly (`current-rank.test.ts`); the value was added and the file, then the suite, passed |
| `pnpm test:golden` | 4 files, 364 tests passed |
| `pnpm build` | exit 0 |
| `shellcheck ops/vm/*.sh scripts/import-editions.sh`, `actionlint .github/workflows/register-vm.yml` | no findings |

The new tests: `packages/truth/src/shift.test.ts` (28: the arithmetic, points, gaps, claim key, the registry's editions, and the pinned sums against the list-facts artefact), `tests/integration/src/distribution-shift.test.ts` (18, against a real PostgreSQL: one claim per list with the points, totals and one in X checked by hand; the registry's total used, not the sum of the stored rows; the 2019 flag and the gap; `NOT_ON_LIST` with no count; one run, K field items, one derived item with K dependencies, one confidence and one citation; idempotence; supersession by a new edition; an edition with the wrong checksum not read; a surname on one edition given no claim; no claim of another type written and the current population unchanged; the scope check; the read and the contract; `NO_CHANGE_DERIVED`; rights-blocked on `PAID` and `READY` on `INTERNAL`; a database migrated only to 0023, where naming the enum value fails and the read returns nothing), contract tests (13 new), web tests (12 chapter tests and 8 message tests, including the forbidden words over the rendered page and the catalogue).

**The batch on real data, locally.** The local rehearsal database (`name_atlas`, 44 surnames from the committed fixtures) holds thirteen of the fifteen earlier editions as the official files' rows for those surnames, each with the registry's checksum; its 2026 resources are the committed excerpts, whose checksums are not the registry's, so the trend there ends at 2025 (men 7 of 8 editions, women 6 of 7). After `pnpm db:migrate` (`0024_distribution_shift: applied`), `pnpm truth:derive-shift --concurrency 4`: **42 surnames, 67 claims written in 0.7 s, 0 failed**. A second run: 0 surnames. `--recheck`: 42 surnames, 0 claims written. `CURRENT_POPULATION` `ACTIVE` stayed 45; no surname had two `ACTIVE` change claims on one list; none had fewer than two known points; every claim had its citation, confidence and evidence rows (the `finish` gate's queries, run by hand against this database). NOWAK, from the claim: men 101,473 (2019-06-30) → 98,859 (2025-01-22), −2.6%, the list +6.2%; women 103,439 → 100,319, −3.0%, the list +6.4%, with the 2022 gap. The page, served by `next dev` against this database and screenshotted with headless Chromium at 1280 px (Polish) and at a true 390 px (English): the chapter renders, the men's list first, no horizontal overflow; AA shows four `not on the list — not zero` rows and the 2019 note; AACHARYA (no claim) has no chapter. The screenshots are not committed.

`PGOPTIONS='-c synchronous_commit=off'`, set in the batch's unit, was checked to reach the connection (`SHOW synchronous_commit` returns `off` with it, `on` without); the speed-up was not measured.

## Not verified

- **The batch's completion and the gate on the VM** (AC-7). On 2026-10-01 the owner ran `shift.sh start` on the VM from the branch (GitHub Actions starts no job; the session has no route to the VM) and pasted its output: the recorded baseline matched the known counts, `0024_distribution_shift: applied`, 8 of 8 men's and 7 of 7 women's editions found stored, the unit `name-atlas-shift-batch` active. So `start` and the migration have run for real. Nothing after that has been seen: no progress, no completion, no `finish`, nothing in production. The gate's SQL was run by hand on the local database; `finish` and its timings were not exercised. The size of the batch (about 830,000 claims) and its duration are estimates, not measurements: the register build's derivation wrote comparable volume in 2 h 51 min on the VM.
- The page against the real 2026 resources and the real full registry: the local trend ends at 2025, and the local database holds 44 surnames.
- The landing atlas is unchanged and still reads 2020–2026; until a later task amends ADR-0019 §2.2 for it, the landing and the surname page define the series differently.
- The 2019 editions' universe: the owner ruled them living persons ("no use it is is living persona"); the lists' totals are consistent with that (+0.10% men, −0.14% women between 2019 and 2020) and that is not proof. The publisher has not said.
- Whether the chapter's table reads well for the surnames with the most editions absent; the screenshots cover NOWAK and AA only.

## Rollout, when the VM is reachable

`Register VM` `shift` (migration, then the batch starts and the step returns), `status` until `shift batch complete: yes`, `shift-finish` (the gate), then the web deploy. A deploy before the batch shows no chapter; a deploy before the migration also shows none (the read compares the claim type as text).
