# 2026-10-01 — TASK-063: accounts on the VM

Branch `claude/friendly-brown-6n5iwu`, built on `main` @ `0a1e869` (#66). Task file: `tasks/063-accounts-vm.md`. Decision: `docs/adr/0027-free-accounts.md` §5.2, amended here.

## Why

The project owner said "go" on the plan that names this as the step after TASK-062. The accounts pages are live but off, and the production database has neither the schema nor the role they need. **This change builds, rehearses and documents the step that provides them. It does not run it on the VM**: that needs the owner's secret (`VM_DB_APP_PASSWORD`) and a go.

## What changed

- **`ops/vm/accounts.sh`** (new), one repeatable Register VM step. It unpacks the pushed commit and runs `pnpm install`; runs `pnpm db:migrate` as the build user; runs the staged `accounts-roles.sql` as the superuser; sets `nameatlas_app`'s password from stdin only when it does not already work (so a re-run keeps its SCRAM salt); writes PgBouncer's user list for the web role and that role and reloads PgBouncer only if the file changed; and checks, by the catalog and then by connecting as the role through the pooler with TLS and SCRAM, that the role writes `accounts` and nothing else, the web role reads nothing of it, nothing crosses between the schemas, and neither can create anything. It refuses while the register build, the archive load or the change-over-time batch is running, and on a database that was not built or a VM without PgBouncer. It prints no secret.
- **The first run applies two migrations, not one.** `0026` (one index on the register's claims; the page works without it, only slower) was never applied in production either: a Vercel deploy runs no migration, and no `shift` or `archive` step has run since it was written.
- **`ops/vm/provision.sh`**: the user list takes a line for each of the two roles that has a SCRAM secret, so running provision again keeps `nameatlas_app` in the pooler instead of rewriting the file without it. With no accounts role the file is byte-identical to the old one-line file.
- **The four data-load dumps** (`finalize.sh`, `editions.sh`, `extras.sh`, `shift.sh finish`) now take `--exclude-table-data='accounts.*'`: the definition of schema `accounts` goes in, its rows never do. Before this, each would have copied readers' addresses and password hashes into a plain file on the VM, kept indefinitely, which an account's deletion would not reach.
- **`scripts/check-vm-dumps.sh`** and `pnpm check:vm`, in CI: every script in `ops/vm` parses, and every `pg_dump` in them carries that flag. It finds dumps by their options, so a comment or a log line naming `pg_dump` is not one.
- **`register-vm.yml`**: the `accounts` step (stages the roles file, passes `VM_DB_APP_PASSWORD` on stdin as `provision` does the web role's), and a last job step that connects as `nameatlas_app` over the public port, as Vercel will. The create probes run inside a rolled-back transaction.
- **Docs:** `ops/vm/README.md` (the step, the secret, a section "Turning accounts on" with the five Vercel variables), ADR-0027 §5.2 amended, TASK-049 amended (its off-host backup is now the only copy of accounts and must include them), `.env.example`, `docs/CODEMAP.md`, `STATUS.md` (including the deployed line, stale since #66).

## Found by the rehearsal, not by reading the script

1. **A check that would have failed in production.** "The role holds no privilege on any table of `public`" was false: PostGIS grants `SELECT` on its own catalog (`spatial_ref_sys`, `geometry_columns`, `geography_columns`) to PUBLIC. The check now counts only privileges PUBLIC does not already hold, and the run prints the three names as a note. ADR-0027 and the roles file's comment say so.
2. **The create probes left a table behind** when the role was wrongly over-privileged (the superuser injection made `accounts.accounts_role_must_not_create` appear in a schema the checks then counted). Both probes, and the workflow's, now run `BEGIN; CREATE TABLE …; ROLLBACK`.
3. A boolean cast (`true|false`, not `t|f`) in one check.

## Verification

Run on 2026-10-01 on the finished tree:

- `pnpm format:check`, `typecheck`, `lint`, `check:ids`, `check:vm`, `build` — exit 0. `pnpm test` — exit 0, 1,807 tests (unchanged: this change adds no test of the web app). `bash -n` passes for the nine scripts in `ops/vm` and `scripts/check-vm-dumps.sh`; both workflows parse, and the step list, the case list and the options list of `register-vm.yml` agree.
- **`scripts/check-vm-dumps.sh` on broken copies of `ops/vm`:** removing the flag from `editions.sh` made it exit 1 and name `editions.sh:122`; a script that does not parse made it exit 1; a comment and a log line naming `pg_dump` were not counted.
- **A rehearsal of the real `ops/vm/accounts.sh`** against a local PostgreSQL 16.4 (container) and the real PgBouncer 1.22.0 package (Ubuntu 24.04's version), with shims for the VM's `runuser` and `systemctl`: the database built through migration `0025` as the build role (`0026` and `0027` pending, no `accounts` schema, no app role), the web role granted as `provision.sh` grants it, PgBouncer with TLS, SCRAM and the web role alone in its user list. Scripts and harness are in the session's scratch directory, not in the repository.
  - **First run:** exit 0. It applied `0026` and `0027`, ran the roles file, set the password, wrote a two-line user list and reloaded PgBouncer. All catalog checks and the six through-the-pooler checks passed: the role logs in with a 10 s statement timeout, reads `accounts.users`, writes `accounts` (rolled back), and is refused (`permission denied`) a register table, `CREATE TABLE` in `public` and in `accounts`.
  - **Second run:** exit 0 and nothing changed: the user list's checksum, the app role's SCRAM secret, the migration count and PgBouncer's process id were identical; the output said "password is already set" and "unchanged; PgBouncer is not reloaded".
  - **30 of 30 scenarios:** 15 refusals (not root; no password; a password too short, with a symbol, and of 129 characters; relative archive and roles paths; a missing archive; an empty archive; a symlinked roles file; each of the three units running; a database that was not built; PgBouncer not set up), each leaving the database, the migration count and the user list as they were; 7 failure injections done by hand to the database, each making the script exit non-zero with a `FAIL` line and the run passing again once repaired (a register table granted to the app role; the web role granted `accounts`; the app role made a superuser, a member of the web role, or allowed to create in `accounts`; an `accounts` table granted to PUBLIC; a foreign key from `accounts` to the register), 14 results of 2 each; and a role whose password no longer matched, which the script set again, rewriting the user list and reloading PgBouncer. No stray table was left in any scenario.
  - **`provision.sh`'s user-list code**, extracted and run after `accounts.sh`: it wrote a file `cmp` found identical to `accounts.sh`'s; with no app role it wrote the old single line.
  - **Dumps:** with a user and a failed sign-in stored, `pg_dump --format=custom` with the flag listed the four `accounts` tables and **no** `TABLE DATA accounts` entry, with 24 `TABLE DATA public` entries, and the address was not in the dump's text; without the flag it listed four `accounts` data entries and the address appeared once. Restoring the flagged dump into a fresh database gave four `accounts` tables, 0 users, 0 failures, 27 migrations including `0027`.

## Not verified

- **The production VM.** `accounts.sh` has not run there. The rehearsal used PostgreSQL 16, not the VM's 17; a shimmed `runuser` and `systemctl`, not systemd; a `pnpm install` that was skipped and a `db:migrate` run from this checkout, so the unpack, the VM's Node and its network were not exercised; a loopback PgBouncer, not Oracle's network path and port 6432; and a `kill -HUP` for the reload, so `systemctl reload pgbouncer` itself and the pooler's behaviour under live clients are untested.
- **Applying `0026`'s index to the full register.** Rehearsed on an empty database. On the VM it is one `CREATE INDEX` on the claims table: reads continue during it, and its duration is unknown.
- **The workflow's new step and final job step**, which cannot run before the secret exists and the workflow is on `main`. The final step's `psql` calls are those of the web role's step with other credentials.
- **`VM_DB_APP_PASSWORD`** does not exist yet; the owner creates it.
- **Restoring any dump.** The restore above is a rehearsal of the flag's effect on a small database, not TASK-049's restore drill.
