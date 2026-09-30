# ADR-0011 — the P0 hosting plane: Vercel for the app, Neon for the database

- **Status:** Accepted 2026-09-22.
- **Supersedes:** `docs/canonical/23` §6.2 ("Why Render P0") and `ARCHITECTURE.md` §9's
  single-hosting-plane target, for P0. Both name one coherent Render plane in Frankfurt.
- **Records a decision already taken in practice:** TASK-029 chose Vercel for the app and Supabase
  for the database, and production was deployed on it. That choice was never written to
  `docs/adr/`, so the canonical corpus still said Render while production said otherwise
  (`AGENTS.md` §1 — binding technical decisions live here).
- **Relates to:** ADR-0002 (Kysely over `pg`, `DATABASE_URL` as the only coupling),
  `docs/LOCAL_DATABASE.md`.
- **Superseded in part by:** ADR-0017 (2026-09-30). The database runs on a free Oracle Cloud VM, not
  Neon. The app half of §2 stands.

## 1. Context

Three positions existed at once, which is the problem this ADR closes.

`docs/canonical/23` §6.2 specifies Render, and explicitly names "Vercel web + another API host +
another worker host + another Redis host" as the split to avoid "unless a concrete limitation
appears". `ARCHITECTURE.md` §9 says the same in fewer words.

TASK-029 nevertheless deployed the app to Vercel, and it works: READY in 50 seconds, no
`vercel.json`, no build-command override, no change to the repository, functions verified running in
`fra1` from the live `x-vercel-id` rather than from project settings. The `docs/canonical/23` §6.2
requirement that pointed hardest at Render — "persistent Node processes" for BullMQ workers — is not
yet exercised: ADR-0001 defers the worker to M3, and `apps/worker` still logs a line and exits.

The database side is where the concrete limitation appeared. The register measures **5,917 MB**,
already reduced from 6,974 MB by TASK-030. No provider's free tier holds it — Crunchy Bridge 5 GB,
Render 1 GB and expiring after 30 days, Aiven 1 GB, Neon 0.5 GB, Supabase 500 MB — and a slice is
not a smaller honest version of the dataset, because `universeSize` is a `COUNT(*)` over a source
record's own value set, so truncation computes rank and rarity against the truncated universe rather
than 42,757,839. Hosting is therefore a paid decision whichever way it goes, and the prices differ by
5×:

| Option | ~6 GB, monthly |
|---|---|
| Neon | ~$5 — usage-based, storage $0.35/GB-month, no monthly floor |
| Render | ~$9 — $6 compute plus ~$3 disk |
| Supabase Pro | $25 — 8 GB included |

Supabase's $25 buys Postgres plus Auth, Storage, Realtime and PostgREST. This project uses none of
them: ADR-0002 commits to hand-written SQL migrations run by Kysely's own migrator over `pg`. The
only Supabase feature it relies on is the transaction pooler, which Neon also provides.

## 2. Decision

**P0 runs the app on Vercel in `fra1` and the database on Neon in an EU region. Both halves stay in
Europe.**

- `DATABASE_URL` is the entire coupling. `packages/db/src/config.ts` is its only reader, and
  `createPool` passes the string to `pg` unchanged, so the host is swappable without a code change.
- **Migrations and batch jobs** use the **direct** (unpooled) endpoint. Kysely's migrator takes a
  session-level advisory lock, which a transaction-mode pooler does not carry.
- **The serverless app** uses the **pooled** endpoint, with `max` capped per instance as TASK-029
  set it: on a serverless host the connections in flight are `max × instances`, and the pooler in
  front is what multiplexes them onto real backends.
- PostGIS and `pg_trgm` are enabled by `0001_bootstrap_extensions` as they are everywhere else.

## 3. Why not the alternatives

**Render, as `docs/canonical/23` §6.2 specifies.** Still the better answer for the *shape* the
architecture describes — one plane, persistent processes, BullMQ, Key Value, private networking. It
is rejected for P0 on two grounds: the app already runs on Vercel and was verified there, so moving
it spends real work to satisfy a document rather than a requirement; and nothing at P0 needs the
persistent-process half, because ADR-0001 defers the worker to M3. **This ADR should be revisited
when M3 introduces BullMQ**, at which point the worker needs a host that keeps processes alive and
the single-plane argument regains its force.

**Supabase, as TASK-029 chose.** Works, and is already wired — the integration is installed, the
schema is applied and `DATABASE_URL` is set. Rejected on cost alone: 5× the price for features this
project does not use. Its `public` schema is also served over PostgREST with a browser-visible anon
key, which required enabling RLS on all 22 tables purely to close an exposure that a plain Postgres
host does not create.

**Staying on the free tier of anything.** Rejected: arithmetic. See §1.

## 4. Consequences

- `docs/canonical/23` §6.1's topology diagram is now wrong for P0 in its first two lines. It remains
  read-only (`AGENTS.md` §2); this ADR is the correction.
- The Supabase project's schema becomes redundant once Neon carries it. Nothing is lost — it holds
  no data.
- Object storage (`docs/canonical/23` §6.3, AWS S3 `eu-central-1`) and Key Value are unaffected;
  neither exists yet.
- Development does not depend on either host. `docker-compose.yml` and `docs/LOCAL_DATABASE.md` run
  the complete register locally at no cost, which is where the data lives until there is a reason to
  pay for it.
