# TASK-126 — The sitemap lists only pages that serve `index`

- **Status:** IMPLEMENTED 2026-10-05 on `claude/loving-faraday-1pyo0y` (`docs/progress/2026-10-05-sitemap-matches-page.md`).
- **Requested by:** the project owner, 2026-10-05: "fix the sitemap query", after TASK-123's go-live check found `/pl/nazwisko/didyk` listed in `/sitemap/1.xml` while serving `noindex`, and `/sitemap.xml` taking 11–14 s.
- **Specification:** `docs/canonical/21` §40–§43 (hard gates, value families, the P0 policy); TASK-027 (the sitemap and its agreement with the page).
- **Depends on:** TASK-027, TASK-123.
- **Model guidance:** implementation session.

## 1. Goal

Every URL in the surname sitemaps is a page that serves `index`, and the sitemap index answers faster. The page's policy (`assessIndexability`) does not change; the sitemap's SQL is brought into line with it.

## 2. In scope

- `packages/seo/src/sitemap.ts`: one eligibility predicate shared by `sitemapEntries` and `sitemapCount`:
  - `GEOGRAPHY` counts only for a cited `CURRENT_DISTRIBUTION` claim whose stored coverage `state` is `READY`. This is the field the page projects as `coverage_state`, and `publishableFamilies` requires it.
  - §42's two citations as the page counts them: one per cited claim (the page counts `citation_id`s and reads every section through an inner join on `citations`). The former "two distinct source records" rule was stricter than the page and was the costliest clause.
  - The SEO-surface gate: surnames with an active claim citing a profile whose own terms block SEO are read first and excluded by id. This is `seo-surface.ts`'s fold applied per profile (equivalent, because every permission column is `NOT NULL` and the fold is most-restrictive-wins).
  - The query shape is chosen by measurement on a register-sized synthetic database; `<lastmod>` is computed only for the page's own rows.
- `apps/web/src/lib/seo-surface.ts`: `seoBlockedProfileIds(db)`, the profiles whose own terms fail `evaluateSurface(…, "SEO")`; the sitemap routes pass it to the query.
- An integration test covering the cases the committed fixtures cannot produce (labelled synthetic distribution claims and a restrictive profile).

## 3. Out of scope

- `ONOMASTICS` as a family in the sitemap. A surname with counts and a meaning but no ready map can serve `index` and stays out of the sitemap. That is an omission, not a listed `noindex` page, and the meaning section's per-work rights would need duplicating in SQL.
- Any change to `assessIndexability`, the page, `robots.txt` or the blog sitemap.
- New indexes or migrations.

## 4. Acceptance criteria

- **AC-1.** A surname whose only distribution claims are `LOW_COVERAGE` or `COVERAGE_UNKNOWN`, or uncited, is not listed; one with a cited `READY` claim is, whichever source record it cites (integration test).
- **AC-2.** A surname with an active claim citing an SEO-blocked profile is not listed (integration test).
- **AC-3.** `sitemapCount` equals the number of entries `sitemapEntries` returns (integration test).
- **AC-4.** TASK-027's agreement tests still pass.
- **AC-5.** On a synthetic database of the register's size, the count and a sitemap page are faster than the current query (measured, recorded).
- **AC-6.** On production after deployment, `/pl/nazwisko/didyk` is absent from the sitemaps, sampled sitemap URLs serve `index`, and `/sitemap.xml`'s time is recorded against the 10.9–14.4 s baseline.

## 5. Verification

```bash
pnpm --filter @name-atlas/seo test
pnpm --filter web test
pnpm test:integration
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm build
```
