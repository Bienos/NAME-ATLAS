# TASK-128 — Smaller sitemap files, so the CDN stores them

- **Status:** IMPLEMENTED 2026-10-06 on `claude/loving-faraday-1pyo0y` (`docs/progress/2026-10-06-sitemap-smaller-files.md`).
- **Requested by:** the project owner, 2026-10-06: "yes make the smaller files and merge it", after TASK-127's post-merge check found `/sitemap.xml` cached (`HIT`, 0.24–0.55 s) but each 15.9 MB `/sitemap/{n}.xml` never cached (`MISS` every time, 5.4–7.7 s).
- **Depends on:** TASK-027, TASK-127.
- **Model guidance:** implementation session.

## 1. Goal

Each surname sitemap file is small enough for Vercel's CDN to store, so a crawler gets it from the cache instead of the database. What the sitemaps list does not change; it is split over more files.

## 2. In scope

- `packages/seo/src/sitemap.ts`: `SITEMAP_PAGE_SIZE` from 50,000 to 10,000 (about 3.2 MB a file; 4.64 MB for 10,000 of the longest accented addresses).
- The comments that named 50,000 per file; `sitemap-xml.test.ts`'s paging test and a size bound on a full file.

## 3. Out of scope

- The query, the cache header (TASK-127), the blog's sitemap.
- Compressing the files or streaming them.

## 4. Acceptance criteria

- **AC-1.** `pageCount` splits at 10,000, and a full file of long percent-encoded addresses stays under 5 MB with all 10,000 entries present (unit tests).
- **AC-2.** On production after deployment, `/sitemap.xml` names 25 surname files for the current 248,405 URLs, and a repeat fetch of a surname file is `x-vercel-cache: HIT`.

## 5. Verification

```bash
pnpm --filter web test
pnpm test:integration
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm build
```
