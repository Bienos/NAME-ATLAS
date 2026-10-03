# TASK-080 — Coverage per surname, and how much of the register could carry a paid report

- **Status:** IMPLEMENTED 2026-10-03 (`docs/progress/2026-10-03-coverage-assessment.md`); AC-3 on the full register and AC-5 on production are not run.
- **Number:** 080. Drafted as 071, then 072, then 074, then 075; `main` gave 071, 072 and 074 to blog posts (#78, #80, #83), 073 to well-known bearers (#84) and 075 to the blog's redesign (#86) while this was open. 076 is `main`'s tree pages, 077 the bearers VM step (#87), 078 is claimed by #81 and 079 is a blog post (#90), so 080 stays free on `main` and in the open pull requests on 2026-10-03 (#94 and #91 later took 082 and 083 on `main`; #76's localities are 090, after #93 took 086).
- **Requested by:** the project owner, 2026-10-03: "start M4 premium inventory".
- **Milestone:** M4, first step (`PLAN.md` M4; `docs/canonical/23` §22, COV-001).
- **Depends on:** built on #77's head (#76 with `main` merged in); #76 merged (the 147 Onomastica meanings and the localities read change what coverage finds).
- **Decision:** the owner answered §6 U-1 and U-2 on 2026-10-03: the proposed v0 tier rule, and Polona's raw hits at most PARTIAL. U-3 takes its recommended default.
- **Model guidance:** implementation session once §6 is answered.

## 1. Goal

For any surname, say which evidence dimensions the register actually holds, how strong each is, and what coverage tier that makes it. Then run it over the whole register and report how many surnames, and how many people, fall in each tier. That count is M4's exit question: "do enough real surnames carry enough deeper evidence to justify a paid report?" (`PLAN.md`).

This task decides nothing commercial. It measures with a versioned, conservative rule, and the owner reads the result.

## 2. Facts (from `STATUS.md`, `docs/canonical/11` §23–24, ADR-0024, 2026-10-03; to be re-checked on `main` in preflight)

1. `packages/truth/src/coverage.ts` (`pnpm coverage:report`) already counts active claims per national resource and count band, for population, rank, rarity, distribution and meaning. It sets no threshold and says that is the owner's call.
2. Production claims per type: `CURRENT_POPULATION`, `CURRENT_RANK`, `RARITY_CONTEXT` 828,262 each; `CURRENT_DISTRIBUTION` 395,216; `SURNAME_DISTRIBUTION_SHIFT` 807,358; `SURNAME_MEANING` 25 surnames live, 172 once #76's extras run; `ARCHIVE_AVAILABILITY` 2,723 surnames (those ranked within 2,000 on either list).
3. Deeper evidence is therefore thin by construction: meanings reach about 0.03% of the 598,476 surnames, Polona about 0.5%. Polona was only searched for the top 2,000 on each list.
4. ADR-0024 §5: a Polona match is a word, not a person; TASK-031's hand sample found 72 of 90 hits to be the surname. There is no verified `HISTORICAL_OCCURRENCE` claim yet (§33 names it as the paid report's next step).
5. `docs/canonical/11` §23: `CoverageAssessment` has a tier (RICH, STANDARD, LIMITED, MINIMAL) and one `CoverageDimension` per dimension with an availability (STRONG, PARTIAL, NONE, BLOCKED_RIGHTS, SOURCE_UNAVAILABLE, NOT_RETRIEVED, NOT_APPLICABLE). The tier comes from meaningful dimensions and their quality, "not a raw count of filled fields".
6. `docs/canonical/23` §22 and golden rules 16–17: the DiscoveryIndex must not count search candidates, raw OCR alternatives, mirrors or rights-blocked paid content, and paywall counts must equal it. That is PRE-001, a later task.
7. The paid tier "Nazwisko i rodzina" (ADR-0026) is a report plus famous bearers plus a tree. Famous bearers are not built, and the tree is dark. D-025 proposes new tiers and is open.

## 3. In scope

- **`assessCoverage(db, surname)`** in `packages/truth`: a read-time projection over the validated PAID-surface response of the query service, so rights, confidence and "not searched" are decided in one place. No migration and no stored assessment (U-3). It returns:
  - each dimension the register can hold today, with its availability, its validated item count and a reason code;
  - a tier;
  - `assessment_version`.
  The dimensions are POPULATION, MODERN_GEOGRAPHY, CHANGE_OVER_TIME (the shift claims), ETYMOLOGY (meanings), ARCHIVES (Polona) and LOCALITIES (TERYT, flagged as not origin). Dimensions with no source yet (ORIGIN, VARIANTS, HISTORICAL_OCCURRENCES, HISTORICAL_PLACES, MIGRATION) are listed as NOT_RETRIEVED, never NONE.
- **Rules v0**, written down in the task's ADR or a section of `docs/contracts/`, per §6 U-1 and U-2. The rules are conservative: a dimension is STRONG only when its section is ready on the PAID surface at VERIFIED or LIKELY confidence (the contract's scale; a meaning is never VERIFIED, ADR-0008 §5, so a meaning is STRONG at LIKELY). "The statistics" are POPULATION and RARITY; MODERN_GEOGRAPHY is reported but not required, because the regional lists suppress small counts. The rules are written in `packages/truth/src/coverage-assessment.ts`.
- **`pnpm coverage:assess`**: a register-wide run of the same function in bulk, read-only, reporting per national resource and count band the surnames and people in each tier and each dimension's availability. The male and female lists are never summed (TASK-004 §14 U-1).
- **One production run** of it through the read-only role, with the output committed to the progress record as the M4 evidence.
- **Golden cases:**
  - a rich surname gets the top tier its data allows;
  - a surname with population only gets MINIMAL;
  - a surname whose meaning source is rights-blocked on the paid surface gets BLOCKED_RIGHTS, not NONE;
  - a surname Polona never searched gets NOT_RETRIEVED, not NONE.

## 4. Out of scope

- DiscoveryIndex and its counts (PRE-001), PremiumEligibility (PRE-002), the report (RPT-001), any paywall or price.
- Any page change. Coverage stays internal until PRE-001 exists.
- New sources, a wider Polona load, or per-hit verification of Polona matches.
- Storing assessments in tables (`docs/canonical/11` §23). That comes when a ResearchRun needs a frozen basis (RPT-001).

## 5. Acceptance criteria

- AC-1: `assessCoverage` returns every dimension in §3 for any resolved surname, and none of them is NONE when the truth is "not searched".
- AC-2: the golden cases in §3 pass.
- AC-3: `pnpm coverage:assess` runs over the full local register, and its totals per resource equal that resource's surname count.
- AC-4: rights follow the stored profile per surface. A source whose commercial use is UNKNOWN counts as BLOCKED_RIGHTS on the paid surface (golden rule 15, `commercialUnknown_blocksPaidSurface`).
- AC-5: the production run's tier table is in the progress record, with the date and the assessment version.

## 6. Unknowns for the owner

- **U-1. Decided 2026-10-03: the proposed v0.** What a paid report needs to be worth selling. Which dimensions must be STRONG for RICH and STANDARD? A proposed v0:
  - RICH: ETYMOLOGY and ARCHIVES both STRONG, plus the statistics.
  - STANDARD: one of the two STRONG.
  - LIMITED: statistics plus change over time.
  - MINIMAL: population only.

  Under that rule, today's data gives at most about 2,800 surnames above LIMITED, because meanings reach 172 surnames and Polona reaches 2,723.
- **U-2. Decided 2026-10-03: at most PARTIAL.** Do Polona's hit counts count as archive evidence? ADR-0024 says a hit is a word, not a person, and canonical 23 §22 says not to count raw OCR alternatives. Recommended: ARCHIVES is at most PARTIAL on raw hit counts, and becomes STRONG only on verified occurrences, which do not exist yet. That makes RICH unreachable today, and the measurement would say so.
- **U-3. Default taken: computed.** Computed or stored? Recommended: computed at read time now, and stored when the report needs a frozen basis.

## 7. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `test:integration`, `test:golden`, `build`; then `pnpm coverage:assess` locally on the full register and once on production through the read-only role.
