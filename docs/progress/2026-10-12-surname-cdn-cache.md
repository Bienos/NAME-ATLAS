# 2026-10-12 — TASK-181: the surname pages and their share images cached at Vercel's CDN

Branch `claude/hopeful-cannon-7nl5tu`, from `origin/main` at `feeb704` (#221 merged). Task: `tasks/181-surname-cdn-cache.md`. Requested by the owner: "yes", after the Vercel team `bienos` was paused.

## Observed before the change

- The owner's Vercel dashboard (screenshot, 2026-10-12): the team is paused, "Your team exceeded the Hobby fair use limits". Fast Origin Transfer 30.09 GB of 10 GB, Fluid Active CPU 8 h 56 min of 4 h, Function Invocations 774K of 1M, CDN Requests 442K of 1M. The limits are the team's, shared by every project on it; which project used how much was not read, because Vercel's observability query answered `402 payment_required` (Observability Plus) on the Hobby plan.
- In this repository: `/pl/nazwisko/[slug]` and `/en/surname/[slug]` and their `opengraph-image` are `force-dynamic`, with no CDN cache header, so each request runs the function, the database reads and, for the image, a 1200×630 PNG render. The sitemap lists 248,406 surname pages (`middleware.ts`).

## Changed

- `apps/web/src/lib/surname-cdn-cache.ts` (new): `SURNAME_PAGE_CDN_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400"`, `SURNAME_IMAGE_CDN_CACHE = "public, s-maxage=21600, stale-while-revalidate=86400"` and `SURNAME_CDN_CACHE_RULES`, which put `Vercel-CDN-Cache-Control` on `/pl/nazwisko/:slug`, `/en/surname/:slug` and their `:image(opengraph-image.*)`.
- `apps/web/next.config.ts`: `headers()` returns the security headers rule, then those rules.
- `apps/web/src/lib/surname-cdn-cache.test.ts` (new): the rules follow the security headers; each path's header, compiled with Next's own `buildCustomRoute`; no header on the routes below a surname, the directory, the account, the API or the sitemap.
- `apps/web/src/lib/security-headers.test.ts`: checks the first rule rather than the whole list.
- `docs/CODEMAP.md`: the new file's row.

## Verified

- `pnpm --filter web exec vitest run src/lib/surname-cdn-cache.test.ts src/lib/security-headers.test.ts`: 2 files, 8 tests passed.
- `pnpm --filter web test`: 1,387 tests passed.
- `pnpm typecheck` exit 0; `pnpm lint` exit 0; `pnpm format:check` "All matched files use Prettier code style!" (after `prettier --write` on the new test); `pnpm check:ids` "every task, ADR, migration and decision number is used once".
- `pnpm --filter web build`: exit 0. Then `next start -p 3999` with **no database** (`DATABASE_URL` unset) and `curl -D -`:
  - `/pl/nazwisko/kowalski`, `/pl/nazwisko/kowalski?view=cards`, `/en/surname/kowalski`: `200`, `Vercel-CDN-Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`, with Next's own `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` still sent;
  - `/pl/nazwisko/kowalski/opengraph-image`, `/en/surname/kowalski/opengraph-image`: `200`, `Vercel-CDN-Cache-Control: public, s-maxage=21600, stale-while-revalidate=86400`;
  - `/pl/nazwisko/kowalski/pelny-raport` (404 here), `/` (200): no `Vercel-CDN-Cache-Control`;
  - `Strict-Transport-Security` present on every response, none carried a `Set-Cookie`.
  - Without a database the surname page is the `UNAVAILABLE` answer served as a **200**: the header is on it, which shows the caveat above (a failed read is cached for up to an hour, plus a stale day). `/pl/nazwiska` answered 500 for the same reason; the change does not touch it.
- Not run: `test:integration`, `test:golden`, `test:e2e`. No query, package or page changed, only response headers.

## Not verified

- AC-4, a CDN hit on production: it needs a deployment, and the team is paused.
- That Vercel's CDN caches a Next dynamic page on a `Vercel-CDN-Cache-Control` route header despite the `Cache-Control: private, no-cache, no-store` Next sends with it. Vercel's documentation, as searched, says `Vercel-CDN-Cache-Control` is read by Vercel's CDN ahead of `Cache-Control` and that `next.config` header rules apply, but shows no example on a dynamic page.
- Whether a new deployment clears the cached copies (as for TASK-127, the documentation searched does not say). Turning `SEO_INDEXING_ENABLED` off could then leave pages with the old robots meta for up to 25 hours; `vercel cache purge --type cdn` clears them.
- How much of the team's usage this removes. The CDN answers only a repeat request for the same URL within the hour (or the stale day); a crawler reading 248,406 different pages once each still reaches the function for every one.
