# TASK-127 — The sitemaps cached at Vercel's CDN

- **Status:** IMPLEMENTED 2026-10-06 on `claude/loving-faraday-1pyo0y` (`docs/progress/2026-10-06-sitemap-cdn-cache.md`).
- **Requested by:** the project owner, 2026-10-06: "yes add the caching", after TASK-126's post-merge check found `/sitemap.xml` still taking 10.8–14.7 s on production and its responses sent with no cache.
- **Depends on:** TASK-027, TASK-126.
- **Model guidance:** implementation session.

## 1. Goal

A crawler fetching the sitemaps gets a stored copy from Vercel's CDN instead of waiting for the database every time. What the sitemaps list does not change.

## 2. In scope

- `apps/web/src/lib/sitemap-xml.ts`: `SITEMAP_CACHE_CONTROL` (`public, s-maxage=21600, stale-while-revalidate=86400`) and `CACHED_SITEMAP_HEADERS`.
- `/sitemap.xml` and `/sitemap/{n}.xml`: those headers on the 200 that reads the database, and only there.
- Route tests for both.

## 3. Out of scope

- `/sitemap-blog.xml` and the responses with nothing to read (no `SITE_ORIGIN`, `SEO_INDEXING_ENABLED` unset): cheap, and switching the flag must take effect at once.
- The query itself, a scheduled warm-up, Next's data cache or `revalidate`.
- `robots.txt` (already `max-age=300`).

## 4. Acceptance criteria

- **AC-1.** A 200 from `/sitemap.xml` or `/sitemap/{n}.xml` that read the database carries `SITEMAP_CACHE_CONTROL` (route tests).
- **AC-2.** A 404, a 500 and the flag-off and origin-less responses carry no `cache-control` from the route (route tests).
- **AC-3.** The production build serves the header unchanged (local `next start`).
- **AC-4.** On production after deployment, a repeat fetch of `/sitemap.xml` is a CDN hit and answers in under a second.

## 5. Verification

```bash
pnpm --filter web test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm build
```
