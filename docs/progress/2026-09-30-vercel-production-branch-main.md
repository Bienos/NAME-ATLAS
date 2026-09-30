# 2026-09-30 — Vercel's production branch is `main`; production redeployed from `main` @ `03d1efb`

The project owner asked in a session: "switch the production branch to main". Until then Vercel's production branch was the stale `claude/exciting-noether-05np1s`, so every merge to `main` built only a preview, and each production deployment had to be created by hand through the Vercel API (`docs/progress/2026-09-29-go-live.md`, `docs/progress/2026-09-30-landing-atlas-go-live.md`).

## Changed

- **Vercel's production branch, by the project owner in the dashboard.** Project `name-atlas`, Settings → Environments → Production → Branch Tracking: "Branch is" `claude/exciting-noether-05np1s` changed to `main`, saved. "Auto-assign Custom Production Domains" stayed enabled. The owner then clicked Redeploy.
- **Not done from the session.** The Vercel connector's `update_project` call has no field for the production branch: sending `{"link": {"productionBranch": "main"}}` was rejected with `Input validation error: … requestBody: Unrecognized key: "link"`. The environment holds no Vercel API token, so no direct API call was possible. The owner made the change by hand from the session's directions.
- **`STATUS.md`**: the "Deployed commit" and "Deploys" rows of the production table; the "Default branch" item under "Blocked on the project owner" removed; the note on deleting `claude/exciting-noether-05np1s` rewritten.
- No source file changed.

## Verified

- **Before the switch**, `list_deployments` (Vercel connector, project `prj_io95UvFcjCJfFtsyVcPZhrlkGZL1`, team `team_Qlgabc646xuDRKqUYR8d5ykj`): the push of `main` @ `03d1efb` (Merge #33) had built only `dpl_4UN2NyU9Pw1GfCjxxXNtZw3skSoN`, target `null` (a preview). Production was `dpl_EqKfZrJcfQ139NcKcL1h1Ln3Xmxm`, `main` @ `12fb474`.
- **After the switch and the redeploy**, `get_deployment dpl_HbrhnkXxmSzU7PRjzr6hZA1KLyvu` with git info: state `READY`, target `production`, `source: "redeploy"`, `githubCommitRef: main`, `githubCommitSha: 03d1efb4b7b7a7c5d3d33ec2784ace8ca15ff230`, region `fra1`, aliases `name-atlas-two.vercel.app`, `name-atlas-bienos.vercel.app`, `name-atlas-git-main-bienos.vercel.app`, `aliasError: null`. Created 15:44:44 UTC, building from 15:44:46, ready at 15:45:29. A commit of `main` that built as a preview before the switch now deploys with target production, which is what the setting controls.
- **`list_deployments` with target `production`** lists it first; `dpl_EqKfZrJcfQ139NcKcL1h1Ln3Xmxm` (`main` @ `12fb474`) is marked `isRollbackCandidate: true`.
- **`curl -sS -o /dev/null -w "%{http_code} %{size_download}" https://name-atlas-two.vercel.app/`** → `200 333682`, the same size the go-live record measured for `12fb474`. #33 is documentation only, so the page is expected to be unchanged.
- **GitHub's default branch** is already `main`: `search_repositories` (GitHub connector) for `Bienos/NAME-ATLAS` returns `default_branch: "main"`. The `STATUS.md` item asking for that was half done before this change.
- **`pnpm check:ids`** → `check-unique-ids: every task, ADR, migration and decision number is used once`, exit 0.
- `prettier --check` was not run on the two changed files: `*.md` is listed in `.prettierignore`, so the format check does not cover them.

## Not verified

- **The setting's stored value.** The connector's `get_project` does not return `link.productionBranch`, so the value `main` is known from the owner's dashboard and from the redeploy's target, not read back through the API.
- **The first automatic production deployment.** No merge to `main` has happened since the switch. The next one should deploy to production on its own; until it does, "automatic" is the setting, not an observed deployment.
- **CI has no result for this change.** On #36, the `verify` job of the CI workflow failed twice on `23a18bf` (runs 36739537077 and 36739796903), each within 3 seconds of starting, with `runner_id: 0`, no runner name, no steps and no log to download (HTTP 404). No step ran, so there is no test, lint or build result. The change is documentation only. This is the GitHub Actions outage `STATUS.md` records, now failing jobs at once instead of not starting them.
