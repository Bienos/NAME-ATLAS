# TASK-070 — Reconcile and verify the remaining repository pipeline

- **Status:** implementation and local verification completed 2026-10-02; deployment and external setup remain pending.
- **Scope authority:** the owner's request to implement remaining changes from the attached 2 October status report. This explicitly spans the existing pending tasks.
- **Base:** origin/main `35f0d13`, including the merged primary-domain correction #73.

## In scope

Combine #70's localities/contract 1.11 (TASK-066, now TASK-082), #67's private tree core (renumbered TASK-068 here; #67 itself merged first, on 2026-10-03, as TASK-066, so the core is TASK-066 and this branch's copy of the task file was dropped), #65's source-display ADR, #44's 147 Onomastica entries (renumbered TASK-069), and the safe #30 cleanup on current code. Reconcile D-032 with the tree's D-030, preserve the owner-selected domain, and implement TASK-049 tooling. Preserve synced reference files under sources: the additional article lives in `datasets/onomastics/`.

Correct the cleanup's actual review issues: keep the truth reads sequential for the two-connection production pool, retain earlier-edition filtering, and return DATABASE_ERROR only for database/driver failures. Check concurrency and graph visibility in the inactive tree service. Keep all user-facing account, payment and privacy release gates.

## Out of scope

Merging or deploying, activating accounts/payments/the tree, deleting remote branches, modifying synced source material, choosing new prices, obtaining credentials or declaring a production restore drill completed. Unique research/design branches remain preserved.

## Acceptance and verification

`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm check:vm`, `pnpm test`, `pnpm build`, `pnpm test:integration`, `pnpm test:golden`, `pnpm test:backup`, `shellcheck ops/vm/*.sh`, and `actionlint .github/workflows/register-vm.yml` must pass. Exact commands and results belong in `docs/progress/2026-10-02-pending-pipeline.md`.

Production R2 verification, PostgreSQL 17 restore, full-SIMC lookup and Oracle role/migration checks must be named as unverified until run against those services.
