# 2026-10-07 — The first name as given to children, in the full-name report (TASK-159)

**Request.** The owner was shown mockups of the paid report and asked for this step first ("tak, zrób to zadanie"); the PDF export comes after it (`tasks/159-births-in-full-name-report.md`). The authority is D-044 as ADR-0037 records it: every tier from 28,99 zł up holds the baby-names figures.

**Where it stands.** Built on `main` @ `461f024`. `main` was merged in at `2fd44be`, at `adef136`, at `ecfd4a8` and at `d752a2a`. No migration is added. Nothing is deployed, built on production or sold.

**Numbering.** Built as TASK-155. The open pull request #185 then took TASK-155, and `main` gained TASK-157 (#188); #187 holds TASK-156 and #189 TASK-158. So this change is TASK-159. `main` was merged in, and with it TASK-157's `BirthSexFigures.on_any_list`, which the parser now reads.

## What changed

- **`packages/truth/src/report.ts`:**
  - `full_name_report@2`. `buildFullNameReport` reads the name's `readBirthNameFacts` on the PAID surface with the history, and freezes it in the first name's facts as `births`.
  - The birth claims the chapter shows are SUPPORT claims of `GIVEN_NAME`; one not shown is a LIMITATION.
  - The chapter's body gives, per sex, the latest year, the years on a list and the trend's direction.
  - LIMITATIONS adds `BIRTHS` with the state when the name is on no list or the rights block it.
  - The bibliography lists each list file once (`referenceKey`, exported). Each birth claim has its own citation row, so the count's and the rank's citations of one list would otherwise be two entries per year.
- **`packages/truth/src/given-name-facts.ts`:**
  - `GivenNameReportFacts.births`: null for a version frozen before `@2`.
  - `parseGivenNameFacts` checks the frozen figures field by field. It refuses:
    - a figure with no list, or on a list of another year or sex;
    - an unknown direction;
    - a trend without a citation;
    - figures of another name.
- **`apps/web/src/lib/report-view.tsx`:** "Imię nadawane dzieciom" / "Given to children", after the lists' table.
  - Each sex gets a table of year, children and rank, oldest first.
  - A year off a list reads "poniżej progu listy (mniej niż N)", from the list's cut-off. A year with no stored list reads "brak listy z tego roku".
  - A sex whose stored lists never had the name gets one line.
  - The trend gives the two shares the claim states and, in words, the rule's 10% threshold.
  - A citation of a publication the bibliography already lists takes its number.
- **Tests:**
  - `apps/web/src/lib/report-view.test.ts`: 7 new tests, built from GENUINE counts and ranks of the 2020 and 2025 boys' lists.
  - `tests/integration/src/full-name-report.test.ts`: 1 new test, and 4 updated for `@2` and the `BIRTHS` gap.
- **Docs:**
  - this record;
  - the task file;
  - ADR-0041 §8 and a consequence line;
  - `STATUS.md`. It also brings the VM lines up to date with the runs of 2026-10-06, as `AGENTS.md` §8.5 asks: `given-names` run 37544349230 and `given-name-births` run 37477431187.

## Verification (commands run, results as returned)

`.github/workflows/ci.yml`'s steps were run locally, in order (scratchpad `ci.sh`):
- **tree:** commit `489304e`, plus this record, which is docs only;
- **database:** PostgreSQL 16.14;
- **`DATABASE_URL`:** a new empty `name_atlas`, so the unit tests met an empty database, as on GitHub.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm` | exit 0 |
| `python3 scripts/test-backup.py` | exit 0 |
| `pnpm test` | exit 0, 2,547 tests (web 1,088, truth 432, sources 615) |
| `pnpm db:migrate`; `db:generate-types` and `git diff --exit-code -- packages/db/src/generated` | exit 0, no diff |
| `pnpm test:integration` | exit 0: 49 files, 541 tests |
| `pnpm test:golden` | exit 0: 4 files, 364 tests |
| `pnpm build` | exit 0 |
| `pnpm e2e:seed`; `pnpm test:e2e` | exit 0, 10 Playwright tests passed |

**After merging `main` @ `2fd44be` and renumbering to TASK-159:**
- `pnpm typecheck`, `lint`, `format:check` and `check:ids`: exit 0.
- Against a new empty `name_atlas`:
  - the web unit tests: 100 files, 1,094 tests;
  - the truth unit tests: 37 files, 433 tests.
- `full-name-report`, `baby-names` and `given-name-meaning` integration tests: 3 files, 21 tests.

All passed.

**After merging `main` @ `ecfd4a8`** (TASK-160 to TASK-166), the whole sequence was run again from a new empty `name_atlas`, and every step exited 0:
- `pnpm test`: 2,708 tests (web 1,240, truth 433);
- `pnpm test:integration`: 547 tests;
- `pnpm test:golden`: 364 tests;
- the build;
- the 10 Playwright tests.

GitHub Actions starts no job in this repository.

**On real data.** The database `gn155` is a copy of the local `gn_full`. It holds the full 2026-01-20 first-name lists, NOWAK and the three meaning files.

- **Migrations:** `0043` and `0044` were applied to the copy with `pnpm db:migrate`. Before that, the copy's 0044 row was deleted and its check dropped, because the original had 0044 without `main`'s 0043.
- **Birth lists:** `pnpm import:given-name-births` with the four committed full files:
  - 2020 boys: 799 rows, 186,590 children;
  - 2020 girls: 799 rows, 176,829 children;
  - 2025 boys: 965 rows, 126,404 children;
  - 2025 girls: 939 rows, 119,788 children;
  - every list has a cut-off of 2.
- **Derivation:** `pnpm truth:derive-given-name-births`, done in 7.9 s.
- **The report:** `pnpm report:build -- --surname NOWAK --given-name PIOTR` stored a `full_name_report@2` version.
  - Its chapter body: boys, latest 2025, 2 years on lists, trend FALLING; girls, latest 2025, 0 years.
  - Its bibliography has 12 entries.
- **The preview** under `next start` (`REPORT_PREVIEW_ENABLED=1`): `/pl/raport/{id}` and `/en/report/{id}` returned `200`, with `cache-control: private, no-store` and `noindex, nofollow`. The Polish page reads:
  - "2020 · 2 839 [5] · 23 z 799";
  - "2025 · 1 146 [6] · 29 z 965";
  - "Udział wśród dzieci: 2020 r. 1,5%, 2025 r. 0,9% — spada.";
  - „Rośnie” albo „spada” znaczy, że udział zmienił się o ponad 10%…;
  - "Dziewczynki: imienia nie ma na żadnej z list z lat 2020–2025…".
- **Years with no list:** 2000–2019 and 2021–2024 read "brak listy z tego roku". This database has no lists for those years.
- **The English page:** "Share among children: 2020 1.5%, 2025 0.9% — falling."
- **Width (Playwright, Chromium):** scroll width equals client width at 1440 × 900 and 390 × 844.

**A defect this run found and fixed.** The first preview read "spada (+10,0%)". The trend claim's `change_percent` is the rule's threshold, `BIRTH_TREND_CHANGE_PERCENT`, not a change. The page now gives the two shares the claim states, as the baby-names page does, and the threshold in words.

## Not verified

- **Production:** no report is built there. The production database holds the birth claims (35,598 counts, 35,598 ranks, 1,904 trends, from the `given-name-births` run of 2026-10-06), but this session did not read them through the report.
- **Every year from 2000:** only the 2020 and 2025 lists were loaded locally. A full table from 2000 to 2025 was not seen.
- **Out of scope:** the PDF export and the new report design (the next task). The voivodeships, half-years and comparisons of D-044's paid view are not in the report.
