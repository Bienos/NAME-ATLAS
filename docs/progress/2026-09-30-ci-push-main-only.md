# 2026-09-30 — CI runs on a push to `main` only

No task file. The project owner asked for it after GitHub Actions stopped starting jobs.

## Changed

- **`.github/workflows/ci.yml`**: `on.push` is limited to `branches: [main]`. `pull_request` is unchanged.
  - Before: every push to any branch ran CI, and so did every pull request. A push to a branch with an open pull request therefore ran the same checks twice.
  - The run history bears this out: 289 of CI's 333 runs from 2026-09-18 to 2026-09-30 were `push` events, and 44 were `pull_request`.
  - After: a branch is verified through its pull request, which runs on the merge with `main`, where `pnpm check:ids` has to run anyway. `main` is still verified on every push, merges included.
- **What is lost:** a branch with no pull request gets no CI. That is deliberate. Opening a pull request, or pushing to `main`, runs it.
- **`STATUS.md`**:
  - a "Blocked on the project owner" entry for the Actions outage;
  - the open pull request line;
  - the note on this branch;
  - the "Last rewritten" line.

## Why

- Since 05:53 UTC on 2026-09-30 no Actions job has been given a runner, on any branch, `main` included.
- This repository used about 1,780 billable minutes between 2026-09-18 and 2026-09-30. The total was estimated from all 350 runs of its three workflows: each run's duration, rounded up to the minute for runs of 10 s or more. CI accounts for about 1,719 of them.
- Whether the 2,000-minute GitHub Free allowance for private repositories is the cause is not confirmed. That can only be seen in the account's billing settings.
- Halving CI's push runs is the one cost cut this repository controls.

## Verified

- **The YAML, parsed with PyYAML and compared with `origin/main`'s:**
  - `on` is `{'push': {'branches': ['main']}, 'pull_request': None}`, where it was `{'push': None, 'pull_request': None}`;
  - `jobs` and `env` are identical.
- `pnpm install --frozen-lockfile`: done; the lockfile is unchanged.
- `pnpm format:check`: passed ("All matched files use Prettier code style!"). It covers `ci.yml`.
- `pnpm check:ids`: passed ("every task, ADR, migration and decision number is used once").
- `pnpm lint`: passed, exit 0, no findings.

## Not verified

- The workflow was not executed. GitHub Actions starts no jobs at present (above), so this change's own CI cannot run either.
- Once Actions runs again, check two things: a push to a non-`main` branch starts no CI run, and the pull request's run still does.
