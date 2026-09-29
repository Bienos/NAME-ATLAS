# TASK-035 — Load the real PESEL register into production

- **Status:** SPECIFIED 2026-09-29. The local rehearsal is recorded in `docs/progress/2026-09-29-register-rehearsal.md`.
- **Requested by:** the project owner, who chose "load the real register" on 2026-09-29, after the go-live of #9, #10, #7 and #11.
- **Milestone:** launch. `PROGRESS.md` (2026-09-21): "A launch needs the full register imported, which is what makes rank, rarity and geography answer instead of refusing."
- **Numbering:** TASK-034 is reserved in `STATUS.md` for the section registry; this takes the next number.

## 1. Goal

Production answers for every surname in the 2026-01-20 PESEL register, not for seven.

Today the hosted database holds a slice built from the committed fixtures: NOWAK, KOWALSKA, KOWALSKI, WIŚNIEWSKA, WIŚNIEWSKI, WÓJCIK and KOWALCZYK (`PROGRESS.md`, "A seven-surname slice is loaded on the hosted database"). Every other search says the dataset does not contain the surname. Rank, rarity and the maps therefore show for seven surnames only.

## 2. Preconditions — the project owner's

1. **Storage.** The Supabase organisation that holds project `xujctkjpvnmcdpximtda` must be on a plan with at least 8 GB. It is on the free plan today (500 MB, checked 2026-09-29). The two national resources alone need at least 781 MB before any rank may be derived (`PROGRESS.md`, "Measured: what a rank actually costs"). The fully derived register measured 5,917 MB (TASK-030).
2. **Database access for the session that runs the load.** Either of these:
   - The environment allows the session pooler `aws-0-eu-central-1.pooler.supabase.com` (port 5432) in its network access, and holds the production connection string in the environment variable `PROD_DATABASE_URL`. The string uses the session pooler with `?uselibpqcompat=true&sslmode=require`, as in `docs/LOCAL_DATABASE.md`. The value is never pasted into a chat. A new session picks it up.
   - Or the owner runs §3 steps 3–5 from their own machine, as in `docs/LOCAL_DATABASE.md`.
3. **A maintenance window.** Between clearing the seed and the end of the restore, production pages say the surname is not in the dataset.

## 3. In scope

1. **Build the complete database from the official files.**
   - `DATABASE_URL=<local> pnpm local:setup` against a fresh local PostgreSQL 16 + PostGIS 3.4.
   - It downloads the four resources and verifies them against the pinned SHA-256 and byte size.
   - It imports the national and regional resources, backfills slugs, and derives with `--rank`.
   - `DERIVE_LIMIT` is unset, so every surname is derived.
2. **Rehearse the transfer locally before touching production.**
   - Prepare a second local database that mimics production: migrated, then seeded like production with the fixture slice (`--slice top:5`).
   - Clear the seed there.
   - Restore the build's data into it.
   - Compare it with the build: the same row count in every table the import and derivation write.
3. **Clear production's fixture seed.** Use the list in `docs/LOCAL_DATABASE.md` ("Clear the fixture seed first"), corrected by what step 2 finds. Tables filled by migrations (`places`, `place_names`, `kysely_migration*`) are neither cleared nor transferred.
4. **Transfer the data.** `pg_dump --data-only` of the build (only the tables in step 2's list), then `pg_restore --data-only` into production through the session pooler.
5. **Verify production** (§5), then rewrite `STATUS.md` and write a record in `docs/progress/`.

## 4. Out of scope

- **Meaning.** No onomastic source is loaded; that belongs to TASK-032 and later tasks.
- **Code changes.** If the rehearsal shows the load cannot be done with the existing commands, stop and record why.
- **Keeping future registers up to date.** Each yearly register is a new resource version and a task of its own.
- **The hosting decision.** ADR-0011 names Neon; production runs on Supabase. That stays an open item in `STATUS.md`.
- **Deploying the app.** No redeploy is needed: the app reads the database it is already pointed at.

## 5. Acceptance criteria

1. **AC-1, the register is complete.**
   - Production holds 598,476 surnames.
   - It holds 408,182 + 420,082 national values, and the regional rows the importer reports.
   - It holds four source records carrying the official SHA-256 values in `packages/sources/src/registry.ts`, and none carrying a fixture's hash.
2. **AC-2, derived like the build.** Production's `ACTIVE` claim count per claim type equals the local build's.
3. **AC-3, no duplicates.** No surname has two `ACTIVE` claims of the same type.
4. **AC-4, live.** On `name-atlas-two.vercel.app`:
   - NOWAK and a surname outside the old seven return 200, with population, rank, rarity and the regional map;
   - a surname published nationally but suppressed regionally returns 200 without a map;
   - a surname whose slug carries an ADR-0010 collision suffix opens at its suffixed address;
   - search redirects to the stored slug;
   - the runtime logs show no 5xx.
5. **AC-5, sized.** The production database size is recorded, and it is within the plan.

## 6. Verification

```bash
pnpm local:setup                                  # against the local build database
psql "$DATABASE_URL" -c "select count(*) from surnames"
psql "$DATABASE_URL" -c "select claim_type, count(*) from claims where claim_status = 'ACTIVE' group by 1 order by 1"
psql "$DATABASE_URL" -c "select subject_entity_id, claim_type, count(*) from claims where claim_status = 'ACTIVE' group by 1, 2 having count(*) > 1 limit 5"
psql "$DATABASE_URL" -c "select pg_size_pretty(pg_database_size(current_database()))"
```

Run the same queries against production after the restore, then check the pages in AC-4 with `curl`.
