# Running the full register locally

How to get a **complete, honest** copy of the register on your own machine, at no
cost. Complete matters: `universeSize` is a `COUNT(*)` over a source record's own
value set, so a partial import silently computes rank and rarity against the
truncated set instead of the real 42,757,839. A slice is not a smaller honest
version of the dataset (`PROGRESS.md`, 2026-09-22).

No hosted plan holds this. The measured database is **5,917 MB**, already reduced
from 6,974 MB by TASK-030. The largest free tier on any provider is 5 GB. Locally
there is no cap.

## Quick start

With Docker, Node 22 and pnpm installed, from the repository root:

```bash
docker compose up -d
pnpm install --frozen-lockfile
pnpm local:setup
```

`local:setup` (`scripts/local-setup.sh`) runs every step below in order:
downloads the four official PESEL files into `data/` and refuses any whose size or
SHA-256 differs from `packages/sources/src/registry.ts`, migrates, imports all four,
assigns page addresses, and derives every claim — first for the surnames with
regional data, then (`--all --rank`) population, rank and rarity for the rest. It is idempotent — re-run it after
a failure and it continues. Set `DERIVE_LIMIT=1000` to derive only the first 1,000
surnames for a quick look. Every other surname's page then says the register lists it but its
figures are not prepared yet. To prepare one, run `pnpm demo:surname`, `demo:surname-distribution`,
`demo:surname-rank` and `demo:surname-rarity` with the surname (about 30 s together); to prepare
the rest, run `pnpm local:setup` again without the limit. The sections below are the same steps by hand.

## What you need

| | |
|---|---|
| Docker | for the database container |
| Node | the version in `.nvmrc` (`nvm use`) |
| pnpm | the version in `package.json`'s `packageManager` (`corepack enable`) |
| Disk | ~10 GB free — 5,917 MB of data plus WAL and working space |
| The PESEL CSVs | ~45 MB for all four; `pnpm fetch:pesel` downloads and verifies them. The **full** files, kept in `data/` (git-ignored) or anywhere outside the repository. **Do not put them in `fixtures/pesel/`** — the excerpts there share the same file names, and overwriting them breaks the test suite. The importer reads bytes already on disk and never downloads; `fixtures/pesel/` holds 22- and 23-row excerpts for tests, not the register |

## 1. Start the database

```bash
docker compose up -d
docker compose ps          # wait for healthy
```

`docker-compose.yml` pins the exact image and digest D-005 fixed, so this is the
same PostgreSQL 16 / PostGIS 3.4 that CI and Testcontainers run.

## 2. Point the repository at it

**Export it in the shell. Do not put it in `.env`** — nothing in this repository
reads a `.env` file: no dotenv, no `--env-file`. `.env.example` documents variable
names only (`AGENTS.md` §6) and `packages/db/src/config.ts` reads `process.env`
directly, so a `.env` file is silently ignored and every command fails with
`MissingDatabaseUrlError`.

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/name_atlas"
echo $DATABASE_URL
```

`export` matters: a bare `DATABASE_URL=...` sets a shell variable that child
processes never see. The value lasts for that terminal window only, so export it
again in any new tab — including the one you leave `truth:derive-batch` running in.

## 3. Install and create the schema

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
```

Expect 19 migrations, `0001_bootstrap_extensions` through
`0019_snapshot_profile_to_source_record`, then `up to date`.

## 4. Load the register

Timings are measured, from `PROGRESS.md`, not estimates. Every step is
idempotent and resumable, so a failure part-way through is safe to re-run.

```bash
# National male — 408,182 rows, ~4m25s
pnpm exec tsx packages/sources/bin/import-pesel.ts \
  --resource 1148808 \
  --file data/national-male-2026-01-20.csv \
  --metadata fixtures/pesel/source-manifest.json

# National female — 420,082 rows, ~4m25s
pnpm exec tsx packages/sources/bin/import-pesel.ts \
  --resource 1148811 \
  --file data/national-female-2026-01-20.csv \
  --metadata fixtures/pesel/source-manifest.json

# Regional male and female — 646,052 and 694,553 rows (timing not recorded separately)
pnpm exec tsx packages/sources/bin/import-pesel-regional.ts \
  --resource 1148786 \
  --file data/regional-male-2026-01-20.csv \
  --metadata fixtures/pesel/source-manifest.json
pnpm exec tsx packages/sources/bin/import-pesel-regional.ts \
  --resource 1148790 \
  --file data/regional-female-2026-01-20.csv \
  --metadata fixtures/pesel/source-manifest.json

# ~57s, 1,196,952 rows
pnpm seo:backfill-slugs

# ~55m at 71.1 rows/s — the long one, leave it running
pnpm truth:derive-batch --rank
```

**Do not skip the regional imports.** The regional files have their own importer
(`import-pesel-regional.ts`; the national one refuses their header with
`SCHEMA_VIOLATION`), and `truth:derive-batch` without `--all` derives only the
surnames that appear in them. Without them it has nothing to do.

`--rank` adds `CURRENT_RANK` and `RARITY_CONTEXT`. The rank itself is now one
grouped query per resource and a lookup per surname (measured on a 408,182-row
universe: 100 ms once, then 0.25 µs a surname). The ~55m above was measured
without `--rank`; the whole run with it has not been timed since that change.

Run these **from the repository root**, and note it is `pnpm exec tsx <path>`, not
`pnpm --filter ... run import-pesel`. Two reasons, both learned the hard way:
pnpm 10 forwards a `--` separator to the script verbatim, so the script sees `--`
as an argument and dies with `missing value for --`; and `pnpm run` executes with
the working directory set to `packages/sources`, where `data/` and `fixtures/` do
not exist.

The `--resource` values are the official dane.gov.pl resource IDs, matched by
`findPeselResource` in `packages/sources/src/registry.ts`. There is no `--sha256`
flag here because the registry already carries `official_sha256` and the importer
enforces it regardless — a wrong file fails with `CHECKSUM_MISMATCH` before a byte
is decoded. Pass `--sha256 <hex>` only to assert a different expected digest.

408,182 + 420,082 = **828,264 national rows**, deduplicating to roughly
**598,476** surnames across both files.

### Without the full files: the committed excerpts

To see the whole stack run before you have the CSVs, load the 22- and 23-row
excerpts in `fixtures/pesel/`. They are not the official files, so each import
needs its own digest, and the completeness gate will then — correctly — withhold
rank, rarity and regional distribution:

```bash
for r in "1148808 national-male" "1148811 national-female"; do set -- $r
  f=fixtures/pesel/$2-2026-01-20.csv
  pnpm exec tsx packages/sources/bin/import-pesel.ts --resource $1 --file $f \
    --metadata fixtures/pesel/source-manifest.json --sha256 $(sha256sum $f | cut -d' ' -f1)
done
for r in "1148786 regional-male" "1148790 regional-female"; do set -- $r
  f=fixtures/pesel/$2-2026-01-20.csv
  pnpm exec tsx packages/sources/bin/import-pesel-regional.ts --resource $1 --file $f \
    --metadata fixtures/pesel/source-manifest.json --sha256 $(sha256sum $f | cut -d' ' -f1)
done
pnpm seo:backfill-slugs
pnpm truth:derive-batch --all --rank
pnpm --filter ./apps/web build && (cd apps/web && pnpm start -p 3100)
```

Then open `http://localhost:3100/pl/nazwisko/nowak`: NOWAK's two counts, sourced
and dated, and an explicit "the loaded set is not complete" in place of rarity
and distribution.

## 5. Check it landed

```bash
psql "$DATABASE_URL" -c "select count(*) from surnames"
psql "$DATABASE_URL" -c "select extname, extversion from pg_extension where extname in ('postgis','pg_trgm')"
pnpm test:integration
```

The integration suite runs against a real database and asserts the §9 invariants
directly, so a green run is the real check — not the row counts.

## Everyday use

```bash
docker compose stop       # keep the data
docker compose start
docker compose down -v    # DESTROY the data; a reload is another ~1 hour
```

## Loading a slice into a small hosted database

The full register needs ~5,917 MB. Every provider's free tier is smaller, so
`--slice` persists part of a resource for an environment that cannot hold all of
it. From `PROGRESS.md`'s measured estimate:

| tier | surnames | people covered |
| --- | ---: | ---: |
| 500 MB (Supabase / Neon free) | ~5,673 | **51.25%** |
| 1 GB | ~14,144 | 65.32% |
| 2 GB | ~39,676 | 80.66% |
| 8 GB | 598,476 (all) | 100% |

Surname frequency is steeply long-tailed, so ~5,000 surnames covers about half
the population and most searches land.

```bash
pnpm exec tsx packages/sources/bin/import-pesel.ts \
  --resource 1148808 \
  --file data/national-male-2026-01-20.csv \
  --metadata fixtures/pesel/source-manifest.json \
  --slice top:5000
```

`--slice top:N` keeps the N largest counts; `--slice prefix:A-F` keeps an
inclusive letter range, folding Polish diacritics onto their base letter so
`Ćwik` files under C and `Łuczak` under L. A surname whose first character is
not a Latin letter is never in a range, and is excluded rather than guessed at.

### What a slice does to the figures, and why that is safe

The whole file is still read, checksummed and counted — `rows read` stays the
resource's real size and `content_hash` stays the real file's digest. Only the
persisted rows are fewer, which is reported as its own `rows excluded` bucket
rather than folded into `rows quarantined`: a quarantined row is one the
importer could not trust, an excluded row is one it never looked at.

The universe completeness gate then compares persisted rows against the
registry's `official_row_count`, returns `ROW_COUNT_SHORT`, and the read path
withholds rank and rarity with `NO_COMPLETE_UNIVERSE` — *"Nie można podać tej
wartości, bo wgrany zbiór nie jest kompletny."*

So a sliced deployment shows **real counts with real citations**, and **no rank
and no rarity**. That is not a limitation to work around: TASK-009 built that
gate because a rank over a fragment would assert "NOWAK is rank 1 of 22" in the
language of a national ranking, and be false from rank 16 on. The gate is
unconditional — AC-03 asserts no flag can pass it, and `--slice` adds none.

Verified on a 22-row fixture sliced to `top:5`: 5 `CURRENT_POPULATION` claims
were derived, and zero `CURRENT_RANK` or `RARITY_CONTEXT`.

## What this is not

This is a development database. It is not a deployment, it has no backups, and
nothing outside your machine can reach it. Production remains Vercel plus a
hosted PostgreSQL; see `PROGRESS.md` for the current state of that and for why the
hosted half is still empty.

## Loading a slice into the hosted database — from your own machine

This has to run from a machine that has the CSVs and can open a socket to the
pooler. A Claude Code web session cannot: three things were checked on
2026-09-22 and all three refuse.

| Checked | Result |
| --- | --- |
| `fixtures/pesel/national-*.csv` | 22 and 23 data rows — enough for ~22 surnames, not 1,000 |
| `https://api.dane.gov.pl/...` | proxy answers `403` to `CONNECT`; `recentRelayFailures` records it as a policy denial |
| TCP to `aws-0-eu-central-1.pooler.supabase.com` :5432 and :6543 | both refused |

So the register cannot be fetched there and the database cannot be reached
there. The steps below are the whole job; they take a few minutes.

### 0. Clear the fixture seed first

The hosted database currently holds seven surnames imported from the committed
fixtures. Those source records carry the *fixture's* `content_hash`, not the
official one, so a real import creates a **second** source record for the same
resource and every surname in both ends up with duplicate claims.

```sql
DELETE FROM claim_evidence;   DELETE FROM confidence_assessments;
DELETE FROM citations;        DELETE FROM claims;
DELETE FROM evidence_items;   DELETE FROM distribution_values;
DELETE FROM distribution_snapshots; DELETE FROM research_runs;
DELETE FROM surname_slugs;    DELETE FROM name_forms;
DELETE FROM surnames;         DELETE FROM knowledge_entities;
DELETE FROM source_records;   DELETE FROM sources;
DELETE FROM rights_profiles;
```

### 1. Point `DATABASE_URL` at the session pooler

Use port **5432**, not 6543. 6543 is transaction mode and is the right choice
for the app's short queries; 5432 is session mode and is the safer port for a
bulk load that holds a connection across many statements. (Not verified against
this importer — if 5432 refuses, 6543 is worth trying.)

```bash
export DATABASE_URL='postgresql://postgres.xujctkjpvnmcdpximtda:<HASŁO>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?uselibpqcompat=true&sslmode=require'
```

`uselibpqcompat=true` is not optional — see the 2026-09-22 entry in
`PROGRESS.md` for why `sslmode=require` alone means `verify-full` and drops the
connection before any query runs.

### 2. Import 1,000 surnames from each resource

Point `--file` at the real downloaded CSVs, not at `fixtures/`.

```bash
pnpm exec tsx packages/sources/bin/import-pesel.ts \
  --resource 1148808 --file data/national-male-2026-01-20.csv \
  --metadata fixtures/pesel/source-manifest.json --slice top:1000

pnpm exec tsx packages/sources/bin/import-pesel.ts \
  --resource 1148811 --file data/national-female-2026-01-20.csv \
  --metadata fixtures/pesel/source-manifest.json --slice top:1000
```

`top:1000` keeps the thousand most frequent surnames in each resource, so the
result is roughly 1,300 distinct surnames — the two lists overlap but are not
the same list. Well inside the 500 MB free tier, whose measured ceiling is
~5,673 surnames.

The importer prints a reconciliation report. `rowsExcludedBySlice` will be large
and that is the point; `rowsRead` must equal
`rowsImported + rowsQuarantined + rowsExcludedBySlice` or it throws.

### 3. Derive the claims

```bash
pnpm exec tsx packages/truth/bin/derive-batch.ts --all
```

`--all` is required here. Without it the job only targets surnames carrying
regional evidence, and no regional resource has been imported, so it would
derive nothing.

### 4. What you will and will not see afterwards

Every one of those surnames gets a full page: counts, confidence, source,
licence, limitations. **Rank and rarity stay withheld** — the universe gate
compares the persisted snapshot count against the registry's
`official_row_count` (408,182 and 420,082), and 1,000 is short of it. That is
the gate working, not a fault, and no flag overrides it.

## The whole register, locally, with rank — the free path

A local Postgres has no tier. The complete national universe is 781 MB and the
register with every page derived is 7.8 GB, which is nothing on a laptop disk,
so the prototype that a hosted free tier cannot hold runs locally in full.

```bash
docker compose up -d
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/name_atlas'
pnpm db:migrate

# The real files, and NO --slice: a slice fails the universe gate and there is
# then no rank to derive.
pnpm exec tsx packages/sources/bin/import-pesel.ts \
  --resource 1148808 --file data/national-male-2026-01-20.csv \
  --metadata fixtures/pesel/source-manifest.json
pnpm exec tsx packages/sources/bin/import-pesel.ts \
  --resource 1148811 --file data/national-female-2026-01-20.csv \
  --metadata fixtures/pesel/source-manifest.json

pnpm exec tsx packages/truth/bin/derive-batch.ts --all --rank --limit 10000
pnpm --filter web dev            # http://localhost:3000
```

`--rank` is what puts `CURRENT_RANK` and `RARITY_CONTEXT` on the page; without
it `derive-batch` derives population and regional distribution only, and the
"Jak rzadkie" section stays a stated gap.

`--limit` is worth keeping. Measured throughput with `--rank` is 11.3
surnames/s, so 10,000 pages take about 15 minutes and the full 598,476 about
15 hours. The run is resumable and idempotent — re-running continues rather
than restarting — so raising the limit later costs only the new surnames.

Without `--rank` the same job runs at 261/s, because rank and rarity are what
cost.
