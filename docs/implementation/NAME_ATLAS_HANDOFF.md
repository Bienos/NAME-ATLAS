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
pnpm test:golden      175 passed, 189 skipped — the resolution domain did not run
pnpm test:integration DID NOT RUN this session
```

**Every database-backed suite is unrun as of this handoff.** Integration and the golden resolution
domain both need a container runtime or `TEST_DATABASE_URL` — the substitute path
`packages/testing/src/postgres-container.ts` documents. This container has no container runtime, and
the local PostgreSQL 16 uses peer authentication with no role for this session's OS user; creating
one needs privileges this session was denied. The 250-test integration figure below the line was
produced in the session that wrote TASK-023/024/025, through `TEST_DATABASE_URL`; it has not been
reproduced since.

## Task state

| Task | Status |
|---|---|
| 001–022 | IMPLEMENTED (002, 005, 006 status lines corrected this session; they were stale `NOT STARTED`) |
| **023** result experience: claim unit, evidence panel, snapshot, intent, second search | **DONE** |
| **024** canonical route, slug, indexability, share, OG image, events | **DONE** |
| **025** surname comparison | **DONE** |
| **026** golden test corpus | **DONE, PARTIALLY VERIFIED** — 175 of 364 assertions ran; `src/resolution.test.ts` (189) needs a database |

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
| `pnpm test:integration` and `tests/golden/src/resolution.test.ts` | **No database.** No container runtime (`Could not find a working container runtime strategy`); the local PostgreSQL 16 is peer-auth with no role for this session's OS user, and `CREATE ROLE` through the `postgres` OS user was denied. Earlier sessions used `TEST_DATABASE_URL`. | Everything pure: 584 unit tests, 175 golden assertions, the build. The corpus's expectations are written and its input-side properties measured; running it needs one reachable PostgreSQL 16 with `postgis` and `pg_trgm`. |

## Next action

**A database, then `pnpm test:integration && pnpm test:golden`.** 189 golden assertions and 250
integration assertions are written and unrun. Nothing else should be built on top of an unrun
regression suite. One reachable PostgreSQL 16 with `postgis` and `pg_trgm` closes it — either a
container runtime, or `TEST_DATABASE_URL` pointed at a server this session can authenticate to.

After that, two unblocked candidates:

1. **A sitemap and the slug table** (D-019). Needed before any indexing pilot: a persisted
   `(locale, slug)` with a collision suffix, a backfill over 598,476 rows, and a sitemap that lists
   only pages `assessIndexability` returns `INDEX` for.
2. **Extend the golden corpus as its fixtures arrive.** §22's evidence/claim domain (125 cases) needs
   historical-source fixtures and is therefore blocked with M3; §20's `SHARE` surface needs an
   evaluator that does not exist. Both gaps are recorded in `tests/golden/README.md` rather than
   filled with invented decisions.
