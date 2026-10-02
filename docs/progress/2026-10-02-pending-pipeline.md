# TASK-070 — Remaining pipeline reconciled and locally verified

The owner asked to implement the remaining repository changes in the attached 2 October report and clarified that the production database is on the Oracle VM. This change keeps that connection and hosting arrangement. It applies no production migration, imports no production data, activates no accounts/tree/payment routes and dispatches no VM operation.

The review branch is `codex/remaining-pipeline`, based on refreshed `origin/main` at `35f0d13`, including merged #73's `name-atlas.pl` correction. The shared checkout acquired separate landing-reference edits and changed branches during the work. The final package was copied into `/private/tmp/name-atlas-pipeline-review`, excluding that landing's files and its CSS/documentation changes. The original checkout was left intact. The pipeline's own locality styles are included.

## What changed

- #70 / TASK-066: TERYT localities with the same official name, on the surname page and deck, contract 1.11, with the warning that a shared name establishes no surname origin. Source rights still decide each surface. Full-SIMC and screen-reader checks remain unverified.
- #67 / TASK-068: the private family schema, row-level policies, typed library and tree contract. This was renumbered from duplicate TASK-066. It remains unused by the web app. Graph edits serialize per tree, require complete living-person visibility, and share the lock with visibility revocation and membership removal. Regression tests cover concurrent cycles, a concurrent third parent, partial visibility, and revocation while an edit waits.
- #65: source-display ADR-0028 and the unresolved new-tier decision. No new prices or legal release approval are inferred.
- #44 / TASK-069: 147 page-cited, verbatim Onomastica meanings, renumbered from duplicate TASK-046. Their existing legal-review-required posture stays. The extra dataset is in `datasets/onomastics/`; synced `sources/` material is untouched. The VM extras step stages and imports this dataset alongside Buryan's file, only when explicitly run.
- #30: canonical keys computed once per input row, reused derivation/slug/parser helpers, one projection per page request and one page-view log, shared universe counts, and unused imports/dependency entries removed. The historical-edition filters and current account/share behavior stay. The proposed four-way query fanout is excluded for the production two-connection pool. Regional database/driver failures get `DATABASE_ERROR`; unrelated errors propagate after rollback. The English image route and comparison log use their English locale.
- TASK-049: fresh complete PostgreSQL dumps stream into age, including accounts/family. The private R2 objects are read back and checked before retention. A held database snapshot captures matching aggregate counts; restore tooling refuses nonempty or differently named databases and checks counts plus a validated public surname payload. Data-load dumps exclude both private schemas. The workflow passes credentials over SSH stdin. There is no private age identity on the VM.
- D-032 avoids the localities/tree D-030 collision. CODEMAP, milestone states, task headers and current status reflect the reconciled implementation and remaining operational gates. Existing branch-specific progress records are preserved as historical evidence; this file records the combined change's actual checks.

## Verification, 2026-10-02

Node 22.22.3, pnpm 10.33.0. Final checks below ran in the isolated review checkout. Database suites used the local PostgreSQL 16.4 + PostGIS test server; each file creates a disposable database. They did not run on Oracle PostgreSQL 17.

| Actual command | Observed result |
|---|---|
| `pnpm install --frozen-lockfile` | Exit 0; no dependency upgrades. Offline installation first failed because the sandbox store lacked a tarball; the normal install reused all 562 packages. |
| `pnpm typecheck` | Exit 0, including family and integration tests; repeated after the final permission fix. |
| `pnpm lint` | Exit 0; repeated after the final permission fix. |
| `pnpm format:check` | Exit 0; repeated after the final permission fix. |
| `pnpm check:ids` | Exit 0: every task, ADR, migration and decision number used once. |
| `pnpm check:vm` | Exit 0: 11 shell scripts parse and all 5 dump invocations either exclude accounts/family rows or stream directly into age. |
| `pnpm test` | Exit 0: 1,868 unit tests, including 561 web tests and 9 family rules tests. |
| `pnpm build` | Exit 0: web, admin and worker. A sandboxed attempt failed DNS for Google Fonts; the first network-enabled retry hit a transient next/font URL parse error. The exact public font responses then validated, and the unmodified build passed on retry. No font, dependency or build configuration was changed. |
| `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/name_atlas pnpm test:integration` | Exit 0: 32 files, **393 tests** after the final permission fix. A sandboxed run initially could not reach the local server; the network-enabled run passed. |
| `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/name_atlas pnpm test:golden` | Exit 0: 4 files, 364 tests. |
| `pnpm test:backup` | Exit 0: 6 tests exercise the actual shell script with mocked pg_dump/age/rclone, covering private-row inclusion, dump/upload/read-back/manifest failure and retention. These are not cryptographic or real-R2 checks. |
| `shellcheck ops/vm/*.sh scripts/check-vm-dumps.sh` | Exit 0, ShellCheck 0.11.0 from `/private/tmp/nameatlas-tools/shellcheck-v0.11.0`. |
| `actionlint .github/workflows/register-vm.yml` | Exit 0, actionlint 1.7.12 from `/private/tmp/nameatlas-tools`. |
| `DATABASE_URL=postgres://postgres:postgres@localhost:5432/name_atlas_pipeline_ci_20261002 pnpm db:migrate`, then `pnpm db:generate-types`, then `git diff --exit-code -- packages/db/src/generated` | Exit 0 on a fresh disposable database; all migrations apply, 25 public tables introspected, generated types unchanged. The scratch database was dropped. |
| `DATABASE_URL=postgres://postgres:postgres@localhost:5432/name_atlas pnpm exec tsx ops/vm/backup-check.ts snapshot`, then `verify /private/tmp/nameatlas-isolated-manifest.json` | Exit 0 through a Python-held stdin handshake; manifest describes 598,476 local surnames and its public payload/counts compare equal. A deliberately refused local connection returned 1 without exposing its fixture connection details. This is a manifest self-check, **not a restore drill**. |
| `DATABASE_URL=postgres://postgres:postgres@localhost:5432/name_atlas_pipeline_validation pnpm exec tsx /private/tmp/nameatlas-full-validation.mts` | Exit 0 on a disposable full-register clone: 147/147 imported, re-import `ALREADY_IMPORTED`, every meaning `POSSIBLE` with one verbatim interpretation and article/page citation, no duplicate active claim keys. The clone was dropped. Dataset and importer bytes are the same in the final package. |
| `git diff --check` and protected-path audit | Exit 0; no changes to `sources/`, canonical/library/archive/reference/review documents or prompts. Separate landing edits excluded. |

Shell/workflow linters were temporary tools; no dependency was added for them. Local connection URLs above contain disposable test credentials, not production credentials. Build warnings about existing middleware convention and a missing local SITE_ORIGIN were informational; the builds passed.

## Not verified or activated

- Production migration 0028, private-role grants through Oracle/PgBouncer, full-SIMC results, production extras import or a production deployment of this branch.
- A real encrypted R2 upload/read-back or PostgreSQL 17 restore drill. TASK-049 AC-2 and AC-3 remain incomplete. R2 bucket-scoped credentials, an EU bucket/lifecycle, VM age/rclone installation and the owner-held age identity must be configured; account/tree release remains gated on a real drill.
- Browser/screen-reader behavior of the added locality chapter/card. Existing account routes and sharing gates pass local tests; their production mail/domain/cron activation remains external setup.
- New payment prices, legal approval, person-search/invitation/identity-verification features or user-facing tree pages. The core stays inactive.
- Original PR closure, remote branch deletion or merge into main. #70/#67/#65/#44/#30 remain open at the GitHub read used for this record. Unique research branches remain preserved.

GitHub CI is checked on the draft PR after publication; no pre-publication local result is described as a CI result.
