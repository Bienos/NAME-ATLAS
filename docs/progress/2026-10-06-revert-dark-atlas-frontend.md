# 2026-10-06 — Revert TASK-149, the Dark Atlas frontend migration

## What changed

- `git revert` of `39267c1` (#178, TASK-149): the public pages go back to the TASK-065 dusk look. The header and footer wordmark, the landing hero with its scenic image, the favicon, the share and OG card colours and the shared shell are as on `3d12f1a` (#177).
- `apps/web/src/design-system/public-dark-atlas.css` and the inline `EvolvedContourMark` are removed with it. The TASK-148 brand system (#177) stays.
- `tasks/149-dark-atlas-frontend.md` is kept, with its Status set to REVERTED, so the number stays used.
- `STATUS.md`: "Last rewritten" and one sentence in the Brand System bullet.

## Why

#178 merged at 21:30 UTC. The owner stopped its production deployment while it was building and asked for the change to be reverted. Production kept serving `3d12f1a` (#177) throughout: Vercel listed the #178 deployment as BUILDING, never READY.

## Verification

Commands run on this branch, with their results, are in the pull request description.

## Not verified

- Nothing was deployed from this branch. Vercel builds it when it merges into `main`.
