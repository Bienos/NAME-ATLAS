# TASK-040 — Production reads the complete register from a free Oracle Cloud VM

- **Status:** IN PROGRESS 2026-09-30. The scripts, the workflow and their local rehearsal are done (§6 AC-1–AC-4); the VM steps wait on the project owner's §3. The record is in `docs/progress/2026-09-30-production-database-on-a-free-vm.md`.
- **Requested by:** the project owner, 2026-09-29: a free VM for now, a paid host once the site earns money, and "a ty mozesz to zrobic sam".
- **Milestone:** launch. TASK-035's goal (production answers for every surname), reached by ADR-0015's host instead of a paid Supabase plan.
- **Supersedes:** TASK-035, parked because Supabase's free plan stops at 500 MB.
- **Decision:** ADR-0015.

## 1. Goal

Production answers for every surname in the 2026-01-20 PESEL register, with rank, rarity and the map, not for seven. The database is PostgreSQL on an Oracle Cloud Always Free VM, built there from the four official files, and the app is the one deployed now with a new `DATABASE_URL`.

## 2. Facts that shape the work (checked 2026-09-29 and 2026-09-30)

- **The build.** `scripts/local-setup.sh` builds the complete register against any `DATABASE_URL`, in seven resumable steps. Measured on 4 CPUs: step 6 at 60.5 surnames a second, step 7 at 86.6 (`docs/progress/2026-09-29-register-load-parked.md`). Never measured on 2 CPUs or on arm64. Projected at 5–7 hours on the VM, and about 16 GB (not measured at completion).
- **The app** reads only `DATABASE_URL` (`packages/db/src/config.ts`) and writes nothing. Every query is a `SELECT`, and the resolver's run in `start transaction read only`. The one non-`SELECT` is `SET LOCAL pg_trgm.similarity_threshold`, which is transaction-scoped. It needs `pg_trgm` at run time and PostGIS only for the schema.
- **TLS in `pg` 8.23.** `sslmode=require` alone means full verification, which fails on a self-signed certificate; this broke production on 2026-09-22 (`PROGRESS.md`). `uselibpqcompat=true&sslmode=require` encrypts without verifying.
- **Kysely's migrator** takes a session-level advisory lock, so migrations must not go through a transaction-mode pooler.
- **The pinned image** `postgis/postgis:16-3.4@sha256:44126d…` is amd64 only, so the A1 VM uses PGDG packages.
- **The session** that implements this cannot open SSH or PostgreSQL connections: its egress is HTTPS only. A GitHub-hosted runner can.
- **GitHub.** The default branch is still `claude/exciting-noether-05np1s`, so `workflow_dispatch` cannot start a workflow that exists only on `main` or a task branch. A push runs the workflow file of the pushed commit.
- **Vercel.** Production is `0eb4814` (`dpl_H55YeqWUjCg34F4F3wcufMym6sM6`), deployed by hand. `DATABASE_URL` is a sensitive, production-only variable that the owner created. An environment change applies only to a new deployment.

## 3. Preconditions — the project owner's

1. **An Oracle Cloud account** whose home region is **Germany Central (Frankfurt)**.
2. **The VM:** `VM.Standard.A1.Flex`, exactly 2 OCPUs and 12 GB (`provision.sh` refuses any other size; more is not free), Canonical Ubuntu 24.04, a public IPv4 address, a 150 GB boot volume, and a key pair saved at creation.
3. **An ingress rule** on the VM's subnet: TCP, destination port 6432, source `0.0.0.0/0`, stateful.
4. **Three repository secrets:** `VM_HOST` (the public IP), `VM_SSH_KEY` (the private key file's whole text) and `VM_DB_WEB_PASSWORD` (40 random letters and digits, also kept in the owner's password manager for the Vercel step). They are never pasted into a chat.
5. **After the build:** Vercel's production `DATABASE_URL` set to `postgresql://nameatlas_web:<VM_DB_WEB_PASSWORD>@<VM_HOST>:6432/name_atlas?uselibpqcompat=true&sslmode=require`.

`ops/vm/README.md` gives each step click by click.

## 4. In scope

- `ops/vm/provision.sh`: PGDG PostgreSQL 17 with PostGIS 3 and `pg_trgm`, the cluster in UTF8 and `en_US.UTF-8`, sizing for 12 GB, the two roles, the database, PgBouncer (TLS, SCRAM, transaction mode, `nameatlas_web` only), the host firewall rule, swap, and Node 22.22.2 with pnpm through corepack. Idempotent.
- `ops/vm/build.sh`: unpacks the pushed commit, installs dependencies on the VM, and starts `local-setup.sh` in a systemd unit that restarts itself and resumes.
- `ops/vm/status.sh`: the build, the database, the services and the machine. Read-only.
- `ops/vm/finalize.sh`: the gate (TASK-035's checks plus the regional values and distribution claims), durability back on, grants, `VACUUM ANALYZE`, `pg_prewarm`, and a `pg_dump` on the VM.
- `.github/workflows/register-vm.yml`: runs one of `check`, `provision`, `build`, `status` and `finalize` over SSH with a pinned host key, then connects the way the app does. It runs on a push to this task's branch that changes `ops/vm/request`, or by `workflow_dispatch`.
- `ops/vm/request`, `ops/vm/ssh_host_ed25519_key.pub` (the host key, pinned after first contact) and `ops/vm/README.md` (the runbook).
- The cutover: the redeploy of `dpl_H55Y…` with the new `DATABASE_URL`, and the check that production answers for surnames outside the slice.
- ADR-0015, and the lines of `STATUS.md`, `docs/CODEMAP.md`, TASK-035 and ADR-0011 that this change makes untrue.

## 5. Out of scope

- Any change to the app, the packages, the migrations or CI. The deployed commit is redeployed as it is.
- Deploying `main`. It carries 37 more commits, including web changes, and would mix two changes in one cutover.
- A tested restore of the dump, off-VM backups and monitoring. `docs/canonical/23` requires a tested restore before paid beta; it is not done here.
- Retiring the Supabase project. It stays until the VM has served production for a week.
- Authenticated TLS (a bundled CA or a public certificate). ADR-0015 §2.4.
- Setting GitHub's default branch and Vercel's production branch to `main`. It stays an owner item in `STATUS.md`.

## 6. Acceptance criteria

- **AC-1.** The four scripts pass `shellcheck`, the workflow passes `actionlint`, and `pnpm format:check` and `pnpm check:ids` pass.
- **AC-2.** On Ubuntu 24.04, `provision.sh` completes, and a second run completes and changes nothing. PgBouncer refuses a connection without TLS, a wrong password and any role but `nameatlas_web`. That role cannot create a table.
- **AC-3.** On that machine, `local-setup.sh` runs as `nameatlas` over the Unix socket with a password-free URL, downloads and verifies the four official files, migrates, and imports 828,264 national and 1,340,605 regional values. `finalize.sh`'s gate refuses the partially derived result.
- **AC-4.** The web app built from this tree, connected through PgBouncer with the production URL form as `nameatlas_web`, renders counts, rarity and rank for a surname outside the seven-surname slice.
- **AC-5.** On the VM, the `provision` run succeeds, and its connection step shows TLS, `default_transaction_read_only = on` and a refused write.
- **AC-6.** On the VM, the build finishes, and `finalize`'s gate passes every check: 598,476 surnames, 828,264 national and 1,340,605 regional values, the four official hashes, no duplicate or surplus `ACTIVE` claims, and no surname missing its population, rank, rarity or, where it has regional data, distribution. The dump exists.
- **AC-7.** Production (`name-atlas-two.vercel.app`) serves `0eb4814` against the VM. A surname page outside the slice shows its count, rarity, rank and regions. The rollback deployment is recorded.

## 7. Verification

```
shellcheck ops/vm/*.sh && actionlint .github/workflows/register-vm.yml
pnpm format:check && pnpm check:ids
```

Then, in order, with each run's ID and result recorded: the `Register VM` workflow's `check`, `provision`, `build`, `status` (until it prints `built: yes`) and `finalize` runs, the redeploy, and `curl` on production for a surname outside the slice.
