# Name Atlas — task index

The task files themselves are in `tasks/`, one per bounded outcome, and each is the scope authority for
its own change (`AGENTS.md` §3). This index exists so the state of all of them can be read at once.

Status vocabulary: `TODO` · `IN_PROGRESS` · `BLOCKED` · `IMPLEMENTED_UNVERIFIED` · `DONE`.
`DONE` means implemented **and** typecheck, lint, format, unit, integration and build all passed, with
the run recorded in `PROGRESS.md`. Code written but not verified is `IMPLEMENTED_UNVERIFIED`, never
`DONE`.

| ID | Title | Status | Notes |
|---|---|---|---|
| 001 | Project foundation | DONE | |
| 002 | PESEL source spike | DONE | Status line corrected 2026-09-21; was stale `NOT STARTED` |
| 003 | Exact surname resolver | DONE | |
| 004 | PESEL surname ingestion | DONE | |
| 005 | `CURRENT_POPULATION` truth chain | DONE | Status line corrected 2026-09-21 |
| 006 | Surname result read API | DONE | Status line corrected 2026-09-21; §15 U-2 closed by ADR-0009 |
| 008 | PESEL regional source spike | DONE | |
| 009 | `CURRENT_RANK` truth chain | DONE | |
| 010 | Mixed-script rows in bulk ingestion | DONE | |
| 011 | Voivodeship places and regional ingestion | DONE | |
| 012 | `CURRENT_DISTRIBUTION` truth chain | DONE | |
| 013 | Importer throughput | DONE | |
| 014 | `RARITY_CONTEXT` truth chain | DONE | |
| 015 | Fuzzy candidate retrieval | DONE | ADR-0006 |
| 016 | Surname suggestions API | DONE | |
| 017 | Free surname result page | DONE | Restructured by 023 |
| 018 | Admin surname inspector | DONE | Gated off; no staff authentication exists |
| 019 | Structured logging baseline | DONE | |
| 020 | Async runtime: Redis, BullMQ, outbox | DONE | Never on the read path |
| 021 | Rights per asset kind and surface | DONE | ADR-0007, resolves D-003 |
| 022 | `SURNAME_MEANING` truth chain | DONE | ADR-0008, resolves D-002 |
| **023** | Result experience: claim unit, evidence, snapshot, intent, second search | **DONE** | Contract 1.5 |
| **024** | Canonical route, slug, indexability, share, OG image, events | **DONE** | ADR-0009 |
| **025** | Surname comparison | **DONE** | `noindex`; strict comparability |
| **026** | Golden test corpus | **DONE** | Resolution + rights, EXPECTED and FORBIDDEN per case; 364 assertions pass on the pinned container image |

All three of 023–025 passed an adversarial five-lens review before being marked DONE; see `PROGRESS.md`.

There is no `007`: the number was skipped when the plan was reorganised.

## Not yet written

| Candidate | Blocked? | Prerequisite |
|---|---|---|
| Evidence/claim golden corpus (`docs/canonical/17` §22, 125 cases) | **Yes** | Historical-source fixtures. TASK-026 built the resolution and rights domains; §22's needs a source M3 cannot yet reach. |
| E2E and load corpora (§3.3, §3.6) | No | Playwright and k6; neither is installed, and neither is worth adding before there is a journey to hold still. |
| Sitemap + persisted slug table | No | D-019's decision on the collision suffix and where the slug is stored |
| Polona connector / M3 | **Yes** | Network egress — every candidate host 403s at the proxy |
| Map layers | **Yes** | A lawful boundary-geometry source; none is in the repository |
| Premium eligibility, report, commerce (M4–M6) | No | Deliberately not started: the directive's §73 puts them behind the consumer loop |
