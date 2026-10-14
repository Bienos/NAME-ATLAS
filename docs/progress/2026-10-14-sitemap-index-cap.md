# 2026-10-14 — The sitemap index names one page

Branch `claude/fervent-tesla-wtadk6`, from `origin/main` at `d133a3b`.

## Why

The Vercel team was paused for fair-use limits (Fast Origin Transfer, CPU, invocations). The sitemap index named every surname page: about 60 sitemaps of 10,000 URLs for the full register, which invites crawlers to request them all.

## Changed

- `apps/web/src/lib/sitemap-xml.ts`: `SITEMAP_INDEX_MAX_PAGES = 1` and `indexedPageCount(total)`, the lesser of `pageCount(total)` and the cap.
- `apps/web/src/app/sitemap.xml/route.ts`: the index uses `indexedPageCount` instead of `pageCount`.
- Tests: `sitemap-xml.test.ts` (`indexedPageCount`), `sitemap.xml/route.test.ts` (the index names `/sitemap/1.xml` and not `/sitemap/2.xml`).

Pages past the first still answer if requested directly. The first page is the first 10,000 surnames by `surname_id`, not the most popular ones: choosing by population needs a query change in `packages/seo/src/sitemap.ts` and a decision that ADR-0010 §3 records.

## Verified

- `npx vitest run` in `apps/web`: 119 files, 1,394 tests passed (after updating the index test).
- `pnpm typecheck`: exit 0.
- `pnpm format:check`: "All matched files use Prettier code style!"
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".

## Not verified

- `pnpm lint`: the root has no `lint` script in this repo; not run.
- Production: not deployed. Nothing merges to `main` from this session.
- ADR-0010 §3 is not updated; the contract change should be recorded there before merge.
