# TASK-035 — Load the real PESEL register into production

- **Status:** SPECIFIED 2026-09-29. The local rehearsal is recorded in `docs/progress/2026-09-29-register-rehearsal.md`.
- **Requested by:** the project owner, who chose "load the real register" on 2026-09-29, after the go-live of #9, #10, #7 and #11. They then chose a GitHub Actions workflow for the transfer.
- **Milestone:** launch. `PROGRESS.md` (2026-09-21): "A launch needs the full register imported, which is what makes rank, rarity and geography answer instead of refusing."
- **Numbering:** TASK-034 is reserved in `STATUS.md` for the section registry; this takes the next number.
- **Depends on:** TASK-036 (#13). Without it `derive-batch --rank` needs days, and a GitHub job stops at 6 hours.

## 1. Goal

Production answers for every surname in the 2026-01-20 PESEL register, not for seven.

Today the hosted database holds a slice built from the committed fixtures: NOWAK, KOWALSKA, KOWALSKI, WIŚNIEWSKA, WIŚNIEWSKI, WÓJCIK and KOWALCZYK (`PROGRESS.md`, "A seven-surname slice is loaded on the hosted database"). Every other search says the dataset does not contain the surname. Rank, rarity and the maps therefore show for seven surnames only.

## 2. Preconditions — the project owner's

1. **Storage.** The Supabase organisation that holds project `xujctkjpvnmcdpximtda` must be on a plan with at least 8 GB. It is on the free plan today (500 MB, checked 2026-09-29). The two national resources alone need at least 781 MB before any rank may be derived (`PROGRESS.md`, "Measured: what a rank actually costs"). The fully derived register measured 5,917 MB (TASK-030).
2. **The production connection string as a repository secret**, named `PROD_DATABASE_URL`:
   - It uses the session pooler with `?uselibpqcompat=true&sslmode=require`, as in `docs/LOCAL_DATABASE.md`.
   - It is never pasted into a chat.
   - A Claude Code web session cannot open a PostgreSQL connection to Supabase. Its egress proxy carries HTTPS only: on 2026-09-29 a tunnel to the pooler opened, but no reply came to the protocol's first message. So the load runs on a GitHub runner instead.
3. **GitHub's default branch is `main`.** GitHub starts a manual workflow only from a file on the default branch.
4. **A maintenance window.** The restore is not one transaction. Between clearing the seed and the end of the restore, production pages show partial data.

## 3. In scope

1. **`.github/workflows/load-register.yml`, manual only.** It has two modes:
   - `build` builds the database on the runner and reports it; it never connects to production.
   - `production` also replaces production's data, and only if the build passes the gate in step 2.

   The build is `pnpm local:setup` against the job's PostgreSQL 16 + PostGIS 3.4 service, the pinned image CI uses. It downloads the four resources and verifies them against the pinned SHA-256 and byte size. It imports the national and regional resources, backfills slugs, and derives every surname with `--rank`.
2. **A gate before production is touched.**
   - The build must hold exactly 598,476 surnames, 828,264 national values and four source records.
   - The four records must carry exactly the official SHA-256 values.
   - No surname may have two `ACTIVE` claims of one type.
3. **The transfer:**
   - `pnpm db:migrate` against production, which brings `0022` from TASK-036;
   - `TRUNCATE` of the 19 data tables;
   - `pg_restore --data-only` of the build's dump;
   - `ANALYZE`;
   - then a comparison of every table's row count with the build.

   All 19 data tables are written by the importers and the derivation, `places` and `place_names` included; no migration inserts rows. `kysely_migration*`, `spatial_ref_sys` and `runtime_outbox` are neither cleared nor transferred.
4. **A local rehearsal before the workflow is run.**
   - Build the register the same way.
   - Prepare a copy that mimics production: migrated, seeded like production with the fixture slice (`--slice top:5`), its tables owned by a role that is not a superuser, as Supabase's `postgres` role is not.
   - Run the workflow's own transfer commands against that copy.
5. **After the run:** verify production (§5), then rewrite `STATUS.md` and write a record in `docs/progress/`.

## 4. Out of scope

- **Meaning.** No onomastic source is loaded; that belongs to TASK-032 and later tasks.
- **Code changes to the importers or the derivation.** Those belong to their own tasks, as TASK-036 did.
- **Keeping future registers up to date.** Each yearly register is a new resource version and a task of its own.
- **The hosting decision.** ADR-0011 names Neon; production runs on Supabase. That stays an open item in `STATUS.md`.
- **Deploying the app.** No redeploy is needed: the app reads the database it is already pointed at.

## 5. Acceptance criteria

1. **AC-1, the register is complete.**
   - Production holds 598,476 surnames.
   - It holds 408,182 + 420,082 national values, and the regional rows the importer reports.
   - It holds four source records carrying the official SHA-256 values in `packages/sources/src/registry.ts`, and none carrying a fixture's hash.
2. **AC-2, derived like the build.** Every data table's row count in production equals the build's.
3. **AC-3, no duplicates.** No surname has two `ACTIVE` claims of the same type.
4. **AC-4, live.** On `name-atlas-two.vercel.app`:
   - NOWAK and a surname outside the old seven return 200, with population, rank, rarity and the regional map;
   - a surname published nationally but suppressed regionally returns 200 without a map;
   - a surname whose slug carries an ADR-0010 collision suffix opens at its suffixed address;
   - search redirects to the stored slug;
   - the runtime logs show no 5xx.
5. **AC-5, sized.** The production database size is recorded, and it is within the plan.

## 6. Verification

- The workflow's own log: the gate's figures, the dump's size, and the table-by-table comparison.
- Then the pages in AC-4 with `curl`, and the deployment's runtime logs.
- Before the workflow is run, the local rehearsal of §3.4, with its measured size and timings.
