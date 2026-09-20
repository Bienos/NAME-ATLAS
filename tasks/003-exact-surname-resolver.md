# TASK-003 — Exact surname resolver

- **Status:** DONE — implemented and verified 2026-09-19 (see `PROGRESS.md`); §6.2 approved by the project owner before implementation
- **Milestone:** M0 (`PLAN.md`: "Tasks: TASK-001 project foundation · TASK-002 PESEL source spike · TASK-003 exact surname resolver")
- **Depends on:** TASK-001 (project foundation) only
- **Independent of:** TASK-002 (PESEL source spike). The resolver never reads PESEL data; see §2.
- **Blocks:** TASK-004 (PESEL ingestion populates `NameForm` rows on top of this task's tables) and TASK-005 (the truth chain attaches `Claim`s to a resolved `Surname`)
- **Canonical epic:** RES-001 (`docs/canonical/23` §48, master roadmap row 6: "RES-001 Resolver v1 | DB-001, QA-001 | L | CRITICAL | safe PL identity")
- **Amended by:** ADR-0005 (2026-09-20) — the canonical key now folds with Unicode **simple** case folding, not full folding, and is `canonical_key_v2`. §5's identity rules are otherwise unchanged. Everything this task accepted still holds except that one step; the ADR records why.
- **Model guidance:** fresh implementation session once §6 is approved

## 1. Goal

Implement the smallest testable exact resolver: given a surname input, either resolve it to an existing canonical `Surname` through a permitted, unambiguous exact match, or report — explicitly, never by guessing — that no match exists, that the input was invalid, or that the match is ambiguous and requires review.

This is surname **identity lookup**, not genealogy, etymology, population counting, or fuzzy search. It answers "which canonical entity, if any, does this exact string refer to?" — nothing more.

## 2. Current baseline

Established by direct inspection of the repository, not assumed:

- **No identity tables exist.** `packages/db/migrations/` contains exactly one migration (`0001_bootstrap_extensions.ts`), which enables `postgis` and `pg_trgm` and creates no table (TASK-001 §3, verified in `PROGRESS.md`). `packages/db/src/generated/db.ts` currently types only the three tables PostGIS itself creates (`geography_columns`, `geometry_columns`, `spatial_ref_sys`) plus Kysely's own migration bookkeeping tables. There is no `knowledge_entities`, `surnames`, or `name_forms` table anywhere.
- **No `packages/resolver` exists.** `docs/CODEMAP.md`'s planned table already anticipates it, owned by this task.
- **`packages/sources` (TASK-002) is unrelated to this task.** It parses raw PESEL CSV bytes into `{ surname, count }` rows and performs no canonical resolution, no database access, and no mapping to `Surname`/`NameForm`. TASK-002's own completeness or incompleteness does not affect this task: per the canonical roadmap's own dependency table, RES-001 depends only on `DB-001` (canonical schema) and `QA-001` (test foundation, done in TASK-001) — not on `DAT-001`/`SRC-001` (source/rights registry, PESEL ingestion). This task does not read `fixtures/pesel/` or `packages/sources` for anything other than optional inspiration for realistic Polish surname strings in its own synthetic fixtures.
- **What TASK-001 already provides and this task reuses as-is:** the pnpm workspace and strict TypeScript config; Kysely + `pg` + hand-written SQL migrations via `Migrator`/`FileMigrationProvider` (ADR-0002); the Testcontainers Postgres harness pinned to `postgis/postgis:16-3.4@sha256:44126d87…` (`packages/testing`); `uuidv7()`/`isUuidV7()` (`packages/domain`); Vitest + fast-check as the test stack (`docs/canonical/17` §3.1, §3.5).
- **Model-change proposal 13-A is not accepted.** `docs/canonical/13` §7 ("MODEL CHANGE PROPOSAL 13-A") proposes adding `GENDER_FORM` to `NameFormType` and `GENDER_FORM_OF` to `NameFormRelationType`. No ADR has accepted it (`docs/adr/` contains only `0001-stack.md` and `0002-db-access.md`). This task treats it as **not binding** and uses only the base enum values `docs/canonical/11` §4.3–§4.4 already defines. This does not block anything here: gendered-form handling is explicitly out of scope for this task (§4).

## 3. Prerequisites and genuine blockers

**One genuine blocker, and it is resolved by this task's own scope, not by an external dependency:** the identity tables this resolver must query do not exist. This is not a reason to wait for another task — `docs/canonical/23` §9 explicitly frames Migration Group A as staged, sequenced by implementation need, "not all at once before proof… an implementation-sequencing decision, not a semantic model change." This task therefore includes the minimal identity migration it needs (§6). It does **not** wait on TASK-004, which will later extend the same migration group with `Source`, `RightsProfile`, `SourceRecord` and PESEL-derived `NameForm` rows.

No other prerequisite is genuinely blocking. TASK-002's residual open items (`docs/DECISIONS_NEEDED.md` D-001's two carried-forward notes) concern PESEL resource download URLs and portal timestamps — irrelevant to identity lookup.

## 4. In scope

1. Input preservation: `raw_input` is captured and returned untouched; normalisation products are computed separately and never overwrite it (`docs/canonical/13` §5.2 "Raw input").
2. Input validation, producing one of a small set of typed outcomes (§7) — never a bare rejection, never silent coercion.
3. The canonical comparison key: Unicode NFC → full Unicode default case folding → explicit separator mapping → trim → collapse ordinary whitespace → preserve diacritics, particles and token order (`docs/canonical/13` §5.2 "Canonical identity key").
4. A secondary Polish diacritic-fold key for retrieval only, per the explicit table in `docs/canonical/13` §6.1 — never used to establish identity by itself (§6.4 "Policy").
5. Script detection sufficient to flag a Latin+Cyrillic (or other cross-script) confusable input for review, per `docs/canonical/13` §10 (P0: Latin; P1 detection-only: Cyrillic, to support the mixed-script flag — full Cyrillic surname support is not implemented).
6. Exact matching only, two tiers (`docs/canonical/13` §1.3 T0/T1; `docs/canonical/11` §4.5 `ResolutionStatus`):
   - **T0 — exact canonical match** against `surnames.canonical_key`.
   - **T1 — exact accepted `NameForm` match** against an eligible `name_forms` row (eligibility rule in §6).
7. The minimal identity schema needed to back the above: `knowledge_entities`, `surnames`, `name_forms` (§6) — and nothing else.
8. The outcome/decision contract (§7), covering the exact-match tiers, ambiguity, unknown input, and invalid input.
9. `packages/resolver` (`@name-atlas/resolver`): pure normalisation/validation functions (no database), plus a thin lookup service taking an injected `Kysely<DB>` instance (matching the pattern already used by `packages/testing`).
10. A test-only seeding helper, clearly separated from the production lookup path (§4 item 7 of the required-behaviour list; §7.4).
11. One migration extending `packages/db/migrations/` and a regenerated `packages/db/src/generated/db.ts`.

## 5. Out of scope

Do not build any of the following in this task. Their absence is a success condition.

- Fuzzy, trigram, or phonetic matching (T2–T5 in `docs/canonical/13` §1.3) — TASK-006.
- Generated Polish gender-form candidates or relationships (`docs/canonical/13` §7, and 13-A, unaccepted) — TASK-006.
- OCR correction, transliteration, or any orthographic-pack candidate generation (`docs/canonical/13` §11–§13) — later.
- `name_form_relations` — not created by this task. Nothing in this task's own matching logic reads or writes it (see §6's scoping rationale); it is added by whichever future task first needs it.
- Any PESEL source download, parsing, or production ingestion — TASK-002 (done, unrelated) / TASK-004.
- Historical or archival ingestion of any kind.
- Population counts, rank, rarity, or trend claims.
- `EvidenceItem`, `Claim`, `ClaimEvidence`, `ConfidenceAssessment`, `Citation` — TASK-005.
- `ResearchRun` and any persistence of `SurnameResolution` itself — see §6's decision to treat it as a pure runtime value object.
- `Source`, `RightsProfile`, `SourceRecord`, `DistributionSnapshot`, `DistributionValue` — TASK-004.
- Any public API endpoint, consumer UI, or admin UI.
- Redis, BullMQ, LLM calls, payments, SEO.
- Surname merge/split commands (the `merged_into_surname_id` column exists per the canonical schema, but no merge logic, no merge test, no admin workflow — `docs/canonical/22` §21–§26 is later, high-risk, dual-control work).
- Any unrelated refactor or dependency upgrade.

## 6. Accepted contracts and unresolved contract decisions

### 6.1 Contracts already accepted — reused as-is, not reopened

- **Stack and DB access:** ADR-0001, ADR-0002. Kysely + hand-written SQL migrations + generated types, exactly as TASK-001 established.
- **Canonical identity key construction:** `docs/canonical/13` §5.2, §5.3 (NFC, full case fold, controlled separator mapping, diacritics preserved) — binding, not reopened.
- **Polish diacritic fold table:** `docs/canonical/13` §6.1 — the exact nine-letter mapping is binding, verbatim.
- **`ResolutionStatus` enum:** `docs/canonical/11` §4.5 defines `EXACT, KNOWN_VARIANT, MULTIPLE_EXACT, POSSIBLE_VARIANT, FUZZY_MATCH, UNKNOWN, REVIEW_REQUIRED`. This task uses the subset `EXACT, KNOWN_VARIANT, MULTIPLE_EXACT, UNKNOWN, REVIEW_REQUIRED` and never produces `POSSIBLE_VARIANT` or `FUZZY_MATCH` (those require candidate generation this task does not implement). This reconciles the reviewed implementation plan's earlier three-outcome sketch (`RESOLVED / UNRESOLVED / INVALID_INPUT`) with the canonical enum: that sketch is a simplification superseded by `docs/canonical/11`'s actual field-level contract, which is what this task implements.
- **NameForm eligibility rule for automatic resolution** (implements required-behaviour item 4 and the hard rule in `docs/canonical/11` §4.3): a `NameForm` may resolve a query to its `surname_id` only if **all** of — `surname_id IS NOT NULL` (association accepted), `form_type IN ('CANONICAL', 'MODERN_VARIANT')`, `attestation_status IN ('ATTESTED', 'DERIVED')`. A `NameForm` with `form_type = 'SEARCH_CANDIDATE'` or `attestation_status IN ('GENERATED_CANDIDATE', 'DISPUTED')` is never eligible, matching the hard rule in `docs/canonical/11` §4.3 verbatim. This is not a new decision — it is the direct, mechanical reading of the accepted field definitions, made explicit because the canonical text states the rule in prose rather than as a query predicate.
- **Ambiguity algorithm** (implements required-behaviour item 6): try T0 (unique by construction — `surnames.canonical_key` is `UNIQUE`); if no T0 match, collect all T1-eligible `NameForm` rows whose `search_key` matches; if they resolve to exactly one distinct `surname_id`, that is `KNOWN_VARIANT`; if more than one distinct `surname_id`, that is `MULTIPLE_EXACT` with every distinct candidate surname listed; if zero, `UNKNOWN`.
- **Script detection without a new dependency:** Node's built-in Unicode property escapes (`/\p{Script=Latin}/u`, `/\p{Script=Cyrillic}/u`, `/\p{Script=Common}/u`, `/\p{Script=Inherited}/u`), backed by V8's ICU integration, satisfy `docs/canonical/13` §10.2's "pinned Unicode/ICU implementation" requirement and §5.7's "one shared resolver library/runtime" preference. **No new npm dependency is needed for script detection.**

### 6.2 One decision this planning session made and flags for approval before implementation

**The minimal identity migration.** `docs/canonical/23` §9.1 lists Migration Group A as `knowledge_entities, surnames, name_forms, name_form_relations, entity_external_ids, sources, rights_profiles, research_runs`. Building all of Group A is explicitly not this task's job (§5) and is not needed for exact matching. This task's migration creates **only**:

- `knowledge_entities` (`docs/canonical/11` §4.1) — needed because `surnames.surname_id` and `name_forms.name_form_id` are typed "UUIDv7 / FK Entity" in the canonical model: they are not independent primary keys, they reuse `knowledge_entities.entity_id`. Populated with `entity_type` restricted to `'SURNAME'` and `'NAME_FORM'` for now (a Postgres enum, expected to grow via `ALTER TYPE … ADD VALUE` in later tasks — a normal, supported operation, not a redesign).
- `surnames` (`docs/canonical/11` §4.2), including the self-referential `merged_into_surname_id` column (present in the schema; no merge logic reads or writes it in this task — see §5).
- `name_forms` (`docs/canonical/11` §4.3), **omitting** `geographic_scope_place_id` (FK to `places`, which does not exist — `places` arrives at M3) and `created_by_run_id` (FK to `research_runs`, which does not exist — arrives with the async runtime at M3). Both columns are added by whichever later task creates their target tables; adding a nullable column with no data yet in it is a trivial, low-risk follow-up migration, not a redesign.

**Not created:** `name_form_relations` — nothing in this task's matching logic (§6.1's ambiguity algorithm) reads or writes it; `NameFormRelation` connects two `NameForm`s for candidate-generation and evidence-linking purposes (`docs/canonical/13` §2, `docs/canonical/11` §4.4), neither of which this task implements. It is created by whichever task first needs it (most likely TASK-006). **Not created:** `entity_external_ids`, `sources`, `rights_profiles`, `research_runs` — no code in this task touches them.

**`SurnameResolution` (`docs/canonical/11` §4.5) is not persisted.** The canonical document itself says persistence is "optional but recommended inside ResearchRun audit data" — and `ResearchRun` does not exist and is out of scope here (§5). This task implements `SurnameResolution` purely as an in-process return value from the resolver's lookup function. Persisting it is a natural, low-risk addition once TASK-004/M3 introduces `ResearchRun`; it is not being designed away, only deferred.

**Why this is flagged for approval rather than simply asserted:** it is the one place this task adds real, if narrow, database schema ahead of TASK-004, and a reviewer may reasonably prefer a different split (for example, creating `name_form_relations` now too, or deferring `merged_into_surname_id`). The specific column-level choices above are this session's engineering judgement applying `docs/canonical/23` §9's staging principle, not a project-level decision requiring `docs/DECISIONS_NEEDED.md` — but it is the one part of this spec worth a human's explicit sign-off before an implementation session starts writing migrations.

## 7. Required behaviour

### 7.1 Validation outcomes (stage 1)

A reduced, implementable subset of `docs/canonical/13` §4.1's list, chosen because each has a concrete, canonically-grounded detection rule; the remainder (`POSSIBLE_MULTIPLE_QUERY_VALUES`, `POSSIBLE_FULL_PERSON_NAME`, `UNSUPPORTED_SCRIPT_FOR_ENRICHMENT`) have no defined algorithm in the canonical text and are not invented here — they remain explicitly out of scope, not silently ignored:

```text
VALID
EMPTY
EXCEEDS_OPERATIONAL_LIMIT      — length > configured limit (default 256 Unicode code points, §4.4; configuration, not domain truth)
MALFORMED_CONTROL_CHARACTERS   — bidi controls, zero-width characters, non-printing control characters (§4.5)
MIXED_SCRIPT_REVIEW            — a script-property scan (§6.1) finds two scripts that are not both in {Latin, Common, Inherited} — e.g. Latin + Cyrillic
```

A short input (1–3 characters), a multi-word input, hyphenated input, or input containing an apostrophe is **VALID** (§4.2, §4.3 — "do not reject a surname merely because it is short, unusual, or composed of multiple words").

### 7.2 Resolution outcomes (stage 2 — only reached from `VALID` input)

```text
EXACT             — unique T0 canonical match
KNOWN_VARIANT      — unique T1 eligible NameForm match
MULTIPLE_EXACT     — T1 eligible NameForms resolve to more than one distinct surname
UNKNOWN            — no T0 or T1 match
REVIEW_REQUIRED    — reserved for validation-stage MIXED_SCRIPT_REVIEW carried through; the resolver does not attempt a match on flagged input
```

### 7.3 What the resolver returns

A `SurnameResolution` value object (`docs/canonical/11` §4.5, not persisted — §6.2), at minimum:

```text
raw_input                 — exactly as received
unicode_nfc                — NFC-normalised form
resolution_status          — one of §7.2 (or the validation outcome, if not VALID)
resolved_surname_id        — set only when resolution_status = EXACT or KNOWN_VARIANT
candidate_surname_ids      — set only when resolution_status = MULTIPLE_EXACT
matched_name_form_id       — set only when resolution_status = KNOWN_VARIANT
resolution_method_version  — a version string identifying the normalisation + matching rules applied (docs/canonical/13 §5.7)
user_confirmation_required — true when resolution_status is MULTIPLE_EXACT or REVIEW_REQUIRED
```

### 7.4 Read-only guarantee

The lookup path issues `SELECT` statements only. It never inserts, updates, or merges a `Surname`, `NameForm`, or `KnowledgeEntity` row, and never auto-creates an entity for an unknown surname (required-behaviour item 7; reviewed-plan blocker test "unknown creates no surname"). Test fixtures are seeded through a separate, explicitly-named function (e.g. `seedTestSurname(...)`) that is never imported by the lookup path's own module graph — a lint rule or a simple import-boundary test should make this checkable, not just documented.

### 7.5 Identity-preservation guarantees (required-behaviour item 5)

All of the following must hold and are directly testable:

- `Łuczak` does not automatically resolve to a `Surname` canonically keyed as `Luczak`, or vice versa, unless an explicit, eligible `NameForm` relation (§6.1) exists between them.
- Grammatical gender pairs (`Cichowski`/`Cichowska`, `Kowalski`/`Kowalska`) do not auto-resolve to each other unless an explicit, eligible `NameForm` exists — no suffix rule runs in this task (§5).
- A compound/multi-token surname does not resolve to one of its components.
- A Latin/Cyrillic confusable pair is flagged `MIXED_SCRIPT_REVIEW`, never silently treated as one identity.
- No `SEARCH_CANDIDATE`, `GENERATED_CANDIDATE`, phonetic, transliterated, or OCR-derived relation is ever used for automatic resolution (§6.1's eligibility rule enforces this structurally, not by a special-case check).

## 8. Acceptance tests

All fixtures are either **frozen, source-backed** (drawn from `fixtures/pesel/*.csv`, real Polish surnames already verified in TASK-002, used only for realistic strings — never for counts or claims) or **clearly labelled synthetic** (constructed for this task, e.g. to engineer a collision). No test may present a synthetic value as if it were a verified real-world fact (`docs/canonical/17` golden-corpus principle).

Unit-level (no database; pure functions — normalisation, validation, script detection):

1. NFC-equivalent inputs (e.g. a precomposed `Ł` vs. a decomposed base-letter-plus-combining-mark form) produce the same canonical key.
2. Case and ordinary-whitespace variants of the same surname produce the same canonical key.
3. Polish diacritics are preserved in the canonical key and in the display form (`Łuczak` stays `Łuczak`, not `Luczak`).
4. A short surname (1–3 characters) and a multi-word surname (e.g. "van der X") both validate as `VALID`.
5. A compound/hyphenated surname and a surname containing an apostrophe both validate as `VALID`, and punctuation is not stripped from the display form.
6. Empty input validates as `EMPTY`; input exceeding the configured length limit validates as `EXCEEDS_OPERATIONAL_LIMIT`.
7. Input containing a bidi control or zero-width character validates as `MALFORMED_CONTROL_CHARACTERS`.
8. A Latin+Cyrillic confusable pair (e.g. Latin `a` vs. Cyrillic `а`) validates as `MIXED_SCRIPT_REVIEW`.

Property-based (fast-check, `docs/canonical/17` §14):

9. **P1 idempotence** — `normalize(normalize(x)) == normalize(x)` for arbitrary valid-length Unicode input.
10. **P2 NFC equivalence** — two canonically-equivalent Unicode representations of the same string always produce the same canonical key.
11. **P3 display preservation** — the diacritic search fold never mutates the stored/returned display or raw input.
12. **P4 no crash** — for arbitrary Unicode input up to the operational length limit, the resolver returns a typed outcome, never an unhandled exception.

Integration-level (real PostgreSQL via the existing Testcontainers harness in `packages/testing` — required per this task's own instruction that a mocked lookup is not sufficient):

13. An existing exact canonical surname resolves to `EXACT` with the correct `resolved_surname_id`.
14. An accepted, uniquely-mapped `NameForm` (eligible per §6.1) resolves to `KNOWN_VARIANT` with the correct `matched_name_form_id` and `resolved_surname_id`.
15. A `NameForm` with `form_type = 'SEARCH_CANDIDATE'` or `attestation_status = 'GENERATED_CANDIDATE'` is **not** used for automatic resolution — the same query returns `UNKNOWN` (or `EXACT`/`KNOWN_VARIANT` from a *different*, eligible row only) — this is required-behaviour item 4's "rejection of an unaccepted/generated alias" test.
16. Two eligible `NameForm` rows (synthetic collision, seeded for this test only) that map to two different surnames both matching the same query produce `MULTIPLE_EXACT` with both candidates listed, and no `resolved_surname_id` is set.
17. An unknown surname returns `UNKNOWN`, and a row-count check on `surnames`/`name_forms`/`knowledge_entities` before and after the call proves no row was created (required-behaviour item 7 / item 5's "unknown surname" test).
18. Zero writes occur on `surnames`, `name_forms`, and `knowledge_entities` across an entire test suite run of exact-match lookups (both hits and misses) — asserted directly against row counts, not inferred from the absence of a write call in application code.
19. A simulated database failure (e.g. the pool destroyed mid-call, or a query against a dropped connection) surfaces as a distinct, typed failure outcome and is never reported as `UNKNOWN` — required-behaviour item 6's "a database failure is not an unknown surname."

## 9. Relevant existing files

To be reused, not reinvented:

```text
packages/db/src/pool.ts, kysely.ts, migrator.ts, index.ts     — connection, Kysely instance, migrator (ADR-0002)
packages/db/migrations/0001_bootstrap_extensions.ts            — the only existing migration; this task adds 0002
packages/db/src/generated/db.ts                                 — regenerated by this task via `pnpm db:generate-types`
packages/testing/src/postgres-container.ts                     — startTestDatabase()/migrateTestDatabase(), reused for §8 items 13–19
packages/testing/src/frozen-clock.ts                            — available if any test needs a fixed `created_at`
packages/domain/src/uuid.ts                                     — uuidv7()/isUuidV7(), reused for entity_id/surname_id/name_form_id generation
packages/sources/src/schema.ts, parser.ts                       — read-only inspiration for realistic Polish surname strings; not a dependency
fixtures/pesel/national-male-2026-01-20.csv, national-female-2026-01-20.csv — optional source of realistic surname strings for fixtures
docs/CODEMAP.md                                                  — already lists `packages/resolver` as planned, owned by this task
```

New in this task: `packages/resolver` (`@name-atlas/resolver`), `packages/db/migrations/0002_identity_core.ts`.

## 10. Verification commands

Run from a clean checkout and report actual output:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Then, against a real PostgreSQL instance (local, or the same Testcontainers-backed harness used by `tests/integration`):

```bash
pnpm db:migrate            # applies 0001 and the new 0002 identity migration
pnpm db:generate-types     # must produce no diff against the committed generated types
pnpm test:integration      # must include the new resolver integration tests (§8 items 13–19)
pnpm build
```

`pnpm test:integration` requires real container-registry access for the pinned `postgis/postgis` image. If the implementing session's environment blocks this (as happened during TASK-001), it must state so plainly and use the same substitute verification TASK-001 used (a locally installed PostgreSQL+PostGIS instance) rather than skip the check — see `PROGRESS.md`'s TASK-001 section for the precedent.

## 11. Definition of done

- Every item in §8 is implemented and passes by actually running the command, not by inspection.
- The migration in §6.2 creates exactly `knowledge_entities`, `surnames`, `name_forms` — nothing from §5's excluded list.
- The read-only guarantee (§7.4) and the eligibility rule (§6.1) are enforced structurally, not merely asserted in a comment.
- `packages/db/src/generated/db.ts` is regenerated and committed; `pnpm db:generate-types` produces no diff after commit.
- `docs/CODEMAP.md` is updated: `packages/resolver` moves from "Planned" to "Current"; the new migration is noted against `packages/db`.
- `PROGRESS.md` is updated with observed facts: what was implemented, what was verified, and the actual command outputs.
- `docs/canonical/` is untouched.
- The complete diff has been reviewed file by file; nothing from §5 is present.
- Work is committed on the designated branch with a descriptive message.
- **STOP.** Do not begin TASK-004. Do not write `tasks/004-*.md`.
