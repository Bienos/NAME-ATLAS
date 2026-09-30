# ADR-0016 — the production database: PostgreSQL on an Oracle Cloud Always Free VM

- **Status:** Accepted
- **Date:** 2026-09-30
- **Deciders:** the project owner.
  - On 2026-09-30 they wrote: "prudction should user oracle db not supabase and we should throw there much data".
  - Asked which form of Oracle, they chose "Oracle VM running PostgreSQL" over Oracle's own database engine and over Oracle's paid managed PostgreSQL.
  - They confirmed an existing Oracle Cloud account whose home region is Frankfurt (EU).
- **Supersedes:** ADR-0011 §2's database half, which chose Neon. Production never ran on Neon: it runs on Supabase, the gap `STATUS.md` recorded ("ADR-0011 chooses Neon, but production runs on Supabase"). ADR-0011's app half — Vercel in `fra1` — stands.
- **Amends:** D-005 (`docs/DECISIONS_NEEDED.md`) for production only; see §3.
- **Implemented by:** TASK-041 (`tasks/041-production-database-on-oracle-cloud.md`). Its §13 holds the questions this ADR leaves to the owner.
- **Code:** none. `DATABASE_URL` is the only coupling to the host (ADR-0002, ADR-0011), so the move is configuration and operations.

## 1. Context

The complete register does not fit any free managed PostgreSQL.

- **Size.** Derived, it is projected at about 16 GB. That figure was never measured at completion: the local build was stopped at step 7, at 7,432 MB with 167,825 of 270,021 regional surnames derived (`docs/progress/2026-09-29-register-load-parked.md`).
- **Supabase.** Its free plan goes read-only above 500 MB, so production holds a seven-surname slice.
- **No paid plan.** The project owner will not pay for one. That is why TASK-035, loading the register into production, was parked.
- **A slice is not an honest small version.** Rank, rarity and the map each need their complete universe, and the derivation refuses a partial one.

Oracle Cloud's Always Free tier offers two relevant things. As read from Oracle's own page on 2026-09-30, <https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm>:

- **Autonomous Database.** Oracle's own engine, two instances of 20 GB each. It is not PostgreSQL: no PostGIS, no `pg_trgm`, none of the 23 hand-written migrations. Using it means re-platforming the data layer ADR-0001 and ADR-0002 chose.
- **Ampere A1 compute.** `VM.Standard.A1.Flex`, arm64, 1,500 OCPU-hours and 9,000 GB-hours a month: 2 OCPUs and 12 GB of memory in total. Block storage is 200 GB in total, boot volumes included, with a minimum boot volume of 47 GB. Outbound transfer is 10 TB a month. There is no Always Free PostgreSQL service.

The same page states an idle-reclamation policy. An Always Free instance may be reclaimed if, over 7 days, its 95th-percentile CPU utilisation, its network utilisation and (for A1 shapes) its memory utilisation are all below 20%.

## 2. Decision

**Production's database is PostgreSQL 16 with PostGIS 3.4 and `pg_trgm`, self-hosted on one Oracle Cloud Always Free `VM.Standard.A1.Flex` instance in the owner's home region, `eu-frankfurt-1`. The app stays on Vercel in `fra1`. Both halves stay in the EU.**

1. **Operating system and packages.** Ubuntu 24.04 LTS (arm64), with PostgreSQL and PostGIS from Ubuntu's own archive: `postgresql-16` and `postgresql-16-postgis-3`. On 2026-09-30 the archive's amd64 builds of these were 16.13 and 3.4.2, and TASK-040's integration suite passed against them in its session. The arm64 builds come from the same source packages. That was not checked on arm64 in this session.
2. **Data on its own block volume.** The data directory is on a block volume separate from the boot volume, so the operating system can be rebuilt without touching the data. The split is 50 GB boot and 150 GB data, the free 200 GB in total.
3. **The register is built on the VM, not transferred to it.** `pnpm local:setup` runs on the VM against the local server. It downloads the four official PESEL files and refuses any whose size or SHA-256 differs from the registry. It then imports, assigns addresses and derives, and it is resumable. Nothing of about 16 GB crosses the network. The same command rebuilds the database from public sources, which is what §4's recovery rests on.
4. **Every connection from outside the VM uses verified TLS.**
   - `pg` 8.23.0 with `pg-connection-string` 2.14.0 is what the lockfile pins. It treats `sslmode=require` as `verify-full`: it checks the server certificate against Node's trusted CAs and the host name.
   - So the server presents a certificate from a public CA for a DNS name that resolves to the VM. The default is Let's Encrypt, renewed on the VM.
   - The alternatives are shipping a private CA to the app (a code change) or `sslmode=no-verify` (no protection against interception). Both are rejected.
   - Which DNS name is TASK-041 §13 U-1.
5. **Authentication.** `pg_hba.conf` admits outside connections only as `hostssl … scram-sha-256`. There is no `host` line for an outside address, and nothing is `trust`.
6. **Two roles.**
   - An owner role runs migrations and the build.
   - The web app connects as a role that can only read: `SELECT` on the schema's tables, granted by default privileges so future migrations need no extra step. The web app issues no write query today; `apps/web/src` has no `insertInto` or `updateTable` outside tests.
7. **The port is reachable from the internet.**
   - The app's serverless functions do not connect from a fixed address that a firewall rule could name on the project's current plan. This was not re-verified against Vercel's current offering in this session.
   - The Oracle security list and the VM's own firewall open 5432, plus 80 when a Let's Encrypt HTTP challenge needs it, and nothing else beyond SSH.
   - Verified TLS, SCRAM authentication and a read-only app role are what protect it.
8. **Connection handling.** ADR-0011 split connections into pooled ones for the serverless app and direct ones for migrations and batch jobs, which need a session-level advisory lock. Whether a pooler (PgBouncer) sits in front of the app from the start is TASK-041 §13 U-3.

## 3. The pinned image does not run here

D-005 pins `postgis/postgis:16-3.4@sha256:44126d87…` for local development, Testcontainers and CI, "so local, CI and tests run identical bytes".

- **That digest is published for amd64 only.** Checked against Docker Hub's API on 2026-09-30, the tag lists one image, `amd64`.
- **The A1 VM is arm64,** so the image cannot run there.
- **Production therefore runs Ubuntu's packages,** at the same PostgreSQL major version and the same PostGIS minor version.
- **Local development, Testcontainers and CI keep the pinned image unchanged.** The difference is the build, not the version. It is the one place production and tests do not run identical bytes.
- **Supabase is not a precedent:** it runs PostgreSQL 17.6 (`docs/progress/2026-09-29-register-load-parked.md`), so production has never matched the pinned image.

## 4. Consequences

- **The project now operates a database server.** Operating-system and PostgreSQL security updates, disk space, certificate renewal and monitoring are its own work. TASK-041 sets up unattended security updates and renewal. Nothing pages anyone.
- **One VM, no replica.** A failure of the VM or its volume is an outage.
  - The database holds no user data. There are no accounts, and the event sink stores none.
  - Everything in it is derived from public, checksum-pinned files. Recovery is a rebuild with `pnpm local:setup`.
  - The recovery time is the build time, which TASK-041 measures for the first time at completion. Backups are TASK-041 §13 U-4.
- **Idle reclamation is a live risk.**
  - A quiet site's database could fall under all three 20% thresholds for 7 days.
  - Pay As You Go accounts are commonly reported to be exempt. That was not verified here.
  - TASK-041 §13 U-2.
- **The complete register goes to production.** TASK-035's §0 reason for parking, the free plan's 500 MB, no longer applies. TASK-035's transfer design — a GitHub Actions runner restoring a dump into Supabase — is superseded by TASK-041's build on the VM.
- **Supabase is retired after cutover.** It stays as the rollback target for a period TASK-041 §13 U-6 sets, and is then removed. Its RLS workaround (ADR-0011 §3) leaves with it.
- **ADR-0011's M3 note still holds.** When BullMQ arrives, the worker needs a host that keeps processes alive. This VM is a candidate at that point; that choice is not made here.
- **`ARCHITECTURE.md` §9 and `docs/canonical/23` §6** still describe a single Render plane. `docs/canonical/` stays read-only (`AGENTS.md` §2). ADR-0011 and this ADR are the correction for P0.
