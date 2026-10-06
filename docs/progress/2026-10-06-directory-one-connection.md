# 2026-10-06 — TASK-130: the directory's `inne` page answers 500 on production

Branch `claude/loving-faraday-1pyo0y`, restarted from `origin/main` at `0940c08` (#156, TASK-129, merged). Task: `tasks/130-directory-one-connection.md`. The number is free on `main` and in the open pull requests (#150 and #151 hold 125; #155 has none).

## Observed before the change

On production, `dpl_8AukX7L9hvxyTtQ9b7BFmuxFvdcB` (#156), 10:18–10:24 UTC (recorded on #156):

- `/pl/nazwiska/inne` answered `500` on two of two fetches, 7.7 s each. The directory's root links to it.
- Every other page fetched answered `200` in 10.0–11.5 s on a first fetch: `/k`, `/k/2`, `/k/56`, `/s`, `/%C5%82`, `/%C5%BC`, `/q`.
- The runtime log: `Error: timeout exceeded when trying to connect` from `acquireConnection`, in `app/pl/nazwiska/[[...path]]/page.js`.

Cause:

- `loadDirectoryLetter` started three queries at once: the letter list, the count and the entries.
- The pool holds two connections per instance and waits at most 5 s for one (`lib/db.ts`), so the third query waited for one of the other two.
- `inne`'s count reads every listed surname. On production it and the letter list both outlasted the 5 s wait, so the third query gave up.

Locally this did not show: on the synthetic database every query took under 2 s, and no surname there falls under `inne`.

## Changed

- `apps/web/src/lib/directory-page.tsx`: `loadDirectoryLetter` awaits the letter list, the count and the entries one after another, so a render holds one connection at a time. A page whose offset is past the count reads no entries; its result is empty and the page is a 404, as before.
- `apps/web/src/lib/directory-page.test.ts`:
  - a test that counts the directory queries in flight and expects at most one;
  - a test that a page past the last reads no entries;
  - the past-the-last metadata test no longer mocks an empty entries result.

## Verified

- Against #156's `directory-page.tsx`, the changed test file failed 3 of 14 (the one-at-a-time test, the past-the-last test and the metadata test); with the change, 14 of 14 passed.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (`apps/web` 943 tests in 91 files) and `pnpm build`: all exit 0.
- `next start` against the synthetic register-sized database (TASK-129's), with `SITE_ORIGIN` and `SEO_INDEXING_ENABLED=true`:
  - Every request first answered `500` with `ECONNREFUSED`: the local PostgreSQL had stopped. It was restarted, and the requests repeated.
  - `/pl/nazwiska/k`: `200` in 64.2 s, the first query after the restart, with the database's cache cold. Then `HIT` in 0.011 s.
  - `/k/37`: `200` in 2.46 s, 452 links.
  - `/k/38`: `404` in 2.04 s.
  - `/inne`: `404` in 2.20 s; that database has no `inne` surname.
  - With the three queries at once, TASK-129 measured 2.2–2.5 s for the same kind of page on this database.
- `pnpm format:check`: "All matched files use Prettier code style!". `pnpm check:ids`: "every task, ADR, migration and decision number is used once".

## Not verified

- AC-3, production: it needs the deployment. With the queries in sequence, a first render there may take longer than the 10.0–11.5 s measured with them at once.
- Renders on one instance still share its two connections. A third directory render at once would wait for one, and could fail the same way after 5 s. The pool's size and timeout are TASK-029's and were not changed.
- `pnpm test:integration`, `test:golden`, `test:e2e`: not run. No query or package changed.
