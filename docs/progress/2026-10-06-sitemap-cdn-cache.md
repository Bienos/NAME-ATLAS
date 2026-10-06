# 2026-10-06 — TASK-127: the sitemaps cached at Vercel's CDN

Branch `claude/loving-faraday-1pyo0y`, restarted from `origin/main` at `875b656` (#152 merged). Task: `tasks/127-sitemap-cdn-cache.md`. Requested by the owner: "yes add the caching".

## Observed before the change

On production after #152 (08:45–09:00 UTC, recorded on #152): `/sitemap.xml` took 22.6 s once after the deployment, then 10.8–14.7 s; the surname files 7.4–13.6 s. Their responses carried Vercel's default `cache-control: public, max-age=0, must-revalidate` (seen on 2026-10-05), so every fetch read the database.

## Changed

- `apps/web/src/lib/sitemap-xml.ts`: `SITEMAP_CACHE_CONTROL = "public, s-maxage=21600, stale-while-revalidate=86400"` and `CACHED_SITEMAP_HEADERS` (with the XML content type). Fresh at the CDN for 6 hours, then served stale for up to 24 more while the CDN rebuilds it.
- `app/sitemap.xml/route.ts`: the header on the 200 that counts from the database. Not on the 500, and not on the empty index served without `SITE_ORIGIN` or with `SEO_INDEXING_ENABLED` unset.
- `app/sitemap/[page]/route.ts`: the header on the 200 that lists from the database. Not on its 404s or its 500. Its unused `XML` constant is removed.
- `app/sitemap.xml/route.test.ts`, `app/sitemap/[page]/route.test.ts` (new): the header on a 200 read from the database; none on a 404, a 500, or with the flag off or no origin.

## Verified

- `pnpm --filter web exec vitest run src/app/sitemap.xml/route.test.ts "src/app/sitemap/[page]/route.test.ts" src/lib/sitemap-xml.test.ts`: 3 files, 18 tests passed.
- `pnpm --filter web build`: exit 0. Then `pnpm start` against the local e2e-seeded database with `SITE_ORIGIN=https://name-atlas.pl` and `SEO_INDEXING_ENABLED=true`:
  - `/sitemap.xml`: `200`, `cache-control: public, s-maxage=21600, stale-while-revalidate=86400`;
  - `/sitemap/1.xml`: `404` (the fixtures produce no distribution claim) with no `cache-control`;
  - `/sitemap-blog.xml`: `200` with no `cache-control`;
  - `/robots.txt`: unchanged, `public, max-age=300`.
- `pnpm typecheck` exit 0; `pnpm format:check` "All matched files use Prettier code style!"; `pnpm check:ids` exit 0; `pnpm test` exit 0 (`apps/web` 927, `apps/admin` 14, `apps/worker` 2); `pnpm build` exit 0. `pnpm lint` first failed on the two new tests' `import()` type annotations (`consistent-type-imports`); after switching to `import type * as Seo`, as `share-route.test.ts` does, it passed.
- Not run: `test:integration`, `test:golden`, `test:e2e`. No package, query or page changed, only the two routes' headers.

## Not verified

- AC-4, the CDN hit and its time on production: it needs the deployment.
- Whether Vercel keeps cached responses across a new deployment. Vercel's documentation, as searched, does not say. The flag-off and origin-less responses are never cached, so switching `SEO_INDEXING_ENABLED` on cannot leave an empty index behind. Switching it off could leave the cached full index and pages served for up to 30 hours if the cache outlives the deployment; `robots.txt` (five minutes) then already turns crawlers away, every page serves `noindex`, and `vercel cache purge --type cdn` clears it.
