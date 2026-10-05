# 2026-10-05 — TASK-123: the surname page's search head

Branch `claude/loving-faraday-1pyo0y`, from `origin/main` at `ab23f2f`, rebased onto `9e46aac` (TASK-122) before the pull request; numbered TASK-123 because `main` had given 121 and 122 to other changes meanwhile. Task: `tasks/123-surname-search-head.md`. Requested by the owner with the "Name Atlas SEO + GEO Fix Plan" brief.

## Observed before the change

Probed on production (`https://name-atlas.pl`, 13:19 UTC):

- `/robots.txt`: 200, the sharing crawlers allowed, then `User-agent: *` / `Disallow: /` with the note that `SEO_INDEXING_ENABLED` is not set.
- `/sitemap.xml`: 200, an empty `<sitemapindex>`.
- `/pl/nazwisko/nowak`: `<title>NOWAK — Name Atlas</title>`, a description of the two counts, `noindex, follow`, a canonical URL, no `hreflang`, no JSON-LD, and no `<h1>` (the surname was an `<h2>`).

## Changed

- `apps/web/src/lib/surname-seo.ts` (new): the `<h1>` words, the title from `publishableFamilies` (`docs/canonical/21` §66–§67: meaning and origin only with `ONOMASTICS`, where only with `GEOGRAPHY`, how many only with `CURRENT_STATS`), the answer sentence (§64: each list's count with its date, the lists side by side and never summed, a null value left out; the strongest voivodeship only when untied, ready, on the same date and the same for every list) and the description (§68).
- `apps/web/src/lib/structured-data.ts` (new): `Organization` + `WebSite` with `@id`s, a surname page's `WebPage` + `BreadcrumbList`, the shared publisher, and `jsonLd` (escapes `<`). Nothing without `SITE_ORIGIN`.
- `surname-page.tsx`: `metadataFor` uses the new title and description and adds `alternates.languages` (`pl`, `en`, `x-default` = the Polish page) when the surname has an address in the other language (`languageAlternates`); the page renders a visible breadcrumb (`surnameCrumbs`: Name Atlas › Nazwisko NOWAK) and its JSON-LD. Canonical URL and `robots` unchanged.
- `snapshot.tsx`: the eyebrow and the surname are now one `<h1 class="snapshot-title">` ("Nazwisko NOWAK"), followed by `<p class="snapshot-answer">` with the answer sentence.
- `app/page.tsx`: the landing (no query) carries `Organization` + `WebSite`.
- `blog-page.tsx`: the `Article`'s publisher is the shared `Organization` (with its `@id` when the origin is known); still no author.
- `globals.css`: the heading reset (`.snapshot-title`), the answer line, the breadcrumb, and the first screen's height reduced by the breadcrumb's line.
- `messages.ts`: `breadcrumbLabel` in both languages.
- Tests: `surname-seo.test.ts`, `structured-data.test.ts` (new); `surname-page.test.ts` (hreflang, breadcrumb, JSON-LD only with `SITE_ORIGIN`); two `result-view.test.ts` assertions moved to the new markup (the surname is a `<span>` in the `<h1>`; the column-order test reads the columns, since the answer above them names both counts).
- `docs/CODEMAP.md`: a row for the two new modules.

## Verified

- `pnpm --filter web test` — 88 files, 917 tests passed (before the new tests: 2 failed, the two `result-view.test.ts` assertions above, then updated).
- `pnpm typecheck` — passed (every workspace package).
- `pnpm lint` — passed, no output.
- `pnpm format:check` — "All matched files use Prettier code style!"
- `pnpm check:ids` — "every task, ADR, migration and decision number is used once".
- `pnpm --filter web build` — passed (blog content check, then `next build --webpack`).
- After the rebase onto `9e46aac`: `pnpm typecheck` (exit 0), `pnpm lint`, `pnpm format:check`, `pnpm check:ids` and `pnpm --filter web build` (exit 0) passed again, and `pnpm --filter web test` passed 917 of 917 in 88 files. The rendered-page checks below were made before the rebase and not repeated.
- Rendered against a local database: PostgreSQL 16 with PostGIS installed in the session container, seeded by `tests/e2e/seed.sh` (the committed PESEL fixtures; "failed 0" on derivation), then `pnpm start` with `SITE_ORIGIN=https://name-atlas.pl` and `SEO_INDEXING_ENABLED=true`:
  - `/pl/nazwisko/nowak`: `<title>Nazwisko NOWAK — ile osób je nosi | Name Atlas</title>`; description "Liczba osób o nazwisku NOWAK w rejestrze PESEL na dzień 20 stycznia 2026 r.: 98 387 mężczyzn i 99 738 kobiet. Zobacz źródła danych."; canonical `https://name-atlas.pl/pl/nazwisko/nowak`; `hreflang` `pl`, `en` and `x-default`; one `<h1>`, "Nazwisko NOWAK"; the answer paragraph; the breadcrumb; one JSON-LD script whose `BreadcrumbList` items are the breadcrumb's. `robots` stayed `noindex, follow`: in the fixtures NOWAK's distribution is `UNAVAILABLE` and it has no meaning, so §43's single family applies.
  - `/en/surname/nowak`: the English counterparts, "Surname NOWAK", and the same three `hreflang` addresses.
  - `/pl/nazwisko/nowak?view=cards`: 200, canonical `https://name-atlas.pl/pl/nazwisko/nowak`.
  - `/`: one JSON-LD script, `Organization` + `WebSite`; `/apple-icon.png`, its logo, 200 `image/png` (180 × 180). `/?surname=xyzqq`: no JSON-LD.
  - `/pl/blog/genealogia`: publisher `{"@type":"Organization","@id":"https://name-atlas.pl/#organization",…}`.
  - `/robots.txt`: unchanged.
  - Screenshots of `/pl/nazwisko/nowak` at 1440 × 900 and 390 × 844 (Playwright, Chromium): the eyebrow and the surname set as before, the breadcrumb one line above them, the answer under the name.

## Not verified

- The title's and description's map and meaning branches against rendered pages: the fixture database has no `CURRENT_DISTRIBUTION` claim and no meaning. They are covered by unit tests only.
- Schema.org's validator and Google's Rich Results Test: not run (no access from the session). The JSON-LD was checked by unit tests and by reading the rendered output.
- Production and staging: nothing deployed; `SEO_INDEXING_ENABLED` is not set there, so every page still serves `noindex` and `robots.txt` still disallows search crawlers.
- `pnpm test:integration`, `test:golden` and `test:e2e`: not run; the change is confined to `apps/web`.
