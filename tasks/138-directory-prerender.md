# TASK-138 — The build renders every directory page

- **Status:** IMPLEMENTED 2026-10-06 on `claude/loving-faraday-1pyo0y` (`docs/progress/2026-10-06-directory-prerender.md`).
- **Requested by:** the project owner, 2026-10-06: "warm the directory cache after each deploy". On production a directory page rendered on its first request after a deployment took 10 to 80 s when several came at once (TASK-132, TASK-134).
- **Depends on:** TASK-129, TASK-134.
- **Model guidance:** implementation session.

## 1. Goal

A deployment goes live with every directory page already rendered and kept, so no reader or crawler waits for one after a deploy. What the pages show does not change.

## 2. Considered

- A Vercel cron: it runs on a schedule, not after a deployment, and how often this account's plan allows was not seen (the existing cron runs daily).
- A GitHub Actions job on each deployment: Actions is not starting jobs on this account. Even when it runs, a crawl of about 530 pages after every deployment would cost Actions minutes on the scale that used up the allowance.
- A warmer inside the deployed app: it needs state shared between instances and chained function calls.
- **Chosen:** the build renders them, through the route's own `generateStaticParams`.

## 3. In scope

- `apps/web/src/lib/directory-page.tsx`:
  - `directoryStaticPaths()`: the root, every letter and every page from 2, read from the database. None without `DATABASE_URL` or when reading the list fails, the second logged as `directory_prerender_skipped`.
  - `loadDirectoryCount`: a letter's count kept on the instance for 6 hours, as the letter list is (TASK-134), so the build does not count a letter once for each of its pages.
- `apps/web/src/app/pl/nazwiska/[[...path]]/page.tsx`: `generateStaticParams` returns those paths. `revalidate` (6 hours) and `dynamicParams` are unchanged.
- Unit tests.

## 4. Out of scope

- The queries, the pool, `next.config.ts`, the other routes.
- Rendering surname pages at build.

## 5. Acceptance criteria

- **AC-1.** With a database, the build renders the root, every letter and every page from 2; the first request for each is served from the cache (local build on the synthetic register-sized database, `next start`).
- **AC-2.** Without `DATABASE_URL` the build renders none and succeeds as before; a failure reading the list is logged and renders none (unit tests; local build).
- **AC-3.** A letter is counted once however many of its pages are rendered (unit test).
- **AC-4.** On production after deployment, directory pages are served from the cache on their first request, and the build's duration is recorded.

## 6. Verification

```bash
pnpm test
TEST_DATABASE_URL=… pnpm test:integration
pnpm test:golden
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm build
DATABASE_URL=… pnpm --filter web build
```
