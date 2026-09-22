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
| The PESEL CSVs | the **full** national files, kept in `data/` (git-ignored) or anywhere outside the repository. **Do not put them in `fixtures/pesel/`** — the excerpts there share the same file names, and overwriting them breaks the test suite. The importer reads bytes already on disk and never downloads; `fixtures/pesel/` holds 22- and 23-row excerpts for tests, not the register |

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

Timings are measured, from `PROGRESS.md`, not estimates. All four steps are
idempotent and resumable, so a failure part-way through is safe to re-run.

```bash
# Male — 408,182 rows, ~4m25s
pnpm exec tsx packages/sources/bin/import-pesel.ts \
  --resource 1148808 \
  --file data/national-male-2026-01-20.csv \
  --metadata fixtures/pesel/source-manifest.json

# Female — 420,082 rows, ~4m25s
pnpm exec tsx packages/sources/bin/import-pesel.ts \
  --resource 1148811 \
  --file data/national-female-2026-01-20.csv \
  --metadata fixtures/pesel/source-manifest.json

# ~57s, 1,196,952 rows
pnpm seo:backfill-slugs

# ~55m at 71.1 rows/s — the long one, leave it running
pnpm truth:derive-batch
```

Run these **from the repository root**, and note it is `pnpm exec tsx <path>`, not
`pnpm --filter ... run import-pesel`. Two reasons, both learned the hard way:
pnpm 10 forwards a `--` separator to the script verbatim, so the script sees `--`
as an argument and dies with `missing value for --`; and `pnpm run` executes with
the working directory set to `packages/sources`, where `data/` and `fixtures/` do
not exist.

The two `--resource` values are the official dane.gov.pl resource IDs, matched by
`findPeselResource` in `packages/sources/src/registry.ts`. There is no `--sha256`
flag here because the registry already carries `official_sha256` and the importer
enforces it regardless — a wrong file fails with `CHECKSUM_MISMATCH` before a byte
is decoded. Pass `--sha256 <hex>` only to assert a different expected digest.

408,182 + 420,082 = **828,264 rows**, deduplicating to roughly **598,476**
surnames across both files.

The two `--resource` values are the official dane.gov.pl resource IDs, matched by
`findPeselResource` in `packages/sources/src/registry.ts`. `--sha256` is optional —
the registry already carries `official_sha256` — but passing it pins the file's
content before it is decoded, which is the point of having a checksum.

408,182 + 420,082 = **828,264 rows**, deduplicating to roughly **598,476**
surnames across both files.

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
