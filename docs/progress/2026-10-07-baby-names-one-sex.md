# 2026-10-07 — TASK-157: the baby-names page shows only the sexes a name is on

Task: `tasks/157-baby-names-one-sex.md`. Branch `claude/blissful-cori-8972y3`, moved onto `origin/main` at `461f024` (#186) before the commit. Requested by the owner after looking at ZOFIA on the live page. Numbers taken: TASK-157. `main` holds TASK-154 (#186) and open #185 and #187 are both titled TASK-154. The change was first committed as TASK-155. At 08:22 UTC a sibling session's message gave 155 to #185, 156 to #187 and 157 to this change, so it moved to 157. No ADR, no migration, no D- number.

## What changed

- **`packages/truth/src/given-name-birth-facts.ts`:** `BirthSexFigures.on_any_list` is true when a count claim stands for the name on at least one stored list of that sex, in any year. It is read from the count claims the reader already holds, with or without the history. False never stands for 0.
- **`apps/web/src/lib/baby-names-page.tsx`:**
  - `shownSexes` picks the sexes with a count on their latest list. When neither has one, it falls back to the sexes with `on_any_list`.
  - `stockSexes` handles a name on no birth list: the sexes the register lists it for, or both when it lists neither.
  - The focus is chosen among the shown sexes, so `?sex=boys` on ZOFIA shows the girls.
  - With one sex shown, the page has no tabs and no two-lists note. Tabs and the note appear only when both sexes are shown.
  - The paid history follows the shown sexes, so ZOFIA has no "Nie ma go na żadnej liście chłopców od 2000 r." line.
- **`apps/web/src/app/globals.css`:** from 900 px, a lone section spans both columns.
- **Tests:**
  - `given-name-birth-facts.test.ts`: +1, `on_any_list` per sex without a history.
  - `baby-names-page.test.ts`: TASK-145/151 assertions that showed ZOFIA's boys now assert their absence; the both-sexes checks moved to fixtures NOA (on both 2025 lists) and ARIEL (on neither); +5 in a TASK-157 block (ZOFIA free and paid in both languages; `?sex=boys`; NIKOLA with a stray earlier boys' record; NOA; ARIEL; a register-only name whose register lists neither sex).
  - `baby-names-share-test-fixtures.ts`: the field.
  - `tests/integration/src/baby-names.test.ts`: +1 on the committed official files. ZOFIA is on no boys' list. IGOR is on the girls' 2020 list (2 girls beside 2 982 boys) and not on 2025's. KASANDRA is on the girls' 2020 list only.
- **Docs:** this record, the task file, `STATUS.md` (the baby-names line, "Last rewritten" and the Deployed row as read from Vercel's API).

Why the latest list, not "any list": IGOR's 2 girls in 2020 are in the official file. Under "any list", IGOR's page would show a girls' section, the same thing the owner objected to on ZOFIA. No name is on both 2025 lists in the committed files.

## Verification

Run from the repository root on this branch. Integration ran on a local PostgreSQL 16 with PostGIS 3 (`apt-get install postgresql-16-postgis-3`, `pg_ctlcluster 16 main start`), `TEST_DATABASE_URL=postgres://postgres:…@localhost:5432/postgres`.

| Command | Result |
|---|---|
| `pnpm format:check` | exit 0 |
| `pnpm check:ids` | exit 0 |
| `pnpm typecheck` | first run exit 2: `baby-names-page.test.ts` TS2345 (the NIKOLA test's query array). Fixed, then `pnpm --filter web typecheck` exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm test` | exit 0. web 1,087 tests (100 files), truth 433, sources 615; 2,547 across all packages (sum of each package's count) |
| `pnpm test:integration` | exit 0: 49 files, 541 tests |
| `pnpm build` (`DATABASE_URL` on the local database, `BABY_NAMES_ENABLED=1`) | exit 0; the baby-names routes are dynamic |
| `pnpm format:check`, `check:ids`, `typecheck`, `lint` on the final tree, after the fix and the records | exit 0 each |

## Not verified

- The page in a browser. No Chromium check was run, so the full-width rule for one sex from 900 px was not seen rendered.
- Production data. The production database holds every list from 2000 to 2025; the local one holds the committed files only. Whether some name is on both 2025 lists in production is not known. The committed full 2025 files have none.
- The live page itself. `curl https://name-atlas.pl/pl/imiona-dla-dziecka?imie=Zofia` from this session failed with `SSL_ERROR_SYSCALL` after 30 s (the session's proxy). The page needs a signed-in session anyway.
- GitHub Actions: no result at the time of writing.
