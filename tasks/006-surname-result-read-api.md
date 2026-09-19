# TASK-006 — Surname Result Read API / Query Contract

- **Status:** NOT STARTED — specification only, and **no longer blocked**. TASK-005 is implemented and verified (migration `0004`, `packages/truth`), and D-010 is resolved by **ADR-0004**. Every precondition is met; §15 now holds implementer choices only.
- **Milestone:** M2, first slice. `PLAN.md` bundles "shared API contracts" into M2 alongside `pg_trgm` candidate generation, `CURRENT_RANK`, `RARITY_CONTEXT` and the free result UI. This task takes **only** the contract-and-read-path part, for one fact. Everything else in M2 stays out (§8).
- **Depends on:** TASK-003 (exact resolution), TASK-004 (PESEL ingestion) and TASK-005 (`CURRENT_POPULATION` truth chain) — all three implemented and verified.
- **Blocks:** the free result UI, and every later chapter of the surname profile.
- **Model guidance:** fresh implementation session. Ready to start.

---

## 1. Goal

Expose the proven truth chain to an application client, once, for one fact.

A caller submits an exact surname query and receives a stable, typed, rights-aware result carrying `CURRENT_POPULATION` and the metadata that makes it defensible — value, snapshot date, confidence, citation, publication state. The read path **consumes** TASK-003's resolver and TASK-005's truth service; it implements neither.

The minimum production read layer, and nothing beyond it. No second resolver, no second population calculation, no second provenance system, no UI.

## 2. User / system outcome

```text
surname query
  → input validation                    (TASK-003's validator, reused)
  → exact surname resolution            (TASK-003's resolveSurname, reused)
  → CURRENT_POPULATION truth result     (TASK-005's service, reused)
  → rights / publication evaluation     (TASK-005's surface eligibility, reused)
  → stable application response          (this task)
```

After this task a developer — and later the web app — can call one documented query and get back a result that is safe to render without deriving anything: the canonical surname identity, the population value with its status and dataset date, a confidence status, citation data sufficient to answer "where does this number come from?", and an explicit publication state for this surface.

A surname that does not resolve, resolves ambiguously, or has no surfaceable evidence produces a **successful response in an explicit state**, not an error and never a zero.

## 3. Canonical authority

Read these; do not restate them in code.

| Topic | Authority |
|---|---|
| API style (REST/JSON), transport, BFF role, Next.js role | `docs/canonical/16` §1.2, §2.1, §2.5, §3, §4 |
| Contract source pipeline (Zod → JSON Schema → OpenAPI) | `docs/canonical/16` §1.3 |
| API versioning and the version fields to distinguish | `docs/canonical/16` §5 |
| Resource model and P0 endpoint inventory | `docs/canonical/16` §6, §7 |
| ID vs slug; what API identity is | `docs/canonical/16` §18 |
| Public surname identity DTO | `docs/canonical/16` §21 |
| Section/chapter state enum (incl. `RIGHTS_BLOCKED`) | `docs/canonical/16` §23 |
| Population chapter and population value DTO; `NumericValueStatus` | `docs/canonical/16` §25, §26 — **as amended by ADR-0004 for `unit`** |
| Domain → projection rule | `docs/canonical/16` §34 |
| Confidence DTO | `docs/canonical/16` §35 |
| Citation DTO; source summary | `docs/canonical/16` §40, §41 |
| Error envelope and public error codes; HTTP status policy | `docs/canonical/16` §78, §79, §80 |
| Request correlation; rate limiting | `docs/canonical/16` §81, §83 |
| Public cache policy and ETag | `docs/canonical/16` §84, §87 |
| Free vs premium data security | `docs/canonical/16` §55 |
| Presentation-object boundary; what the BFF may and may not do | `ARCHITECTURE.md` §6 |
| Rights boundary and per-surface gating | `ARCHITECTURE.md` §5; `docs/canonical/12` §6.3, §6.4 |
| System invariants | `ARCHITECTURE.md` §10 (1, 2, 4, 5, 8, 9, 11 all bind here) |
| Trust and evidence rules; non-goals | `PRODUCT.md` §7, §8 |
| Contract acceptance process and file placement | `docs/contracts/README.md` |
| Resolver interface | `tasks/003-exact-surname-resolver.md`; `packages/resolver/src/{index,resolution,lookup}.ts` |
| Ingested data and rights posture | `tasks/004-pesel-surname-ingestion.md` §14; `packages/sources/src/registry.ts` |
| Truth-chain service and result object | `tasks/005-current-population-truth-chain.md` §5, §7 |
| Stack and database access | `docs/adr/0001-stack.md`, `docs/adr/0002-db-access.md` |
| Population unit at the contract boundary | **`docs/adr/0004-population-value-unit.md`** (binding; deviates from `docs/canonical/16` §26) |
| Open decisions | `docs/DECISIONS_NEEDED.md` — D-007 constrains this task's rights output; D-006/D-008/D-009/D-010 are all resolved |

## 4. Preconditions

Verified against the working tree during this task's preflight (2026-09-19).

1. **TASK-003 accepted.** `@name-atlas/resolver` exports `resolveSurname`, `validateSurnameInput`, `canonicalKey`, `outcomeOf`, `CANONICAL_KEY_VERSION`/`NORMALIZATION_VERSION`, `RESOLUTION_METHOD_VERSION`. `resolveSurname` returns `{kind:"RESOLUTION"}` or `{kind:"LOOKUP_FAILED"}`; `resolution_status` covers `EXACT | KNOWN_VARIANT | MULTIPLE_EXACT | UNKNOWN | REVIEW_REQUIRED` plus validation statuses, and `outcomeOf` projects these to `RESOLVED | UNRESOLVED | INVALID_INPUT`. Lookups run `READ ONLY`.
2. **TASK-004 accepted.** Migration `0003`; PESEL data ingestible; the rights profile seeded with `commercial_use = UNKNOWN`, `review_status = LEGAL_REVIEW_REQUIRED`, so paid and SEO surfaces are ineligible by `docs/canonical/12` §6.4.
3. **TASK-005 accepted** (implemented and verified 2026-09-19). Migration `0004_truth_layer` created `research_runs`, `evidence_items`, `claims`, `claim_evidence`, `confidence_assessments` and `citations`. `@name-atlas/truth` exports `deriveCurrentPopulation`, the `SurnameTruthResult` projection (including per-surface `SurfaceEligibility`), and the confidence and rights rules as separate modules. **This task consumes that service and must not substitute its own population lookup** (§13).
4. **REST is the chosen style.** `docs/canonical/16` §2.1 "REST — CHOSEN"; §1.2 "REST + JSON + OpenAPI-compatible schemas"; GraphQL and WebSockets explicitly not P0.
5. **The BFF already exists in skeleton.** `apps/web` is a Next.js 16 App Router app. The one existing route handler is `apps/web/src/app/api/health/route.ts` — a `GET` returning `NextResponse.json(...)`, with a sibling `route.test.ts` importing and calling the handler directly. That is the established convention to follow.
6. **`packages/contracts` is an intentional stub.** It exports only `CONTRACT_PACKAGE_VERSION`, documented as carrying no product meaning. `docs/contracts/README.md` states "No contract is accepted yet. The first is expected at M2" — this task's contract is that first one, and must be recorded there as an accepted contract document in the same change.
7. **Zod is not yet a direct dependency** of any workspace package. `docs/canonical/16` §1.3 recommends Zod 4 as the contract source. Adding it needs a one-line justification per `AGENTS.md` §6.
8. **No slug exists.** `surnames` has no slug column, and nothing generates one. `docs/canonical/16` §21's `PublicSurnameIdentity` requires `canonical_slug` and `canonical_path`. See §15 U-2.
9. **No caching, correlation-id, rate-limiting or error-envelope implementation exists** anywhere in `apps/web`. The health route is static and has none.

## 5. The read boundary

Three layers, with a hard rule about what may live in each. `ARCHITECTURE.md` §6 is the authority and is not negotiable here.

```text
apps/web/src/app/api/v1/…/route.ts        ← thin BFF route handler
    may: parse the request, map a typed result to an HTTP status and body,
         set cache/correlation headers, serialize
    may NOT: resolve a surname, interpret a claim, compute confidence,
             evaluate rights, select a source, or hold any SQL

packages/<application>                     ← the query service (name per §15 U-1)
    owns: input validation → resolver → truth service → rights projection
          → response DTO construction. One function, one typed result union.

packages/contracts                         ← the contract
    owns: the request/response schemas and their inferred types.
          No business logic, no database access.
```

The query service is the seam that makes AC-19's "no duplicate logic" testable: the route handler is thin enough that a test can assert it contains no SQL and no resolver import.

## 6. In scope

1. **One request/response contract** in `packages/contracts`: runtime schemas plus inferred types for the surname-result query, its success shape and its non-success states.
2. **A contract document** in `docs/contracts/`, named for the resource, recording what was accepted — per `docs/contracts/README.md`, added by the task that implements it.
3. **An application query service** in a workspace package: validation → exact resolution → TASK-005 truth lookup → rights/surface projection → DTO construction, returning a typed result union.
4. **A thin route handler** under `apps/web/src/app/api/v1/`, following the health-route convention, mapping the typed result to HTTP per `docs/canonical/16` §80, with the §78 error envelope and a request id.
5. **Projection of confidence, citation and rights** from what TASK-005 persisted — read-only, recalculating nothing.
6. **Error/result mapping** using the §79 public error codes, with expected unresolved/ambiguous states returned as successful responses, not errors.
7. **Unit tests** (validation, mapping, projection, error mapping — no database), **integration tests** (real PostgreSQL, real ingested fixture data), and one **application-level end-to-end test** through the route handler.
8. `docs/CODEMAP.md` and `PROGRESS.md` updated with observed facts.

## 7. Acceptance criteria

Each is a behaviour an automated test must demonstrate by running.

**Query semantics**

- **AC-01 — Exact resolution only, via TASK-003.** The query path calls `resolveSurname` and nothing else. No fuzzy, trigram, phonetic, diacritic-insensitive, gender-form or transliteration path exists in the diff. An input that does not resolve exactly returns the canonical unresolved state (`ARCHITECTURE.md` §10 invariant 9).
- **AC-02 — No second resolver and no second population calculation.** A test asserts the query service imports the resolver and the TASK-005 service, and that no module under the read layer contains SQL against `distribution_values`, `claims` or `evidence_items`.
- **AC-03 — Read-only execution.** A normal query creates no `Surname`, `NameForm`, `Claim`, `EvidenceItem`, `ClaimEvidence`, `ConfidenceAssessment`, `Citation` or `SourceRecord`. An integration test snapshots row counts of every truth-layer and identity table before and after a batch of queries and asserts equality. If TASK-005's derivation is lazy rather than precomputed, that is a write and belongs behind an explicit non-read entry point — the read path must not trigger it (§15 U-3).
- **AC-04 — Determinism.** The same canonical state and the same input produce a semantically identical response across repeated calls: identical value, status, date, confidence status, citation fields and rights state. Only a request id and timing metadata may differ.

**The contract**

- **AC-05 — One stable typed contract, versioned.** Request and response schemas live in `packages/contracts`, are the single source of the types both sides use, and the response carries a schema version distinct from the API version (`docs/canonical/16` §5). The URL carries `/api/v1/`.
- **AC-06 — Minimal, not future-proof.** The response exposes only what this slice needs. No empty chapter array for meaning, origin, history or geography; no placeholder rarity or rank; no field whose only purpose is a later task. A reviewer can name the reason for every field.
- **AC-07 — No persistence detail leakage.** The response carries no table names, no column names, no internal enum unavailable to a client, no `source_record_id`, no `evidence_item_id`, no `claim_id`, no run id. Exposing the surname's own UUID as API identity **is** permitted and expected (`docs/canonical/16` §18, §21).

**The fact**

- **AC-08 — `CURRENT_POPULATION` comes from TASK-005.** The value returned is the one TASK-005's service produced. The read layer performs no arithmetic on counts whatsoever — no sum, no rounding, no unit conversion, no selection between snapshots by magnitude.
- **AC-09 — Never timeless.** Every returned population value carries its dataset snapshot date and its dataset scope. A response containing a bare number without them is a defect (`ARCHITECTURE.md` §10 invariant 5; `PRODUCT.md` §7 rule 5).
- **AC-10 — Status, not overloaded null.** The value uses the canonical `NumericValueStatus` (`KNOWN`, `SUPPRESSED`, `NOT_AVAILABLE`, `NOT_APPLICABLE` — `docs/canonical/16` §26). A suppressed or absent value carries `value: null` with the status explaining it. **No path emits `0` for an absent, suppressed or unknown value** — asserted directly (`ARCHITECTURE.md` §10 invariant 4).
- **AC-11 — Two snapshots stay two.** Where TASK-005 produced a claim per snapshot, the response represents them separately, with their own dates and scopes. Nothing sums, averages or picks between them (`tasks/005-…` AC-21). A test asserts no response field equals the sum of the two counts.
- **AC-12 — The unit is `SURNAME_OCCURRENCES`.** Per **ADR-0004**, which resolves D-010: the publisher counts occurrences, not stated people, so the DTO must not assert `"PEOPLE"`. A test asserts the emitted unit is `SURNAME_OCCURRENCES`, and that `"PEOPLE"` appears nowhere in a PESEL-derived response. The contract schema carries a comment pointing at ADR-0004, because this deviates from `docs/canonical/16` §26.

**Confidence, provenance, rights**

- **AC-13 — Confidence is projected, never computed.** The response carries the `ConfidenceStatus` TASK-005 persisted, via the `docs/canonical/16` §35 DTO shape. No recalculation, no probability, no numeric score (§35: "Do not transmit internal probability").
- **AC-14 — Confidence and rights are independent in the response.** A restricted rights state does not alter the confidence status, and a permissive one does not raise it. A test constructs both combinations — high confidence + restricted surface, and low confidence + publishable — and asserts each round-trips intact (`ARCHITECTURE.md` §10 invariant 2; `PRODUCT.md` §7 rule 3).
- **AC-15 — Citation answers "where does this number come from?"** The response carries the §40 `CitationDTO` fields — title, publisher, publication date at source precision, source type, locator, url, attribution — projected from what TASK-005 persisted. Nothing is fabricated: a field with no persisted value is absent or null, never a plausible substitute. `url` may be absent where rights do not permit linking (§40).
- **AC-16 — No raw evidence leakage.** The response contains no `raw_payload`, no `raw_excerpt`, no source checksum, no file path, no internal locator beyond what §40 permits, and no full source record. A test asserts the serialized body contains none of these (`docs/canonical/16` §34: the projection builder decides what is browser-safe).
- **AC-17 — Rights gate before surfacing.** Surface eligibility for **this** surface is evaluated before factual data is included. Where evidence exists internally but is not surfaceable, the response carries the canonical `RIGHTS_BLOCKED` state (`docs/canonical/16` §23) and omits the restricted value — it does not send the value and mark it hidden (`docs/canonical/16` §55's hard rule against client-side gating). "Stored internally" never implies "displayable here".

**States and errors**

- **AC-18 — Six distinguishable outcomes.** Invalid input; unresolved surname; ambiguous surname needing confirmation; resolved with no `CURRENT_POPULATION` evidence; resolved with evidence that cannot be surfaced; successful result. Each is a distinct, named state using repository terminology. Expected unresolved and ambiguous outcomes are **successful responses**, not errors (`docs/canonical/16` §79).
- **AC-19 — Typed error envelope, nothing leaked.** Genuine failures use the §78 envelope with a §79 code and a request id. A test forces an internal failure (a killed database handle) and asserts the body contains no stack trace, no SQL text, no file path, no connection string, no exception class name — and that the client receives `INTERNAL_ERROR` or `SERVICE_UNAVAILABLE` with an appropriate status.
- **AC-20 — Input safety without Latin-only narrowing.** Empty, whitespace-only, over-length and control-character inputs are rejected through TASK-003's existing validator, not a new one. Polish diacritics and non-Latin scripts are accepted as valid input (`ARCHITECTURE.md` §10 invariant 8). A test asserts `WIŚNIEWSKI` and `NGUYỄN` are valid input and that no regex restricts input to `[A-Za-z]`.
- **AC-21 — One surname's evidence never reaches another's response.** A test queries two surnames with different counts and asserts each response's value, citation and snapshot belong to its own subject. An unresolved query returns no other surname's facts.

**Verification**

- **AC-22 — End-to-end through the real modules.** One application-level test drives input → validation → resolver → truth chain → rights → response → serialization by invoking the route handler exactly as `apps/web/src/app/api/health/route.test.ts` does, against a real database holding genuinely ingested fixture data. No fake pipeline, no mocked truth service in this test.
- **AC-23 — Reproducible verification.** Every command in §12 runs from a clean checkout and is reported with actual output, including the TASK-003/004/005 regression counts.

## 8. Out of scope

Their absence is a success condition. Anything here in the diff is a defect.

- Any second fact: rarity, rank, trends, regional distribution, maps, meaning, etymology, linguistic origin, geographic-origin inference, historical occurrence, migration, genealogy, heraldry.
- Any new population calculation, any new dataset, any second source.
- Search, autocomplete, suggestions, search ranking, fuzzy matching, phonetic matching, OCR matching, transliteration, gender-form inference, LLM enrichment.
- The consumer frontend: pages, components, result-page design, styling, routing under `apps/web/src/app/(pages)`. This task adds a route **handler**, not a page.
- `POST /api/v1/surname-searches` and the search/resolution-confirmation flow (`docs/canonical/16` §7–§17), the full `SurnameProfile` resource with its chapter architecture (§19–§24), SSE, polling, partial results.
- SEO pages, sitemaps, structured data, slugs as a public routing concern.
- Authentication, entitlements, premium eligibility, paywall, billing, checkout, reports, analytics.
- Rate limiting and CDN policy beyond what a single cache header requires — deployment policy, not this slice (`docs/canonical/16` §84: "Exact durations are deployment policy").
- The admin app, the worker app, Redis, BullMQ, the outbox.
- TASK-007. Do not create `tasks/007-*.md`.
- Any unrelated refactor or dependency upgrade.

## 9. Data / security invariants

Testable statements that must hold after any sequence of queries.

1. Query execution creates no domain truth: no row is inserted or updated in any identity, source, distribution or truth-layer table by a read.
2. The read layer never bypasses the rights model. Every factual field in a response passed a surface-eligibility check derived from the source's `RightsProfile`.
3. Raw source evidence — payloads, excerpts, checksums, file references — never appears in a response body.
4. An unresolved or ambiguous query returns no surname's facts.
5. Evidence for surname A cannot appear in surname B's response; every projected value traces to the subject surname.
6. Absence, suppression and "not applicable" are distinct statuses, and none is ever represented as `0`.
7. A population value is never returned without its snapshot date and dataset scope.
8. Confidence is copied from a persisted `ConfidenceAssessment`, never computed, defaulted or inferred in the read layer.
9. Citation fields are copied from persisted values or omitted; none is constructed from a template or a guess.
10. Internal error detail — stack traces, SQL, file paths, credentials, exception strings — never reaches a client body.
11. Confidence and rights are produced by separate code paths with no shared input; neither reads the other's fields.
12. The route handler contains no business logic: no resolution, no claim interpretation, no confidence calculation, no rights evaluation, no SQL (`ARCHITECTURE.md` §6).

## 10. Failure behaviour

| Condition | Behaviour |
|---|---|
| Empty, whitespace-only, over-length or control-character input | Successful HTTP response in the invalid-input state, or `INVALID_SURNAME_INPUT` per `docs/canonical/16` §79/§80 — one, chosen and stated, not both. Nothing else in the body. |
| Surname does not resolve (`UNKNOWN`) | Successful response, unresolved state. Not an error. Not a zero. |
| Surname ambiguous (`MULTIPLE_EXACT` / `REVIEW_REQUIRED`) | Successful response, ambiguous state. No candidate is auto-selected. |
| Resolver returns `LOOKUP_FAILED` | Infrastructure failure. `SERVICE_UNAVAILABLE` or `INTERNAL_ERROR` with the §78 envelope. **Never** reported as "surname unknown". |
| Resolved, but no `CURRENT_POPULATION` evidence | Successful response, value status `NOT_AVAILABLE`, carrying the source coverage note so a client can distinguish suppression from true absence. No claim, no zero. |
| Evidence exists but this surface is not eligible | Successful response, `RIGHTS_BLOCKED`; the restricted value is **not** included in the payload. |
| TASK-005 service returns a typed failure (conflicting claims, violated invariant, stale assessment) | Fail closed: `INTERNAL_ERROR`, nothing partial, no fallback value. A broken invariant is never papered over with a plausible number. |
| Database unavailable mid-query | `SERVICE_UNAVAILABLE`, envelope only, no detail. |
| Any unexpected exception | Caught at the boundary, logged internally with the request id, mapped to `INTERNAL_ERROR`. The body never carries the original message. |

## 11. Test requirements

Follow the existing harness (`@name-atlas/testing`, `startTestDatabase`/`migrateTestDatabase`, the `TEST_DATABASE_URL` fallback) and the shape of `tests/integration/src/pesel-ingestion.test.ts`. Route-handler tests follow `apps/web/src/app/api/health/route.test.ts` — import the handler, call it, assert on the `Response`.

**Integration / application-level, over genuinely ingested fixture data**

1. A known exact surname returns a complete successful result.
2. A case-equivalent input (`nowak` / `NOWAK`) resolves to the same surname and the same value.
3. A Polish-diacritic surname (`WIŚNIEWSKI`) resolves and returns its value.
4. A diacritic-different input (`WISNIEWSKI`) does **not** resolve to it — unresolved state, not a near-match.
5. An unknown but valid surname returns the unresolved state, no value, no zero.
6. Invalid input (empty, whitespace-only, over-length, control characters) returns the invalid-input state.
7. A resolved surname with population evidence returns value, date, scope, confidence, citation and rights state.
8. A resolved surname with no applicable evidence returns `NOT_AVAILABLE` and no claim.
9. Rights-restricted evidence returns `RIGHTS_BLOCKED` with the value absent from the serialized body.
10. Zero versus absent: no response anywhere contains a population `value` of `0`.
11. Provenance projection matches the persisted citation, field by field.
12. Confidence projection matches the persisted assessment status.
13. Snapshot date propagates unchanged from the source's reference date, and is never the retrieval date.
14. Repeated identical reads are semantically identical.
15. No mutation: row counts across every identity, source, distribution and truth-layer table are unchanged after a batch of queries, including unresolved and error paths.
16. Serialization round-trips: the response validates against the published contract schema.
17. Internal-error mapping: a forced failure yields the envelope with no leaked detail (AC-19's assertions).
18. Two surnames queried in sequence never cross-contaminate (AC-21).
19. Complete application-level read journey through the route handler (AC-22).
20. A surname present in both PESEL snapshots returns both, and nothing equals their sum.

**Unit — pure, no database**

21. Input validation delegates to TASK-003's validator; a test asserts no second validation regex exists in the read layer.
22. Result-to-HTTP mapping is exhaustive over the state union — a new state cannot compile without a mapping.
23. Rights projection maps the `docs/canonical/12` §6.3 matrix correctly, including `commercial_use = UNKNOWN` → paid/SEO ineligible.
24. Confidence projection is a pure copy: identical input assessment under permissive and restrictive rights yields identical output.
25. The response schema rejects a payload missing snapshot date or dataset scope.
26. The response schema rejects a population value of `0` paired with a non-`KNOWN` status.

**Regression**

27. TASK-003, TASK-004 and TASK-005 suites pass unchanged, with counts reported (§12).

## 12. Verification

Run from a clean checkout and report actual output. Never claim a command passed without having run it.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Then against a real PostgreSQL:

```bash
pnpm db:migrate
pnpm db:generate-types     # must produce no diff; this task is not expected to add a migration
pnpm test:integration
pnpm build                 # apps/web must build with the new route handler
```

Then the read path end to end, over real ingested fixture data: import a committed fixture with TASK-004's CLI, derive with TASK-005's, then exercise the query — through the route handler, and report the serialized body.

**Regression reporting is mandatory, not optional.** State the TASK-003 resolver, TASK-004 ingestion and TASK-005 truth-chain test counts before and after, and confirm none regressed. As of TASK-005's specification the baseline is **132 unit and 60 integration tests**; TASK-005 will raise both, and this task must report the then-current numbers rather than these.

If container registries remain network-egress-blocked, use the `TEST_DATABASE_URL` fallback against a locally installed PostgreSQL 16 + PostGIS and **state plainly that the pinned image was not exercised**, as TASK-001 through TASK-004 did.

## 13. Constraints

- Preserve all currently passing behaviour. No regression in TASK-003, TASK-004 or TASK-005 coverage.
- **Do not work around TASK-005.** If the truth service is absent or incomplete, stop and report (`AGENTS.md` §3). Do not query `distribution_values` directly to "get something working" — that is the second truth chain this task exists to avoid.
- Use the existing resolver, truth chain, confidence model, rights model and provenance model. Do not duplicate any of them.
- No business logic in the route handler (`ARCHITECTURE.md` §6). The handler parses, maps and serializes.
- No speculative API abstraction: no generic chapter framework, no pagination, no filter DSL, no SSE scaffold, no endpoint this slice does not use.
- No frontend implementation. A route handler is not a page.
- New dependency only with a one-line justification (`AGENTS.md` §6). Zod is the expected one, sanctioned by `docs/canonical/16` §1.3; pin it and say why in the change description. No dependency upgrade.
- `docs/canonical/`, `docs/library/`, `docs/archive/`, `docs/reference/`, `docs/review/` and `prompts/` are read-only (`AGENTS.md` §2).
- Where a canonical document does not support a requirement, record it as unresolved rather than choosing.

## 14. Preflight

Before editing, read-only and targeted — no repository-wide exploration:

1. This task file and the §15 answers.
2. `PROGRESS.md`, especially the TASK-005 section and what was actually verified.
3. TASK-003's public interface: `packages/resolver/src/{index,resolution,validation}.ts`.
4. TASK-005's public interface: its result object, its typed failure union and its package name.
5. The existing API pattern: `apps/web/src/app/api/health/route.ts` and its test; `apps/web/{package.json,next.config.ts,vitest.config.ts}`.
6. The rights-enforcement pattern TASK-005 implemented (surface eligibility from the `RightsProfile`).
7. `packages/contracts/src/index.ts` and `docs/contracts/README.md`.
8. The canonical sections named in §3, **by line range**. Do not read the canonical corpus in bulk.
9. `tests/integration/src/` for the established integration shape.
10. `git status` and the current diff.

Then state a short plan naming the exact files to change, and implement.

## 15. Unresolved decisions — answer before implementation

**Nothing blocks the start of this task.** Both former blockers are closed:

- **TASK-005 is implemented and verified** (2026-09-19): migration `0004_truth_layer`, `packages/truth` with `deriveCurrentPopulation`, and a developer demo (`pnpm demo:surname`). D-008 and D-009 are recorded RESOLVED.
- **D-010 is resolved by `docs/adr/0004-population-value-unit.md`**: the unit enum is widened and PESEL-derived responses carry `SURNAME_OCCURRENCES`. See AC-12.

**Read before writing the contract:** TASK-005 deliberately stores **no unit** on the claim — the unit is a presentation-boundary concept introduced here, not a claim-payload one. The claim carries `source_population_scope` with the publisher's verbatim Polish, which this layer may surface.

**Implementer choices to make and record during the work:**

- **U-1 — where the query service lives.** It cannot be in `apps/web` (`ARCHITECTURE.md` §6) and should not be inside `packages/resolver` or `packages/sources`, which own narrower concerns. Candidates: extend the package TASK-005 creates for the truth layer, or add a thin application/query package that depends on it. **Recommended:** decide only after reading TASK-005's actual package layout, and prefer extending it over adding a package if the truth service already exposes a clean result object — one fewer package is the smaller complete change.
- **U-2 — `canonical_slug` / `canonical_path`.** `docs/canonical/16` §21's `PublicSurnameIdentity` requires both; no slug exists in the schema and nothing generates one. Slug generation for Polish surnames is not trivial (`Ł`, `Ś`, `Ż`, `Ź`, `Ć`, `Ń`, `Ó`, `Ą`, `Ę` all need a documented transliteration that must not be confused with the identity-bearing diacritics of `ARCHITECTURE.md` §10 invariant 8). **Recommended:** omit both fields from this slice and record the omission — this task ships no browser route and no SEO surface, so nothing consumes them yet. Adding them later is additive. If they are included instead, the transliteration table must be explicit and tested, and must live nowhere near the resolver's normalisation.
- **U-3 — is TASK-005's derivation lazy or precomputed?** If a query can trigger derivation, the read path would write, breaking AC-03. **Recommended:** the read path looks up already-derived claims only, and returns `NOT_AVAILABLE` when none exists; derivation stays an explicit non-read operation. Confirm against TASK-005's actual implementation and record the answer.
- **U-4 — invalid input: successful state or 4xx?** `docs/canonical/16` §79 lists `INVALID_SURNAME_INPUT` as an error code, while noting expected unresolved/ambiguous outcomes stay successful response states. Invalid input sits between the two. **Recommended:** `400` with the §78 envelope for input that fails validation, and successful states for input that is valid but does not resolve — that keeps "you sent something malformed" distinct from "we looked and found nothing". Record whichever is chosen and make §10's table match.

**Inherited constraints, not to be reopened:**

- **D-007** keeps `commercial_use = UNKNOWN`, so paid and SEO surfaces are ineligible. This task consumes that; it must not "upgrade" a profile to make a surface eligible.
- **TASK-004 §14 U-1** (what the male/female split partitions) stays unanswered, so the response must never describe either snapshot as men's or women's counts, and must never sum them.

## 16. Diff review

Before declaring the task complete, inspect the entire diff file by file and confirm:

1. No new fact was introduced — no rarity, rank, trend, region, meaning, origin or history anywhere.
2. No alternative resolver exists; `packages/resolver` ideally shows no diff at all.
3. No alternative population calculation exists; grep the diff for arithmetic on counts and confirm every hit is a test asserting absence.
4. No write side effect exists in the read path: no `insertInto`, `updateTable` or `deleteFrom` in any module the query touches.
5. No raw evidence leak: no `raw_payload`, `raw_excerpt`, checksum, file path or internal id in any response type.
6. No rights bypass: every factual field passes an eligibility check, and no code path returns a value alongside a `RIGHTS_BLOCKED` state.
7. No fuzzy, phonetic, trigram, transliteration or diacritic-fold matching.
8. No UI: no page, component, stylesheet or client-side code. A route handler only.
9. The route handler holds no business logic and no SQL.
10. `pnpm-lock.yaml` changed only for the one justified new dependency; nothing was upgraded.
11. `docs/canonical/` and the other read-only directories are untouched (`git status --porcelain` on those paths is empty).
12. No debug code, stray file or accidental formatting churn.

## 17. Documentation / handoff

- `docs/contracts/` — **add the accepted contract document** for this resource, named for it, referencing `docs/canonical/16` rather than restating it. `docs/contracts/README.md` requires the implementing task to add it in the same change; this is that task, and it is the repository's first accepted contract.
- `docs/CODEMAP.md` — update only if stable module ownership changed (it will: a new or extended package, a new route handler, a populated `packages/contracts`).
- `PROGRESS.md` — facts only: TASK-006 status, files and modules introduced, verification actually run with PASS/FAIL and real counts, the §15 answers as recorded decisions, and any unresolved blocker still open. No session diary.
- `docs/DECISIONS_NEEDED.md` — mark D-010 RESOLVED once answered, or supersede it with an ADR if the decision deviates from `docs/canonical/16` §26 (the precedent is ADR-0003). D-007 stays open.

## 18. Definition of done

An application client can execute one canonical surname-result query and obtain a stable, rights-aware, evidence-backed `CURRENT_POPULATION` response produced entirely by the existing truth chain. Verified, by running:

```text
query
  → validation
  → exact surname resolver          (TASK-003, unchanged)
  → truth-chain lookup              (TASK-005, unchanged)
  → rights evaluation
  → response projection
  → serialization
```

and:

- Every acceptance criterion in §7 is demonstrated by a test that was run, with its actual output reported.
- Every invariant in §9 is asserted, including the no-mutation check across every affected table.
- Every failure mode in §10 has a test, including the no-leakage assertions.
- No duplicate truth or business logic exists in the read layer, proved by AC-02's and §16 item 9's checks rather than by inspection.
- The contract document exists in `docs/contracts/` and matches the shipped schemas.
- TASK-003, TASK-004 and TASK-005 suites pass with counts reported and no regression.
- The complete diff has been reviewed per §16 and contains no unrelated work.
- `docs/CODEMAP.md` and `PROGRESS.md` record observed facts; `docs/canonical/` is untouched.
- Work is committed on the designated branch with a descriptive message.
- **STOP.** Do not begin TASK-007. Do not write `tasks/007-*.md`.
