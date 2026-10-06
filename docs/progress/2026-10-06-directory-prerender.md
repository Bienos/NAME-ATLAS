# 2026-10-06 — TASK-138: the build renders every directory page

Branch `claude/loving-faraday-1pyo0y`, restarted from `origin/main` at `4d3b02a` (#164, TASK-135). Task: `tasks/138-directory-prerender.md`. Requested by the owner: "warm the directory cache after each deploy". Written as TASK-136. #162 then merged as TASK-136, and #165 opened as TASK-137, so this is TASK-138, free on `main` and in the open pull requests. Rebased onto `6efc7c0` (#161) before the pull request.

## Observed before the change

- Production after #163 (11:22 UTC, recorded there): eight directory pages requested at once on a new deployment answered `200` in 36.8–54.4 s; one got no response before 30.5 s.
- Every page was rendered on its first request after each deployment: `generateStaticParams` named none (TASK-129).
- Vercel's API names the team "bienos' projects" and does not show its plan. Vercel's documentation, as searched here, did not state the cron limits, so how often a cron may run on this account was not established.
- GitHub Actions starts no jobs on this account: every `verify` today failed within 3 s with `runner_id: 0`.

## Changed

- `apps/web/src/lib/directory-page.tsx`:
  - `directoryStaticPaths()`: the root, then every letter and every page from 2, from the letter list and each letter's count.
    - It returns none when `db()` throws `MissingDatabaseUrlError`, as in CI or a local build without `DATABASE_URL`.
    - It also returns none when reading fails, and logs `directory_prerender_skipped` with the error's name.
  - `keep()`: one helper for reads kept on the instance for `KEPT_FOR_MS`, 6 hours, the pages' `revalidate`.
    - The letter list (TASK-134) now uses it.
    - So does the new `loadDirectoryCount`, keyed by letter, which `loadDirectoryLetter` and `directoryStaticPaths` read.
    - `LETTERS_TTL_MS` is now `KEPT_FOR_MS`, and `forgetDirectoryLettersForTests` is now `forgetDirectoryReadsForTests`.
- `apps/web/src/app/pl/nazwiska/[[...path]]/page.tsx`: `generateStaticParams` returns `directoryStaticPaths()`. `revalidate = 21600` and `dynamicParams = true` are unchanged.
- `apps/web/src/lib/directory-page.test.ts`: four tests:
  - one count per letter for all its pages;
  - the paths named for three letters of 1,201 surnames each;
  - none, unlogged, without a database;
  - none, logged, when reading fails.
- `docs/CODEMAP.md`: the directory row no longer says no address is rendered at build.

## Verified

- `pnpm --filter web build` without `DATABASE_URL`: exit 0 in 33 s. `/pl/nazwiska/[[...path]]` is `●`, with no path rendered.
- The same build with `DATABASE_URL` set to the synthetic register-sized database (TASK-129's; 600,044 surnames), with `SITE_ORIGIN` and `SEO_INDEXING_ENABLED=true`:
  - **Before `loadDirectoryCount`:** exit 0 in 214 s, rendering `/pl/nazwiska`, `/pl/nazwiska/a`, `/pl/nazwiska/a/2` "and 464 more paths".
  - **With it:** exit 0 in 132 s, the same 467 paths.
  - No error or timeout in either build's output.
  - This container has 4 CPUs, so Next used 3 build workers of up to 8 pages each.
- `next start` of the second build on that database:
  - **First requests after start, each a `HIT` in 9–15 ms:** `/pl/nazwiska`, `/k`, `/k/37`, `/%C5%82`, `/%C5%BC/2`, `/q`.
  - **Not built, as before:** `/k/38` answered `404` in 1.9 s; `/K` and `/k/1` answered `308` to `/pl/nazwiska/k`.
  - **The 40-page burst of TASK-132 and TASK-134, as the first requests to those pages:** 40 `200`s, the slowest in 0.26 s. TASK-134's run: slowest 17.4 s.
  - **`/k/2`:** 500 surname links, `index, follow`, canonical `https://name-atlas.pl/pl/nazwiska/k/2`.
- `apps/web/src/lib/directory-page.test.ts`: 22 of 22 passed.
- Full suite on `4d3b02a` plus this change, all exit 0:
  - `pnpm typecheck`, `pnpm lint`;
  - `pnpm test`: `apps/web` 960 tests, `packages/db` 15, `apps/admin` 14, `apps/worker` 2;
  - `pnpm test:integration` with `TEST_DATABASE_URL`: 493 tests in 43 files;
  - `pnpm test:golden`: 364 tests;
  - `pnpm build`.
- Again after the rebase onto `6efc7c0`, all exit 0. #162 brings migration 0040 and the new integration tests.
  - `pnpm typecheck`, `lint`, `format:check`, and `check:ids` ("every task, ADR, migration and decision number is used once");
  - `pnpm test`: `apps/web` 960 tests;
  - `pnpm test:integration`: 500 tests in 44 files;
  - `pnpm test:golden`: 364 tests;
  - `pnpm build` without `DATABASE_URL`: `/pl/nazwiska/[[...path]]` is `●` with no path rendered.
  - The build with the synthetic database was not repeated after the rebase. #161 and #162 touch no file of the directory.

## Not verified

- AC-4, production: it needs the deployment.
- **Build time on Vercel.** The bench build added about 99 s on 4 CPUs.
  - Production's directory queries took several times the synthetic database's (TASK-126, TASK-129).
  - Vercel's build machine was not seen.
  - So the added build time on Vercel is not known until the first deployment, and could be several minutes.
- **Database reachable from the build?** The build reads the database Vercel's Production `DATABASE_URL` names. That it reaches it from Vercel's build machines was not seen. If it does not, the build logs `directory_prerender_skipped` and renders none, as before.
- **A failure mid-build.** A page that fails while the build renders it fails that build, as any failing page does, and the deployment before it stays live. A database failure in the middle of a build therefore stops that deployment.
- `pnpm test:e2e`: not run.
