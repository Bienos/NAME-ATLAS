# ADR-0015 — the production database runs on a free Oracle Cloud VM, behind PgBouncer

- **Status:** Accepted
- **Date:** 2026-09-30
- **Deciders:** project owner, 2026-09-29, choosing a free VM over Supabase's free plan for now and a paid host once the site earns money ("ja to chce miec narazie zeby to dokonycz jak zacznie to zarabiac to ja to moge zmienic"), and asking for it to be done for them ("a ty mozesz to zrobic sam")
- **Supersedes in part:** ADR-0011 §2's choice of Neon for the database. ADR-0011's other half stands: the app stays on Vercel in `fra1`, and `DATABASE_URL` stays the only coupling.
- **Resolves:** `STATUS.md`, "Blocked on the project owner", the hosting ADR (ADR-0011 named Neon while production ran on Supabase), and TASK-035 §0, which parked the load because the free plan stops at 500 MB.
- **Relates to:** ADR-0002 (Kysely over `pg`), TASK-035, TASK-036.
- **Implemented by:** TASK-040 (`ops/vm/`, `.github/workflows/register-vm.yml`).

## Context

Production reads a Supabase project on the free plan. It holds a seven-surname slice, so every other surname is not found (the API answers UNRESOLVED and the page says "Nie znaleziono takiego nazwiska"), and for the seven only the count is shown: rank, rarity and the map need a complete universe and are unavailable. The complete register, derived, is projected at about 16 GB (TASK-035 §2; not measured at completion). The free plan stops at a 500 MB database. The project owner will not pay for a plan now (TASK-035 §0).

The free tiers of the hosted PostgreSQL services in reach are all 1 GB or less: Supabase 500 MB, Neon 0.5 GB, and Render 1 GB, which also expires after 30 days (ADR-0011 §1). Oracle Cloud's Always Free tier gives a VM instead: Ampere A1 with 2 OCPUs and 12 GB of memory, and 200 GB of block storage, in the tenancy's home region (Oracle, "Always Free Resources", read 2026-09-30).

## Decision

### 1. Where it runs

The production database is a self-managed PostgreSQL 17 on one Oracle Cloud Always Free A1 VM (Ubuntu 24.04, arm64) in Frankfurt (`eu-frankfurt-1`), the same region as the app's `fra1`. Both halves stay in Europe.

### 2. What runs on it

1. **PostgreSQL 17, PostGIS 3 and PgBouncer from the PostgreSQL apt repository (PGDG).** Ubuntu 24.04's own PgBouncer is 1.22.0, with unauthenticated-crash CVEs its tracker marks "Needs evaluation"; PGDG carries 1.26.0, which fixes them. Taking PostgreSQL and PostGIS from the same repository keeps one origin for all three. Production already ran PostgreSQL 17 on Supabase; development and CI stay on the pinned `postgis/postgis:16-3.4` image (D-005), which has no arm64 build.
2. **The cluster uses UTF8 and `en_US.UTF-8`**, as CI's image does, because tie order in the prefix, fuzzy and most-common lists depends on collation.
3. **The web app connects through PgBouncer** on port 6432 in transaction mode, as ADR-0011 §2 requires of a serverless app, as the read-only role `nameatlas_web` with a SCRAM password. That role has `default_transaction_read_only = on`, a 30 s `statement_timeout` (Supabase imposed 120 s platform-wide) and `SELECT` only. The web app writes nothing (TASK-040 §2).
4. **TLS encrypts but does not authenticate the server,** as today on Supabase. PgBouncer requires TLS with a self-signed certificate, and the app's URL keeps `?uselibpqcompat=true&sslmode=require`, which `pg` 8.23 reads as "encrypt, do not verify". Authenticating the server would need a CA file bundled into the Vercel function or a public certificate on a DNS name. Either is an app or domain change, and this move changes neither.
5. **Migrations and the build connect directly,** over the Unix socket with peer authentication, as the role `nameatlas` that owns the database. Their connection string carries no password. PostgreSQL listens on `localhost` only.
6. **The register is built on the VM** by `scripts/local-setup.sh`, the same command a developer runs, in a systemd unit that restarts itself after a failure and resumes. Nothing is copied from Supabase.

### 3. How it is operated

The Claude session that builds and runs it has HTTPS-only egress, so it cannot reach the VM. A GitHub Actions workflow, `register-vm.yml`, does the work over SSH, and the session reads the run logs. The owner creates the Oracle account and the VM, and puts three secrets in GitHub: `VM_HOST`, `VM_SSH_KEY` and `VM_DB_WEB_PASSWORD`. Nobody pastes a secret into a chat. The VM's SSH host key is pinned in the repository after first contact.

### 4. The cutover keeps the app unchanged

Vercel's production `DATABASE_URL` is pointed at the VM's pooler, and the deployment running now is redeployed with it. Vercel applies an environment change only to a new deployment. The code does not change. Supabase stays as it is until the VM has served production for a week; returning to it is an Instant Rollback to the deployment that still carries its URL.

## Why not the alternatives

**A paid plan (Supabase Pro, Neon Launch).** It works and removes all operating work. The owner declined it until the site earns money. That is the condition to revisit.

**A compact projection of the published figures, on the free plan** (TASK-035 §0 option 3). It needs an ADR changing what the pages read, and its 300–400 MB is an estimate against a 500 MB limit. The owner chose the VM instead.

**A cheap paid VPS.** The same operating work as the free VM, for money.

**The owner's own computer through a tunnel.** The site would go down whenever the computer sleeps, and the computer would face the internet.

## Consequences

- Backups, security updates and uptime are this project's job, not a vendor's. The data is rebuilt from four public files by one command, and `finalize.sh` keeps a `pg_dump` on the VM. A dump, not a rebuild, keeps the 854 suffixed slugs stable: their suffixes derive from UUIDv7 ids. A restore has not been tested, so this is not yet a verified backup (`docs/canonical/23`).
- Oracle reclaims an Always Free instance when its CPU (95th percentile), network and memory all stay under 20% for 7 days. `shared_buffers` is 3 GB of the 12 GB and `pg_prewarm` keeps it filled, so memory should stay above the line. Oracle does not document how it measures memory, so this is not verified.
- An Oracle account left idle for 30 days may be suspended (Oracle Free Tier FAQ). The owner signs in now and then.
- Port 22 and port 6432 are open to the internet. GitHub's runners and Vercel's functions have no fixed addresses on these plans, so neither port can be allowlisted. Postgres itself listens on `localhost` only.
- On GitHub's free plan, a workflow pushed to any branch of this private repository can read the VM's SSH secret. Every writer to the repository is already trusted with production.
- `docs/LOCAL_DATABASE.md`'s hosted-database sections describe Supabase. They stay true for the Supabase project until it is retired.

## Do not revisit unless

- the site earns money and a managed host is affordable (the owner's own condition), or
- Oracle reclaims or suspends the VM, or Always Free stops covering 2 OCPUs, 12 GB and 200 GB, or
- M3 brings persistent workers (ADR-0011 §3), which changes what the hosting plane must provide.
