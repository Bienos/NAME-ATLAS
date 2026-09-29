# TASK-035 — Load the real PESEL register into production

- **Status:** PARKED 2026-09-29 by the project owner, who will not move Supabase off the free plan (§0). What was measured before stopping is in `docs/progress/2026-09-29-register-load-parked.md`.
- **Requested by:** the project owner, who chose "load the real register" on 2026-09-29, after the go-live of #9, #10, #7 and #11. They then chose a GitHub Actions workflow for the transfer.
- **Milestone:** launch. `PROGRESS.md` (2026-09-21): "A launch needs the full register imported, which is what makes rank, rarity and geography answer instead of refusing."
- **Numbering:** TASK-034 is reserved in `STATUS.md` for the section registry; this takes the next number.
- **Depends on:** TASK-036 (#13, merged). Without it `derive-batch --rank` needs days.

## 0. Parked

The complete register cannot go into production on the free plan. Derived, it is about 16 GB; the free plan stops at a 500 MB database. The project owner will not move to a paid plan, so production keeps the seven-surname slice.

**What exists:**
- The four official files download and verify.
- A local build of the whole register reached step 7 of `pnpm local:setup` before it was stopped. The record gives its size and rates.
- The load workflow is **not on `main`**. It is `.github/workflows/load-register.yml` at commit `945e98f`, in this task's history. Its load step's script was rehearsed locally, at small scale, for success, a truncated dump and a failing statement. Nothing else of it ran to completion.

**What would unpark it:**
1. **Population only, on the free plan.** A national `--slice top:N` fits.
   - Rank, rarity and the map do not fit. Each needs its complete universe: the derivation refuses a partial one, with no bypass. The regional importer has no slice, and the complete regional import, with the surnames it brings, is estimated at about 680 MB on its own.
   - N has not been measured.
   - The transfer still has to run from a GitHub runner: it needs the `PROD_DATABASE_URL` secret and `main` as the default branch.
2. **A paid plan.** Supabase Pro with the Spend Cap off, and the disk raised by hand to at least 24 GB before the load. Then §3–§7 as written.
3. **A compact projection** of the published figures for every surname. It is estimated, not measured, at 300–400 MB. It needs an ADR first, because the pages would read a projection of validated claims instead of the claim tables.
4. **Less storage per claim.** A task of its own, which would help options 1 to 3. Today there is one research run per claim, and one pair of universe evidence items per ranked surname. At the stop, the pairs numbered 310,527 and 310,524, nearly identical.

## 1. Goal

Production answers for every surname in the 2026-01-20 PESEL register, not for seven.

Today the hosted database holds a slice built from the committed fixtures: NOWAK, KOWALSKA, KOWALSKI, WIŚNIEWSKA, WIŚNIEWSKI, WÓJCIK and KOWALCZYK (`PROGRESS.md`, "A seven-surname slice is loaded on the hosted database"). Every other search says the dataset does not contain the surname. Rank, rarity and the maps therefore show for seven surnames only.

## 2. Facts that shape the load (checked 2026-09-29)

- **Size.** The derived register is about 16 GB, not the 5,917 MB on record. That figure (TASK-030) predates `--rank` and `--all`. With them a surname carries up to eight claims, and each claim with its evidence, run, assessment and citation takes about 5.1 KB. The rehearsal record gives the measured figure.
- **Supabase.**
  - The organisation "bienos' projects" is on the free plan: a 500 MB database limit. It is billed through the Vercel Marketplace.
  - The project runs PostgreSQL 17.6 on the Micro compute: 1 GB of memory, and a recommended maximum database size of 10 GB.
  - Its platform configuration sets `statement_timeout` to 2 minutes for every session.
  - It has no replication slots, so no slot holds WAL back during a large write.
  - The `postgres` role can `SET session_replication_role`.
- **Supabase disk rules** (`docs/guides/platform/database-size`):
  - Pro includes an 8 GB disk. Growing past it needs the Spend Cap off.
  - Autoscaling adds 50% at 90% full, at most four times in 24 hours.
  - Importing more than 1.5× the current size puts the database into read-only mode. For that case Supabase recommends enlarging the disk by hand first.
- **Runners.** The repository is private, so `ubuntu-24.04` has 2 CPUs, 8 GB of memory and a 14 GB SSD. A job stops at 6 hours. The build ran at about 50 surnames a second on 4 CPUs here, so on 2 it may not finish inside one job.
- **Network.** A Claude Code web session cannot open a PostgreSQL connection to Supabase. Its egress proxy carries HTTPS only: a tunnel to the pooler opened, but no reply came to the protocol's first message. A GitHub runner can reach it.

## 3. Preconditions — the project owner's

1. **Supabase Pro**, with the **Spend Cap off**, for project `xujctkjpvnmcdpximtda`.
2. **The disk enlarged by hand to at least 24 GB before the run**: the 16 GB register, plus WAL, plus room for a retry. Supabase allows four disk changes a day.
3. **Recommended: the Small compute or larger.** 16 GB is above Micro's recommended 10 GB. A larger compute also shortens the load.
4. **The production connection string as a repository secret**, named `PROD_DATABASE_URL`:
   - It uses the session pooler with `?uselibpqcompat=true&sslmode=require`, as in `docs/LOCAL_DATABASE.md`.
   - It is never pasted into a chat.
5. **GitHub's default branch is `main`.** GitHub starts a manual workflow only from a file on the default branch.

No maintenance window is needed. The load is one transaction, and readers see the seven-surname slice until it commits.

## 4. In scope

1. **`.github/workflows/load-register.yml`**, started by hand (`workflow_dispatch`), with two modes. `build` builds and checks; `production` also replaces production's data. Three jobs:
   - **`build-1`** runs `pnpm local:setup` against a PostgreSQL 16 + PostGIS 3.4 container: the pinned image CI uses, with durability off because it is thrown away. The setup downloads the four resources and verifies them against the pinned SHA-256 and byte size. It then migrates, imports the national and regional resources, backfills slugs, and derives with `--rank`, then `--all --rank`. The job stops the setup after 4h50m, then packs the database into the Actions cache. The setup is resumable, so stopping it loses nothing.
   - **`build-2`** restores the database and runs `pnpm local:setup` again, which continues where `build-1` stopped. It then checks the build (item 3), dumps its 19 data tables and counts their rows.
   - **`load`** runs in `production` mode only, and only when the Supabase project ref is typed into `confirm`. It performs the transfer (item 4).
2. **A smoke run on pull requests that change the workflow.** Both build jobs run with `DERIVE_LIMIT=6000`. That exercises the mechanics and measures the runner's rates. It never derives the whole register and never touches production.
3. **A gate before production is touched.**
   - The build must hold exactly 598,476 surnames, 828,264 national values and four source records.
   - The four records must carry exactly the official SHA-256 values.
   - No two `ACTIVE` claims may share a `claim_key` (type, surname and resource).
   - No surname may have more than two `ACTIVE` claims of one type, one per sex-specific file.
   - Outside the smoke run, every surname must carry `CURRENT_POPULATION`, `CURRENT_RANK` and `RARITY_CONTEXT`.
4. **The transfer:**
   - `pnpm db:migrate` against production, which brings `0022` from TASK-036.
   - Then one transaction, run through `psql`:
     - `SET statement_timeout = 0`;
     - `SET session_replication_role = replica`, as in Supabase's restore guide, because the build already enforced the foreign keys;
     - `DELETE` from the 19 data tables;
     - the build's data, restored with `pg_restore --data-only`;
     - `ANALYZE`;
     - `COMMIT`, written only after `pg_restore` has succeeded. If anything fails, production keeps what it had.
   - Then a comparison of every table's row count with the build, and the gate's checks run against production.

   All 19 data tables are written by the importers and the derivation, `places` and `place_names` included; no migration inserts rows. No foreign key points into them from outside. `kysely_migration*`, `spatial_ref_sys` and `runtime_outbox` are neither cleared nor transferred.
5. **A local rehearsal before the workflow is run.**
   - Build the register the same way.
   - Prepare a copy that mimics production:
     - migrated, and seeded like production with the fixture slice (`--slice top:5`);
     - its tables owned by a role that is not a superuser, as Supabase's `postgres` role is not;
     - a database-level `statement_timeout`;
     - `SET` on `session_replication_role` granted to that role.
   - Run the workflow's own step scripts against that copy: the success path, a truncated dump and a failing statement.
6. **After the run:** verify production (§6), then rewrite `STATUS.md` and write a record in `docs/progress/`.

## 5. Out of scope

- **Meaning.** No onomastic source is loaded; that belongs to TASK-032 and later tasks.
- **Code changes to the importers or the derivation.** Those belong to their own tasks, as TASK-036 did. That includes the storage per claim.
- **Keeping future registers up to date.** Each yearly register is a new resource version and a task of its own.
- **The hosting decision.** ADR-0011 names Neon; production runs on Supabase. That stays an open item in `STATUS.md`.
- **Deploying the app.** No redeploy is needed: the app reads the database it is already pointed at.

## 6. Acceptance criteria

1. **AC-1, the register is complete.**
   - Production holds 598,476 surnames.
   - It holds 408,182 + 420,082 national values, and the regional rows the importer reports.
   - It holds four source records carrying the official SHA-256 values in `packages/sources/src/registry.ts`, and none carrying a fixture's hash.
2. **AC-2, derived like the build.** Every data table's row count in production equals the build's.
3. **AC-3, no duplicates.**
   - No two `ACTIVE` claims share a `claim_key`.
   - No surname has more than two `ACTIVE` claims of one type.
4. **AC-4, live.** On `name-atlas-two.vercel.app`:
   - NOWAK and a surname outside the old seven return 200, with population, rank, rarity and the regional map;
   - a surname published nationally but suppressed regionally returns 200 without a map;
   - a surname whose slug carries an ADR-0010 collision suffix opens at its suffixed address;
   - search redirects to the stored slug;
   - the runtime logs show no 5xx.
5. **AC-5, sized.** The production database size is recorded, and it is within the provisioned disk.

## 7. Verification

- **Before the run:**
  - the local rehearsal of §4.5, with its measured size and timings;
  - the smoke run on this pull request, with the runner's rates.
- **The run itself:** the workflow's log, with the gate's figures, the dump's size and the table-by-table comparison.
- **After the run:** the pages in AC-4 with `curl`, and the deployment's runtime logs.
