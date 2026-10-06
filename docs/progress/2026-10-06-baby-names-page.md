# 2026-10-06 — TASK-141: first names given to children, the page, dark behind a flag

Task: `tasks/141-baby-names-page.md` (drafted as 140; open #168 took TASK-140 before this pull request). Decision: D-044 §1–8 (§6 as amended by TASK-139), ADR-0037 §2.1, ADR-0042, ADR-0043, ADR-0032, ADR-0023 §2.5. No new ADR, contract or migration. Built on `main` @ `023061e`.

## What changed

- **`packages/truth/src/given-name-birth-facts.ts`** (new):
  - `findBirthGivenName` goes from the typed text through `canonicalKey` to `given_names`. A flagged form is `HELD`. Empty text, or text over 60 characters, is `INVALID`.
  - `readActiveBirthLists` reads the lists on ACTIVE source records: id, year, sex and cut-off.
  - `readBirthNameFacts` reads the name's ACTIVE `GIVEN_NAME_BIRTH_COUNT`, `_RANK` and `_TREND` claims with their citations and rights.
  - `assembleBirthNameFacts` holds the pure selection rules:
    - a claim counts only when its key names a current list;
    - the trend counts only when it is `given_name_birth_trend@2` and on the sex's latest list;
    - the latest list per sex;
    - with `history`, every year from 2000 to the latest; a year with no stored list is `list: null`;
    - an absence keeps its list's `publication_threshold`, never a 0;
    - two active lists of one year and sex throw (ADR-0042 §3);
    - `RIGHTS_BLOCKED` through `sectionEligibility`.
  - Figures come from claims only; the list rows give only a year, a sex and a cut-off.
- **`packages/accounts/src/purchases.ts`:**
  - `Purchases.hasPurchaseOf(userId, tiers)` checks the tier.
  - `BABY_NAMES_FULL_TIERS = ["smaller", "couple", "family"]` (28,99, 89,99 and 199 zł). The 800 zł tier has no `PurchaseTier`, and the 5,99 zł product does not exist.
  - `hasPurchase` (the tree, TASK-114) is unchanged.
- **The web app:**
  - `baby-names-config.ts`: the flag, the addresses and the cache header.
  - `baby-names-text.ts`: the Polish and English copy.
  - `baby-names-page.tsx`: `loadBabyNames`, `BabyNamesView` and `BabyNamesRoute`.
  - The routes `app/pl/imiona-dla-dziecka/page.tsx` and `app/en/baby-names/page.tsx`.
  - The middleware sends `private, no-store` to both addresses, on or off.
  - `safeNext` accepts the two bare addresses, so a sign-in comes back to the page.
  - Styles in `globals.css`.
  - A 404 unless `BABY_NAMES_ENABLED` is exactly `1` and accounts are on.
  - Signed in, the latest view for every account. The history is read (on the `PAID` surface) only when `hasPurchaseOf` is true. Otherwise the page shows a locked "Imiona dla dziecka 5,99 zł · Wkrótce" card with no button or link.
- **Tests:**
  - `given-name-birth-facts.test.ts`: 7 unit tests.
  - `baby-names-page.test.ts`: 10 page tests, covering flag off, accounts off, cache header, signed out, signed in without a purchase, signed in with a 28,99 zł purchase, each tier from 28,99 zł up, another reader's purchase, an unknown name, a flagged name, and no read for a signed-out reader.
  - `account-paths.test.ts`: 1 test of the return address.
  - Integration `baby-names.test.ts`: 6 tests on the full 2020 and 2025 files and the 2000–2019 excerpt.
  - Integration `accounts.test.ts`: 1 new test of `hasPurchaseOf` per tier.
- **Docs:** the task file, `docs/CODEMAP.md`, this record, `STATUS.md`.

## Verification

GitHub Actions starts no jobs on this account (billing), so there is no CI result. Run locally on PostgreSQL 16 with PostGIS 3 (`apt-get install postgresql-16-postgis-3`, `pg_ctlcluster 16 main start`), with `TEST_DATABASE_URL` pointed at that server.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm check:ids` | exit 0: "every task, ADR, migration and decision number is used once" |
| `pnpm test` | exit 0: 15 packages, 2,396 tests (truth 413, web 971) |
| `pnpm build` | exit 0; `/pl/imiona-dla-dziecka` and `/en/baby-names` are dynamic routes |
| `pnpm test:integration` | exit 0: 46 files, 517 tests |
| `pnpm test:golden` | exit 0: 4 files, 364 tests |

`pnpm test:integration` and `pnpm test:golden` were run again on the final code: 46 files, 517 tests, exit 0; and 4 files, 364 tests, exit 0.

**The full dataset, on a disposable local database** (`atlas_births_140`, migrated to 0041, holding nothing else):
- The 13 resources of dataset 219 were downloaded from each registry `official_source_url`. Every SHA-256 equals the registry's.
- `pnpm import:given-name-births` for each: all 13 imported, exit 0.
- `pnpm truth:derive-given-name-births`: exit 0, 66.7 s. Active claims: 35,598 counts, 35,598 ranks, 1,904 `@2` trends. ZOFIA and ANTONI are STEADY; JULIA and JAKUB are FALLING.
- Two accounts were made in its `accounts` schema with the accounts package, by a script that was deleted afterwards. One holds a test-mode `smaller` purchase (2899 grosze, `livemode` false).

**In Chromium (Playwright 1.56.1, `/opt/pw-browsers`)**, two `next start` servers ran with accounts on: one with `BABY_NAMES_ENABLED=1`, one without. Each case was checked at 390 px and 1280 px wide, with analytics declined first so the consent banner does not cover the page. 18 full-page screenshots are saved in the session scratchpad (`shots/{case}-{390|1280}.png`).

| Case | What the page showed (both widths) |
|---|---|
| Flag off, `/pl/imiona-dla-dziecka` | 404 "Nie ma takiej strony", `noindex`. `curl`: 404 on both addresses, `cache-control: private, no-store` |
| Signed out, PL and EN | The explanation, the source line, and "Zaloguj się" / "Sign in" to `/pl/konto/zaloguj?next=%2Fpl%2Fimiona-dla-dziecka` / `/en/account/sign-in?next=%2Fen%2Fbaby-names`. No form and no figure |
| ZOFIA, signed in, no purchase | Girls: 4 415 children in 2025, "1 z 939", "bez większej zmiany" (STEADY), the comparison line (2025 against 2020, 10%), sources (resources 1159538 and 28021). Boys: "W 2025 r. nadano je mniej niż 2 razy…". Locked card "Imiona dla dziecka 5,99 zł WKRÓTCE"; the only button on the page is the search's |
| JAKUB, EN, no purchase | Boys: 3,386, "9 of 965", falling. Girls: fewer than 2 times in 2025 |
| KASANDRA (15 girls in 2020, on no 2025 list) | Both sexes: "mniej niż 2 razy" in 2025, no direction |
| Qwxyzzy (unknown) | "Imienia „Qwxyzzy” nie ma na żadnej z list…" |
| ZOFIA, signed in with the 28,99 zł test purchase | No locked card. Two tables of 26 rows each. Boys: "< 5" for 2000–2012 and "< 2" for 2013–2025. Girls: 2000: 916, "44 z 414"; 2025: 4 415, "1 z 939". A source column [1]–[7] names resources 21457, 28021, 36394, 44824, 54100, 63899 and 1159538 |
| JAKUB, EN, with the purchase | Boys: 2000: 14,497, "1 of 382"; 2025: 3,386, "9 of 965". Girls: "< 5" or "< 2" every year |

At 390 px `document.documentElement.scrollWidth` was 390 in every case, and at 1280 px it was 1280: no horizontal overflow. The page's absence of sitemap entries was checked with `curl /sitemap.xml`: 0 matches. No header or footer link points to it.

## Not verified

- Nothing on staging or production. The flag is not set anywhere, and nothing was deployed.
- A real sign-in round trip through the form. The local sessions were made by the accounts package, and the browser was given the session cookie.
- Google sign-in's return to the page. `safeNext` accepts the address, and the Google routes use the same `safeNext`.
