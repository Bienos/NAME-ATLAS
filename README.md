# Name Atlas

Sourced answers about Polish surnames: how many people are registered with one, how rare it is, where
its bearers have a permanent registered residence, and — where a citable work says so — what it means.
Every figure carries its source, its dataset date and an assessment of how well the evidence supports
it. Missing data is stated as missing, never as zero.

This repository is the implementation. The rules it is built under are in **`AGENTS.md`** (read that
first if you are going to change anything) and the product it is building is defined in
**`PRODUCT.md`**. `STATUS.md` says what is live, what is next and what is blocked, and
`docs/progress/` records each verified change.

## Requirements

- Node **≥ 22.12 < 23** and pnpm (`packageManager` in `package.json` pins the version)
- PostgreSQL **16** with **PostGIS** and **pg_trgm** — the pinned image is
  `postgis/postgis:16-3.4` (see `packages/testing/src/postgres-container.ts`)

## Getting started

```bash
pnpm install
docker compose up -d          # the pinned PostgreSQL 16 + PostGIS image, or any equivalent server
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/name_atlas
pnpm db:migrate               # applies packages/db/migrations in order
pnpm --filter web dev         # the public app on http://localhost:3000
```

Export variables in the shell. Nothing in this repository reads a `.env` file (no dotenv, no
`--env-file`); `.env.example` only lists the variables and the file that reads each one.

The app answers nothing until a source is ingested. To load the committed excerpt fixtures, run
this from the repository root. `pnpm --filter … run` would run the CLI inside `packages/sources`,
where these relative paths do not exist (`docs/LOCAL_DATABASE.md`):

```bash
pnpm exec tsx packages/sources/bin/import-pesel.ts \
  --resource 1148808 \
  --file fixtures/pesel/national-male-2026-01-20.csv \
  --metadata docs/sources/acquisition/2026-09-18/metadata/pesel_national_2026_male_1148808.official_resource.json \
  --sha256 "$(sha256sum fixtures/pesel/national-male-2026-01-20.csv | cut -d' ' -f1)"
```

Those fixtures are 22–40 row excerpts, so every derived statistic over them is correctly **refused**:
a rank or a rarity figure needs a complete resource version, and the completeness gate checks the
checksum and the row count against the registry. The full resources are not committed — see
`docs/sources/pesel.md` for what they are and how they were verified.

Then derive and read:

```bash
pnpm demo:surname NOWAK              # the CURRENT_POPULATION chain
pnpm demo:surname-rarity NOWAK       # 1-in-X over the published universe
pnpm demo:surname-distribution NOWAK # per-voivodeship registered residence
pnpm demo:surname-meaning NOWAK      # a sourced meaning, or an honest gap
```

## Layout

| Path | What it is |
|---|---|
| `apps/web` | The public app: search, the canonical surname page, the read API |
| `apps/admin` | The read-only evidence inspector (gated off; no authentication exists yet) |
| `apps/worker` | The BullMQ worker — asynchronous derivation, never on the read path |
| `packages/resolver` | Surname normalisation, exact resolution, fuzzy candidates |
| `packages/sources` | Source registry, fail-closed parsers, importers |
| `packages/truth` | Evidence → claim → confidence → citation, and the read projection |
| `packages/contracts` | The wire contract, as Zod schemas |
| `packages/db` | Kysely types, pool, migrations |
| `docs/` | `adr/` decisions, `contracts/` wire contracts, `canonical/` the read-only specification |

`docs/CODEMAP.md` has the full map. `docs/canonical/` is **read-only** — see `AGENTS.md` §2.

## Commands

```bash
pnpm typecheck        # tsc across every project
pnpm lint             # eslint
pnpm format:check     # prettier
pnpm test             # unit tests, no database
pnpm test:integration # real PostgreSQL; needs Docker, or TEST_DATABASE_URL for an existing server
pnpm build            # every app and package
```

`pnpm test:integration` starts the pinned PostGIS container. Where a container runtime is not
available, point it at a running server instead — it creates and drops a fresh database per suite:

```bash
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/postgres pnpm test:integration
```

## Environment

`.env.example` documents every variable the code reads. The ones that change behaviour:

| Variable | Effect |
|---|---|
| `DATABASE_URL` | Required. Everything else refuses to start without it. |
| `SITE_ORIGIN` | The public origin used for canonical URLs, Open Graph URLs and the share link. Unset renders relative paths. |
| `SEO_INDEXING_ENABLED` | `true` lets a page be indexed when `docs/canonical/21` §42's policy passes. Unset means every page is `noindex` — the alpha default (ADR-0009). |
| `ADMIN_INSPECTOR_ENABLED` | `true` lets the admin inspector answer. It is **not** authentication; the console must not be reachable from a network. |
| `REDIS_URL` | The worker's queue. Not read by the public app. |
| `LOG_LEVEL` | `debug`/`info`/`warn`/`error`, default `info`. |

## What this does not do

No large language model is used anywhere, for anything. No meaning, origin, date, place or family link
is ever generated: if no citable source says it, the product says it does not know. Surname evidence
establishes nothing about an individual's ancestry, ethnicity, nationality or family, and no surface
here implies otherwise.
