# TASK-041 — Production database on Oracle Cloud, with the complete register

- **Status:** SPECIFIED 2026-09-30, not started. §13's questions await the project owner's answers.
- **Requested by:** the project owner, 2026-09-30: "prudction should user oracle db not supabase and we should throw there much data". Asked which form, they chose PostgreSQL on an Oracle Cloud Always Free VM, in their existing account with home region Frankfurt (ADR-0016).
- **Decision record:** ADR-0016.
- **Supersedes:** TASK-035 (parked). Its goal, the complete register in production, is this task's goal. Its transfer design, a GitHub Actions runner restoring into Supabase, is replaced by a build on the VM (ADR-0016 §2 item 3).
- **Milestone:** launch. Rank, rarity and the map answer in production only with the complete register.
- **Depends on:** nothing unmerged. It needs owner actions in the Oracle console, listed in §12.
- **Numbering:** TASK-041 and ADR-0016. On 2026-09-30, `claude/keen-cannon-1jc301` held a `tasks/040-…` and an ADR-0015 with no pull request open. ADR-0016 avoids a known collision.

---

## 1. Goal

Production's database runs on one Oracle Cloud Always Free Ampere A1 VM:
- PostgreSQL 16 with PostGIS 3.4 and `pg_trgm`;
- holding the complete PESEL register, built on the VM;
- reached by the Vercel app over verified TLS as a read-only role.

Supabase is retired after a rollback period.

## 2. Outcome

- A surname outside today's seven-surname slice has a production page with its count, rank, rarity and, where regional data exists, its map.
- The database can be rebuilt from public sources with one command, and how long that takes is measured.
- The owner has a runbook, `docs/PRODUCTION_DATABASE.md`, for provisioning, the build, cutover, rollback, renewal and rebuild.

## 3. Authority

| Topic | Authority |
|---|---|
| The decision, and what it leaves open | ADR-0016 |
| `DATABASE_URL` as the only coupling; migrations over a direct connection | ADR-0002, ADR-0011 §2 |
| Per-instance connection cap on serverless | TASK-029; `apps/web/src/lib/db.ts` |
| The build | `scripts/local-setup.sh`; `docs/LOCAL_DATABASE.md` |
| Measured sizes and rates so far | `docs/progress/2026-09-29-register-load-parked.md` |
| Why a slice is not acceptable | TASK-035 §0; ADR-0011 §1 |
| Pinned image and its arm64 gap | D-005; ADR-0016 §3 |

## 4. Preconditions

Checked on 2026-09-30 by reading and querying, not on the VM.

1. **The build runs from a clean database** with `pnpm local:setup`. It did so locally through step 7 before TASK-035 was parked. Holds.
2. **The app reads only.** `apps/web/src` has no write query outside tests. Holds. The implementing session re-checks this before creating the read-only role.
3. **The Oracle account exists, with Frankfurt as its home region.** The owner said so. The account itself is not visible to a session.
4. **Ubuntu 24.04 arm64 carries `postgresql-16` and `postgresql-16-postgis-3`.** The amd64 builds are 16.13 and 3.4.2. On arm64 this is **to confirm on the VM**; stop and report if the versions differ in major or PostGIS minor.

## 5. Design

The shape is ADR-0016 §2. This section records only what the implementation adds to it.

- **`scripts/production/provision-db.sh`**, run as root on the VM.
  - It is idempotent: a second run changes nothing and fails on nothing.
  - It installs PostgreSQL, PostGIS and certbot (plus PgBouncer if U-3 says so), and enables unattended security upgrades.
  - It mounts the data volume, places the data directory on it and creates the cluster.
  - It writes `postgresql.conf` settings for 12 GB of memory and a bulk build, and `pg_hba.conf` per ADR-0016 §2 item 5.
  - It obtains the certificate for the U-1 name and installs a renewal hook that copies it to PostgreSQL and reloads.
  - It opens the VM's own firewall for 5432 (and 80 if U-1's challenge needs it) and persists the rule. Oracle's Ubuntu images ship `iptables` rules that drop everything but SSH, independent of the security list.
  - It creates the owner and read-only roles, with passwords read from the environment, never from arguments or files in the repository.
- **The build** is `pnpm local:setup` on the VM with `DATABASE_URL` pointing at the local socket or `localhost`. The run is recorded step by step, with durations, the final `pg_database_size` and row counts.
- **Cutover** sets Vercel's production `DATABASE_URL` to the VM's DNS name with `sslmode=verify-full`, then makes a production deployment of `main`.
- **Rollback** is the reverse: the previous Supabase `DATABASE_URL` and a redeploy.

## 6. In scope

1. `scripts/production/provision-db.sh`, and a check script `scripts/production/check-db.sh` that asserts the AC-02 to AC-04 facts from outside the VM.
2. Rehearsal of the provisioning script in an Ubuntu 24.04 container before the VM, recorded.
3. The build on the VM, recorded with its measurements.
4. Cutover and rollback, recorded.
5. `docs/PRODUCTION_DATABASE.md`, the runbook.
6. `STATUS.md` (the Production table) and `docs/CODEMAP.md`, plus a `docs/progress/` record.

## 7. Acceptance criteria

Each is shown by a command that was run, with its real output in the record.

- **AC-01** The provisioning script completes on the fresh VM, and a second run completes with no change.
- **AC-02** `SELECT version(), postgis_full_version()` reports PostgreSQL 16 and PostGIS 3.4. `pg_trgm` is installed. The data directory is on the data volume. After a reboot, PostgreSQL is up with no manual step.
- **AC-03** From outside the VM:
  - a connection with `sslmode=disable` is refused;
  - a connection with `sslmode=verify-full` to the U-1 name succeeds;
  - a wrong password is refused.
- **AC-04** The read-only role can `SELECT`. It is refused `INSERT`, `UPDATE`, `DELETE`, `CREATE` and `DROP`.
- **AC-05** `pnpm db:migrate` applies every migration on `main` and reports none pending on a re-run.
- **AC-06** `pnpm local:setup` completes with no `DERIVE_LIMIT`. The record gives:
  - each step's duration;
  - the final database size;
  - the counts of surnames and `ACTIVE` claims by type;
  - that the derivation refused no surname for an incomplete universe.
- **AC-07** `certbot renew --dry-run` succeeds, and the hook leaves PostgreSQL serving the renewed certificate.
- **AC-08** Unattended security upgrades are enabled (`apt-config dump` shows it), and the VM's firewall rule survives a reboot.
- **AC-09** After cutover, a production page for a surname outside the seven-surname slice shows its count, rank and rarity. Its response's `x-vercel-id` names `fra1`.
- **AC-10** Rollback is rehearsed on a preview deployment, not on production: a preview with Supabase's `DATABASE_URL` serves the slice.
- **AC-11** No password, private key or connection string with a password is committed. Checked with `git grep` for the host name and for `password=`.

## 8. Out of scope

- Any code change in `packages/` or `apps/`, any migration, and any change to CI or to the pinned test image.
- Oracle Autonomous Database, MySQL HeatWave, and any Oracle paid service.
- High availability, replicas and automatic failover.
- Moving the app off Vercel, and the M3 worker's host.
- Search indexing (`SEO_INDEXING_ENABLED`) and sitemaps.
- Deleting the Supabase project before U-6's period ends.

## 9. Failure behaviour

- **A build step fails.** `local:setup` is resumable; re-run it. A second failure of the same step is reported with its output, not worked around.
- **The derivation refuses a surname for an incomplete universe.** Stop and report. That is a data fault, never something to bypass.
- **Cutover shows an error or missing figures.** Roll back first (§5), then diagnose.

## 10. Verification requirements

- The provisioning script passes `shellcheck` and completes twice in a clean `ubuntu:24.04` container. Steps that need the VM (block volume, certificate, Oracle firewall) are skipped there by flag, and the skips are listed in the record.
- `check-db.sh` is run against the VM from outside it, for AC-02 to AC-04.
- The repository's own checks are run: `pnpm check:ids`, `pnpm format:check`, and `pnpm lint` if any TypeScript changed.

## 11. Constraints

- Nothing in the repository holds a secret. Passwords live in Vercel's environment and on the VM.
- The VM stays within Always Free limits: one `VM.Standard.A1.Flex` with 2 OCPUs and 12 GB, and at most 200 GB of block storage in total.
- `docs/canonical/` and the other read-only directories are untouched (`AGENTS.md` §2).

## 12. What the owner does

A session cannot reach the Oracle console or the Vercel project settings.

1. **Create the instance** in `eu-frankfurt-1`:
   - shape `VM.Standard.A1.Flex`, 2 OCPUs, 12 GB;
   - image Ubuntu 24.04 (aarch64), 50 GB boot volume;
   - an SSH key.
2. **Create a 150 GB block volume** and attach it to the instance.
3. **Add security-list ingress rules** for TCP 5432 (and TCP 80 if U-1 needs it), from `0.0.0.0/0`.
4. **Create the DNS record** U-1 decides, pointing at the instance's public IP.
5. **Run the scripts**, or give access, as U-5 decides.
6. **Set the production `DATABASE_URL` in Vercel**, and approve the production deployment.

## 13. Decisions for the owner

**U-1 — The DNS name for the TLS certificate.** `pg` verifies the certificate and host name (ADR-0016 §2 item 4), so the database needs a name a public CA will certify.
- (a) A subdomain of a domain you own, such as `db.<your-domain>`.
- (b) A free dynamic-DNS name, such as DuckDNS.
- (c) No public CA: ship a private CA to the app. That is a code change, which ADR-0016 rejects.

**Proposed:** (a) if you own a domain; otherwise (b).

**U-2 — Idle reclamation.** Oracle may reclaim an Always Free instance idle under 20% on CPU, network and memory for 7 days.
- (a) Upgrade the account to Pay As You Go, which is commonly reported to exempt it, with a budget alert at the smallest amount. The exemption must be confirmed on Oracle's page before relying on it.
- (b) Stay free-only, accept the risk, and rely on the rebuild.

**Proposed:** (a).

**U-3 — A pooler.**
- (a) PgBouncer on the VM in transaction mode for the app, with migrations and the build connecting directly. This mirrors ADR-0011's pooled/direct split.
- (b) Direct connections only, with TASK-029's per-instance cap.

**Proposed:** (a).

**U-4 — Backups.** The database holds nothing that cannot be rebuilt from public sources (ADR-0016 §4).
- (a) Rebuild from source, plus weekly block-volume backups (5 are free).
- (b) (a) plus a nightly `pg_dump` to Object Storage, where 20 GB is free. The dump's size is unmeasured and might not fit.

**Proposed:** (a).

**U-5 — How a session works on the VM.**
- (a) You run the commands the session gives you over SSH and paste the output.
- (b) You give the session a dedicated SSH key for this VM, removed after the task.

**Proposed:** (a) for safety. (b) is faster.

**U-6 — Supabase's retirement.** Proposed: keep it untouched as the rollback target for 14 days after a successful cutover, then delete the project and its GitHub integration.

## 14. Preflight

1. `git fetch origin main` and `git merge-base --is-ancestor origin/main HEAD` (`AGENTS.md` §11).
2. This file, ADR-0016, `STATUS.md`, and §13's answers.
3. `scripts/local-setup.sh`, `docs/LOCAL_DATABASE.md`, `apps/web/src/lib/db.ts`, and `packages/db/src/{config,pool}.ts`.
4. Confirm §4 items 2 and 4.

## 15. Verification commands

```bash
pnpm check:ids
pnpm format:check
shellcheck scripts/production/*.sh
# in ubuntu:24.04, twice
bash scripts/production/provision-db.sh --rehearsal
# from outside the VM
bash scripts/production/check-db.sh
```

## 16. Diff review

1. No file under `packages/` or `apps/` changed, no migration, and no CI change.
2. No secret anywhere in the diff (AC-11).
3. No stray files, and no formatting churn.

## 17. Documentation

- `docs/PRODUCTION_DATABASE.md`: provisioning, the build, cutover, rollback, certificate renewal, rebuild, and the reclamation risk.
- `STATUS.md`: the Production table's Database row, and TASK-035's line.
- `docs/CODEMAP.md`: `scripts/production/` and the runbook.
- `docs/progress/YYYY-MM-DD-<slug>.md`: every measurement AC-06 names.

## 18. Definition of done

- Every acceptance criterion is shown by a command that was run.
- Production serves the complete register from the VM, and the rollback was rehearsed.
- **STOP.** Do not start search indexing, the worker host or any code change.
