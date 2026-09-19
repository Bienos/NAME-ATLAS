# TASK-009 — `CURRENT_RANK` Truth Chain (the first derived claim)

- **Status:** **IMPLEMENTED AND VERIFIED 2026-09-19 on the refusing path; the passing path is
  BLOCKED by D-013, not by this task.** Migration `0005_current_rank`, `packages/truth`'s
  completeness gate, rank derivation, derived-statistic confidence rule, result projection and
  `demo:surname-rank` CLI all exist, with 23 new unit tests and 18 new integration tests. D-011 was
  answered Option A: `evidence_dependencies` exists and records each input's role.
  **The gate refuses over the committed fixtures and writes nothing, which is correct** — and while
  proving the passing path, the first full-resource import surfaced **D-013**: `canonical_key_v1`
  merges 171 genuinely distinct surnames because Unicode full case folding maps `ẞ` to `ss`, so the
  full official resource cannot be ingested at all yet. The gate is therefore refusing for exactly
  the right reason. Outcome and evidence: `PROGRESS.md`; the blocker: D-013 in
  `docs/DECISIONS_NEEDED.md`.
- **Created:** 2026-09-19 at the project owner's direction, as the next unblocked step in M2.
  `tasks/008-pesel-regional-source-spike.md` §5 forbade *its own* session from writing
  `tasks/009-*.md`; that was scope discipline for the spike, not a standing ban. TASK-008 is
  executed and this is a separate, directed task.
- **Milestone:** M2 (`PLAN.md`: "`CURRENT_RANK` and `RARITY_CONTEXT`" among the M2 items). This
  task takes **only** `CURRENT_RANK`.
- **Depends on:** TASK-003 (exact resolution), TASK-004 (ingestion, source registry), TASK-005
  (the truth chain this extends) — all implemented and verified. TASK-006 is a **read boundary**
  and must not become a source of truth.
- **Blocks:** `RARITY_CONTEXT`, which additionally needs the population denominator TASK-004 left
  as U-6 with `universe_size` null. Do not bundle them.
- **Canonical authority:** `docs/canonical/11` §6.1–§6.2 (snapshot and value; stored vs derived),
  §9.5–§9.6 (`EvidenceItem`, `EvidenceDependency`), §10.1–§10.4 (claim, link, confidence,
  citation), §11 (the `CURRENT_RANK` row and the scope allow-list), §12.1–§12.3;
  `docs/canonical/12` §9.6 (what a rank must store); `docs/canonical/14` §30 (derived statistics
  and their required lineage), §58 (deterministic generation without an LLM); `ARCHITECTURE.md`
  §10 invariants 1, 2, 5 and **10**; `PRODUCT.md` §7 rules 1, 3 and 5; ADR-0003, ADR-0004.
- **Model guidance:** fresh implementation session, after §15's D-011 is answered.

---

## 1. Goal

Produce the repository's **first derived claim**: for a surname that resolves exactly and has
ingested PESEL evidence, emit a `CURRENT_RANK` claim stating that surname's frequency rank **within
one complete resource version**, carrying its universe definition, its ties policy and its
algorithm version — and **refuse to emit anything at all when the universe is incomplete.**

`ARCHITECTURE.md` §10 invariant 10 is the reason this is a claim and not a column: "Derived values
(rank, 1-in-X, share) are reproducible claims carrying method and version — never bare columns on
`Surname`." TASK-005 built the chain for a source-native fact. This task is the first time Name
Atlas asserts something it computed itself, so the standard of proof is higher, not lower.

## 2. The trap this task exists to avoid

**A rank is meaningless unless its universe is complete, and the repository's ingested universe is
currently 0.005% of the real one.**

Established by direct inspection of the live database during this task's preflight, not assumed:

| | Resource `1148808` | Resource `1148811` |
|---|---|---|
| `source_records.content_hash` as stored | `426f44a2304a1f80…be2448` | `72ff8dfa2b207419…feeea8` |
| Registry `official_sha256` | `ce4238feda85e75c…62b62f4` | `c508680d084dd219…909f6e6` |
| `distribution_snapshots` for that record | **22** | **23** |
| Registry `official_row_count` | **408,182** | **420,082** |

The stored `content_hash` is the **committed fixture's** digest, because what was ingested is the
22-row and 23-row excerpt. A rank computed over that would assert *"NOWAK is rank 1 of 22"* while
dressing it in the language of a national ranking. For the top fifteen it would even be
accidentally correct, because the fixtures were selected as the top fifteen by count plus a tail —
which makes the bug **worse**, not better: it would pass a casual eyeball and be false from rank 16
on.

`PRODUCT.md` §7 rule 1 promises every published fact traces to a source, and `AGENTS.md` §9 forbids
inventing results. Emitting a rank over an excerpt would breach both. **So the completeness gate,
not the ranking arithmetic, is the substance of this task.**

The registry already carries what the gate needs: `official_sha256`, `official_byte_size` and
`official_row_count` per resource descriptor, with the comment "SHA-256 of the full official
resource. NOT the committed fixture's checksum."

## 3. User / system outcome

A developer runs one command against a database into which a **complete** PESEL resource version
has been imported, and gets, for an exactly resolved surname: its rank, the universe that rank is
within, the ties policy, the algorithm version, the supporting evidence, a confidence status, a
citation and per-surface rights — and, against a database holding only the committed fixtures, a
typed refusal that names incompleteness as the reason and writes nothing.

## 4. Preconditions

All verified against the working tree and the live database during this task's preflight.

1. **The truth chain exists (TASK-005).** `packages/truth` exports `deriveCurrentPopulation`,
   `currentPopulationClaimKey`, `TruthInvariantError`, `readCurrentPopulation`,
   `querySurnameResult`, `assessCurrentPopulation`, `evidenceSetHash`, `isValidCombination`,
   `evaluateSurface`, `evaluateAllSurfaces`, and the version constants in `version.ts`. Migration
   `0004_truth_layer` created `research_runs`, `evidence_items`, `claims`, `claim_evidence`,
   `confidence_assessments`, `citations`.
2. **`claim_type` carries exactly one member, `CURRENT_POPULATION`.** Migration `0004`'s own header
   anticipates this task: "they arrive by `ALTER TYPE … ADD VALUE` as later tasks emit them — the
   same staging migration `0002` used for `entity_type`." Adding `CURRENT_RANK` is therefore the
   sanctioned pattern and **not** a deviation.
3. **`evidence_scope` carries `SURNAME_LEVEL`**, alongside `FAMILY_LEVEL`, `PERSON_LEVEL`, `SHARED`.
4. **`evidence_dependencies` does not exist.** TASK-005 excluded it deliberately, citing
   `docs/canonical/11` §9.6's "P1 if `ClaimEvidence` links are sufficient for the first vertical
   slice". This task is the first whose canonical section (`14` §30) names `EvidenceDependency` in
   the required lineage, which is why §15's D-011 exists.
5. **The registry carries the completeness facts.** `PeselResourceDescriptor` has `official_sha256`
   (`ce4238fe…` / `c508680d…`), `official_byte_size` (5,293,415 / 5,592,881) and `official_row_count`
   (408,182 / 420,082), and `findPeselResource(resourceId)` resolves a descriptor.
6. **A surname can carry two snapshots in different comparability groups.** `pesel_2026_national_male`
   and `pesel_2026_national_female`. TASK-005 emits one claim per snapshot and never sums; the same
   rule governs rank, and it means there are **two rank universes per annual refresh, not one**.
7. **Derived columns on `distribution_values` exist and are null.** `surname_share`,
   `population_rate`, `rank`, `derivation_version`, with a CHECK that any derived value requires
   `derivation_version`. TASK-004 wrote null to all of them.
8. **The rank universe cannot be "a snapshot".** `DistributionSnapshot` is surname-scoped
   (`ARCHITECTURE.md` §10 invariant 3), so one snapshot holds one surname's value.
   `docs/canonical/12` §9.6's "within a specific snapshot" cannot be read literally here; the
   universe is the set of snapshots sharing one `source_record_id`. §6 fixes this precisely.

## 5. Truth-chain flow

```text
raw surname input
  → validateSurnameInput + resolveSurname             (TASK-003, reused unchanged)
  → Surname                                           (EXACT only)
  → DistributionSnapshot[] + DistributionValue        (TASK-004, read-only)
  → UNIVERSE COMPLETENESS GATE                        (this task — refuse if incomplete)
  → rank computed over all snapshots sharing the source_record, within comparability group
  → EvidenceItem            DERIVED, carrying algorithm version and universe definition
  → Claim                   one CURRENT_RANK per (surname, source_record), FACT
  → ClaimEvidence           SUPPORTS; links to the count evidence and the universe evidence
  → ConfidenceAssessment    VERIFIED only when the computation is reproducible
  → Citation                the same source record the count came from
  → SurnameCurrentRankResult   developer-facing, read-only projection
```

**One rank per (surname, resource version), never one per surname.** Male and female resources sit
in different `comparability_group` values, so a surname present in both gets **two** ranks. They
must never be merged, averaged, or described as "the" rank.

## 6. What the rank is, exactly

The definition must appear in the claim payload, not only in this file.

- **Universe:** every `Surname` having a `distribution_snapshots` row whose `source_record_id` is
  the same record, and whose `comparability_group` therefore matches. One universe per resource
  version. Its size is recorded on the claim.
- **Ordering key:** `distribution_values.count` descending, for the national value row
  (`place_id IS NULL`).
- **Ties policy:** recorded explicitly and applied deterministically — see §15 U-1.
- **Algorithm version:** a named constant beside TASK-005's, bumped when the rule changes.
- **Label discipline:** the rank is within one sex-partitioned resource of the PESEL current-surname
  field. It is **not** "the most common surname in Poland". Because U-1 forbids summing the
  partitions, no all-Poland rank is derivable from this source at all, and the payload must not
  imply one (`PRODUCT.md` §7 rule 5; `ARCHITECTURE.md` §10 invariant 5).

## 7. In scope

1. **A migration** adding `CURRENT_RANK` to `claim_type` by `ALTER TYPE … ADD VALUE`, plus whatever
   D-011 decides about `evidence_dependencies`. Numbered after `0004`. Nothing else.
2. **A completeness predicate** in `packages/truth`, pure and separately testable, deciding whether
   a `source_record` represents a complete resource version.
3. **A rank derivation service** extending `packages/truth`, reusing TASK-005's transaction,
   idempotency and research-run patterns rather than duplicating them.
4. **A confidence rule for a derived statistic**, distinct from TASK-005's source-native rule, with
   its own `assessment_method` and `assessment_version`.
5. **Citation and surface eligibility** reused unchanged from TASK-005. Rank does not get its own
   rights model.
6. **A developer-facing result and CLI**, following the `packages/<pkg>/bin/*.ts` convention and
   aliased from the root `package.json`.
7. **Unit tests** for the pure rules and **integration tests** against real PostgreSQL.
8. `docs/CODEMAP.md` and `PROGRESS.md` updated with observed facts.

## 8. Out of scope

Their absence is a success condition. Anything here in the diff is a defect.

- `RARITY_CONTEXT`, 1-in-X, percentile, share, `population_rate`, `surname_share`, and any use of
  `universe_size` — it is null by TASK-004 U-6 and inventing a denominator is forbidden.
- `CURRENT_DISTRIBUTION`, `REGIONAL_CONCENTRATION`, any regional ingestion, any `Place`, any use of
  the regional fixtures TASK-008 committed. D-004 is untouched.
- Writing `distribution_values.rank`. The rank is a claim, not a column
  (`ARCHITECTURE.md` §10 invariant 10). The column stays null and a test asserts it.
- Any other `ClaimType`; any second source; any trend or year-over-year comparison.
- Changes to `packages/resolver` or to TASK-004's importer, registry or migration `0003`.
- The API contract and `apps/`. Exposing rank over HTTP is a later, separate slice; this task adds
  no route and no DTO.
- Fuzzy, phonetic, trigram or diacritic-fold matching; gender-form merging; LLM enrichment.
- Redis, BullMQ, the outbox, `ResearchModuleRun` — M3.
- TASK-010. Do not write `tasks/010-*.md`.

## 9. Acceptance criteria

Each is a behaviour an automated test must demonstrate by running.

**The completeness gate — the heart of this task**

- **AC-01 — An incomplete universe yields no claim.** Against a database holding only the committed
  22-row and 23-row fixtures, derivation returns a typed `INCOMPLETE_UNIVERSE` state, names the
  expected and actual figures, and writes **zero** rows to every truth-layer table. A test asserts
  the row counts are unchanged.
- **AC-02 — Completeness is decided from recorded evidence, not a flag.** The predicate compares the
  `source_record`'s `content_hash` against the registry descriptor's `official_sha256`, and the
  count of snapshots for that record against `official_row_count`. Both must agree. A test covers:
  matching hash and matching count (complete); matching hash but short count (incomplete, a partial
  or interrupted import); mismatched hash (incomplete, an excerpt); and an unknown resource id
  (refused).
- **AC-03 — The gate cannot be bypassed by configuration.** No environment variable, option or flag
  makes a rank emit over an incomplete universe. A test asserts no such switch exists in the diff.

**Claim identity and payload**

- **AC-04 — A typed derived proposition.** `claim_type = 'CURRENT_RANK'`, `epistemic_type = 'FACT'`,
  `scope = 'SURNAME_LEVEL'`, `subject_entity_id` = the resolved surname's entity id,
  `claim_status = 'ACTIVE'`, a `method_version`, and a `structured_value` validating against a
  versioned schema.
- **AC-05 — The payload carries its universe, not just a number.** `structured_value` includes the
  rank, the universe size, the universe definition (source record and comparability group), the
  ties policy, the algorithm version, the snapshot date and the originating `source_record_id`. A
  bare integer stored as "the rank" is a defect.
- **AC-06 — No all-Poland rank and no partition merge.** A surname present in both resources yields
  **two** claims with their own universes. A test asserts neither payload nor result field contains
  a combined rank, and that no code path sums, averages or selects between the two counts.
- **AC-07 — `claim_key` is stable and semantic.** Deterministic from
  `(claim_type, surname, source_record)` and nothing else. No clock, no UUID, no run id.

**Derivation correctness**

- **AC-08 — The rank is right, over real data.** Against a complete import, a test asserts the rank
  of several known surnames, including the first and last by count, and one surname adjacent to a
  tie if the data contains one.
- **AC-09 — The ties policy is applied and recorded.** Constructed tied counts produce the ranks
  §15 U-1's answer prescribes, and the policy name is stored on the claim.
- **AC-10 — Determinism.** Identical canonical data produces an identical `claim_key`, identical
  `structured_value` and identical `evidence_set_hash`. Row order from the database must not affect
  the result; a test asserts stability under a deliberately different scan order.
- **AC-11 — Idempotent re-derivation.** Running twice creates no second claim, evidence item, link
  or assessment, and reports that it was a no-op.
- **AC-12 — A new resource version supersedes.** Re-importing different bytes creates a new
  `source_record` and a new universe, so re-derivation produces a **new** claim whose
  `supersedes_claim_id` points at the prior one, which becomes `SUPERSEDED` and is otherwise
  unmutated.

**Lineage, per `docs/canonical/14` §30**

- **AC-13 — The derived statistic traces to its inputs.** The claim reaches the count evidence for
  the subject surname and the evidence establishing the universe, by whichever mechanism D-011
  selects, plus the algorithm version. A test walks the chain to the `source_records` row and
  reaches the resource checksum, URL and retrieval time.
- **AC-14 — Source rows are not mutated.** A test asserts every `source_records`,
  `distribution_snapshots` and `distribution_values` row is unchanged by derivation, and that
  `distribution_values.rank` and `derivation_version` remain null.

**Confidence and rights**

- **AC-15 — A derived-statistic confidence rule.** `VERIFIED` only when the inputs are complete,
  the computation is reproducible and the underlying count evidence is itself verified. Its
  `assessment_method` and `assessment_version` differ from TASK-005's, so the two rules are
  distinguishable in the data.
- **AC-16 — Rights never touch confidence.** Deriving under a permissive and a restrictive
  `RightsProfile` produces a byte-identical `ConfidenceAssessment`. With TASK-004's seeded profile
  (`commercial_use = UNKNOWN`) paid and SEO stay ineligible while confidence is unaffected.
- **AC-17 — Valid epistemic pairing.** The `(epistemic_type, status)` pair is one
  `docs/canonical/11` §12.3 permits for `FACT`.

**Failure states**

- **AC-18 — Distinguishable outcomes, none of them a number.** Typed states for: invalid input;
  unresolved; ambiguous or review-required; resolved but no applicable evidence; resolved with
  evidence but **incomplete universe**; and lookup failure. No path emits a rank of `0`, and none
  emits a rank when the universe is incomplete.
- **AC-19 — Reproducible verification.** Every command in §12 runs from a clean checkout and is
  reported with actual output, including the TASK-003 through TASK-006 regression counts.

## 10. Data-integrity invariants

1. No `CURRENT_RANK` claim exists whose `source_record` fails the completeness predicate.
2. Every rank is ≥ 1 and ≤ its recorded universe size.
3. Within one universe, no two distinct surnames hold the same rank unless the ties policy
   explicitly permits it, and their counts are then equal.
4. A surname's rank is consistent with its count: if count(A) > count(B) in the same universe, then
   rank(A) < rank(B).
5. Every claim's `structured_value` carries a non-null universe size, ties policy and algorithm
   version.
6. `claim_key` is unique among `ACTIVE` claims.
7. Derivation writes nothing to `source_records`, `distribution_snapshots` or
   `distribution_values`; `rank` and `derivation_version` stay null.
8. Confidence is never a function of any `RightsProfile` field, and surface eligibility never a
   function of `ConfidenceStatus`.
9. No `CURRENT_RANK` claim references another surname's evidence.
10. All primary keys are UUIDv7.
11. No synthetic fixture row is reachable from a claim derived over genuine source-derived data.

## 11. Failure behaviour

| Condition | Behaviour |
|---|---|
| Input fails validation | Typed state, no write, no claim |
| Resolution `UNKNOWN` | Typed unresolved state. Never a rank, never a zero |
| Resolution `MULTIPLE_EXACT` / `REVIEW_REQUIRED` | Typed ambiguous state. Never guessed |
| Resolution `LOOKUP_FAILED` | Infrastructure failure surfaced as such |
| No applicable snapshot | Typed "no applicable evidence" state |
| **Universe incomplete** | **Typed `INCOMPLETE_UNIVERSE` with expected and actual figures. Writes nothing. Never a partial rank** |
| Resource id not in the registry | Fail closed; completeness is undecidable, so no rank |
| Two `ACTIVE` claims for one `claim_key` | Conflicting records; fail closed, do not pick |
| Count null or below the source minimum | Violated source invariant; fail closed |
| Rights profile missing for the source record | Fail closed (`ARCHITECTURE.md` §10 invariant 13) |
| Database error mid-derivation | Transaction rolls back; typed failure; tables unchanged |
| Re-derivation over unchanged data | Not a failure. Reports "already derived", writes nothing |

## 12. Verification

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Then against a real PostgreSQL:

```bash
pnpm db:migrate            # applies 0001–0004 and this task's migration
pnpm db:generate-types     # must produce no diff against the committed generated types
pnpm test:integration
pnpm build
```

Then the gate and the rank end to end:

```bash
# 1. with only the committed fixtures imported, the gate must refuse
pnpm --filter @name-atlas/sources run import-pesel --resource 1148808 \
  --file <abs>/fixtures/pesel/national-male-2026-01-20.csv \
  --metadata <abs>/docs/sources/acquisition/2026-09-18/metadata/pesel_national_2026_male_1148808.official_resource.json \
  --sha256 <the fixture's own checksum>
pnpm demo:surname-rank -- "NOWAK"     # expect INCOMPLETE_UNIVERSE, 22 of 408182, no claim

# 2. with a complete resource imported, the rank must be real
#    (requires the full official CSV, supplied by the project owner and checksum-verified)
pnpm demo:surname-rank -- "NOWAK"     # expect rank 1 of 408182, universe named, ties policy stated
```

Report a second run of the same command showing idempotency. **Regression:** state explicitly that
the TASK-003 resolver, TASK-004 ingestion, TASK-005 truth-chain and TASK-006 read-API suites still
pass, with their counts — the baseline is **193 unit tests and 113 integration tests**
(`PROGRESS.md`).

Container registries have been egress-blocked in every session so far. If `pnpm test:integration`
cannot pull the pinned `postgis/postgis` image, use the `TEST_DATABASE_URL` fallback against a
locally installed PostgreSQL 16 with PostGIS and **state plainly that the pinned image was not
exercised**. PostGIS is installable from apt as `postgresql-16-postgis-3` (3.4.2, which matches
D-005); note that a failed install can still exit 0, so confirm through
`pg_available_extensions`.

**Step 2 needs the full official resource.** If the project owner has not supplied it, the complete
path cannot be demonstrated. Do not fake it, do not lower the gate, and do not report the rank as
verified. Report the gate as verified, the complete path as blocked on supply, and stop.

## 13. Constraints

- Preserve all passing behaviour: 193 unit and 113 integration tests; none may regress.
- Reuse TASK-003's resolver and TASK-005's chain, transaction shape, research-run pattern, citation
  builder and rights evaluator. No second resolver, no second claim architecture, no second
  provenance chain.
- Do not relax the resolver's `READ ONLY` guarantee. Do not modify TASK-004's importer or registry.
- Do not write `distribution_values.rank`. The claim is the rank.
- No fabricated universe, denominator or ties resolution. Where a value is unknown, fail closed.
- Smallest complete implementation satisfying §9. No abstraction for `RARITY_CONTEXT`.
- No new dependency without a one-line justification (`AGENTS.md` §6). None is expected.
- `docs/canonical/`, `docs/library/`, `docs/archive/`, `docs/reference/`, `docs/review/` and
  `prompts/` are read-only.

## 14. Preflight for the implementing session

Read-only and targeted.

1. This file and the §15 answers.
2. `PROGRESS.md` — the TASK-004, TASK-005 and TASK-008 sections, and what was actually verified.
3. `packages/truth/src/{derive,confidence,rights,result,version}.ts` — the patterns to extend.
4. `packages/sources/src/registry.ts` — the `official_*` descriptor fields the gate depends on.
5. `packages/db/migrations/0004_truth_layer.ts` — the enum-staging comment, and the table shapes.
6. The canonical sections named above, **by line range**.
7. `tests/integration/src/truth-chain.test.ts` — the established test shape.
8. `git status` and the current diff.

Then state a short plan naming the exact files to change, and implement.

## 15. Unresolved decisions — answer before implementation

**One needs a recorded decision before the migration can be written.**

- **D-011 — does a derived claim need `EvidenceDependency`, or are `ClaimEvidence` links
  sufficient?** `docs/canonical/14` §30 states the required lineage for a derived statistic as
  `DERIVED_STATISTIC EvidenceItem → EvidenceDependency → {count evidence, denominator/universe
  evidence, methodology/version}`. `evidence_dependencies` does not exist: TASK-005 excluded it on
  `docs/canonical/11` §9.6's own "P1 if `ClaimEvidence` links are sufficient for the first vertical
  slice". This is the first task for which that section's mechanism is named and absent. Options,
  costs and a recommendation are recorded in D-011. **Do not settle it by picking a shape in the
  migration file** — `AGENTS.md` §2 requires a canonical tension to be recorded.

**One implementer choice to record during the work.**

- **U-1 — the ties policy.** `docs/canonical/12` §9.6 requires it be stored but does not fix it.
  **Recommended: competition ranking** — tied surnames share the lowest rank and the next distinct
  count skips accordingly, so rank 1, 2, 2, 4. It is the convention readers expect from frequency
  tables and it keeps invariant 4 exact. Whichever is chosen, name it in the payload, state it in
  the acceptance criteria and test it against constructed ties.

**Two constraints inherited, not to be reopened.**

- **TASK-004 §14 U-1** — what the male/female split partitions is still unanswered, so the two
  resources stay in different comparability groups and no all-Poland rank is derivable. U-4 (the
  unit of `Liczba`) likewise stays open; a rank does not depend on it, which is part of why rank
  precedes rarity.
- **D-007** — the resource-level licence is unconfirmed, so paid and SEO surfaces stay ineligible.
  This task consumes that and must not upgrade the profile.

## 16. Diff review

Before declaring the task complete, inspect the whole diff file by file and confirm:

1. Nothing from §8 is present — no rarity, no share, no regional, no place, no route, no DTO, no
   second claim type beyond `CURRENT_RANK`.
2. The completeness gate exists, is reached on every derivation path, and has no bypass.
3. No rank is written to `distribution_values`; that column and `derivation_version` stay null.
4. TASK-003 and TASK-004 show no behavioural diff; `packages/resolver` ideally shows none at all.
5. No summation, averaging or selection across the two comparability groups; grep for it and
   confirm every hit is a test asserting absence.
6. No fuzzy, phonetic, trigram, transliteration or diacritic-fold logic anywhere.
7. Confidence and rights remain separate functions with no shared input.
8. No fabricated universe size, denominator or tie resolution.
9. `pnpm-lock.yaml` changed only if a workspace member was added; nothing upgraded.
10. `docs/canonical/` and the other read-only directories untouched; no debug code, no stray file.

## 17. Definition of done

A fresh agent can demonstrate, by running commands and reporting real output:

```text
exact surname input
  → canonical Surname
  → ingested PESEL snapshot and value
  → UNIVERSE COMPLETENESS GATE  (refuses on the fixtures, passes on a complete import)
  → CURRENT_RANK claim with universe, ties policy and algorithm version
  → ClaimEvidence to the count and universe evidence
  → ConfidenceAssessment from the derived-statistic rule
  → structured Citation
  → per-surface rights eligibility
  → deterministic developer-facing result
```

and:

- Every acceptance criterion in §9 is demonstrated by a test that was run, with real output.
- Every invariant in §10 is asserted against a real database.
- Every failure mode in §11 has a test.
- The gate is proven to refuse over the committed fixtures, writing nothing.
- Re-running derivation changes nothing and says so.
- `pnpm db:generate-types` produces no diff after commit.
- TASK-003 through TASK-006 suites still pass, with counts reported.
- `docs/CODEMAP.md` and `PROGRESS.md` record observed facts; `docs/canonical/` untouched.
- Work is committed on the designated branch with a descriptive message.
- **STOP.** Do not begin `RARITY_CONTEXT`. Do not write `tasks/010-*.md`.
