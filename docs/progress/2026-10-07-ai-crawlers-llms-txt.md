# 2026-10-07 — TASK-175: AI crawlers in `robots.txt`, and `/llms.txt`

## What changed

- `apps/web/src/app/robots.txt/route.ts`:
  - New `aiSearchAgents` and `aiTrainingAgents`, and the `*` rules factored into `searchRules`.
  - With indexing enabled, the answer engines get a group of their own carrying `searchRules`.
  - In both postures, the training crawlers get a group with `Disallow: /`.
- `apps/web/src/lib/llms-txt.ts` and `apps/web/src/app/llms.txt/route.ts`: `/llms.txt`.
  - It is a 404 unless `SEO_INDEXING_ENABLED` is `true` and `SITE_ORIGIN` is set.
  - Otherwise it is `text/plain` Markdown: the product in PRODUCT.md §1/§3's words, the directory, the surname page patterns, How it works, the blog indexes and posts by language, and the sitemap. It states no figures.
- `apps/web/src/middleware.ts`: `llms.txt` is excluded from the rate limiter, as `robots.txt` is.
- `apps/web/next.config.ts`: the blog files are traced for `/llms.txt`.
- Tests:
  - `robots.txt/route.test.ts`: four new tests. The existing three are unchanged and pass.
  - `llms.txt/route.test.ts`: new.
- `tasks/175-ai-crawlers-llms-txt.md`, `docs/adr/0050-ai-crawlers.md`, `docs/CODEMAP.md`, `STATUS.md`.

## Verification (run in this session, on `978b7ee` plus this change)

- `pnpm format:check`, `pnpm check:ids`, `pnpm lint`, `pnpm typecheck`: exit 0.
- `pnpm test`: exit 0, every package passed; `apps/web` 114 files, 1334 tests.
- `pnpm exec vitest run src/app/robots.txt src/app/llms.txt` (in `apps/web`): 2 files, 11 tests passed.
- Both routes' `GET` were run through `tsx` with `SITE_ORIGIN=https://name-atlas.pl`:
  - With `SEO_INDEXING_ENABLED` unset: `robots.txt` has the preview group, then `User-agent: *` / `Disallow: /`, then the seven training crawlers with `Disallow: /`. `/llms.txt` returns 404.
  - With `SEO_INDEXING_ENABLED=true`: `robots.txt` has the `*` group and the sitemap, then the six answer engines with the same six rules, then the training group. `/llms.txt` returns 200 and lists 12 Polish and 12 English posts.

## Not verified

- `pnpm build`, the integration, golden and e2e suites, and the routes behind a running Next server. The routes were called directly.
- The routes on staging or production.
- That each vendor honours its agent name as documented.
