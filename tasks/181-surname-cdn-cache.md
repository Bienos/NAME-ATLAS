# TASK-181 — The surname pages and their share images cached at Vercel's CDN

- **Status:** IMPLEMENTED 2026-10-12 on `claude/hopeful-cannon-7nl5tu` (`docs/progress/2026-10-12-surname-cdn-cache.md`).
- **Requested by:** the project owner, 2026-10-12, after the Vercel team `bienos` was paused for exceeding the Hobby plan's fair use (dashboard, read by the owner: Fast Origin Transfer 30.09 GB of 10 GB, Fluid Active CPU 8 h 56 min of 4 h, Function Invocations 774K of 1M). Asked whether to cache the surname page and its share image first: "yes".
- **Depends on:** TASK-023, TASK-024, TASK-127.
- **Model guidance:** implementation session.

## 1. Goal

A repeat request for a surname page, or for its Open Graph image, is answered by Vercel's CDN instead of running the function and the database again. What either shows does not change.

## 2. Considered

- `revalidate` (ISR) on the page, as `/pl/nazwiska` has: the page reads `headers()` (the referrer, for `page_rendered`'s `search_origin`) and `searchParams` (`intent`, `view`), so it cannot be static without moving both out of the render. A larger change to the page; left for later.
- `Cache-Control` from `next.config.ts`: Next sends its own `Cache-Control` with a dynamic page, and a function's header takes precedence over a route rule.
- **Chosen:** `Vercel-CDN-Cache-Control` from `next.config.ts`'s `headers()`. Vercel's CDN reads it ahead of `Cache-Control` and does not forward it, so the page code is unchanged.

## 3. In scope

- `apps/web/src/lib/surname-cdn-cache.ts`: the two values and the four `headers()` rules.
  - `/pl/nazwisko/{slug}`, `/en/surname/{slug}`: `public, s-maxage=3600, stale-while-revalidate=86400`.
  - their `opengraph-image`: `public, s-maxage=21600, stale-while-revalidate=86400` (TASK-127's).
- `apps/web/next.config.ts`: the rules after the security headers.
- Unit tests, matching paths with Next's own rule compiler; `security-headers.test.ts` checks the first rule instead of the whole list.

## 4. Out of scope

- The page and image code, `force-dynamic`, the queries.
- The routes below a surname (report, share studio, cards, PDFs), the comparison, the baby-names and account pages, the API.
- Bot or crawl-rate controls, `robots.txt`, `SEO_INDEXING_ENABLED`.
- Vercel project settings and the plan.

## 5. Acceptance criteria

- **AC-1.** The four paths carry `Vercel-CDN-Cache-Control` with the values above; no other route does (unit tests).
- **AC-2.** The security headers still apply to every path (unit test).
- **AC-3.** The production build serves the header on a surname page and its image (local `next start`).
- **AC-4.** On production after deployment, a repeat request for the same surname page is `x-vercel-cache: HIT`.

## 6. Verification

```bash
pnpm --filter web test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm --filter web build
```
