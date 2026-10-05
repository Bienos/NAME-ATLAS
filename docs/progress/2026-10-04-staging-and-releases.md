# 2026-10-04 — A staging site from `main`, and releases to production (ADR-0039)

The project owner: "we have a one live product and then can we create a second test environment when we're gonna be essentially like pushing all the changes and then once it's ready we can push everything at the same time to main". Offered a design, they chose `staging.name-atlas.pl` with a separate database. No task file; ADR-0039 records the decision.

## Changed

- `docs/adr/0039-staging-and-releases.md` (new): `main` stays the trunk and builds staging.name-atlas.pl; the branch `production` builds name-atlas.pl and only the Release workflow moves it; only those two branches are built; staging has its own database without readers' rows.
- `.github/workflows/release.yml` (new, `workflow_dispatch` only): fast-forwards `production` to a commit of `main` (default: its latest). It refuses a commit not on `main`, one behind what is live, a `production` that holds a commit `main` does not, a commit whose CI `verify` run is not `completed/success`, and a commit with a migration missing from production's `kysely_migration` (read as `nameatlas_web` through PgBouncer). It writes the released commits into the run summary.
- `ops/vm/staging.sh` (new): `refresh` (the role `nameatlas_staging_web` with its password from stdin, a disk check, `pg_dump --exclude-table-data='accounts.*' --exclude-table-data='family.*'` streamed into `pg_restore --no-acl` of a temporary database, then renamed) and `migrate` (the pushed commit unpacked into `/srv/name-atlas/staging-app`, `pnpm db:migrate` on the copy, grants, PgBouncer's database line with `pool_size=5 max_db_connections=10` and user list, reload, checks).
- `.github/workflows/register-vm.yml`: steps `staging` (secret `VM_DB_STAGING_WEB_PASSWORD`) and `staging-migrate`, and a last job step that connects as the staging site: read-only, a write refused, the production database refused.
- `ops/vm/provision.sh`: `pgbouncer.ini` lists `name_atlas_staging`, and the user list keeps `nameatlas_staging_web` once it has a password. `ops/vm/accounts.sh`: its user list keeps the staging role too. Without these, a later `provision` or `accounts` run would drop staging from the pooler.
- `apps/web/vercel.json`: `git.deploymentEnabled` `{"**": false, "main": true, "production": true}`.
- `AGENTS.md` §8 (a release gets no record-only change) and §11 ("Merged means staging, not live"); `ops/vm/README.md` (the `staging.sh` row, "Staging: the owner's part"); `docs/DOMAIN_SETUP.md` ("Staging and releases": the owner's steps in order); `docs/CODEMAP.md`; `STATUS.md`.

## Read before the change

- Vercel's API, 2026-10-04: project `name-atlas`, production domains as `STATUS.md` lists; `ssoProtection` `{enabled: true, deploymentType: all_except_custom_domains}`; every environment variable (`DATABASE_URL`, `SITE_ORIGIN`, the account variables) targets `production` only. The latest deployment was a preview of `claude/claimant-account-deletion`, so task branches were being built.
- `PROGRESS.md` line 4184 records the project's root directory as `apps/web`, so `apps/web/vercel.json` is the file Vercel reads.
- GitHub, open pull requests: ADR-0036 is taken by #108; no open pull request adds ADR-0039.

## Verification

- `pnpm format:check`, `pnpm lint`, `pnpm check:ids`, `pnpm check:vm` ("14 scripts parse, and 6 dumps exclude private rows"), `python3 scripts/test-backup.py`, `pnpm typecheck`, `pnpm test` (`apps/web` 830 tests in 79 files; every package passed): exit 0. `pnpm build`, the integration and golden suites were not run: no TypeScript or application code changed.
- `shellcheck` 0.11 (from `shellcheck-py`) on `staging.sh`, `provision.sh`, `accounts.sh`: no findings. `actionlint` (from `actionlint-py`) on `release.yml`: no findings. On `register-vm.yml` it reports one SC2029 note in the `archive` step, which it also reports on `main` without this change.
- **Rehearsal of `staging.sh` in this session's container** (Ubuntu 24.04, PostgreSQL 16 with PostGIS 3 and PgBouncer 1.22 from Ubuntu's archive; no systemd, so a stand-in `systemctl` answered `show` and sent PgBouncer a HUP for `reload`). `name_atlas` was built by `pnpm db:migrate` (33 migrations) with `provision.sh`'s grants and `accounts-roles.sql`, one row in `accounts.users` and one in `family.trees`, and PgBouncer configured as `provision.sh` wrote it before this change (no staging line).
  - `refresh`, first run: exit 0; the role made, the copy restored and renamed, migrations "no pending", `pgbouncer.ini` gained the staging line, the user list three roles, all 11 checks `ok`. (The first attempt stalled in `pnpm install` because this container's proxy CA file is not readable by the `nameatlas` user; with a readable copy it ran. The VM has no such proxy.)
  - Through PgBouncer with TLS: `nameatlas_staging_web` on `name_atlas_staging` gets `default_transaction_read_only=on`, `statement_timeout=30s`; `CREATE TABLE` fails "read-only transaction"; the same role on `name_atlas`, and `nameatlas_web` and `nameatlas_app` on `name_atlas_staging`, each fail "permission denied for database". `nameatlas_web` still reads `name_atlas`, which still holds its 1 user and 1 tree.
  - `migrate` with an archive carrying an extra migration `0099_rehearsal` (a table in `public`): applied on staging only (staging 34, production 33); the staging role reads the new table; PgBouncer not reloaded (nothing changed).
  - A row planted in staging's `accounts.users`, then `migrate`: exit 1, "FAIL rows in the tables of accounts and family: expected '0', got '1'".
  - `migrate` with an archive lacking `0099_rehearsal`, which staging had applied: exit 1, Kysely's "corrupted migrations: previously executed migration 0099_rehearsal is missing". `refresh` with that archive then repaired it: exit 0, 33 migrations.
  - `accounts.sh`'s changed user-list loop, run on its own against the rehearsal: the same three lines byte for byte as `staging.sh` wrote.
- **The Release workflow's scripts**, extracted from the YAML and run with GitHub's shell flags against a scratch repository (one commit per migration file of this checkout) and the rehearsal database: the first run created `production`; "already live" exited 0 with nothing to do; a commit behind `production` refused; a forward move pushed `1a013ef..890bfbe` and listed three commits; an added `0099_pending.ts` refused with its name; a `production` holding a commit `main` lacks refused; a commit off `main` refused; the input `main; rm -rf /` refused. The `jq` filter of the CI step, on sample responses: the latest of two runs, an `in_progress` run, and no run.

## Not verified

- Nothing ran on the real VM or in Vercel. The `staging` step's duration and its load on production with the real database (24 GB at the last reading in `docs/progress/2026-09-30-surname-change-over-time.md`) are unmeasured; the rehearsal database was 17 MB.
- The workflows have not run on GitHub: the Release workflow's `gh api` call, its push with `GITHUB_TOKEN`, and Vercel building a production deployment from that push.
- That `git.deploymentEnabled`'s `**` matches branch names with a slash (`claude/...`) in Vercel. Vercel documents minimatch patterns; if it does not match, task branches keep being built, which costs deployments and nothing else.
- Whether the project's Deployment Protection (`all_except_custom_domains`) covers a preview custom domain. `docs/DOMAIN_SETUP.md` step 7 checks it.
- The Google Analytics tag loads on staging after consent and counts in production's property (ADR-0039, Consequences).
