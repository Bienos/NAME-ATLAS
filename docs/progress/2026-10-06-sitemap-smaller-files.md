# 2026-10-06 — TASK-128: smaller sitemap files, so the CDN stores them

Branch `claude/loving-faraday-1pyo0y`, restarted from `origin/main` at `8193ca7` (#153 merged). Task: `tasks/128-sitemap-smaller-files.md`. Requested by the owner: "yes make the smaller files and merge it".

## Observed before the change

On production after #153 (09:28 UTC, recorded on #153):

- `/sitemap.xml` (533 bytes): `x-vercel-cache: MISS` in 11.4 s, then `HIT` in 0.55, 0.25 and 0.24 s.
- `/sitemap/1.xml` (50,000 URLs, 15,891,276 bytes, the same `cache-control` from the same code path): `MISS` in 5.7, 5.4 and 7.7 s; one fetch got no response through the session's proxy.

Vercel's documentation, as searched, states no size limit for its CDN cache. Size is the only difference found between the cached and the uncached response.

## Changed

- `packages/seo/src/sitemap.ts`: `SITEMAP_PAGE_SIZE` 50,000 → 10,000, with the reason. The owner had been offered 20,000 (about 6.4 MB); 10,000 was chosen to stay well under a limit that is not documented.
- Comments that said 50,000 per file: `app/sitemap/[page]/route.ts`, `app/sitemap.xml/route.ts`, `lib/sitemap-xml.ts`.
- `lib/sitemap-xml.test.ts`: paging at 10,000 (598,476 surnames would be 60 files); and a full file of 10,000 entries with the address `szczepańska-wiśniewska-żółtkowska`, percent-encoded in both locales, has all 10,000 `<url>`s and stays under 5,000,000 bytes. Computed by hand: 464 bytes an entry, 4,640,000 for the file.

## Verified

- `pnpm --filter web exec vitest run src/lib/sitemap-xml.test.ts src/app/sitemap.xml/route.test.ts "src/app/sitemap/[page]/route.test.ts"`: 3 files, 19 tests passed.
- All exit 0: `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` (`apps/web` 928, `apps/admin` 14, `apps/worker` 2), `test:integration` (479 tests in 40 files, local PostgreSQL 16 + PostGIS via `TEST_DATABASE_URL`) and `build`.

## Not verified

- AC-2 on production (25 files named, a surname file served `HIT`): it needs the deployment.
