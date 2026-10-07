# TASK-154 — Comparing two first names, part of the baby-names 8,99 zł view, in Brand System v1

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-baby-names-compare.md`). Dark behind the same flag as the page; the comparison belongs to the 8,99 zł view, which cannot be sold yet.
- **Requested by:** the project owner's design canvas, the board `project/Paid-Compare.dc.html` (390 px): two first names of one sex side by side, with the counts, shares, direction, years at no. 1, the register's count, a grouped bar chart every five years, a rank ladder, "Zamień drugie imię" and the footer line. D-044 puts "comparing names" in the paid view.
- **Decision:** D-044 (comparing names is paid), D-045 (8,99 zł), ADR-0023 §2.5 (no buy button, no checkout link; the locked card reads "Wkrótce"), ADR-0043 §4 (the shares), ADR-0046 (Brand System v1: Atlas Blue for action and focus; the two chart series in the Brand System's chart colours `--chart-current` and `--chart-context`; amber nowhere, since no peak is marked). No new ADR, no migration, no D- number: nothing here needed a decision the owner has not made.
- **Numbers:** TASK 154. 153 is the last on `main` (`3a82803`, #184); open #181 takes no number. `pnpm check:ids` exit 0.
- **Model guidance:** implementation session.

## 1. Goal

A signed-in reader holding the 8,99 zł view types two first names and sees them side by side for boys or for girls: the latest year's count, share and rank, the direction with the two shares it was decided on, the years at no. 1, the register's count; a grouped bar chart and a rank ladder for 2000, 2005, …, the latest year; the full year table for both. Every figure is a claim's or a list's stored figure, one sex at a time, nothing summed, nothing 0 where data is absent. A reader without the entitlement gets the form, the sex tabs and the page's locked card, and no claim is read.

## 2. Facts (2026-10-07)

1. The page (TASK-151) reads a name's figures through `BabyNamesDeps`: `findName` (`findBirthGivenName`), `readFacts` (`readBirthNameFacts`, PAID surface with the history when `true`), `readStock` (`readGivenNameFacts`, `stockListOfSex`), `hasFullView` (`hasPurchaseOf(userId, BABY_NAMES_FULL_TIERS)`). `BirthSexFigures.history` has every year from 2000 to the latest; a year with no stored list has `list: null`; a year the name is below the cut-off has `count: null` with its list; a year without a rank claim has `rank: null`. `BirthTrendFigure` carries the two shares, the earlier null when the name was below the earlier list's cut-off. The ladder's years come from the page's `ladderYears`.
2. The surname comparison (`compare-request.ts`) names its two sides `a` and `b`; the page's sex field and values are `BABY_NAMES_SEX_FIELD`, `BABY_NAMES_SEX_VALUES`, `BABY_NAMES_SEX_PARAM`.
3. `isBabyNamesPath` matches everything under either page since TASK-152, so the middleware's `private, no-store` already covers the comparison; the pages are `noindex` and in no sitemap; a sign-in comes back to the page (`BABY_NAMES_HOMES`).
4. The Brand System's chart colours are `--chart-current` (Atlas Blue 400), `--chart-historical` (amber) and `--chart-context` (aubergine); ADR-0046 narrows amber to historical emphasis.
5. On the committed fixtures ZOFIA and JULIA are both on the girls' lists of 2020 and 2025; the 2000–2019 excerpt has JULIA's rows for 2001–2014 and 2016–2019 and none of ZOFIA's, so ZOFIA's 2000, 2005, 2010 and 2015 are stored lists she is below (cut-off ticks) and JULIA's 2015 is one too; 2021–2024 have no list. The register's lists are not in the fixtures.
6. React's server renderer writes `autoFocus` as the `autofocus` attribute, so the second field can take focus without script.
7. GitHub Actions starts no job in this repository (an account-level block the owner must lift): every verification ran locally.

## 3. In scope

1. **The page** `/pl/imiona-dla-dziecka/porownaj` and `/en/baby-names/compare`, `?a=<name>&b=<name>&sex=boys|girls` (`baby-names-compare-page.tsx`; `BABY_NAMES_COMPARE_PATHS` in `baby-names-config.ts`). Gated like the page: a 404 unless `babyNamesEnabled()` and accounts are on; signed out, the explanation and the sign-in link that comes back to the page; `noindex`; `private, no-store`; in no sitemap. The entitlement is decided before any name is looked up: without it the form, the sex tabs and the page's locked card (`BabyLocked`, exported from the page), no figure of either name.
2. **The facts** (`baby-names-compare-facts.ts`, pure): `parseBabyCompareQuery`, `babyComparePath`, `babyCompareFigures` (the sex's figures with the history and at least one count, else null), `babyCompareModel` (both sides: the head "2025 · 1. z 939" or "2025 · poniżej progu", the latest count or "< N", the share, the direction word with "2020 → 2025" and "4,0% → 3,7%" or "poniżej progu → …", the years at no. 1 or "w żadnym roku", the register's count, rank and date or none; every year newest first with each name's count, "< N" or "—", rank or "—", and the year's citations; the ladder years). Formatting through `messages.ts` only.
3. **The view:** the back link to the first name's page, the eyebrow "Porównanie · Dziewczynki", the sex tabs (in-page links with `aria-current`, keeping both names), the GET form (two fields, the sex hidden, one submit; the second field takes focus when only the first is given), the two heads and the rows W 2025 · Udział · Kierunek · Nr 1 na liście · Nosi dziś, the grouped bar chart as inline SVG (two bars a year, a cut-off tick for a year below the list, a gap for no list, never a zero bar; `data-bars`), the chart's figures and the ladder as a table each (a row a name, a column a year), the year table for both names (six rows open, the rest behind `<details class="atlas-accordion">`, the sources numbered once), "Zamień drugie imię" (a link with `a` and `sex` alone, to the second field), the footer line. Two value columns that fit 390 px: long names wrap; the year table scrolls in its own box as the page's does.
4. **The way in:** "Porównaj z innym imieniem" under each sex's paid view on the page (`CompareEntry` in `History`), with the name as the first; the free view's locked note now names "porównanie dwóch imion" in both languages.
5. **Copy** in `baby-names-compare-text.ts`, both languages; one line in `baby-names-text.ts`.
6. **Styles:** a block under `.baby-names.atlas-v1` in `globals.css` (`.bn-compare-page`, `.bnc-…`): the series colours as `--bnc-series-a: var(--chart-current)` and `--bnc-series-b: var(--chart-context)`, Atlas Blue for the submit and the focus ring, the result column `minmax(0, 1fr)` so the table's width never stretches the tiles.
7. **Tests:** `baby-names-compare-facts.test.ts` (the query, the address, which figures a comparison can use, the model: both names, an absent year, a name below the earlier cut-off, no rank claim, no list, no register, below the latest cut-off), `baby-names-compare-page.test.ts` (the way in, signed out, locked with no claim read, the tiers, the full view's markup, the cut-off tick, English, one name and none, the problems, the routes' 404s and `noindex`, the middleware's header, the sitemaps), `baby-names-compare-test-fixtures.ts` (JULIA); one integration case in `tests/integration/src/baby-names.test.ts` (ZOFIA against JULIA on the girls' lists).
8. **Records:** this file, `docs/progress/2026-10-07-baby-names-compare.md`, `docs/CODEMAP.md`, `STATUS.md`, `docs/brand/MIGRATION_GUIDE.md`.

## 4. Out of scope

A comparison share card (the board's "Udostępnij kartę porównania": left out, not stubbed); more than two names; voivodeships or half-years; the list page's restyle; a buy button or checkout link; changing the free/paid split; a public URL; new dependencies; production configuration; the VM.

## 5. Not decided

- The sex when the query names none is boys, as the page's base is; the page itself then prefers the sex with a count, which needs the claims the comparison does not read before the form is filled.
- The register's noun is "kobiet" / "mężczyzn" ("women" / "men"), the register's lists being of women and of men, where the page says "osób".
- A rank is written "1. z 939" in Polish and "no. 1 of 939" in English; the page writes "1 z 939".
- A name on no list of the asked sex gets one plain line even when it is on the other sex's lists; the tabs lead there.
- The signed-out reader is sent back to the page after sign-in, as the sheet's is, not to the comparison with its query.
- The chart's second series is `--chart-context` (aubergine), the Brand System's third chart colour, the board's light blue not being a chart colour of the system.

## 6. Acceptance criteria

- **AC-1:** with the entitlement, two names of one sex show side by side: latest count, share, rank, direction with both shares, years at no. 1, register line; the chart and ladder for 2000, 2005, …, latest; the full table behind `<details>`; every figure from claims or the lists' stored figures, nothing summed, nothing 0 where absent.
- **AC-2:** without the entitlement a signed-in reader sees the form and the locked card with the page's words and no figure of either name; no claim is read before the entitlement is known.
- **AC-3:** flag-gated, signed-in only, `noindex`, `private, no-store`, not in the sitemap; signed out → the sign-in link that comes back.
- **AC-4:** Brand System v1 semantic tokens; Atlas Blue for action and focus; no amber; the chart's two series in the brand's chart colours.
- **AC-5:** no horizontal overflow at 390 px in Chromium with two long names (or the record says it was not checked).

## 7. Verification

`pnpm format:check`, `check:ids`, `typecheck`, `lint`, `test`, `test:integration` (local PostgreSQL 16 with PostGIS 3), `build` (`BABY_NAMES_ENABLED=1`, `DATABASE_URL` on the local database); Chromium (Playwright 1.56, the pre-installed browser, `next dev --webpack`) at 390 and 1280 px on a database built from the committed fixtures: the comparison with the entitled account (ZOFIA · JULIA, with cut-off years; MAŁGORZATA · STANISŁAWA and NGOC MINH CHAU · MAŁGORZATA as long names; JAKUB · ANTONI as boys; English), the swap link, the locked view with the free account, signed out, an unknown name, the entry on the page. CI did not run. Results in the progress record.
