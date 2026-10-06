# 2026-10-06 — TASK-145: the register's count on the baby-names page

Task: `tasks/145-baby-names-stock-count.md`. No new ADR, contract, migration or D- number. Built on `main` @ `f7c2460`.

## What changed

- `packages/truth/src/given-name-birth-facts.ts`, `index.ts`: `stockListOfSex(lists, sex)`, the register list of one sex by its group's suffix; the latest date if two stand; null if none.
- `apps/web/src/lib/baby-names-page.tsx`: `BabyNamesDeps` gains `readStock` (`readGivenNameFacts`, surface `FREE`) and `readLists` (`readActiveBirthLists`). `loadBabyNames` reads both for a found name; result `FACTS` carries `stock`; new result `STOCK_ONLY` for a name with no birth claim and a register claim (a name with neither stays `NOT_FOUND`). New views `Register` (under each sex) and `StockOnly`.
- `baby-names-text.ts`: six strings per language. `globals.css`: `.baby-register`.
- Tests: `given-name-birth-facts.test.ts` (3), `baby-names-page.test.ts` (9 new: both datasets, birth only, register only, neither, held form, signed out, rights-blocked, no `given_name_counts`, free), integration `baby-names-stock.test.ts` (5).
- Records: task file, CODEMAP, STATUS, ADR-0032 note. The register block is free (assumption; task §5 says how to move it to the 8,99 zł view).

## Verification

Local PostgreSQL 16 with PostGIS 3 (`apt-get install postgresql-16-postgis-3`, `pg_ctlcluster 16 main start`), `TEST_DATABASE_URL=postgres://postgres:…@127.0.0.1:5432/postgres`.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm check:ids` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm test` | exit 0 (truth 420, web 989, sources 609) |
| `pnpm test:integration` | exit 0: 47 files, 524 tests |
| `pnpm test:golden` | exit 0: 4 files, 364 tests (same `TEST_DATABASE_URL`) |
| `pnpm build` | exit 0, with `DATABASE_URL` at the local `atlas_145` database |

**Chromium, real data.** Disposable database `atlas_145` migrated to 0042; the four full 2020 and 2025 birth files from `fixtures/` and the two full register files (resources 1159669 and 1159670, downloaded; SHA-256 equal to the registry's); `pnpm import:given-name-births`, `import:given-names`, both derive commands (all claims: 3,502 birth counts, 74,978 register counts). `next dev --webpack`, `BABY_NAMES_ENABLED=1`, accounts on, a session made with the accounts package.
- ZOFIA (pl, 1280 px): girls: 4 415 children in 2025, "1 z 939"; register 360 466, "14 z 28 781", 20 stycznia 2026 r., resource 1159670. Boys: below the cut-off of 2 in 2025; register 4, "18 950 z 46 197", resource 1159669. Equal to the claims in the database.
- MARIA (en): girls 2,536, "11 of 939"; register men 55, "3,120 of 46,197".
- JĀNIS (register only): boys register 173, "1 417 z 46 197" and "W 2025 r. nadano je mniej niż 2 razy…" for both sexes; girls: "Nie mamy liczby z listy rejestru PESEL…".
- Qwxyzzy: "nie ma na żadnej z list…". Signed out: explanation and sign-in only.
- `scrollWidth` equal to the width (390 and 1280) in all five cases. Screenshot of ZOFIA at 390 px viewed.

## Not verified

- Nothing on staging or production; the flag state there is unchanged. The full 2000–2019 birth file was not loaded (the committed excerpt only).
