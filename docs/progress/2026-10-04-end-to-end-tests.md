# 2026-10-04 — TASK-103: end-to-end tests of the reader's journey, in CI

Scope authority: `tasks/103-end-to-end-tests.md`.

## What changed

- `tests/e2e/` (new workspace package `@name-atlas/e2e-tests`):
  - `seed.sh` migrates, imports the four committed PESEL fixtures with their own checksums, backfills page addresses, runs `truth:derive-batch --all`, and runs `seed-bearers.ts`, which stores NOWAK's well-known bearers from the pinned ZAREMBA Wikidata answer with the names rewritten, through the real connector and derivation, with no network.
  - `playwright.config.ts` starts `next start` on the production build. It runs two projects, desktop at 1440 × 900 and Pixel 7. `PLAYWRIGHT_CHROMIUM` can point at an installed Chromium.
  - `specs/journey.spec.ts` has five tests: search to deck, the surname page with its count and bearers and no sideways scroll, the deck by key and by next-card button to the bearers' card and closed, the summary share card as a PNG, and a surname not in the register.
- New dependency: `@playwright/test` 1.56.1, the browser test runner, pinned to the Chromium build 1194 installed in Claude Code web sessions. Next.js already lists it as an optional peer.
- `package.json`: `e2e:seed`, `test:e2e`. `.github/workflows/ci.yml`: after Build, seed the database, install Chromium with its system dependencies, run the tests, and upload `tests/e2e/test-results/` when a run fails. `.gitignore`: Playwright's output.
- `docs/CODEMAP.md`: the package.

## Verification (run 2026-10-04, on `main` @ `85312b9`)

- `DATABASE_URL=…/e2e bash tests/e2e/seed.sh` against local PostgreSQL 16 with PostGIS 3: exit 0 in 12.7 s. It left 45 active `CURRENT_POPULATION` claims and one `NOTABLE_BEARERS`, for NOWAK with 59 people. A second run printed "ALREADY IMPORTED" for every file and left the same counts.
- `pnpm --filter web build`: exit 0.
- `PLAYWRIGHT_CHROMIUM=/opt/pw-browsers/chromium pnpm test:e2e`: 10 passed (5 tests × 2 projects) in 10 s. The first run failed one phone test: the deck's list of cards is hidden on a phone. That test now uses the cards and the next-card button.
- With NOWAK's bearers claim set to `SUPERSEDED`: 4 failed, the bearers' page and deck tests at both sizes, and 6 passed. Restored: 10 passed.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm check:vm`: each exit 0. The CI file parses as YAML.

## Not verified

- The CI steps themselves (`playwright install --with-deps chromium` on the runner) until the pull request runs.
