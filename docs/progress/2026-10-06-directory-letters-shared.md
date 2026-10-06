# 2026-10-06 — TASK-134: the directory's letter list, read once per instance

Branch `claude/loving-faraday-1pyo0y`, restarted from `origin/main` at `5103371` (#160, TASK-132, merged), rebased onto `fb83fbf` (#159, TASK-133) before the pull request; #159 changes only the Register VM workflow, `ops/vm/`, its records and `docs/CODEMAP.md`, none of them files this change touches. Task: `tasks/134-directory-letters-shared.md`. Requested by the owner: "yes cache the letter list". Numbered TASK-134 because `main` holds up to 132 and #159 holds 133.

## Observed before the change

- On production, `dpl_C3wLe9mzmQTMdJGnnApAy5JKLvDY` (#160), 11:03 UTC: eight directory pages, none cached, requested at once (recorded on #160).
  - Seven answered `200` in 35.4–79.4 s.
  - `/pl/nazwiska/%C5%BC` answered `500` in 37.1 s: `CheckoutWaitTimeoutError`, a query that waited 30 s for a connection.
- Every render asked for the letter list (`directoryLetters`: an existence check for each letter, then one for `inne`), and on the synthetic database that is its slowest query, 1.6–1.9 s (TASK-129's benchmark).
- `loadDirectoryLetters` was wrapped in React's `cache`, which keeps a value for one render only.

## Changed

- `apps/web/src/lib/directory-page.tsx`: `loadDirectoryLetters(now = Date.now())` keeps the promise of its read on the instance for `LETTERS_TTL_MS` = 21,600,000 ms (6 hours, the pages' `revalidate`).
  - Renders that start together share the one query.
  - A rejected read is dropped, so the next render asks again.
  - `forgetDirectoryLettersForTests` empties it.
  - `loadDirectoryLetter` and the root's metadata and page call it as before.
- `apps/web/src/lib/directory-page.test.ts`:
  - four tests: one read shared by renders together and in turn; a new read after 6 hours; a failed read not kept; three pages served by one read;
  - every test starts from an empty list, and the root's empty-directory test empties it before its own read.

## Verified

- Against #160's `directory-page.tsx` with only `LETTERS_TTL_MS` and an empty `forgetDirectoryLettersForTests` added, 3 of the 18 tests failed: the sharing, the 6-hour and the three-pages tests. The failed-read test passes there too, since nothing was kept. With the change, 18 of 18 passed.
- `next start` of this branch's build, on the synthetic register-sized database (TASK-129's), with `SITE_ORIGIN` and `SEO_INDEXING_ENABLED=true`, the same 40 directory pages at once as in TASK-132's record:
  - 40 answered `200`, the slowest in 17.4 s and on average in 13.9 s. TASK-132's run of the same burst: 40 `200`s, slowest 45.4 s, average 40.6 s.
  - No error in the server's log.
  - Both runs were on the same database after earlier requests, but not on the same minute's cache state, so the comparison is indicative.
- After the burst, `/pl/nazwiska/l/2`, `/pl/nazwiska` and `/pl/nazwiska/q` each drew the 32 letters A–Ż. The first and last also drew 500 surname links each.
- Full suite, all exit 0:
  - `pnpm typecheck` and `pnpm lint`;
  - `pnpm test`: `apps/web` 956 tests, `packages/db` 15, `apps/admin` 14, `apps/worker` 2;
  - `pnpm test:integration` with `TEST_DATABASE_URL` (local PostgreSQL 16 + PostGIS): 493 tests in 43 files;
  - `pnpm test:golden`: 364 tests;
  - `pnpm build`.
- `pnpm format:check` ("All matched files use Prettier code style!") and `pnpm check:ids` ("every task, ADR, migration and decision number is used once"): exit 0.

## Not verified

- AC-4, production: it needs the deployment.
- Each instance reads the letters once in 6 hours; a new instance and a new deployment read them again. Nothing is shared between instances.
- A change to which letters list a surname shows on a page within 6 hours of the instance's read, as the pages themselves are kept.
- `pnpm test:e2e`: not run.
