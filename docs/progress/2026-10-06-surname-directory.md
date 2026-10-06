# 2026-10-06 — TASK-129: the alphabetical surname directory

Branch `claude/loving-faraday-1pyo0y`, restarted from `origin/main` at `b7168fb` (#154 merged). Task: `tasks/129-surname-directory.md`. Requested by the owner: "build the A–Z surname directory". The number is free on `main` and in the open pull requests (#150 and #151 hold 125; #155 has none).

## Changed

- `packages/seo/src/sitemap.ts`: `eligible` (the sitemap's predicate) takes an optional extra condition and also returns `canonical_key`; it and `seoBlockedSurnameIds` are exported within the package. The sitemap's own queries are unchanged.
- `packages/seo/src/directory.ts` (new), exported from the package:
  - `DIRECTORY_LETTERS`: the 32 letters of the Polish alphabet less ą, ę and ń, which begin no Polish word, plus Q, V and X. So ć, ł, ó, ś, ź and ż are letters of their own. `DIRECTORY_OTHER` (`inne`) for any other first character.
  - `DIRECTORY_PAGE_SIZE` = 500.
  - `directoryLetters`, `directoryCount` and `directoryEntries`: `eligible` filtered on `left(canonical_key, 1)`, ordered by `canonical_key, surname_id`.
- `apps/web/src/app/pl/nazwiska/[[...path]]/page.tsx` (new): `revalidate = 21600`, `dynamicParams = true`, and `generateStaticParams` returning none, so each address is rendered on its first request and then kept, and the build reads no database.
- `apps/web/src/lib/directory-page.tsx` (new):
  - `parseDirectoryPath`: `/k/1` and `/K` (and a decomposed `ś`) redirect to the one address; anything else that is not a letter, or a page number from 2, is 404.
  - The loaders, through React `cache`, so the metadata and the page read once.
  - The metadata: its own canonical; `index` when `SEO_INDEXING_ENABLED` is on and the page lists something; Open Graph.
  - The root and letter views: breadcrumb, `CollectionPage` + `BreadcrumbList` JSON-LD with `SITE_ORIGIN`, the `<h1>` "Nazwiska na literę K" (§113), the count and range, the letters, the 500 links, and links to every page of the letter.
- `apps/web/src/lib/directory-text.ts` (new): the Polish words. The footer and the surname breadcrumb import them from here rather than from the page module.
- `apps/web/src/lib/breadcrumbs.tsx` (new): the surname page's `Breadcrumbs`, moved unchanged so both kinds of page use it.
- `apps/web/src/lib/surname-page.tsx`: the Polish `surnameCrumbs` is Name Atlas › Nazwiska (`/pl/nazwiska`) › Nazwisko X. The English one is unchanged.
- `apps/web/src/lib/structured-data.ts`: `surnamePageGraph` takes `type`, `WebPage` by default or `CollectionPage`.
- `apps/web/src/lib/site-links.ts`: `DIRECTORY_PATH` and `directoryLetterPath`. `site-footer.tsx`: "Nazwiska A–Ż" in the Polish "Odkrywaj" group only.
- `apps/web/src/app/globals.css`: the letters and page numbers as tiles, the list in columns.
- Tests:
  - `directory-page.test.ts` (new, 12 tests).
  - `structured-data.test.ts` and `surname-page.test.ts`: the three-step Polish breadcrumb, the unchanged English one, and `CollectionPage`.
  - `tests/integration/src/directory-query.test.ts` (new): see below.

## Verified

- `tests/integration/src/directory-query.test.ts`, run on its own against the local PostgreSQL 16: 4 of 4 passed. It imports the PESEL fixtures with the real importer and picks its surnames by query: the first of up to eight first characters, then two more of the most common one. It adds synthetic `READY` distribution claims (as `sitemap-query.test.ts` does), leaving one surname with none and citing a copy of PESEL's profile with `commercial_use = UNKNOWN` on another. It computes every expectation from the database. It checks:
  - the letters, in order, with `inne` last;
  - for all 33 letters, the count equals the entries; each entry's first character matches; the order follows `canonical_key`; the union equals the sitemap's set and the counts sum to `sitemapCount`;
  - both excluded surnames are absent;
  - paging within the letter.
  
  Two mutations of `directory.ts` were each caught and then reverted: `inne` matching the letters instead of excluding them failed 2 tests; ordering by `surname_id` failed 1.
- The functions on the synthetic register-sized database built for TASK-126, regenerated for this task: 600,044 surnames and 3,498,927 claims. Through `tsx`, two runs:
  - `directoryLetters`: 1.87 s and 1.56 s;
  - `directoryCount` for k: 0.55 s and 0.47 s (18,452 surnames, 37 pages);
  - k's first page: 0.55 s and 0.46 s; its last: 0.58 s and 0.48 s;
  - `inne`'s count: 1.29 s and 0.97 s.

  In `psql`, k's count and pages took 0.41–0.48 s.
- `pnpm --filter web build`: `/pl/nazwiska/[[...path]]` is `●` (SSG through `generateStaticParams`) with no address prerendered. `next start` on that database with `SITE_ORIGIN=https://name-atlas.pl` and `SEO_INDEXING_ENABLED=true`:
  - `/pl/nazwiska`: `200`, `x-nextjs-cache: MISS` in 1.89 s, then `HIT` in 0.008 s. Title "Nazwiska od A do Ż | Name Atlas", `index, follow`, canonical `https://name-atlas.pl/pl/nazwiska`, the 32 letters.
  - `/pl/nazwiska/k`: `MISS` 2.20 s, then `HIT` 0.009 s. `/k/2` `MISS` 2.25 s; `/k/37` 2.52 s; `/%C5%82` 2.12 s.
  - `/k/2`'s HTML: 500 links to `/pl/nazwisko/…`, 37 page entries, the title "Nazwiska na literę K, strona 2 | Name Atlas", the canonical `…/pl/nazwiska/k/2`, `index, follow`, and `CollectionPage` + `BreadcrumbList` JSON-LD.
  - `/k/1` and `/K`: `308` to `/pl/nazwiska/k`.
  - `/k/38`, `/inne` (no surname on that database starts with another character), `/zz`, `/k/2/3`: `404`.
  - Next sent `cache-control: s-maxage=21600, stale-while-revalidate=31514400` on each.
- Full suite, run once on the finished code:
  - `pnpm test`: exit 0. `apps/web`: 941 tests in 91 files; `apps/admin`: 14; `apps/worker`: 2.
  - `pnpm test:integration` with `TEST_DATABASE_URL` (local PostgreSQL 16 + PostGIS): 483 tests in 41 files passed.
  - `pnpm test:golden`: 364 tests in 4 files passed.
  - `pnpm build`: exit 0.
- After the last edits (a comment and two unexported helpers in `directory-page.tsx`, and the records), all exit 0: `pnpm typecheck`, `pnpm lint`, `pnpm format:check` ("All matched files use Prettier code style!") and `pnpm check:ids` ("every task, ADR, migration and decision number is used once"). The three changed `apps/web` test files: 32 tests passed.
- The first `pnpm typecheck` failed. In the integration test, `[...DIRECTORY_LETTERS, DIRECTORY_OTHER]` widened to `string[]`. A typed constant fixed it.

## Not verified

- AC-6, production. It needs the deployment. The first request for each address after a deployment reads the database. On the synthetic database that took 1.9–3.3 s. The sitemap's count took 2.5–2.9 s there and 10.8–14.7 s on production (TASK-126), so a first render may take several times longer on production.
- Whether Vercel keeps the rendered pages across deployments. The 404 for a page past the last is kept for 6 hours like any other page, so a letter that grows a page shows it within 6 hours.
- `pnpm test:e2e`: not run.
- The page's look in a browser: not seen. Only its HTML was checked.
