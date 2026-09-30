# 2026-09-30 — Repository clean-up: STATUS on one page, two process rules, CI on a push to `main` only

No task file. The project owner asked for the clean-up proposed earlier in the same session ("ok do the cleanup you suggested").

## Changed

- **`.github/workflows/ci.yml`**: `on.push` is limited to `branches: [main]`. `pull_request` is unchanged. This is #31's change, carried here because #31's own `STATUS.md` edits are stale: they list #34 and #35 as open. Before, a push to a branch with an open pull request ran the same job twice.
- **`AGENTS.md`**:
  - §8 step 4: "Last rewritten" names the latest change only.
  - §8 step 5, new: no commit, pull request or progress file whose only content is a merge, a deploy or a go-live check. What was checked goes in a comment on the merged pull request. The old step 5 is now step 6.
  - §11, new first rule: one session commits toward `main` at a time.
- **`STATUS.md`**: rewritten from 11,447 bytes to about 6,600. The "Last rewritten" chain, the stale open pull request list and the stale branch lists are gone. The branch lists were rebuilt from the remote (below). The stale sentence that the atlas's named surnames could become links later is gone: TASK-044 made them links.

## Verified

| Command | Result |
|---|---|
| `git ls-remote --heads origin` | 41 branches |
| `git merge-base --is-ancestor <branch> origin/main`, per branch | `main` plus 40: 17 merged into `main`, 23 not |
| `pnpm typecheck`, on `origin/main` @ `61ffc49` before any edit | exit 0 |
| `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, on `61ffc49` | exit 0 each |
| `pnpm test`, on `61ffc49` | exit 0; 1,454 tests in 13 packages, none failed |
| `pnpm format:check`, `pnpm lint`, `pnpm check:ids`, after the edits | exit 0 each; `format:check` covers `ci.yml`, and Markdown is excluded by `.prettierignore` |
| `pnpm build`, on `61ffc49` | exit 0 |
| `ci.yml` parsed with PyYAML and compared with `origin/main`'s | `on` is `{'push': {'branches': ['main']}, 'pull_request': None}`, was `{'push': None, 'pull_request': None}`; `jobs` and `env` identical |
| `curl https://name-atlas-two.vercel.app/` | 200; the page contains "Zmiany w czasie" (TASK-044's Plate VII) |
| `curl` of the surname-results API for ADAMCZYK | `RESOLVED`, population 22,435 on the men's list |
| GitHub Actions, CI run #400 on `main` | job started 19:24:42 UTC, failed 19:24:45 UTC |

`pnpm test` and `pnpm build` were not re-run after the edits: they touch no TypeScript.

## Not done

- **Deleting remote branches.** The session's permission system refused `git push origin --delete` for one merged branch. `STATUS.md` lists every branch for the project owner.
- **Removing `docs/archive/`, `docs/library/`, `docs/sources/acquisition/` and `PROGRESS.md` from the working tree.** The permission system refused the steps toward it, so nothing was removed or moved. Two findings apply whoever does it:
  - `docs/library/` is binding design input in `docs/SOURCE_MAP.md`, and `packages/sources/src/catalogue/catalogue.test.ts` reads two of its files.
  - Seventeen integration test files read `docs/sources/acquisition/2026-09-18/metadata/`.
- **Merging #31.** Its change is carried here instead (above).
- **GitHub Actions.** Why no job starts is not established. Only the account's billing settings show it.

## Not verified

- The CI workflow was not executed, because Actions starts no job. Once it does, check that a push to a branch other than `main` starts no run and that a pull request's run still does.
