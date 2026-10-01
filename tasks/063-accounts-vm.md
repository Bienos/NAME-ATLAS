# TASK-063 — Accounts on the VM: the migration, the `nameatlas_app` role, PgBouncer, dumps without accounts, and an `accounts` step

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu`; record: `docs/progress/2026-10-01-accounts-vm.md`. **Not run on the production VM.**
- **Requested by:** the project owner, 2026-10-01: "go", on the plan that names this as the next step after TASK-062.
- **Decision:** ADR-0027 §5.2, amended here. Also ADR-0017 (the VM) and `ops/vm/README.md`.
- **Depends on:** TASK-061 and TASK-062, on `main` at `0a1e869`.
- **Model guidance:** implementation session. It changes scripts that run as root on the production database host: review the diff adversarially.

## 1. Goal

One Register VM step, `accounts`, that makes the production database ready for accounts and can be run again at any time: it applies the pending migrations (`0027` creates schema `accounts`), creates the role `nameatlas_app` with its grants, sets its password from a GitHub secret, adds it to PgBouncer, and proves the isolation ADR-0027 promises. Alongside it, nothing the VM does afterwards may copy an account out of the database in the clear. Running it on the VM needs the owner's secret and a go; this task builds, rehearses and documents it.

## 2. Facts (checked on `main` @ `0a1e869`, 2026-10-01)

1. **Migrations `0026` and `0027` are not applied on the production database.** A Vercel deploy runs none; the VM's steps do (`archive.sh` and `shift.sh` call `pnpm db:migrate` as the build user). `docs/progress/2026-10-01-cards-first-surname-view.md` says `0026`'s index waits for the next `shift` or `archive` step, and none has run since. The new step's migrate therefore applies **both**: `0026` is one index on the register's claims (the page works without it, only slower), `0027` the accounts schema.
2. **Four scripts take a whole-database dump** beside the data they load: `finalize.sh`, `editions.sh`, `extras.sh` and `shift.sh finish`, each `pg_dump --format=custom -d "$DB"`, as the `postgres` user into a `0700` directory. Once accounts hold a row, each would copy addresses and password hashes into a plain file on the VM, kept indefinitely, which the privacy notice does not describe and which deleting an account would not reach. (An off-host, encrypted backup that does include accounts is TASK-049's.)
3. **`provision.sh` rewrites PgBouncer's `userlist.txt` from the web role alone** (one `printf`). Run again after accounts are set up, it would drop the accounts role from the pooler and restart PgBouncer.
4. PgBouncer logs in to PostgreSQL with the client's own SCRAM secret, so each line of `userlist.txt` must be byte-identical to that role's `pg_authid.rolpassword`. `provision.sh` sets the web role's password only when it does not already work, so as not to change the salt.
5. `ops/vm/accounts-roles.sql` (TASK-061) is idempotent and creates `nameatlas_app` without a password, grants `CONNECT`, `USAGE` on `accounts`, and `SELECT, INSERT, UPDATE, DELETE` on its tables, with default privileges for the build role's future ones. It creates schema `accounts` if absent, and migration `0027` also creates it `IF NOT EXISTS`, so the order of the two does not matter; the grants on existing tables need the migration first.
6. `register-vm.yml` runs a step by `workflow_dispatch` (its push trigger names branches that no longer exist). Its scripts are copied to the SSH user's `~/name-atlas-ops`, mode 700, and run with `sudo`; the web role's password reaches `provision.sh` on stdin. The workflow's last step connects "as the web app does" over the public port.
7. Production's PostgreSQL is 17 on Ubuntu 24.04 with PgBouncer 1.22 (`provision.sh`); the local test database is PostgreSQL 16.4 and the PgBouncer package installed here is 1.22.0-1build4, the version Ubuntu 24.04 ships.

## 3. In scope

- **`ops/vm/accounts.sh`** (new), run as root over SSH like `archive.sh`: unpack the pushed commit and `pnpm install`; `pnpm db:migrate` as the build user; run the staged `accounts-roles.sql` as the superuser; set the role's password from stdin (only when it does not already work); write PgBouncer's user list for both roles and reload PgBouncer only if it changed; check, by the catalog and by connecting as the role through the pooler, that the role writes `accounts` and nothing else, the web role reads nothing of it, and neither can create anything; print counts and the connection string's shape, never a secret.
- **`ops/vm/provision.sh`**: the user list takes a line for each of the two roles that has a SCRAM secret, so a later provision keeps the accounts role.
- **The four dumps** gain `--exclude-table-data='accounts.*'`: the dump keeps the schema's definition, so a restore leaves accounts empty and consistent with the migrations table, and no row leaves the database.
- **`scripts/check-vm-dumps.sh`** and a `pnpm check:vm` that runs it, wired into CI: every `pg_dump` in `ops/vm/*.sh` must carry that flag, and every script must parse (`bash -n`).
- **`register-vm.yml`**: the `accounts` step (stages the roles file, passes `VM_DB_APP_PASSWORD` on stdin as `provision` does the web role's), and a last step that connects as `nameatlas_app` over the public port, as Vercel will.
- **Docs:** `ops/vm/README.md` (the step, the secret, the Vercel variables), ADR-0027 §5.2's amendment, `.env.example`'s example URL, `docs/CODEMAP.md`, `STATUS.md`, a progress record.
- **A rehearsal** of `accounts.sh` against a local PostgreSQL and the real PgBouncer package, with shims for the VM's `runuser` and `systemctl`, recorded with what it did and did not prove.

## 4. Out of scope

- Running the step on the production VM, and creating `VM_DB_APP_PASSWORD`: the owner's secret and go.
- Setting the five Vercel variables and the Resend account (the owner), and the app's behaviour once on.
- An off-host backup (TASK-049); how a restore from the on-VM dumps is rehearsed.
- Changing PgBouncer's pool sizes, TLS, the firewall, or the web role.
- The download gate (TASK-064).

## 5. Acceptance criteria

- **AC-1.** `accounts.sh` refuses to run: not as root; with no password on stdin or one that is not 24–128 letters and digits; with no archive path, or one that is not a non-empty regular file; while the register build, the archive load or the change-over-time batch is running; on a database that has not been built, and where PgBouncer is not set up; in each case the database and the user list are left as they were (rehearsal).
- **AC-2.** A run applies the pending migrations, creates the role, sets its password, writes the user list and reloads PgBouncer; a **second run changes nothing**: the password is not reset, the user list is byte-identical and PgBouncer is not reloaded (rehearsal).
- **AC-3.** The checks pass on a good run and **fail loudly on a bad one**: each of these, done by hand to the rehearsal database, makes the script exit non-zero, and the run passes again once it is repaired: the app role granted `SELECT` on a register table, the web role granted `USAGE` on `accounts`, the app role made a superuser, made a member of the web role, or allowed to create in `accounts`, an `accounts` table granted to PUBLIC, and a foreign key from `accounts` to the register (rehearsal). The probes that try to create a table run inside a rolled-back transaction, so a wrongly privileged role leaves nothing behind (found by the rehearsal). A password that no longer matches the secret is set again and PgBouncer reloaded (rehearsal).
- **AC-4.** Through PgBouncer, as `nameatlas_app` with its password: `SELECT` on `accounts.users` works; `SELECT` on a register table, `CREATE TABLE` in `public` and in `accounts` are refused; a write to `accounts` inside a rolled-back transaction works; the role's `statement_timeout` is 10 s (rehearsal).
- **AC-5.** After `accounts.sh`, `provision.sh`'s user-list code, run again, produces the same file (rehearsal of its code block).
- **AC-6.** With a user in `accounts.users`, a dump taken with each script's flags contains the schema and no row of `accounts` (a real `pg_dump` of the rehearsal database, listed with `pg_restore`); `pnpm check:vm` fails when a `pg_dump` line lacks the flag.
- **AC-7.** `bash -n` passes for every `ops/vm/*.sh` and `scripts/check-vm-dumps.sh`; the workflow's YAML parses and its step list, case list and options list agree.
- **AC-8.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test` and `build` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm check:vm && pnpm test && pnpm build
```

Then the rehearsal, with every command and result in the progress record, and what it could not prove (the real VM, `systemd`, the pooler's reload under live clients, PostgreSQL 17, Oracle's network path).
