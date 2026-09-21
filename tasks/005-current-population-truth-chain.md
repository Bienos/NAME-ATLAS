# TASK-005 — `CURRENT_POPULATION` Truth Chain

- **Status:** IMPLEMENTED AND VERIFIED. Stale `NOT STARTED` corrected 2026-09-21: migration `0004_truth_layer.ts` and `packages/truth/src/derive.ts` exist, the chain is exercised end to end by `tests/integration/src/truth-chain.test.ts` against a real PostgreSQL, and the four blockers named below are resolved — D-008 and D-009 in `docs/DECISIONS_NEEDED.md`, and TASK-004 §14 U-1/U-4 by the project owner (ADR-0004 as amended: the unit is `PEOPLE`). The original text is kept below because §15's reasoning is the record of how they were answered.
- **Milestone:** M1 (`PLAN.md`: "Tasks: TASK-004 PESEL ingestion + Source/Rights · TASK-005 `CURRENT_POPULATION` truth chain"). This task closes M1.
- **Depends on:** TASK-003 (exact resolution, identity tables) and TASK-004 (PESEL ingestion, source/rights registry, distribution rows) — both implemented and verified, see `PROGRESS.md`.
- **Blocks:** M2 (`CURRENT_RANK`, `RARITY_CONTEXT`, the shared API contract and the first consumer surface).
- **Model guidance:** fresh implementation session, after §15 is answered.

---

## 1. Goal

Turn what TASK-004 persisted into the first reproducible, evidence-backed proposition Name Atlas can defend: for a surname that resolves exactly and has applicable ingested PESEL data, produce a `CURRENT_POPULATION` claim carrying its evidence, its confidence, its citation and its rights position — and stop exactly there.

This is the step that makes `ARCHITECTURE.md` §10 invariant 1 real for the first time:

```text
Source → SourceRecord → EvidenceItem → Claim → ConfidenceAssessment → Citation
```

TASK-004 built the first two links and the distribution rows beneath them. TASK-005 builds the remaining four, and a developer-facing result object that renders them. It produces **no** rank, rarity, share, trend, regional distribution, API endpoint or UI.

## 2. User / system outcome

After this task an engineer can run one command against a database that has had a PESEL resource imported, and get a structured result that answers *"why are we showing this number?"* without reconstructing anything by hand:

- the canonical surname identity the input resolved to, and how (`EXACT`, never fuzzy);
- one `CURRENT_POPULATION` claim **per applicable dataset snapshot**, each with its own count, its own reference date and its own dataset scope — never a sum across snapshots;
- the evidence each claim rests on, traceable to the exact `source_records` row, its checksum and its official URL;
- a confidence status produced by a named, versioned method, reproducible against the same evidence set;
- a structured citation with everything a later presentation layer needs, and no presentation prose;
- the rights position of the source, expressed per surface, so that "we hold this data" is visibly not the same statement as "we may publish it anywhere".

No user-facing surface changes. Nothing is published. This is the internal proof that M1's vertical slice exists.

## 3. Canonical authority

Read these; do not restate them as prose in code.

| Topic | Authority |
|---|---|
| `EvidenceItem` field specification | `docs/canonical/11` §9.5 (and §9.6 on `EvidenceDependency`) |
| `Claim`, `ClaimEvidence`, `ConfidenceAssessment`, `Citation` | `docs/canonical/11` §10.1–§10.4 |
| Claim taxonomy; `CURRENT_POPULATION` row and scope constraint | `docs/canonical/11` §11 |
| `EpistemicType` / `ConfidenceStatus` and their valid combinations | `docs/canonical/11` §12.1–§12.3 |
| Source / SourceRecord / EvidenceItem / Claim / Citation distinction | `docs/canonical/11` §13 |
| `ResearchRun` | `docs/canonical/11` §22.1 (see §15 D-009) |
| The deterministic `CURRENT_POPULATION` path and its provisos | `docs/canonical/14` §29, §29.1 |
| Structured claim payload for current population | `docs/canonical/14` §14.1 |
| Evidence type taxonomy; evidence directness | `docs/canonical/14` §4, §5 (see §15 D-008) |
| Claim/evidence relationships and the publishing rule | `docs/canonical/14` §18, §18.1 |
| Claim provenance — "why does Name Atlas currently believe this?" | `docs/canonical/14` §19 |
| Rights decision matrix and hard gates | `docs/canonical/12` §6.3, §6.4 |
| Rights boundary; presentation boundary; system invariants | `ARCHITECTURE.md` §5, §6, §10 |
| Trust and evidence rules; non-goals | `PRODUCT.md` §7, §8 |
| What TASK-004 persisted, and its recorded decisions | `tasks/004-pesel-surname-ingestion.md` §14; `PROGRESS.md` |
| `SourceRecord` granularity and uniqueness | `docs/adr/0003-source-record-granularity.md` |
| Stack and database access | `docs/adr/0001-stack.md`, `docs/adr/0002-db-access.md` |
| Open decisions | `docs/DECISIONS_NEEDED.md` — **D-008 and D-009 block this task**; D-007 constrains its rights output; D-004 untouched |

## 4. Preconditions

All verified against the working tree during this task's preflight (2026-09-19), not assumed.

1. **Exact resolution exists (TASK-003).** `@name-atlas/resolver` exports `resolveSurname`, `canonicalKey`, `CANONICAL_KEY_VERSION` / `NORMALIZATION_VERSION` (both `canonical_key_v1`), `RESOLUTION_METHOD_VERSION`, `detectScripts`, `validateSurnameInput`, `outcomeOf`. `resolveSurname` returns `{kind: "RESOLUTION", resolution}` or `{kind: "LOOKUP_FAILED", …}`; `resolution_status` is one of `EXACT | KNOWN_VARIANT | MULTIPLE_EXACT | UNKNOWN | REVIEW_REQUIRED` plus the validation statuses. It runs in a `READ ONLY` transaction and must stay that way.
2. **Identity tables exist (TASK-003).** `knowledge_entities`, `surnames` (`canonical_key` UNIQUE), `name_forms`, view `resolvable_name_forms` — migration `0002_identity_core`.
3. **PESEL data is ingested (TASK-004).** Migration `0003_source_rights_distribution` created `rights_profiles`, `sources`, `source_records`, `distribution_snapshots`, `distribution_values`. `@name-atlas/sources` exports `importPeselResource`, the registry (`PESEL_SOURCE`, `PESEL_RIGHTS_PROFILE`, the two approved resource descriptors) and `sha256Hex`.
4. **What a PESEL row looks like once persisted.** Per imported row: one `distribution_snapshots` row (`surname_id` NOT NULL, `source_id` and `source_record_id` NOT NULL, `as_of_date = 2026-01-20`, `geography_level = 'NATIONAL'`, `universe_description` = the publisher's verbatim Polish, `methodology_key`, `comparability_group`, `coverage_notes`, `universe_size` NULL, `surname_total_count` NULL) and exactly one `distribution_values` row (`place_id` NULL, `count` = the source's `Liczba`, every derived column NULL).
5. **Provenance is already reachable.** From a `distribution_values` row a single join chain reaches `distribution_snapshots → source_records → sources → rights_profiles`. TASK-004's integration suite exercises that traversal. TASK-005 must extend this chain, not build a second one.
6. **The seeded rights position.** `commercial_use = UNKNOWN`, `redistribution = UNKNOWN`, `review_status = LEGAL_REVIEW_REQUIRED`, `automated_access = ALLOWED`, `attribution_required = false`, `terms_version = "CC0 1.0"`. By `docs/canonical/12` §6.4 this makes paid surfaces ineligible. That is the input to §7's rights criteria, and it is **not** an input to confidence.
7. **No truth-layer table exists.** There is no `evidence_items`, `claims`, `claim_evidence`, `confidence_assessments`, `citations` or `research_runs` table. TASK-005 creates what it needs and nothing more.
8. **The contracts package is an intentional stub.** `packages/contracts` exports only `CONTRACT_PACKAGE_VERSION`; `docs/contracts/README.md` defers real schemas to M2. TASK-005 does not populate it.
9. **A surname can carry two snapshots.** A string appearing in both the male and female resources resolves to **one** `Surname` with **two** snapshots in **different** `comparability_group` values. TASK-004's verification observed exactly this (7 surnames reused across the fixtures; `NOWAK` at 98,387 and 99,738). §7's "Exact-form semantics" criteria depend on this fact.

## 5. Truth-chain flow

The bounded flow, in this repository's terminology. Every arrow is a link this task builds or reuses; nothing beyond the final box is in scope.

```text
raw surname input
  → validateSurnameInput + resolveSurname            (TASK-003, reused unchanged)
  → Surname                                          (surnames.surname_id; EXACT only)
  → DistributionSnapshot[] + DistributionValue       (TASK-004, read-only)
      ↳ each carries its own source_record_id, as_of_date, universe_description,
        methodology_key, comparability_group, coverage_notes
  → EvidenceItem            one per applicable (surname, snapshot), OFFICIAL dataset value
  → Claim                   one CURRENT_POPULATION per (surname, snapshot), FACT
  → ClaimEvidence           SUPPORTS, claim ↔ its evidence
  → ConfidenceAssessment    one per claim, versioned, reproducible via evidence_set_hash
  → Citation                structured, referencing source + source_record + rights_profile
  → SurnameCurrentPopulationResult   developer-facing, read-only projection
```

**One claim per snapshot, never a sum.** The male and female resources sit in different `comparability_group`s precisely because the publisher does not disambiguate what the partition means (TASK-004 §14 U-1), and `docs/canonical/11` §6.1 defines that field as the gate on quantitative comparison. A surname in both resources therefore yields **two** `CURRENT_POPULATION` claims, each with its own count and snapshot. The result object returns a list. Summing, averaging or picking "the bigger one" is forbidden, and §7 requires a test proving no code path does it.

**No `DistributionValue` is rewritten.** Evidence reads the distribution rows; it never mutates them. Source data and derived product claims stay separate objects (`docs/canonical/11` §13; `ARCHITECTURE.md` §10 invariant 6).

## 6. In scope

1. **A migration** creating only the truth-layer tables this chain needs — `evidence_items`, `claims`, `claim_evidence`, `confidence_assessments`, `citations`, and `research_runs` if D-009 lands on Option A — plus their enums. Numbered after `0003`.
2. **A derivation service**: given a resolved `Surname`, read every applicable snapshot/value pair and emit evidence, claim, link, confidence and citation for each, idempotently, in one transaction per surname.
3. **A confidence rule** implementing `docs/canonical/14` §29's provisos as an actual predicate, with a named `assessment_method` and `assessment_version`.
4. **Structured citation construction** from the already-persisted source registry and resource metadata. No prose, no formatting.
5. **Surface-eligibility evaluation** computed from the effective `RightsProfile` per `docs/canonical/12` §6.3/§6.4 — internal / free / paid / SEO — carried on the result object, never on the claim's confidence.
6. **A developer-facing result object and CLI** exercising the real derivation code end to end.
7. **Unit tests** (pure rules and mapping) and **integration tests** against real PostgreSQL.
8. `docs/CODEMAP.md` and `PROGRESS.md` updated with observed facts.

## 7. Acceptance criteria

Each is a behaviour an automated test must demonstrate by running. Field names below are taken from `docs/canonical/11`; where D-008 changes them, follow the recorded decision.

**Claim identity**

- **AC-01 — A typed proposition, not a number.** Each claim row carries `claim_type = 'CURRENT_POPULATION'`, `epistemic_type = 'FACT'`, `scope = 'SURNAME_LEVEL'` (`docs/canonical/11` §11 scope constraint), `subject_entity_id` = the resolved surname's entity id, `claim_status = 'ACTIVE'`, a `method_version`, and a `structured_value` validating against a versioned schema for this claim type. A bare integer stored anywhere as "the population" is a defect.
- **AC-02 — The payload carries scope and date, never a timeless count.** `structured_value` includes the count, the originating `distribution_snapshot_id`, the country scope, the snapshot date (`2026-01-20` for the current resources) and the source population scope. The last field carries the publisher's own universe wording, so the claim never asserts more than the publisher stated (`ARCHITECTURE.md` §10 invariant 5; §15 U-4).
- **AC-03 — `claim_key` is a stable semantic identity.** Deterministic from `(claim_type, surname, distribution_snapshot)` and nothing else — no timestamp, no UUID, no run id. It is the dedupe key AC-09 relies on.
- **AC-04 — Scope allow-list enforced.** An attempt to emit `CURRENT_POPULATION` at any scope other than `SURNAME_LEVEL` fails closed rather than being stored.

**Evidence and traceability**

- **AC-05 — Evidence is created, source rows are not mutated.** Each applicable snapshot produces one `EvidenceItem` whose `source_record_id` is the exact TASK-004 `source_records` row and whose `subject_entity_id` is the surname. A test asserts every `distribution_values`, `distribution_snapshots` and `source_records` row is byte-for-byte unchanged by derivation (`ARCHITECTURE.md` §10 invariant 6).
- **AC-06 — Evidence preserves enough context to audit.** `structured_value` carries the count and the snapshot's own scope fields; `supporting_locator` identifies the specific distribution row. `verification_status` is set from a stated rule, not defaulted optimistically.
- **AC-07 — "Why are we showing this number?" answerable in one traversal.** An integration test walks claim → `claim_evidence` → `evidence_items` → `source_records` → `sources` → `rights_profiles` and asserts it reaches the resource checksum, official URL, retrieval time and licence — without heuristics and without re-reading the CSV.
- **AC-08 — `ClaimEvidence` links, it does not copy.** The relationship row carries `relationship = 'SUPPORTS'`. No raw source value is duplicated onto the claim row for convenience. At least one non-lead support path exists per claim (`docs/canonical/14` §18.1).

**Determinism and idempotency**

- **AC-09 — Idempotent re-derivation.** Running derivation twice over unchanged data creates no second claim, no second evidence item, no second link and no second confidence assessment; row counts of every truth-layer table are equal before and after, and the run reports that it was a no-op.
- **AC-10 — Deterministic output.** Identical canonical data and identical snapshot produce identical `claim_key`, identical `structured_value` and identical `evidence_set_hash`. No clock, locale, environment variable or random value affects any stored field other than system-generated UUIDv7 keys and timestamps.
- **AC-11 — A changed snapshot supersedes rather than overwrites.** When a resource is re-imported with different bytes (TASK-004 AC-22 creates a new `source_record` and a new snapshot), re-derivation produces a **new** claim whose `supersedes_claim_id` points at the prior one, which becomes `SUPERSEDED`. The prior claim's other columns are unchanged.

**Confidence**

- **AC-12 — Confidence from the canonical model.** One `ConfidenceAssessment` per claim, with `status` from `docs/canonical/11` §12.2, a `rationale`, an `evidence_set_hash`, a named `assessment_method` and `assessment_version`, and `review_status = 'AUTO'`. `VERIFIED` is emitted only when `docs/canonical/14` §29's four provisos actually hold — reproducible extraction, valid exact resolution, preserved source scope, no material conflict — each checked, not assumed.
- **AC-13 — Valid epistemic/confidence pairing.** The `(epistemic_type, status)` pair is one `docs/canonical/11` §12.3 permits for `FACT`. A test asserts an invalid pairing cannot be stored.
- **AC-14 — Rights never touch confidence.** Deriving the same claim under a deliberately restrictive `RightsProfile` (e.g. `commercial_use = PROHIBITED`) produces a **byte-identical** `ConfidenceAssessment`. Conversely, a permissive profile does not raise confidence. This is the direct test of `ARCHITECTURE.md` §10 invariant 2 and `PRODUCT.md` §7 rule 3.

**Citation and provenance**

- **AC-15 — Structured citation, no presentation copy.** Each claim has a `Citation` carrying `source_id`, `source_record_id`, title, publisher, publication date at source precision, `url_or_reference`, `supporting_locator`, `accessed_at` and `rights_profile_id` — every value read from the persisted registry and resource metadata. No formatted PL/EN citation string is produced or stored (`docs/canonical/11` §10.4: "Formatting … is downstream").
- **AC-16 — No fabricated provenance.** Every citation field is either read from persisted data or null. A test asserts that with a resource whose metadata lacks a field, the citation carries null rather than a plausible substitute.

**Rights and surface eligibility**

- **AC-17 — Possession is not permission.** The result object exposes per-surface eligibility derived from the effective profile via `docs/canonical/12` §6.3/§6.4. With TASK-004's seeded profile (`commercial_use = UNKNOWN`) paid and SEO surfaces are **ineligible** while the claim's confidence is unaffected. A test asserts both halves in the same assertion block.
- **AC-18 — Rights travel with the claim's provenance.** The rights profile reachable from the claim is the one in force for its source record, not a global default.

**Zero, missing, suppressed and unresolved**

- **AC-19 — Six distinguishable outcomes, none of them `0`.** The result object reports a distinct, typed state for each of: (a) input did not resolve (`UNKNOWN`), (b) input was ambiguous or needs review (`MULTIPLE_EXACT` / `REVIEW_REQUIRED`), (c) input was invalid (validation statuses), (d) surname resolved but no snapshot from an applicable source exists, (e) the source's coverage excludes the surname — the `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT` situation TASK-004 recorded in `coverage_notes` — and (f) the lookup itself failed (`LOOKUP_FAILED`, infrastructure, never "unknown surname"). A test asserts no path produces a count of `0`, and that no claim is created for (a)–(f).
- **AC-20 — Absence is never a claim.** No `CURRENT_POPULATION` claim is written for a surname with no applicable evidence. A "we found nothing" result is a state on the result object, not a zero-valued claim (`ARCHITECTURE.md` §10 invariant 4; `PRODUCT.md` §7 rules 4 and 7).

**Exact-form semantics**

- **AC-21 — No aggregation across snapshots.** A surname present in both PESEL resources yields two claims with their own counts. A test asserts the result contains both, that neither count equals their sum, and that no code path sums, averages or selects between them.
- **AC-22 — No aggregation across forms.** `KOWALSKI` and `KOWALSKA` produce entirely separate results. Nothing merges masculine and feminine forms, spelling variants, diacritic variants or historical variants. `Łuczak` and `Luczak` remain distinct throughout (`ARCHITECTURE.md` §10 invariant 8).
- **AC-23 — Exact resolution only.** Only `EXACT` proceeds to derivation. `KNOWN_VARIANT` — a resolution through an accepted `NameForm` — is either excluded or explicitly permitted by a stated rule recorded in the task's own §15; it must not be silently treated as equivalent. No fuzzy, phonetic, trigram or diacritic-fold path exists anywhere in the diff (`ARCHITECTURE.md` §10 invariant 9).

**Developer-facing verification**

- **AC-24 — One command exercises the real chain.** A CLI following the existing `packages/<pkg>/bin/*.ts` convention (as `packages/db/bin/migrate.ts` and `packages/sources/bin/import-pesel.ts` do), aliased from the root `package.json` alongside `db:migrate` and `test:integration`, accepts a surname and prints a structured result showing: canonical surname identity and resolution status; each `CURRENT_POPULATION` value with its snapshot date and dataset scope; the evidence and source-record reference; the confidence status and method version; the citation fields; and per-surface rights eligibility.
- **AC-25 — The demo consumes production code.** The CLI calls the same derivation service the integration tests call. A test asserts there is no second derivation path — in particular that the CLI module contains no SQL of its own. *(Practical note from TASK-004: a `pnpm --filter` script runs with the package directory as cwd, so file arguments must be resolved accordingly or documented as absolute.)*
- **AC-26 — Reproducible verification.** Every command in §12 runs from a clean checkout and is reported with actual output.

## 8. Out of scope

Their absence is a success condition. Anything here appearing in the diff is a defect.

- Any other `ClaimType`: `CURRENT_RANK`, `RARITY_CONTEXT`, `CURRENT_DISTRIBUTION`, `REGIONAL_CONCENTRATION`, `SURNAME_MEANING`, `LINGUISTIC_ORIGIN`, `GEOGRAPHIC_ORIGIN`, `HISTORICAL_*`, `MIGRATION_PATTERN`, `ARCHIVE_AVAILABILITY`, `SOURCE_CONFLICT`, `DATA_LIMITATION`.
- Any derived statistic: rank, 1-in-X, percentile, share, population rate, trend, year-over-year comparison, male+female total.
- Public surname API, HTTP endpoint, OpenAPI schema, `packages/contracts` population — M2 (`docs/contracts/README.md`).
- Consumer result UI, homepage, search UI, admin UI, any change under `apps/`.
- Maps, regional distribution, `Place`, `PlaceName`, `PlaceGeometry`, `AdministrativeMembership`. D-004's gate is untouched.
- Historical records, `HistoricalOccurrence`, `HistoricalVariant`, earliest-occurrence semantics, historical PESEL comparison, earlier annual snapshots.
- Etymology, surname meaning, linguistic origin, geographic-origin inference, migration, heraldry, genealogy.
- Polona, archives, Geneteka, FamilySearch, IJP PAN, TERYT, GeoNames, Wikidata, US Census, INSEE, or any second source.
- Fuzzy, phonetic, trigram, `pg_trgm`, OCR, transliteration or diacritic-fold matching; automatic gender-form inference; generated name forms.
- LLM enrichment of any kind. No prompt, no model call, no `prompt_manifest` content beyond an honestly empty object.
- `DiscoveryIndex`, `CoverageAssessment`, `PremiumEligibility`, paywall, premium reports, payments, entitlements.
- SEO, analytics, sitemaps, structured data.
- Redis, BullMQ, the outbox, `ResearchModuleRun`, async orchestration — M3 (`PLAN.md`). A synchronous `research_runs` row, if D-009 lands on Option A, is **not** the async runtime and must not grow into it.
- `EvidenceDependency` / `EvidenceIndependenceGroup` (`docs/canonical/11` §9.6 calls the first "P1 if ClaimEvidence links are sufficient for the first vertical slice"; they are).
- `SurfaceEligibilityAssessment` as a persisted entity — it is `docs/canonical/14`'s MODEL CHANGE PROPOSAL 14-I, unaccepted. Surface eligibility is computed here, not stored.
- TASK-006. Do not create `tasks/006-*.md`.
- Any unrelated refactor or dependency upgrade.

## 9. Data-integrity invariants

Testable statements that must hold after any sequence of derivations. The authority is `ARCHITECTURE.md` §10.

1. Derivation never writes to `source_records`, `distribution_snapshots` or `distribution_values`. Source payloads stay immutable.
2. Every `CURRENT_POPULATION` claim has at least one `claim_evidence` row with `relationship = 'SUPPORTS'`.
3. Every `claim_evidence.evidence_item_id` references a persisted `evidence_items` row; no dangling or synthesised support.
4. Every evidence item's `source_record_id` references a persisted `source_records` row.
5. A claim's evidence concerns the claim's own subject: the evidence item's `subject_entity_id` equals the claim's `subject_entity_id`, and the snapshot behind it belongs to that same surname. A claim can never cite another surname's evidence.
6. Every claim's `structured_value` carries a non-null snapshot date and dataset scope. Snapshot provenance cannot be silently lost.
7. No claim exists with a count of `0`, null or negative. Absence produces no claim at all.
8. `claim_key` is unique among `ACTIVE` claims; re-derivation cannot create a second active claim for the same `(surname, snapshot)`.
9. `supersedes_claim_id` forms no cycle, and a `SUPERSEDED` claim is never mutated except to set that status.
10. Exactly one `ACTIVE` `ConfidenceAssessment` per claim, and its `evidence_set_hash` matches a recomputation over that claim's current evidence set.
11. Confidence status is never a function of any `RightsProfile` field, and surface eligibility is never a function of `ConfidenceStatus`. The two are computed by separate code paths with no shared input.
12. Every `Citation.rights_profile_id` resolves to the profile in force for the cited source record.
13. All primary keys are UUIDv7 (`ARCHITECTURE.md` §10 invariant 12).
14. No row created by a test fixture is reachable from a claim derived over genuine source-derived data, and no synthetic count is ever stored with a real surname's identity presented as source evidence.

## 10. Failure behaviour

Every failure is a typed, named outcome — never an untyped exception, never a silent skip, never a partial write.

| Condition | Behaviour |
|---|---|
| Input fails validation (empty, over limit, control characters) | Typed result state; no database write; no claim. |
| Resolution returns `UNKNOWN` | Typed "unresolved" state. No claim. Explicitly **not** a zero count. |
| Resolution returns `MULTIPLE_EXACT` or `REVIEW_REQUIRED` | Typed "ambiguous / needs review" state. Never resolved by guessing. No claim. |
| Resolution returns `LOOKUP_FAILED` | Infrastructure failure, surfaced as such. Never reported as "surname unknown". No claim. |
| Surname resolves; no snapshot from an applicable source | Typed "no applicable evidence" state, carrying the source's coverage note so the caller can distinguish suppression from true absence. No claim. |
| A snapshot exists but its value row is missing, null or below the source's confirmed minimum | Violated source invariant. Fail closed with a typed error; write nothing. Do not treat as zero. |
| Two `ACTIVE` claims found for one `claim_key` | Conflicting canonical records. Fail closed; do not pick one. |
| Evidence set hash recomputation disagrees with the stored assessment | Fail closed; a stale assessment is a finding, not something to silently refresh. |
| Rights profile missing for a source record | Fail closed. `ARCHITECTURE.md` §10 invariant 13 requires an approved profile before any production surface. |
| Database error mid-derivation | Transaction rolls back; typed failure returned; every truth-layer table unchanged. |
| Re-derivation over unchanged data | Not a failure. Reports "already derived"; writes nothing. |

## 11. Test requirements

Prefer integration tests for the chain; use unit tests for pure rules. Follow the existing harness (`@name-atlas/testing`, `startTestDatabase` / `migrateTestDatabase`, the `TEST_DATABASE_URL` fallback) and the shape of `tests/integration/src/pesel-ingestion.test.ts`.

**Integration — real PostgreSQL, over genuinely ingested fixture data**

1. An exactly-resolved surname with valid PESEL evidence produces a complete chain: evidence, claim, link, confidence, citation.
2. The claim's fields match AC-01/AC-02 exactly, including snapshot date and dataset scope.
3. Claim → evidence traceability (AC-07's single traversal).
4. Evidence → `source_record` traceability, reaching checksum, URL and retrieval time.
5. Repeated derivation is byte-identical in every stored field except system keys/timestamps.
6. Repeated derivation is idempotent: no new rows in any truth-layer table.
7. Unresolved surname → typed state, no claim, no zero.
8. Resolved surname with no applicable evidence → typed state, no claim.
9. Missing-versus-zero: an absent surname and a present surname are distinguishable, and nothing returns `0`.
10. Polish diacritics survive the chain: `WIŚNIEWSKI` resolves and claims; `WISNIEWSKI` does not resolve to it; `Łuczak` and `Luczak` never converge.
11. Snapshot date propagates from `distribution_snapshots.as_of_date` into the claim payload and the result object unchanged, and is never the retrieval date.
12. Citation is constructed from persisted values only (AC-15/AC-16).
13. Confidence is `VERIFIED` when §29's provisos hold, and a different, honest status when one does not.
14. Rights metadata reaches the result per surface; paid/SEO ineligible under the seeded profile.
15. Malformed evidence (a snapshot with a missing or invalid value row, constructed synthetically) fails closed and writes nothing.
16. A second `ACTIVE` claim for one `claim_key`, inserted directly, is detected and fails closed.
17. A surname present in both resources yields two claims, and no result field equals the sum of the two counts.
18. No fuzzy or variant aggregation: a diacritic-stripped and a case-variant input are tested explicitly.
19. End-to-end developer verification: the result the CLI path produces equals the result the service produces for the same input.
20. Every invariant in §9 asserted as a query after a full two-resource import and derivation.
21. Superseding a snapshot supersedes its claim (AC-11), and the prior claim is otherwise unmutated.

**Unit — pure, no database**

22. The confidence rule returns `VERIFIED` only when all four provisos hold; one test per proviso withheld.
23. The same rule returns an identical assessment under permissive and restrictive rights profiles (AC-14, as a pure test in addition to the integration one).
24. Surface eligibility maps the `docs/canonical/12` §6.3 matrix correctly, including `commercial_use = UNKNOWN` → paid ineligible.
25. `claim_key` construction is deterministic and depends on no clock, no UUID and no environment.
26. Claim payload validation rejects a payload missing snapshot date or dataset scope.
27. `(epistemic_type, status)` validation rejects a pairing `docs/canonical/11` §12.3 does not permit for `FACT`.

**Property-based (`fast-check`, kept small per `docs/canonical/17` §14)**

28. For arbitrary valid `(count, snapshot)` inputs, payload construction is deterministic and the count is preserved exactly.
29. `evidence_set_hash` is stable under evidence reordering and changes when the evidence set changes.

## 12. Fixture strategy

The distinction between genuine source-derived data and synthetic construction must be visible in the code, not only in a comment. TASK-004 established this; TASK-005 inherits it unchanged.

1. **Genuine, source-derived (already committed):** `fixtures/pesel/national-male-2026-01-20.csv` (22 rows) and `national-female-2026-01-20.csv` (23 rows). Every row is byte-identical to a real line of the official resource. The publisher metadata under `docs/sources/acquisition/2026-09-18/metadata/` is a verbatim capture. These are the primary inputs: the chain should be proved over **genuinely ingested data**, by running TASK-004's importer in test setup rather than by hand-inserting distribution rows.
2. **A fixture's checksum is not the resource's checksum.** The committed fixtures are excerpts. Tests pass the excerpt's own SHA-256 explicitly, as TASK-004's do.
3. **Synthetic fixtures are named as such.** Anything constructed to force a code path — a malformed value row, a duplicate active claim, a restrictive rights profile, an ambiguous identity — lives under an explicitly synthetic name or is built inline with a comment stating it is synthetic and is not PESEL evidence.
4. **Synthetic counts are never presented as real.** A synthetic count is a mechanical value, never a plausible-looking figure attributed to a real surname.
5. **No new genuine fixture is added.** If a test needs a real row the committed fixtures lack, that is a finding to record — the full resources are not in the repository and must not be added (`AGENTS.md` §6).
6. **Synthetic rows can never become production evidence** (§9 invariant 14). A test asserts no claim derived over genuine data references a synthetically seeded identity.

## 13. Constraints

- Preserve all currently passing behaviour: **132 unit tests and 60 integration tests pass today** (`PROGRESS.md`); none may regress.
- TASK-003 resolver semantics are unchanged. Do not relax its `READ ONLY` guarantee, do not add a resolution tier, do not duplicate `canonicalKey`.
- TASK-004 ingestion semantics are unchanged. Do not modify the importer, the registry, migration `0003`, or any row they own.
- Reuse the canonical models. Do not create a parallel evidence or claim architecture, a second surname model, or a second provenance chain.
- Do not infer population aggregation of any kind. Do not fabricate provenance, confidence or citation data. Where a value is unknown, store null and let the result say so.
- The derivation service owns SQL; the CLI owns none.
- No new dependency without a one-line justification (`AGENTS.md` §6). This task is not expected to need one. No dependency upgrade.
- Smallest complete implementation satisfying §7. No abstraction for the second claim type, the second source or the future API.
- `docs/canonical/`, `docs/library/`, `docs/archive/`, `docs/reference/`, `docs/review/` and `prompts/` are read-only (`AGENTS.md` §2).
- Where a canonical document does not support a requirement, record it as unresolved rather than choosing.

## 14. Preflight

Before editing, read-only and targeted — no repository-wide exploration:

1. This task file and the §15 answers.
2. `PROGRESS.md` — in particular the TASK-004 sections and what was actually verified.
3. `tasks/003-exact-surname-resolver.md` and `tasks/004-pesel-surname-ingestion.md` (their §14 decisions bind here).
4. The TASK-003 implementation: `packages/resolver/src/{lookup,resolution,normalize,version}.ts`.
5. The TASK-004 implementation: `packages/sources/src/{registry,importer,import-result}.ts` and `packages/db/migrations/0003_source_rights_distribution.ts`.
6. The canonical sections named in §3, **by line range**. Do not read the canonical corpus in bulk.
7. `packages/db/src/generated/db.ts` and `packages/db/src/migrator.ts` for existing schema and conventions.
8. `tests/integration/src/pesel-ingestion.test.ts` and `packages/testing/src/postgres-container.ts` for the established test shape.
9. `docs/adr/0003-source-record-granularity.md`, and `docs/DECISIONS_NEEDED.md` D-007/D-008/D-009.
10. `git status` and the current diff.

Then state a short plan naming the exact files to change, and implement.

## 15. Unresolved decisions — answer before implementation

**Two need a recorded decision before the migration can be written** (both discovered from repository evidence during this task's preflight and written up in `docs/DECISIONS_NEEDED.md`):

- **D-008 — do `docs/canonical/14`'s MODEL CHANGE PROPOSALS bind, or does `docs/canonical/11`'s schema?** They disagree on the `EvidenceType` enum (`OFFICIAL_DATASET_FIELD` vs `OFFICIAL_DATASET_VALUE` — the same concept under two names), on the `EvidenceItem` field set (14-A adds `directness`, `extraction_method`, a required `rights_profile_id` and more), on the `ClaimEvidence` relationship enum (14-D adds `QUALIFIES`, `CONTEXTUALISES`, `LEAD_ONLY`), and on the `CURRENT_POPULATION` payload field names (§10.1 vs §14.1). Three options and a recommendation are in D-008. **Do not settle this by picking a shape in the migration file** — `AGENTS.md` §2 requires a contradiction between canonical documents to be recorded.
- **D-009 — `created_by_run_id` is required and not nullable on both `EvidenceItem` and `Claim`, but no `ResearchRun` exists.** `docs/canonical/11` marks `ResearchRun` P0; `PLAN.md` puts the research runtime at M3. TASK-005 is the first task forced to resolve it. Three options and a recommendation are in D-009.

**Two need the publisher and are carried forward from TASK-004 §14:**

- **U-1 — what the male/female split partitions.** Unanswered. TASK-005 **can proceed without it** by emitting one claim per snapshot and never summing (§5, AC-21), which is what the differing `comparability_group` values already enforce. What it must **not** do is describe either count as "men" or "women".
- **U-4 — the unit of `Liczba`.** The publisher says "liczba wystąpień" (number of occurrences) of a current-surname value among living persons; that one occurrence equals one living person is strongly implied but **not stated**. TASK-005 **can proceed without it** only by carrying the publisher's own universe wording verbatim in the claim payload's source-population-scope field and never asserting a count of *people* anywhere in the claim, the confidence rationale or the result object. **If the implementing session finds it cannot write the payload honestly under that restriction, stop and report rather than choosing a unit.**

**One implementer choice to record during the work:**

- **U-5 — whether `KNOWN_VARIANT` proceeds to derivation.** `EXACT` certainly does (AC-23). A `KNOWN_VARIANT` resolution reaches a surname through an accepted, eligible `NameForm`, which is a canonical identity link rather than a fuzzy guess — but no `NameForm` variant links exist in production data today, since TASK-004 creates exactly one `CANONICAL`/`ATTESTED` form per surname. **Recommended:** accept `EXACT` only for now and record the exclusion, because the permissive path cannot be tested against real data and would be speculative. Whichever is chosen, state it in the task's acceptance criteria and test it.

**One constraint inherited, not to be reopened:**

- **D-007** — the PESEL resource-level licence is unconfirmed, so the seeded profile carries `commercial_use = UNKNOWN` and `review_status = LEGAL_REVIEW_REQUIRED`. TASK-005 consumes that; it does not change it, and it must not "upgrade" the profile to make a surface eligible.

## 16. Verification

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
pnpm db:migrate            # applies 0001–0003 and the new migration
pnpm db:generate-types     # must produce no diff against the committed generated types
pnpm test:integration
pnpm build
```

Then the truth chain end to end, against real ingested fixture data — import, derive, inspect:

```bash
# import a committed fixture (TASK-004 path, unchanged)
pnpm --filter @name-atlas/sources run import-pesel --resource 1148808 \
  --file <abs>/fixtures/pesel/national-male-2026-01-20.csv \
  --metadata <abs>/docs/sources/acquisition/2026-09-18/metadata/pesel_national_2026_male_1148808.official_resource.json \
  --sha256 <the fixture's own checksum>

# derive and inspect (TASK-005 path)
pnpm demo:surname -- "<a surname present in that fixture>"     # or the equivalent alias this task adds
```

Report the structured result, and report a second run of the same command showing it is idempotent.

**Regression check:** state explicitly that the TASK-003 resolver tests and the TASK-004 ingestion tests still pass, with their counts, rather than only reporting the new suite.

Container registries have been network-egress-blocked in every session so far. If `pnpm test:integration` cannot pull the pinned `postgis/postgis` image, use the `TEST_DATABASE_URL` fallback against a locally installed PostgreSQL 16 + PostGIS, and **state plainly that the pinned image itself was not exercised** — as TASK-003 and TASK-004 did. Do not skip the check.

## 17. Diff review

Before declaring the task complete, inspect the entire diff file by file and confirm:

1. Nothing from §8 is present — no second claim type, no derived statistic, no API, no UI, no place, no second source, no LLM, no async runtime.
2. TASK-003 resolver semantics are unchanged: no new tier, no relaxed read-only transaction, no second normalisation function. `packages/resolver` ideally shows no diff at all.
3. TASK-004 ingestion semantics are unchanged: `packages/sources` importer/registry and migration `0003` show no behavioural diff.
4. No fuzzy, phonetic, trigram, transliteration or diacritic-fold logic was introduced anywhere.
5. No hidden aggregation: grep the diff for summation over counts and confirm every hit is a test asserting absence.
6. No source evidence was rewritten into a derived fact; `distribution_*` and `source_records` are read-only in the new code.
7. No missing value became `0`; grep for zero-valued defaults on counts.
8. Confidence and rights are computed by separate functions with no shared input; neither imports the other's inputs.
9. `pnpm-lock.yaml` changed only if a workspace member was added; no dependency was upgraded.
10. No raw source file was committed; no synthetic fixture is presented as source evidence.
11. `docs/canonical/` and the other read-only directories are untouched (`git status --porcelain` on those paths is empty).
12. No debug code, stray file or accidental formatting churn.

## 18. Documentation / handoff

- `docs/CODEMAP.md` — update only if stable module ownership changed (it will: a new package or module for the truth layer, a new migration, a new CLI entry point).
- `PROGRESS.md` — facts only: TASK-005 status, files and modules introduced, migration applied, verification actually run with PASS/FAIL and real counts, the §15 answers as recorded decisions, and any unresolved blocker still open. No session diary, no narrative.
- `docs/DECISIONS_NEEDED.md` — mark D-008 and D-009 RESOLVED (or supersede them with an ADR, as D-006 was superseded by ADR-0003) once answered. D-007 stays open and is not this task's to close. Carry U-1 and U-4 forward explicitly as preconditions of any claim wording that reaches a user.
- If the decision on D-008 deviates from a canonical document, record it as an ADR and make the migration carry a comment pointing at it — the precedent is ADR-0003.

## 19. Definition of done

A fresh agent can demonstrate, by running commands and reporting their real output:

```text
exact surname input
  → canonical Surname
  → persisted PESEL DistributionSnapshot/DistributionValue
  → EvidenceItem
  → CURRENT_POPULATION Claim
  → ClaimEvidence (SUPPORTS)
  → ConfidenceAssessment
  → structured Citation
  → per-surface rights eligibility
  → deterministic developer-facing result
```

and:

- Every acceptance criterion in §7 is demonstrated by a test that was run, with its actual output reported.
- Every invariant in §9 is asserted against a real database after a full import and derivation.
- Every failure mode in §10 has a test.
- Re-running the derivation changes nothing and says so.
- `pnpm db:generate-types` produces no diff after commit.
- TASK-003 and TASK-004 tests still pass, with counts reported.
- The complete diff has been reviewed per §17 and contains no unrelated work.
- `docs/CODEMAP.md` and `PROGRESS.md` record observed facts; `docs/canonical/` is untouched.
- Work is committed on the designated branch with a descriptive message.
- **STOP.** Do not begin TASK-006. Do not write `tasks/006-*.md`.
