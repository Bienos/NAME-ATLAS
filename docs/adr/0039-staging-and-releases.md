# ADR-0039 — A staging site from `main`, and releases to production

- **Status:** Proposed 2026-10-04. It becomes accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-04
- **Deciders:** the project owner. They asked for "one live product" and "a second test environment" that takes every change, with everything released to the live site at once when it is ready. Offered the design below, they chose the address **`staging.name-atlas.pl`** and **a separate database**.
- **Amends:** `STATUS.md`'s "Deploys: from `main`, automatically" (the owner set Vercel's production branch to `main` on 2026-09-30); `AGENTS.md` §8 and §11 gain one line each.
- **Relates to:** ADR-0017 (the database VM), ADR-0020 §2.10 (migration, then deploy), `ARCHITECTURE.md` §9 (separate environments), `docs/DOMAIN_SETUP.md`.

## Context

Every merge into `main` went live on name-atlas.pl a minute later. There was no place to look at merged work before readers saw it, and every pull request's own preview build counted against Vercel's daily deployment limit, which #94's merge hit. Preview builds also had no database: every Vercel variable, `DATABASE_URL` included, targets Production only.

## Decision

1. **`main` stays the one line of development.** Tasks still branch from `main` and merge into it through a pull request; numbering and `pnpm check:ids` are unchanged (`AGENTS.md` §11).
2. **`main` is the staging site.** Vercel builds every push to `main` as a preview deployment, served at **`staging.name-atlas.pl`** (a project domain assigned to the git branch `main`). Vercel Authentication (the project's Standard Protection) keeps it to signed-in members of the Vercel team, and `SEO_INDEXING_ENABLED` stays unset there, so its `robots.txt` disallows everything.
3. **The branch `production` is the live site.** Vercel's production branch becomes `production`. Only the **Release** workflow (`.github/workflows/release.yml`, run by hand) moves it, and only forward: to a commit of `main` on which CI's `verify` job passed and whose every migration the production database has already applied. A release is a fast-forward push; it never rewrites history. Rolling back is Vercel's Instant Rollback.
4. **Only `main` and `production` are built.** `apps/web/vercel.json` sets `git.deploymentEnabled` to `false` for every other branch, so a task branch's pushes no longer spend the daily deployment limit. Pull requests are reviewed on CI and on their diff; their result is seen on staging after the merge.
5. **Staging has its own database: `name_atlas_staging`**, on the same PostgreSQL cluster on the VM as `name_atlas`, which keeps it free (ADR-0017). `ops/vm/staging.sh`, run by the `Register VM` workflow:
   - `staging` copies production into it with `pg_dump | pg_restore` (no dump file), **without the rows of `accounts` and `family`**, so no reader's address or tree reaches staging; then it migrates the copy to the pushed commit.
   - `staging-migrate` migrates the copy only, so a merged migration reaches staging without touching production.
   - Its role, `nameatlas_staging_web`, is read-only like `nameatlas_web`, has its own password (`VM_DB_STAGING_WEB_PASSWORD`), may connect to the copy only, and no other application role may connect to the copy. PgBouncer gives the copy its own pool of at most 10 server connections, so staging cannot take production's.
6. **Staging's Vercel variables are Preview variables scoped to the branch `main`**: `DATABASE_URL` naming the staging role and database. Nothing else is copied from Production. Accounts, the family tree, mail, Google sign-in and payments stay off on staging until a later change gives staging its own credentials for them.

## Consequences

- A merge changes staging only. name-atlas.pl changes when the owner runs Release, and then takes everything merged since the last release at once.
- A change with a migration goes: merge; `staging-migrate`; check staging; apply the migration to production (the Register VM step that applies pending migrations, as today); Release. The Release workflow refuses until production has the migration.
- The production steps that migrate (`accounts`, `archive`, `bearers`, `meanings`) run `main`'s tree, so they apply every migration merged so far, released or not. Migrations stay additive, as they are today, so the live code keeps working against a newer schema.
- Staging's data is production's as of the last `staging` run. Loads that write production (`archive`, `bearers`, `meanings`) reach staging at the next refresh.
- The copy reads the whole production database on the same 2-OCPU VM, at lower CPU and disk priority than the site. Production may be slower while it runs, and staging is unavailable until it finishes. Its duration on the real database has not been measured.
- The copy needs disk for one more database of production's size; `staging.sh` refuses, changing nothing, when there is not room for it plus a fifth and 10 GiB.
- The Google Analytics measurement ID is a constant in the code (ADR-0038), so a visitor to staging who accepts the banner is counted in production's property. Only Vercel team members can open staging; `ARCHITECTURE.md` §9's separate analytics project for staging is not met until a later change gates the tag on the environment.
- "Merged" no longer means "live". `STATUS.md`'s Production section names the commit `production` points at.
