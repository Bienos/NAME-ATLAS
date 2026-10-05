# TASK-116 — The DiscoveryIndex: what a paid report could truthfully count, per surname

- **Status:** IMPLEMENTED 2026-10-05 (`docs/progress/2026-10-05-discovery-index.md`); AC-4 on the full register and AC-5 on production are not run.
- **Number:** 116. `main` holds 113; the open pull requests hold 099 (#108), 114 (#134) and 115 (#135) on 2026-10-05.
- **Requested by:** the project owner, 2026-10-05: "can we build next step premium report", then, offered the DiscoveryIndex, PremiumEligibility with it, or the report itself, chose **"DiscoveryIndex"**.
- **Milestone:** M4, second step (`PLAN.md` M4; `docs/canonical/23` §22, PRE-001). It follows TASK-080 (COV-001).
- **Decision:** no new ADR. Like TASK-080's `coverage@0`, the rules are versioned (`discovery@0`), written in §3 and in `packages/truth/src/discovery-index.ts`, and take the conservative default wherever an earlier owner decision already points (§6).
- **Model guidance:** implementation session.

## 1. Goal

For any surname, give the one inventory a paid report's preview or paywall may draw numbers from (`docs/canonical/11` §24): per category, how many deduplicated items are validated, how many the PAID surface allows, what one item means, and whether a preview may name the count. Then run it over the whole register, so the owner can read how many surnames have anything a paid report could truthfully count.

Nothing is sold, shown or stored. Whether a surname may be offered a paid report is PRE-002.

## 2. Facts (from `STATUS.md`, TASK-080, `docs/canonical/11` §24, `docs/canonical/17` §42–43, `docs/canonical/23` §22, 2026-10-05)

1. `docs/canonical/11` §24: DiscoveryIndex is "the only canonical inventory from which premium preview/paywall counts may be drawn", built from validated, deduplicated, rights-eligible objects. Its categories are HISTORICAL_VARIANTS, HISTORICAL_PLACES, HISTORICAL_OCCURRENCES, ARCHIVE_REFERENCES, HISTORICAL_LAYERS, MIGRATION_CLUES, SOURCES and ORIGIN_ALTERNATIVES. Each entry has `validated_count`, `eligible_count`, `count_semantics`, `confidence_distribution`, `availability_status` and `preview_allowed`.
2. `docs/canonical/23` §22: "P0 categories based on what actually exists. Do not count: SearchCandidates; raw OCR alternatives; mirrors as independent discoveries; rights-blocked paid content."
3. `docs/canonical/17` §42 hard fails: OCR candidates counted as variants; one record reached through three aggregators counted three times; rights-blocked evidence counted in paid inventory. §43: a preview's number must equal the index's.
4. What the register holds beyond the statistics: meanings (`SURNAME_MEANING`; 25 surnames live, 1,324 on `main` waiting for the VM step), Polona search matches (`ARCHIVE_AVAILABILITY`, 2,723 surnames) and famous bearers (`NOTABLE_BEARERS`, 2,723 surnames). There is no variant, historical place, verified occurrence, migration or layer source.
5. TASK-080 §6 U-2, the owner's decision of 2026-10-03: Polona's matches are words, not verified occurrences (ADR-0024 §5), so archives are at most PARTIAL.
6. ADR-0037 and D-025 (2026-10-04): famous bearers are free. The meanings are already shown on the free page.

## 3. In scope

- **`discoveryIndexOf(paid, internal)`** in `packages/truth/src/discovery-index.ts`: a pure projection over two validated responses of the query service for one surname, on the PAID surface and on the INTERNAL surface. `validated_count` is read on INTERNAL, `eligible_count` on PAID, so rights are decided once, in the query service. The availability of each category is TASK-080's coverage dimension it draws from. Nothing is stored (TASK-080 §6 U-3).
- **`buildDiscoveryIndex(db, surname)`**: reads the PAID surface, and the INTERNAL surface only when a counted section is rights-blocked on PAID (otherwise the two counts are the same read).
- **Rules `discovery@0`:**

  | Category | One item | Counted in v0 | Availability from |
  |---|---|---|---|
  | ORIGIN_ALTERNATIVES | a distinct proposed root: root form and language, case-folded, the key the meaning chain uses to decide whether two works agree | yes | ETYMOLOGY |
  | SOURCES | a distinct work (title, author or publisher, year) behind a counted item | yes; in v0 only the works behind ORIGIN_ALTERNATIVES | ETYMOLOGY |
  | ARCHIVE_REFERENCES | a distinct archival record verified to contain the surname | no: Polona's matches are search matches for a word, never verified (fact 5) | ARCHIVES |
  | HISTORICAL_OCCURRENCES | a verified dated occurrence | no source yet | HISTORICAL_OCCURRENCES |
  | HISTORICAL_VARIANTS | a validated historical form | no source yet; the male or female form (`other_form`) is a grammatical form, not a historical variant | VARIANTS |
  | HISTORICAL_PLACES | a place with a surname-level historical association | no source yet; a locality with the same name is not one (TASK-080) | HISTORICAL_PLACES |
  | MIGRATION_CLUES | a surname-level pattern passing an evidence threshold | no source yet; the 2019–2026 regional change is not one | MIGRATION |
  | HISTORICAL_LAYERS | — | no source yet | none (NOT_RETRIEVED) |

  `preview_allowed` is true exactly when `eligible_count` is above zero. `confidence_distribution` holds the eligible items by the section's confidence status. Famous bearers are not counted: they are free (fact 6), and a person sharing the name is not evidence about the surname.
- **`pnpm discovery:index`**: a register-wide run of the same function, read-only, reporting per category the surnames with eligible items, their total, the surnames whose items are all rights-blocked, and each availability; and, per list, the surnames and people with any eligible item. The male and female lists are never summed (TASK-004 §14 U-1). It shares TASK-080's loop over the register.
- **Tests** for `docs/canonical/17` §42's three hard fails and for the dedupe rule.

## 4. Out of scope

- PremiumEligibility (PRE-002): the `premium_eligible` flag of `docs/canonical/11` §24.2, its reasons and any threshold.
- The report (RPT-001), a preview, a paywall, a price or any page change. The index stays internal until PRE-002 exists.
- Storing the index (`docs/canonical/11` §24.2's `research_run_id` and `coverage_assessment_id`); that comes with RPT-001's frozen basis.
- New sources, a wider Polona load, verifying Polona matches.

## 5. Acceptance criteria

- AC-1: `buildDiscoveryIndex` returns all eight categories, in §3's order, for any resolved surname; a category with no source is NOT_RETRIEVED, never NONE.
- AC-2: Polona's search matches count zero ARCHIVE_REFERENCES, whatever their number (`docs/canonical/17` §42, first case).
- AC-3: two works proposing the same root count one ORIGIN_ALTERNATIVE and two SOURCES; two works proposing different roots count two of each (§42, second case: one item reached twice is counted once).
- AC-4: a meaning whose source is rights-blocked on the PAID surface has a validated count above zero, an eligible count of zero, BLOCKED_RIGHTS and no preview (§42, third case).
- AC-5: `pnpm discovery:index` runs over the register, and its surnames read equal the active surnames; it is run once on production through the read-only role, with the output in the progress record.

## 6. Unknowns for the owner

- **U-1. Default taken: Polona's matches count nothing.** TASK-080 §6 U-2 already made them at most PARTIAL, and `docs/canonical/23` §22 forbids counting search candidates. They will count once a match is verified as the surname (ADR-0024 §33's `HISTORICAL_OCCURRENCE`).
- **U-2. Default taken: famous bearers are not inventory.** They are free under ADR-0037. A later rule may count them if a paid tier comes to hold more of them than the free page shows.
- **U-3. For PRE-002, not this task:** everything v0 counts (meanings and the works behind them) is also on the free page. Whether an offer may promise items the reader can already see is PremiumEligibility's question.

## 7. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `test:integration`, `test:golden`, `build`; then `pnpm discovery:index` locally, and once on production through the read-only role (the owner's).
