# Running the full register locally

How to get a **complete, honest** copy of the register on your own machine, at no
cost. Complete matters: `universeSize` is a `COUNT(*)` over a source record's own
value set, so a partial import silently computes rank and rarity against the
truncated set instead of the real 42,757,839. A slice is not a smaller honest
version of the dataset (`PROGRESS.md`, 2026-09-22).

No hosted plan holds this. The measured database is **5,917 MB**, already reduced
from 6,974 MB by TASK-030. The largest free tier on any provider is 5 GB. Locally
there is no cap.

## What you need

| | |
|---|---|
| Docker | for the database container |
| Node | the version in `.nvmrc` (`nvm use`) |
| pnpm | the version in `package.json`'s `packageManager` (`corepack enable`) |
| Disk | ~10 GB free — 5,917 MB of data plus WAL and working space |
| The PESEL CSVs | the **full** national files. The importer reads bytes already on disk and never downloads; `fixtures/pesel/` holds 22- and 23-row excerpts for tests, not the register |

## 1. Start the database

```bash
docker compose up -d
docker compose ps          # wait for healthy
```

`docker-compose.yml` pins the exact image and digest D-005 fixed, so this is the
same PostgreSQL 16 / PostGIS 3.4 that CI and Testcontainers run.

## 2. Point the repository at it

```bash
cp .env.example .env
```

Then set, exactly as `.env.example` documents:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/name_atlas
```

## 3. Install and create the schema

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
```

Expect 19 migrations, `0001_bootstrap_extensions` through
`0019_snapshot_profile_to_source_record`, then `up to date`.

## 4. Load the register

Timings are measured, from `PROGRESS.md`, not estimates. All four steps are
idempotent and resumable, so a failure part-way through is safe to re-run.

```bash
# ~4m25s — repeat per resource (male, female)
pnpm --filter @name-atlas/sources run import-pesel -- \
  --resource <resource-id> --file <path/to/national.csv> --metadata <path/to/manifest.json>

# ~57s, 1,196,952 rows
pnpm seo:backfill-slugs

# ~55m at 71.1 rows/s — the long one, leave it running
pnpm truth:derive-batch
```

`import-pesel` also takes `--sha256 <hex>` to pin the file's content before it is
decoded. Use it when you have the publisher's checksum.

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

## What this is not

This is a development database. It is not a deployment, it has no backups, and
nothing outside your machine can reach it. Production remains Vercel plus a
hosted PostgreSQL; see `PROGRESS.md` for the current state of that and for why the
hosted half is still empty.
