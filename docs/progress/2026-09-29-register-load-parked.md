# 2026-09-29 — TASK-035 parked: what was measured before stopping

Scope authority: `tasks/035-load-the-register-into-production.md`, now PARKED.

## Decision

The project owner will not move the Supabase organisation "bienos' projects" off the free plan. The complete register does not fit on it, so TASK-035 stops here. Production is unchanged: the seven-surname slice, and 21 of the 22 migrations. Nothing was written to production.

## Measured

### The four files

`fetch-pesel` downloaded all four and verified them against the SHA-256 values pinned in `packages/sources/src/registry.ts`. It did so twice: locally, and on a GitHub runner.

### A local build of the whole register

The build ran on PostgreSQL 16.13 with PostGIS 3.4.2, on 4 CPUs, using `pnpm local:setup` with TASK-036's code.

- **Imports:**
  - 598,476 surnames;
  - 408,182 + 420,082 national values;
  - 646,052 + 694,553 regional values;
  - four source records carrying the official hashes;
  - 1,196,952 slugs, 854 of them with a collision suffix.
- **Step 6** (`derive-batch --rank`, the 270,021 surnames with regional data): the last run derived 239,660 surnames in 3,962.4 s, 60.5 a second, with 0 failures. Earlier, interrupted runs had derived the rest.
- **Step 7** (`derive-batch --all --rank`): stopped by hand at 114,000 surnames when the load was parked. It was running at 86.6 a second, with 0 failures.
- **Size per claim.** The database grew from 5,131 MB to 5,464 MB while `ACTIVE` claims went from 705,750 to 772,967: 5.07 KB a claim. A surname with regional data carries up to eight claims, four types from each of the two sex-specific files. The others carry about three.
- **Size mid-build.** 7,432 MB with 167,825 of the 270,021 regional surnames derived.
- **Projection** for the complete build: about 16 GB. It was not measured at completion. The 5,917 MB on record for TASK-030 predates `--rank` and `--all`.
- **Where the space went,** at 1.22 million claims:

  | Rows | Count | Size |
  |---|---|---|
  | `DERIVED_STATISTIC` evidence items with a subject | 1,206,903 | 774 MB |
  | `OFFICIAL_DATASET_FIELD` evidence items | 603,452 | 452 MB |
  | Subject-less universe items, one pair per ranked surname | 310,527 + 310,524 | 296 MB |
  | Research runs, one per claim | 1,224,721 | 521 MB |

  Sizes are row bytes only, without indexes.
- **The regional side on its own,** estimated from table sizes in proportion to rows:

  | Part | Rows | Size |
  |---|---|---|
  | Regional values | 1,340,605 | 261 MB |
  | Regional snapshots | 395,217 | 95 MB |
  | The 270,021 surnames it covers, with their entities, name forms and slugs | — | 327 MB |

### What a partial import can derive

- `CURRENT_POPULATION` has no universe gate.
- `CURRENT_RANK`, `RARITY_CONTEXT` and `CURRENT_DISTRIBUTION` each need their complete universe. `packages/truth/src/distribution.ts` says so: "an incomplete regional import has no distribution, and there is no bypass".
- `import-pesel-regional.ts` has no `--slice`: it imports the whole regional file and creates the surnames it needs.

So on the free plan, a national `--slice top:N` gives population only.

### Supabase, project `xujctkjpvnmcdpximtda`

Read through SQL and the Supabase documentation on 2026-09-29.

- **Plan.** The organisation is on the free plan, and is a Vercel Marketplace organisation.
- **Server.** PostgreSQL 17.6, 20 MB of data.
- **Settings.**
  - `statement_timeout` is 120,000 ms, set in `platform-defaults.conf`, so every session has it.
  - `max_wal_size` is 1 GB, `max_connections` 60 and `shared_buffers` 224 MB.
- **Replication.** There are no replication slots.
- **Replica mode.** `SET LOCAL session_replication_role = replica` succeeds as `postgres`. `set_config('session_replication_role', …)` is refused.
- **Documented limits:**
  - A free project goes read-only above 500 MB of database.
  - Pro includes an 8 GB disk, and grows past it only with the Spend Cap off.
  - Importing more than 1.5× the current size puts a project into read-only mode unless the disk was enlarged by hand first.
  - Micro compute's recommended maximum is 10 GB.

### The load workflow

It is not merged. It is `.github/workflows/load-register.yml` at commit `945e98f`.

- **Lint.** `actionlint` 1.7.7 with `shellcheck` 0.10.0 found nothing. `prettier --check` and `pnpm check:ids` passed.
- **The load step's own script,** extracted from the workflow and run locally against a copy seeded like production. The copy's owner was a role that is not a superuser. The database had `statement_timeout = '2s'`, and the role had been granted `SET` on `session_replication_role`:

  | Case | Result |
  |---|---|
  | Success | exit 0; committed; every table count equal to the dump's |
  | Dump truncated to 60% | exit 1 (`pg_restore: error: could not read from input file: end of file`); the copy untouched |
  | A statement that fails | exit 3; the copy untouched |

- **A wrong gate, corrected.** The first version of the duplicate check counted a surname's male and female claims as duplicates. It now checks one `ACTIVE` claim per `claim_key`, which the partial unique index `claims_active_claim_key_uq` already enforces.
- **Smoke run** 36568936275, on `ubuntu-24.04`:
  - **Runner:** 2 CPUs and 7 GB of memory. The root disk was 72 GB with 13 GB free, and 34 GB free after unused toolchains were removed, which took 1m38s. There was no `/mnt`. `psql` was 16.15.
  - **Timings:**

    | Step | Time |
    |---|---|
    | Download of the four files | 2m51s |
    | `db:migrate` | 2 s |
    | National imports | 65 s and 57 s |
    | Regional imports | 32 s and 36 s |
    | Slugs | 50.5 s |

  - **Derivation:** 1.3 surnames a second. That run was on `main` before #13 merged, so it measured the code without TASK-036.
  - It was cancelled at 13:17 UTC, when the load was parked.

## Not verified

- The size of the complete build: projected, not measured.
- The derivation's rate on a 2-CPU runner with TASK-036.
- The full-size transfer: the dump, the restore into a copy of production, and the comparison.
- How many surnames a population-only slice fits in 500 MB.
- Anything in production: nothing was written to it.
