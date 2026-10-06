# 2026-10-06 — TASK-146: the baby-names list, the names of a year ranked, and its gate

Task: `tasks/146-baby-names-list.md`. Decision: D-047 (new; this session's reading of the owner's "i potem cala lista dostepna za 8.99 PLN"), on D-044, D-045, ADR-0037 §2.1, ADR-0042, ADR-0043, ADR-0023 §2.5. Migration 0043. Built on `main` @ `0596cc6` (#173). Numbers taken: TASK-146, D-047, 0043; no pull request was open when they were chosen. No ADR.

## What changed

- **`packages/truth/src/given-name-birth-list.ts`** (new): `readBirthListPage(db, list, { surface, limit, offset, withTrend, direction })`. One SQL query per page over the claims of one `given_name_birth_lists` row: the active `GIVEN_NAME_BIRTH_COUNT` claims whose key names the list, left-joined to the same list's `GIVEN_NAME_BIRTH_RANK` claim and (when `withTrend`) the `given_name_birth_trend@2` claim whose key names it as the latest list. Ordered by the rank claim, then display form, then id; names with no rank claim last and `rank: null`. A flagged form (`form_review`) is not listed. `LIMIT` is capped at 100. Rights: `sectionEligibility` over the rows' count claims' rights; a refusal is `RIGHTS_BLOCKED` with no row. The citations are the claims' own, each once. `given_name_birth_counts` and `given_name_counts` are not read. `assembleBirthListPage` is the pure part. Exported from `packages/truth/src/index.ts`.
- **`packages/db/migrations/0043_given_name_birth_list_index.ts`** (new): `claims_given_name_birth_list_idx` on `(split_part(claim_key,'|',1), split_part(claim_key,'|',3))`, partial on `claim_key LIKE 'GIVEN_NAME_BIRTH_%' AND claim_status = 'ACTIVE'`. `packages/db/src/migrator.test.ts` lists it; `tests/integration/src/extensions.test.ts` and `canonical-key-v2.test.ts` name it as the latest migration.
- **The web app:**
  - `baby-names-config.ts`: `BABY_NAMES_LIST_PATHS`, `BABY_NAMES_LIST_PAGE_SIZE` (100), `BABY_NAMES_LIST_FREE_ROWS` (10); `isBabyNamesPath` covers the two new addresses, so the middleware sends `private, no-store` to them on or off.
  - `account-paths.ts`: `safeNext` accepts the two bare list addresses.
  - `baby-names-list-page.tsx`, `baby-names-list-text.ts` (new), and the routes `app/pl/imiona-dla-dziecka/lista/page.tsx`, `app/en/baby-names/list/page.tsx`: a 404 with empty metadata unless `BABY_NAMES_ENABLED` is exactly `1` and accounts are on; `noindex`. Query: `sex=boys|girls`, `year`, `trend=rising|falling`, `page`. Signed out: explanation, source, sign-in back to the list; no figure and no read. Free: the first 10 rows of the sex's latest list (`FREE` surface). Entitled (`hasPurchaseOf(userId, BABY_NAMES_FULL_TIERS)`, the same dependency as the page, via `runningBabyNamesDeps`): any year, 100 rows a page, the filter (`PAID` surface). A free reader asking for another year, a page above 1 or a filter gets the locked card, "8,99 zł · Wkrótce", with no `<a>` or `<button>` in it, and **the reader is not called**. The filter is the latest year's only; for another year it is dropped with a sentence saying so.
  - `baby-names-page.tsx`: exports `Source`, `runningBabyNamesDeps`, `readBabyNamesSession` (the cookie read the page already did, now shared); adds the link "Cała lista imion" / "The whole list" under the search box and a sentence in the locked card's text. `baby-names-text.ts`: two strings. `globals.css`: styles for the list's selects, table and pager.
- **Tests:** `given-name-birth-list.test.ts` (6, truth), `baby-names-list-page.test.ts` (14, web), 1 in `account-paths.test.ts`, `tests/integration/src/baby-names-list.test.ts` (7).
- **Docs:** `tasks/146-baby-names-list.md`, D-047 (and a pointer in D-045's "Not decided"), `docs/CODEMAP.md`, ADR-0037 §2.1 (one clause), `STATUS.md`, this record.

## The `EXPLAIN` that justifies 0043

On a local database holding the full 2020 and 2025 files and the 2000–2019 excerpt (9,012 claims), for the count claims of one list:

- before the index: `Bitmap Heap Scan on claims`, `Recheck Cond: claim_status = 'ACTIVE'`, the key's type and list as a `Filter`, over `Bitmap Index Scan on claims_active_claim_key_uq`, so every ACTIVE claim of every kind is read;
- after `CREATE INDEX claims_given_name_birth_list_idx …`: `Index Scan using claims_given_name_birth_list_idx` with `Index Cond` on the type and list.

The database is small, so this shows the shape of the plan, not a timing; on the register's database, with its surname claims, the first plan would read them all.

## Verification

Run locally on PostgreSQL 16 with PostGIS 3 (`apt-get install postgresql-16-postgis-3`, `pg_ctlcluster 16 main start`), with `TEST_DATABASE_URL=postgres://postgres:…@localhost:5432/postgres`. No CI result: this was run before the pull request existed.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm check:ids` | exit 0: "every task, ADR, migration and decision number is used once" |
| `pnpm typecheck` | exit 0 (a first run failed on a type in the new web test; fixed, re-run) |
| `pnpm lint` | exit 0 |
| `pnpm test` | exit 0: web 95 files, 1,004 tests; truth 37 files, 426 tests; 2,451 tests across all packages (sum of each package's count) |
| `pnpm test:integration` | exit 0: 48 files, 531 tests. A first run failed 2 tests that name the latest migration (`extensions.test.ts`, `canonical-key-v2.test.ts`); they were updated for 0043 and the run repeated |
| `pnpm test:golden` | exit 0: 4 files, 364 tests |
| `pnpm build` (`DATABASE_URL` pointing at the local database, `BABY_NAMES_ENABLED=1`) | exit 0; `/pl/imiona-dla-dziecka/lista` and `/en/baby-names/list` are dynamic routes |

**Chromium, real data.** Disposable database `atlas_146`: migrated to 0043; the five birth files from `fixtures/pesel-given-name-births/` (the 2000–2019 excerpt and the full 2020 and 2025 files) imported with `pnpm import:given-name-births`; `pnpm truth:derive-given-name-births` gave 3,606 counts, 3,502 ranks, 1,904 trends. Two accounts made with the accounts package (one free, one with a recorded test purchase of `babynames`). `next dev --webpack` with accounts on and `BABY_NAMES_ENABLED=1`; headless Chromium at 390 and 1280 px: signed out, free (top 10), free with another year (locked card), `babynames` latest girls (100 rows), `babynames` boys rising, `babynames` 2010 (an excerpt: 2 rows). In all twelve views `scrollWidth` equals `clientWidth` (no horizontal overflow); the free view has 10 rows and the locked card; the entitled views have no locked card; one `<button>` (the filters') on every signed-in view, none signed out. Screenshots of the free view at 390 px and the entitled view at 1280 px were read.

## Not verified

- Signed-in figures on production or staging data: nothing is loaded there, and 0043 is not applied there.
- The query's speed on the register's real size: only the plan's shape was checked (above).
- `private, no-store` in the running dev server: it answers `no-cache, must-revalidate` for pages in `next dev`; the header is checked in the unit test on the middleware.
- A real payment, a Stripe link: none exists on either page; AC-5 is checked on the HTML in unit tests.
- GitHub Actions: no result at the time of writing.
