# 2026-09-30 — ADR-0016 and TASK-041: production's database moves to Oracle Cloud

Documentation only. No code, migration, CI or dependency change.

## Changed

- **`docs/adr/0016-production-database-on-oracle-cloud.md`, new.** It records the project owner's decision of 2026-09-30:
  - production's database is PostgreSQL 16 with PostGIS 3.4 and `pg_trgm`;
  - it runs on one Oracle Cloud Always Free `VM.Standard.A1.Flex` in `eu-frankfurt-1`;
  - the complete register is built on the VM.

  It supersedes ADR-0011's Neon choice. That closes `STATUS.md`'s "Hosting ADR" item: ADR-0011 chose Neon, but production runs on Supabase.
- **`tasks/041-production-database-on-oracle-cloud.md`, new, specified and not started.** Its §13 holds six questions for the owner (U-1 to U-6), each with a proposal. Its §12 lists the console steps only the owner can take.
- **`tasks/035-load-the-register-into-production.md`:** header only, marked superseded by TASK-041.
- **`STATUS.md` and `docs/CODEMAP.md`:** the lines this makes untrue.

## How the decision was taken

- The owner wrote: "prudction should user oracle db not supabase and we should throw there much data".
- Oracle's free database is its own engine, not PostgreSQL. So the owner was asked which form they meant: Oracle's engine (Autonomous Database), a VM running PostgreSQL, or Oracle's paid managed PostgreSQL. They chose "Oracle VM running PostgreSQL".
- They confirmed an existing account with Frankfurt (EU) as its home region.

## Facts established for the ADR, with how

- **Oracle's Always Free resources.** Read from Oracle's page on 2026-09-30: <https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm>
  - Ampere A1: 1,500 OCPU-hours and 9,000 GB-hours a month, which is 2 OCPUs and 12 GB.
  - Block storage: 200 GB in total, including boot volumes of at least 47 GB. Outbound transfer: 10 TB a month.
  - Autonomous Database: 2 instances of 20 GB. There is no Always Free PostgreSQL service.
  - An idle Always Free instance may be reclaimed if, over 7 days, CPU (95th percentile), network and memory are all below 20%.
- **The pinned PostGIS image is amd64 only.** Docker Hub's API for `postgis/postgis` tag `16-3.4` returned digest `sha256:44126d872ac91993766c341e369c539e8196614321765d36a6f1bab0419a5fa5` — D-005's — with one image, architecture `amd64`. It cannot run on the arm64 A1 VM.
- **`sslmode=require` means `verify-full` here.** `pg-connection-string` 2.14.0, the lockfile's version, treats `sslmode=require` like `verify-full` unless `uselibpqcompat=true` is set. Checked by reading its `index.js`. That is why ADR-0016 requires a publicly trusted certificate for a DNS name.
- **Package versions.** In this session's container, Ubuntu 24.04's archive installed `postgresql-16` 16.13 and `postgresql-16-postgis-3` 3.4.2 (amd64). The arm64 builds were not checked.
- **The web app reads only.** `grep` for `insertInto` and `updateTable` in `apps/web/src` found nothing outside tests.
- **Size.** The complete register's projected size, about 16 GB, and the measured partial figures come from `docs/progress/2026-09-29-register-load-parked.md`. Nothing new was measured.

## Numbering

- ADR-0015 was free on `main` and in open pull requests.
- On 2026-09-30, branch `claude/keen-cannon-1jc301`, with no pull request, held `docs/adr/0015-list-scope-statistics-as-a-committed-artefact.md` and `tasks/040-landing-atlas-list-facts.md`.
- This change took ADR-0016 so as not to collide knowingly. TASK-040 is taken by #29. That branch's `tasks/040-…` will need a new number whichever of the two merges second.

## Verified

- `pnpm check:ids` — result in the change description.
- `pnpm format:check` — result in the change description.
- No build or tests were run; only Markdown changed.

## Not verified

- The arm64 package versions.
- Whether a Pay As You Go account is exempt from idle reclamation.
- Whether Vercel offers fixed outbound addresses on the project's plan.

All three are named as open in ADR-0016 or TASK-041.
