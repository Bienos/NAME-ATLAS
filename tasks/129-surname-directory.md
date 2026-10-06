# TASK-129 — The alphabetical surname directory

- **Status:** IMPLEMENTED 2026-10-06 on `claude/loving-faraday-1pyo0y` (`docs/progress/2026-10-06-surname-directory.md`).
- **Requested by:** the project owner, 2026-10-06: "build the A–Z surname directory", one of the search follow-ups listed after TASK-123 (from the owner's SEO + GEO brief).
- **Depends on:** TASK-027, TASK-123, TASK-126, TASK-127.
- **Spec:** `docs/canonical/21` §111–§114 (the directory), §20 (`/pl/` first), §62 and §73 (breadcrumb), §237 (Home → directory → letters → surnames).
- **Model guidance:** implementation session.

## 1. Goal

Every surname page the sitemap lists is reachable through ordinary links: from the footer to `/pl/nazwiska`, to a letter, to the surname. Each surname page's breadcrumb gains the directory as its middle step.

## 2. In scope

- `packages/seo/src/directory.ts`: the letters (the Polish alphabet's initial letters, plus Q, V and X) and `inne` for every other first character; `directoryLetters`, `directoryCount` and `directoryEntries` over the sitemap's own predicate (`eligible` in `sitemap.ts`, given an optional extra condition), 500 to a page, ordered by `canonical_key`.
- `apps/web`: the route `/pl/nazwiska/[[...path]]` (`/pl/nazwiska`, `/pl/nazwiska/{letter}`, `/pl/nazwiska/{letter}/{n}`), rendered on first request and kept for 6 hours (`revalidate = 21600`; no address at build). `directory-page.tsx` (paths, data, metadata, views), `directory-text.ts` (its Polish words), `breadcrumbs.tsx` (the surname page's breadcrumb, now shared).
- Each page: its own canonical; `index, follow` when `SEO_INDEXING_ENABLED` is on and it lists something, else `noindex, follow`; `CollectionPage` and `BreadcrumbList` JSON-LD when `SITE_ORIGIN` is set.
- `/pl/nazwiska/k/1` and `/pl/nazwiska/K` redirect (308) to `/pl/nazwiska/k`; other addresses, and a page past the last, are 404.
- The Polish footer's "Odkrywaj" group links to `/pl/nazwiska`. The Polish surname breadcrumb is Name Atlas › Nazwiska › Nazwisko X, here and in its JSON-LD.
- Unit tests for the paths, metadata, views and footer; an integration test that the directory and the sitemap list the same surnames.

## 3. Out of scope

- An English directory (§20: `/pl/` first). The English breadcrumb and footer stay as they are.
- Adding the directory pages to the sitemap; search inside the directory; counts per letter on the root page.
- Changing which surnames are listed: the sitemap's predicate is reused as it is.

## 4. Acceptance criteria

- **AC-1.** The directory lists exactly the sitemap's surnames: every letter's entries, `inne` included, add up to the sitemap's set and count, and each letter's count equals its entries (integration test).
- **AC-2.** The root shows only letters with at least one surname, in alphabetical order with `inne` last; a letter's page lists 500 surnames as plain `<a href>` links in server-rendered HTML, in `canonical_key` order, with links to every page of the letter (unit and integration tests; local production build).
- **AC-3.** Each page is its own canonical, `index` only when indexing is on and it lists something; `/k/1` and `/K` redirect to `/k`; an unknown address or a page past the last is 404 (unit tests; local production build).
- **AC-4.** A Polish surname page's visible breadcrumb and its `BreadcrumbList` have the step Nazwiska → `/pl/nazwiska`; the Polish footer links to the directory (unit tests).
- **AC-5.** A repeat request for a directory page is served from the cache (`x-nextjs-cache: HIT` from a local `next start`).
- **AC-6.** On production after deployment, `/pl/nazwiska` and a letter's page answer 200 with `index, follow`, and a repeat fetch is a cache hit.

## 5. Verification

```bash
pnpm --filter web test
TEST_DATABASE_URL=… pnpm test:integration
pnpm test:golden
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm build
```
