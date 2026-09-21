# Name Atlas — session handoff

Updated **2026-09-21**. This file records where the work stands and what the next action is. It is
facts only; `PROGRESS.md` holds the detail and `AGENTS.md` holds the rules.

## State

| | |
|---|---|
| Branch | `claude/elegant-archimedes-w5ony1` |
| Last commit before this session | `d3ea799` — TASK-023/024/025, the consumer loop |
| Working tree | Clean as of the commit below |
| Schema version | Contract **1.5**; database migrations `0001`–`0017` applied |
| Open decisions | **D-019** only (slug collisions need a persisted slug table) — non-blocking |

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
pnpm test:integration passed, 250 tests across 19 files, exit 0
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
| Turning indexing on | Deliberate: `SEO_INDEXING_ENABLED` is unset, so every page is `noindex, follow` (ADR-0009 §5). | The policy is implemented and unit-tested; a pilot needs a surname cohort and manual QA. |

## Next action

Nothing is blocking. Two unblocked candidates, in the order I would take them:

1. **A sitemap and the slug table** (D-019). The last prerequisite for any indexing pilot: a
   persisted `(locale, slug)` with a collision suffix, a backfill over 598,476 rows, and a sitemap
   listing only pages `assessIndexability` returns `INDEX` for. D-019 needs deciding first — where
   the slug lives and what the collision suffix is.
2. **Extend the golden corpus as its fixtures arrive.** §22's evidence/claim domain (125 cases) needs
   historical-source fixtures and is therefore blocked behind M3; §20's `SHARE` surface needs an
   evaluator that does not exist. Both gaps are recorded in `tests/golden/README.md` rather than
   filled with invented decisions.

One thing a session cannot close by itself: every golden case carries `reviewed_at: null`, and the
ten rights cases ask for a `LEGAL` reviewer they have not had.
