# 2026-10-05 — TASK-126: the sitemap lists only pages that serve `index`

Branch `claude/loving-faraday-1pyo0y`, restarted from `origin/main` at `93db9a1` (#148 merged), rebased onto `4aa1c04` (#149) before the pull request; numbered TASK-126 because `main` gave 124 to the full-name report and #150 holds 125. Task: `tasks/126-sitemap-matches-page.md`. Requested by the owner: "fix the sitemap query".

## Observed before the change

On production (`name-atlas.pl`, 16:23–16:40 UTC, after `SEO_INDEXING_ENABLED=true` was set; TASK-123's merged PR records the go-live check):

- `/pl/nazwisko/didyk` is listed in `/sitemap/1.xml` and serves `noindex, follow`. `/api/v1/surname-results?surname=DIDYK`: population `READY`, distribution `READY` with entries `LOW_COVERAGE`, `LOW_COVERAGE`; meaning `NO_SOURCED_MEANING`. So the page has one value family (§43).
- `/sitemap.xml`: 14.4 s, then 10.9 s and 11.3 s. `/sitemap/6.xml`: 12.6 s.

Cause: `sitemapEntries`/`sitemapCount` counted any `CURRENT_DISTRIBUTION` claim as the `GEOGRAPHY` family, while `publishableFamilies` needs an entry with `coverage_state = READY`. `tests/integration/src/sitemap-policy.test.ts` could not see it: the committed regional fixtures are excerpts, so no distribution claim is ever derived there and both sides were empty.

## Changed

- `packages/seo/src/sitemap.ts`: one predicate, shared by the entries and the count:
  - a cited `CURRENT_DISTRIBUTION` claim with `structured_value->>'state' = 'READY'`, the field `query.ts` projects as `coverage_state`;
  - a cited `CURRENT_POPULATION` claim;
  - §42's two citations as the page counts them: one `citation_id` per claim, every section read through an inner join on `citations` (`read.ts`). The former "two distinct source records" rule was stricter than the page and was the costliest clause;
  - the SEO-surface gate: surnames with an active claim citing a blocked profile are read first (`seoBlockedSurnameIds`) and excluded by id;
  - `<lastmod>` computed only for the page's own rows.
- `apps/web/src/lib/seo-surface.ts`: `seoBlockedProfileIds(db)`, the profiles whose own terms fail `evaluateSurface(…, "SEO")`. Because every permission column of `rights_profiles` is `NOT NULL` and the fold is most-restrictive-wins, this is equivalent to `seoGatesFor`'s fold.
- `app/sitemap.xml/route.ts` and `app/sitemap/[page]/route.ts` pass it; the index route's comment no longer says the sitemap is empty.
- `tests/integration/src/sitemap-query.test.ts` (new): real PESEL surnames and population claims, with labelled synthetic distribution claims (`READY`, `LOW_COVERAGE`, `COVERAGE_UNKNOWN`, uncited, same source record) and a copy of the PESEL profile with `commercial_use = UNKNOWN`. `sitemap-policy.test.ts` passes the new option.
- `ONOMASTICS` stays out of the sitemap: a surname with counts and a meaning but no ready map serves `index` and is not listed (TASK-126 §3).

## Verified

- New test against the new query: 4 of 4 passed. The same file against `origin/main`'s `sitemap.ts`: 4 of 4 failed. Two runs: once on the first draft (3 of 4 failed), once on the final file (4 of 4 failed).
- Query shape, by measurement on a synthetic database in the session container. It was built from `tests/e2e/seed.sh`'s rows as templates plus 600,000 generated surnames: 600,044 surnames, 3,498,170 claims (`CURRENT_POPULATION` 827,959, `CURRENT_RANK` 827,959, `RARITY_CONTEXT` 827,959, `SURNAME_DISTRIBUTION_SHIFT` 600,000, `CURRENT_DISTRIBUTION` 414,247 with 310,267 `READY`), one citation each, and a blocked profile on 2,000 citations. `psql`, warm cache, median of three:
  - former query: count 4.5–4.9 s, page 5 (offset 200,000) 4.8–5.1 s, 300,147 surnames, of which 75,194 have no `READY` distribution;
  - drafts rejected: an `EXISTS` pair over population and distribution citations (5.3 s; 7.8–8.6 s with a `NOT EXISTS` rights gate), a single-pass aggregate (3.7–3.9 s), a materialized CTE (count 22 s), `INTERSECT`/`EXCEPT` (4.9–5.9 s), and a `NOT IN` subquery gate (6.2–6.5 s);
  - chosen: count 2.5 s and page 5 2.9 s, with or without the 2,000 blocked surnames; the blocked-surname lookup 0.2 s; 224,953 surnames listed (224,192 with the gate).
  - The functions themselves (`sitemapCount`, `sitemapEntries` through `tsx`, bound parameters): count 2.92 s and 2.70 s; page 1 3.61 s and 3.58 s; page 5 3.24 s twice; `seoBlockedProfileIds` 0.05 s.
- `pnpm typecheck` exit 0 (after typing the test's role map as `string | undefined`; the first run failed on it). `pnpm lint` exit 0. `pnpm format:check`: "All matched files use Prettier code style!". `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm test`: exit 0; `apps/web` 917 tests in 88 files, `apps/admin` 14 in 2.
- `pnpm test:integration` with `TEST_DATABASE_URL` (local PostgreSQL 16 + PostGIS): 473 tests in 39 files passed. `pnpm test:golden`: 364 in 4 passed.
- `pnpm build`: exit 0.
- After the rebase onto `4aa1c04`, all exit 0: `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` (`apps/web` 922, `apps/admin` 14, `apps/worker` 2), `db:migrate` on a fresh database with `db:generate-types` leaving no diff, `test:integration` (479 in 40 files), `test:golden` (364) and `build`.

## Not verified

- Production timing and the absence of DIDYK and other `LOW_COVERAGE` surnames: they need this change deployed (AC-6).
- The synthetic benchmark's absolute times: the VM's hardware, cache and data differ. Only the comparison between queries on the same database is evidence.
- Whether any production claim cites an SEO-blocked profile: the database was not queried.
- `pnpm test:e2e`: not run; no page or route output changed beyond the sitemap's list.
