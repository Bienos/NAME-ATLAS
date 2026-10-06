# 2026-10-05 — CI: cancel superseded pull-request runs, and a 30-minute timeout

Branch `claude/pensive-galileo-l71rgm`, on `origin/main` @ `4aa1c04` (#149, TASK-124). Asked by the owner in a session ("can we make ci use less minutes"); there is no task file. No migration, no ADR, no application code.

## Why

GitHub stopped starting jobs on this account on 2026-10-04 (annotation on every failed job: "recent account payments have failed or your spending limit needs to be increased"). The repository is private, so CI draws on the account's monthly Actions allowance. The Actions API for this repository gives job start and end times for 685 jobs between 2026-09-01 and 2026-10-04. Each job is rounded up to whole minutes, which is how GitHub bills. Billing pages were not readable from the session (403 outside `repos/Bienos/NAME-ATLAS/`), so the account's plan and balance were not seen.

## Observed

- September: 1,878 minutes. 1–4 October: 2,018 minutes. Of those 2,018: CI on pull requests 1,507, CI on pushes to `main` 477, Register VM 34.
- A CI `verify` job: median 6.8 minutes, p90 9.9, longest 11.5 (531 jobs over 60 seconds). Integration tests are 44.7% of step time, Build 14.5%, Typecheck 12.5%, container start 7.7%, unit tests 7.2%.
- 28 pull-request runs were still running when the next push to the same branch started their replacement. Overlap between the two is about 125 of 1,780 pull-request minutes in the window.
- Commits that touched only `docs/progress/`, `tasks/`, `STATUS.md`, `docs/CODEMAP.md`, `docs/DECISIONS_NEEDED.md` or `docs/SEO_CONTENT_PLAN.md`: 8 of 155 October pull-request runs, 73 of 1,505 minutes. Commits that touched only Markdown under `docs/` or `tasks/`: 17 runs, 162 minutes.
- None of the 531 measured jobs ran the Playwright steps. `ci.yml` gained them on 2026-10-05 09:11 (#117, TASK-103), after the last run that started.

## Changed

- `.github/workflows/ci.yml`: a `concurrency` group, `ci-<pull request number>` for a pull request and `ci-<commit sha>` for a push, with `cancel-in-progress` true only for a pull request. A push to `main` has its own group, so none is cancelled, and Release still finds `verify` on that very commit.
- `.github/workflows/ci.yml`: `timeout-minutes: 30` on `verify`. There was none, so a hung job ran to GitHub's default of 360 minutes.

## Verified

- `yaml.safe_load` on the file: parses; `concurrency` and `timeout-minutes` read back as above.
- `pnpm exec prettier --check .github/workflows/ci.yml`: "All matched files use Prettier code style!".

## Not verified

- Not run: GitHub Actions, which is not starting jobs on this account. That a newer push cancels the older pull-request run, and that a push to `main` is not cancelled, are expected from GitHub's documented behaviour and were not observed. `actionlint` is not installed here.
- The 30-minute limit is about 2.6 times the longest run measured. How long the Playwright steps take on the runner was not measured.

## Not done

- Docs-only commits still run the full job. They are 5% of pull-request minutes by the narrow list above, and a path filter on `push` would leave Release without a `verify` on a docs-only commit of `main`.
- CI still runs the integration tests on Testcontainers while the job also starts a `postgres` service container of the same image. `TEST_DATABASE_URL` (`packages/testing/src/postgres-container.ts`) lets the suite use an existing server instead; a session ran it that way against a local PostgreSQL 16 (`2026-10-05-tree-paid-tier.md`). What it would save on the runner was not measured. The comment on `TEST_DATABASE_URL` says CI leaves it unset on purpose, so changing that is left to the owner.

## Landed

On 2026-10-06, commit `baec1fe` from `claude/pensive-galileo-l71rgm` was cherry-picked onto `claude/relaxed-dirac-cbere4`, on `origin/main` @ `b7168fb` (#154, TASK-128). `ci.yml` applied cleanly. In `STATUS.md` only "Last rewritten" conflicted; it now names this change. The Actions bullet now names the latest failed runs it was checked against (CI on `main` @ `b7168fb`, created 09:37 UTC on 2026-10-06; Register VM on `main`, created 16:34 UTC on 2026-10-05), and its merged-without-CI range is now #143–#149 and #152–#154. Checks on the landed tree: `yaml.safe_load` reads back the `concurrency` group and `timeout-minutes: 30`; `pnpm exec prettier --check .github/workflows/ci.yml STATUS.md docs/progress/2026-10-05-ci-fewer-minutes.md` passes; `pnpm check:ids` passes. `actionlint` is not installed here. GitHub Actions still starts no jobs, so this change's own effect (cancelling a superseded run) has not been observed.

On 2026-10-06 after #156 (TASK-129) merged, `origin/main` @ `0940c08` was merged into this branch. Only "Last rewritten" conflicted in `STATUS.md`; it still names this change. The Actions bullet now ends its check at CI on `main` @ `0940c08` (#156, created 10:16 UTC, failed within seconds) and its merged-without-CI range is #143–#149, #152–#154 and #156. The checks above were run again on the merged tree with the same results.
