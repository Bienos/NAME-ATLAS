# Name Atlas — session handoff

Updated **2026-09-21**. This file records where the work stands and what the next action is. It is
facts only; `PROGRESS.md` holds the detail and `AGENTS.md` holds the rules.

## State

| | |
|---|---|
| Branch | `claude/elegant-archimedes-w5ony1` |
| Last commit before this session | `d3ea799` — TASK-023/024/025, the consumer loop |
| Working tree | Clean as of the commit below |
| Schema version | Contract **1.5**; database migrations `0001`–`0018` applied |
| Open decisions | **None.** D-019 resolved by ADR-0010 (TASK-027) |

## What runs

The whole vertical slice runs with no LLM anywhere:

```
surname → canonical_key_v2 → exact resolution → PESEL source record
        → evidence → claim → confidence → citation → contract 1.5 → page
```

`/` is the search and redirects an exact match to `/pl/nazwisko/{slug}`, which is the shareable
canonical page. `/pl/porownaj` compares two surnames under strict comparability rules.
`/api/v1/surname-results` is the read API and `/api/v1/events` the product-event sink.

Measured on this container (warm, sequential, n=60, 4 vCPU, loopback, PostgreSQL 16 local): API
p50 18.1 ms / p95 26.5 ms; HTML page p50 20.6 ms / p95 26.1 ms. **Not production numbers** — one
client, no concurrency, a 330-row claims table, a fresh pool per request.

## Verification at handoff

```
pnpm typecheck        passed, 14 projects
pnpm lint             passed
pnpm format:check     passed
pnpm test             passed, 584 unit tests
pnpm build            passed, 11 routes
pnpm test:golden      passed, 364 tests across 4 files, exit 0
pnpm test:integration passed, 258 tests across 20 files, exit 0
```

**Everything passes, and for the first time in this project both database-backed suites ran on the
pinned `postgis/postgis:16-3.4` image** rather than the `TEST_DATABASE_URL` substitute. Every session
from TASK-001 onwards had to record the pinned image as unexercised; that caveat is now retired.
`docker images --digests` confirms `sha256:44126d87…`, the exact value of `POSTGRES_TEST_IMAGE`.

**How to get a runtime here — not guessable, so it is written down.** No daemon runs at session
start and `/etc/init.d/docker start` fails on `ulimit`. `registry-1.docker.io` and `auth.docker.io`
are reachable, so a pull *looks* like it is working and then fails: Docker Hub serves blobs from
`production.cloudfront.docker.com`, which the proxy answers `403` to, and the error reads like a
corrupt image rather than a policy denial. `mirror.gcr.io` is permitted, so:

```
setsid dockerd --iptables=false --ip6tables=false --registry-mirror=https://mirror.gcr.io \
  > /tmp/dockerd.log 2>&1 < /dev/null &
```

The local PostgreSQL 16 is *not* a usable fallback: peer auth, no role for this session's OS user,
and creating one needs privileges the session does not have.

## Task state

| Task | Status |
|---|---|
| 001–022 | IMPLEMENTED (002, 005, 006 status lines corrected this session; they were stale `NOT STARTED`) |
| **023** result experience: claim unit, evidence panel, snapshot, intent, second search | **DONE** |
| **024** canonical route, slug, indexability, share, OG image, events | **DONE** |
| **025** surname comparison | **DONE** |
| **026** golden test corpus | **DONE** — all 364 assertions pass on the pinned container image |
| **027** persisted slugs, collision suffixes, robots, sitemap | **DONE** — ADR-0010 resolves D-019 |
| **028** batch derivation over the register | **DONE** — 71/s; ceiling measured at 248,406 indexable pages |

All three were reviewed adversarially by five independent readers before being marked DONE; the 21
defects they found are listed in `PROGRESS.md` and every one is fixed. Three were pre-existing: the
public API accepting `surface=INTERNAL`, the API's bare 500 with no error envelope, and
`<html lang="pl">` on the English pages.

## Blocked, with the exact blocker

| What | Blocker | What can proceed |
|---|---|---|
| Polona connector, M3 historical discovery | **Egress**: `polona.pl`, `polona2.pl`, `api.dane.gov.pl`, `wikidata.org`, `data.geonames.org` all return `403` to the proxy's `CONNECT`. Attempted with `curl` through `$HTTPS_PROXY`; the proxy's own status endpoint records each as `connect_rejected`, a policy denial. | Everything else. ADR-0007 already decided what to do with per-object rights, so the connector is a build-and-test job the moment a host is reachable. |
| A real map | **No geometry.** No GeoJSON/TopoJSON/Shapefile in the repository; `places.centroid` is NULL in all 16 rows; TERYT is a code register, not boundaries. | The geography chapter renders as an accessible table with its coverage caveat, which is truthful. |
| Meaning coverage | **No licensed onomastic corpus** (D-002 resolved by ADR-0008: Path B). Every surname correctly returns `NO_SOURCED_MEANING`. | The chain, the rights gate and the honest gap are built and tested. A source is an import away. |
| Turning indexing on | **Data, not code.** `docs/canonical/21` §42 needs two substantive value families and only `CURRENT_STATS` exists: the regional fixtures are 40 of 646,052 rows, so the distribution chain refuses and `GEOGRAPHY` cannot be produced. The sitemap is correctly empty and asserts its own reason (`SINGLE_VALUE_FAMILY`). | Everything else. The slug table, backfill, 308 redirects, robots and sitemap are built and verified; supplying the full register is what unblocks it. |

## Is it ready?

The consumer loop is **built and verified end to end** — a real instance was stood up this session
from a pinned container, real fixtures and the real CLIs, and every route served with every refusal
intact (`PROGRESS.md`, "Live end-to-end verification"). What stands between this and a public launch
is not code quality:

| | |
|---|---|
| **Deployment** | Nothing exists — no `ops/`, Dockerfile, compose file, host or domain. INF-001 unstarted. |
| **Data** | **Supplied and verified 2026-09-21.** The full register imports in 4m25s, 598,476 surnames, and every derivation answers. The repo still commits only excerpts (size and rights); the bytes are the owner's. |
| **Indexing** | **Works.** A page serves `index, follow`, the sitemap lists eligible surnames, 31,000+ derived and climbing. `SEO_INDEXING_ENABLED` still unset by design — turning it on needs a QA cohort and a domain, not code. |
| **Legal review** | Ten rights golden cases carry `reviewed_at: null` and want a `LEGAL` reviewer. D-004 is an unverified assumption. |
| **Staff access** | Admin inspector gated off; no staff authentication exists. |
| **Environment-blocked** | M3 historical discovery and any real map. |

## Next action

**Deployment (INF-001).** It is now the only thing between this and a live, indexable site. Nothing
exists: no `ops/`, Dockerfile, compose file, host or domain. Everything upstream of it is done and
verified end to end on the real register.

A deployment needs, in this order:

1. A host and a PostgreSQL 16 with PostGIS and `pg_trgm`, and `SITE_ORIGIN` set — a sitemap must
   carry absolute URLs and a `Host` header is not a safe basis for one.
2. Import the four 2026 resources (4m25s), `pnpm seo:backfill-slugs` (57s), `pnpm truth:derive-batch`
   (about an hour). All three are idempotent and resumable, so a failed deploy is re-runnable.
3. Raise the container's `--shm-size` if parallel query is wanted; the derivation does not need it.
4. A QA cohort reviewed by hand, then `SEO_INDEXING_ENABLED=true` as a deliberate act (ADR-0009 §5).

Unblocked but not required:

- **Legal review.** Ten rights golden cases carry `reviewed_at: null` and want a `LEGAL` reviewer.
  D-004 (resource-level licence inheritance) is a recorded unverified assumption.
- **The 2019–2025 time series** is verified and in hand (`docs/sources/INVENTORY.md`). Year-over-year
  claims need their own claim type and comparability rules — a task, not an import.
- **`packages/sources`' stale comment.** `PESEL_RIGHTS_PROFILE`'s doc block still describes the
  pre-D-007 posture and contradicts the values beneath it.

## What cannot be fixed by building anything

**350,070 surnames — 58.5% of the register — can never be indexable.** They are published
nationally and suppressed regionally, so they can never carry `docs/canonical/21` §42's second value
family, and §43 withholds a page whose whole content is one count. The ceiling is **248,406 pages**.
That is the policy working, and the number to plan against.
