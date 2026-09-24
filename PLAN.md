# PLAN.md — Name Atlas milestones

Coarse milestones only. Detailed work exists only as a task file in `tasks/`, and only one task is specified at a time.

Milestone numbering follows `docs/canonical/23` §17. Current state is in `STATUS.md`.

## M0 — Foundation + source risk removal

Smallest production-shaped platform, plus elimination of the two risks that would invalidate everything downstream: the real PESEL source, and Unicode surname identity.

Exit: monorepo builds and tests from a clean checkout; PostgreSQL with PostGIS and `pg_trgm` available locally and in CI; the production PESEL resource is selected, its rights recorded and its counts parsed from a real fixture; the resolver's Unicode identity approach passes its blocker tests.

Tasks: TASK-001 project foundation · TASK-002 PESEL source spike · TASK-003 exact surname resolver.

## M1 — Current surname vertical slice

One real surname through one real source, end to end, internally.

`input → resolver → PESEL → SourceRecord → surname-scoped DistributionSnapshot → EvidenceItem → Claim(CURRENT_POPULATION) → ConfidenceAssessment → Citation`

Exit: a developer command resolves a real surname and returns a real, sourced, dated count with confidence and citation, for the exact-known, unknown, invalid and suppressed cases.

Tasks: TASK-004 PESEL ingestion + Source/Rights · TASK-005 `CURRENT_POPULATION` truth chain.

## M2 — Complete current surname intelligence + free profile

Full current-surname capability and the first consumer-facing slice: gender forms and safe diacritic behaviour, `pg_trgm` candidate generation with tier-safe ranking, `CURRENT_RANK` and `RARITY_CONTEXT`, shared API contracts, the free result UI, a read-only internal inspector, and logging/tracing baseline.

Exit: a real user journey — search → resolution → current result → confidence/source/date → honest low-data state. Release gate: **internal alpha**.

## M3 — Historical discovery / Polona

First historical evidence: Polona connector, minimum Place foundation, `HistoricalOccurrence` and historical claims. This is the milestone that justifies the asynchronous runtime — `ResearchRun`/`ResearchModuleRun`, outbox, Redis/Valkey and BullMQ — and the partial/pending consumer states that go with it.

Exit: a surname shows dated, sourced historical evidence with correct partial-result behaviour. Release gate: **closed free beta**.

## M4 — Coverage + DiscoveryIndex + premium eligibility

`CoverageAssessment → DiscoveryIndex → PremiumEligibility`, run across a representative surname corpus.

Exit: an evidence-based answer to the one question that decides the business — do enough real surnames carry enough deeper evidence to justify a paid report? No payment code is written in this milestone.

## M5 — Premium report without payments

Report snapshot, claim references, citations, reproducible versioning, delivery preview, insufficient-data behaviour. Tested manually and across representative surnames. No Stripe.

Exit: premium viability decision on a real artifact rather than a mockup.

## M6 — Commerce / paid limited beta

Only after M5 demonstrates real inventory: Offer, Customer/Order, hosted checkout, signed webhook, entitlement, report delivery, email recovery, refund and reconciliation, operational admin. Privacy, security and consumer-law readiness are release gates here.

Release gate: **paid limited beta**.

## M7 — Public paid MVP hardening

Critical E2E coverage, security review, failure/retry/recovery tests, migration safety, backups and rollback, accessibility, performance, support and repair workflows, staging and production verification, independent release review.

Release gate: **public paid MVP**.

## M8 — SEO qualified cohort

Only after page and data quality are stable: SEO eligibility, canonical routing, alias handling, structured data, sitemap cohorts, noindex rules, a first qualified surname cohort, Search Console monitoring.

Thin or low-confidence pages are never published to increase page count.

---

## Parallel non-code track (runs from day one)

Not milestones, but they gate milestones: PESEL resource verification and annual refresh policy; onomastics licence/partnership outreach; Polona rights rules per surface; current regional surname data search and licensing; legal/privacy review for commercial use; payment/tax preparation before M6 only.

Open items are tracked in `docs/DECISIONS_NEEDED.md`.

## Sequencing rules

- Do not build monetisation until representative surnames prove premium inventory exists (M4/M5 before M6).
- Do not wait for the complete premium system before putting one real surname through a real source, evidence, claim, API and UI (M1/M2 before M3+).
- Redis/BullMQ arrive at M3, not before. Do not add Redis to cache a single PESEL lookup.
- No LLM before the M2 truth pipeline exists.
- Family Origin and person-level research come after the public paid MVP, if at all.
