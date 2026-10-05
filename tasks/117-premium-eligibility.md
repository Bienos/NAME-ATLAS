# TASK-117 — Premium eligibility: whether a paid surname report may be offered, and why not

- **Status:** IMPLEMENTED 2026-10-05 (`docs/progress/2026-10-05-premium-eligibility.md`); the run over the full register (AC-4 on production) is not run.
- **Number:** 117. `main` holds 116; the one open pull request (#137, Vercel Speed Insights) takes no number on 2026-10-05.
- **Requested by:** the project owner, 2026-10-05: "build next step premium eligibility", after TASK-116 (#136) merged.
- **Milestone:** M4, third step (`PLAN.md` M4; `docs/canonical/23` §22, PRE-002). It follows TASK-080 (COV-001) and TASK-116 (PRE-001).
- **Decision:** the owner answered §6 U-1 and U-2 on 2026-10-05. No new ADR: like `coverage@0` and `discovery@0`, the policy is versioned (`eligibility@0`) and written in §3 and in `packages/truth/src/premium-eligibility.ts`.
- **Model guidance:** implementation session.

## 1. Goal

For any surname, say whether a paid surname report may be offered, with a versioned policy and every reason it may not. Then run it over the whole register, so the owner can read how many surnames could be offered one. That count closes M4's question (`PLAN.md`).

Nothing is offered, shown, sold or stored.

## 2. Facts (from `docs/canonical/16` §58, `docs/canonical/17` §44, `docs/canonical/20` §26, `PRODUCT.md` §4 and §6, TASK-116; 2026-10-05)

1. `docs/canonical/16` §58: `PremiumEligibilityDTO` has `eligible` and a `state` of ELIGIBLE, RESEARCHING, INSUFFICIENT_MEANINGFUL_CONTENT, RIGHTS_BLOCKED or NOT_AVAILABLE. "The browser does not decide eligibility."
2. `docs/canonical/17` §44's cases: RICH_ELIGIBLE, STANDARD_ELIGIBLE, LIMITED_NOT_ELIGIBLE, MINIMAL_NOT_ELIGIBLE, RIGHTS_BLOCKED, RESEARCH_STILL_RUNNING, UNCONFIRMED_ONLY, ONE_CATEGORY_ONLY. "No 'always show paywall' behavior."
3. `docs/canonical/20` §26: checkout for a report begins only after ELIGIBLE, with the DiscoveryIndex ready and paid rights allowed.
4. `PRODUCT.md` §6: "Premium sells depth and synthesis, never the answer already promised free"; premium is offered "only when coverage and the DiscoveryIndex show real inventory exists".
5. TASK-116: today the index counts only meanings (ORIGIN_ALTERNATIVES, and the works behind them as SOURCES), and every meaning it counts is on the free page.
6. The PAID surface does not check a source's metadata rights and the FREE surface does (`rights.ts` `evaluateSurface`), so a meaning can be allowed on PAID and blocked free.
7. No surname-report offer exists. TASK-111's checkout sells ADR-0037's tiers, which promise no surname report, so this policy gates nothing yet.

## 3. In scope

- **`premiumEligibilityOf(paid, free, tier)`** in `packages/truth/src/premium-eligibility.ts`: a pure policy over the surname's DiscoveryIndex on the PAID surface, the same index built from its FREE response, and its coverage tier.
- **`assessPremiumEligibility(db, surname)`**: builds the DiscoveryIndex, and reads the FREE surface only when some kind has an item the PAID surface allows.
- **Policy `eligibility@0`** (§6). ELIGIBLE needs all of:
  - **two kinds** of deeper evidence with premium items. A kind is a DiscoveryIndex category other than SOURCES, which only names the works behind the other kinds' items;
  - **premium items** are those the PAID surface allows less those the free page shows. The query service allows or blocks a section whole, so the difference of the counts is exact;
  - coverage tier **STANDARD or RICH**;
  - **not only unconfirmed**: some premium item at a confidence other than UNCONFIRMED or INSUFFICIENT_DATA. Items with no confidence count as unconfirmed.

  Otherwise the state is INSUFFICIENT_MEANINGFUL_CONTENT, or RIGHTS_BLOCKED when paid rights alone leave no premium item. Every failing condition is reported: NO_PREMIUM_INVENTORY, ALL_SHOWN_FREE, PAID_RIGHTS_BLOCKED, ONE_CATEGORY_ONLY, UNCONFIRMED_ONLY, COVERAGE_BELOW_STANDARD. RESEARCHING is not produced, because no research run exists. A surname that does not resolve or cannot be read is the outcome NOT_RESOLVED or UNAVAILABLE (the DTO's NOT_AVAILABLE).
- **`pnpm premium:eligibility`**: a register-wide run, read-only, reporting surnames per state and per reason, and per list the surnames and people eligible. The male and female lists are never summed. It shares TASK-080's loop.
- `buildDiscoveryIndex`'s outcome carries its coverage assessment (it carried only its people), so the tier is read once.
- **Tests** for `docs/canonical/17` §44's cases that `eligibility@0` can reach, and for the free-page rule on a real database.

## 4. Out of scope

- An Offer, a price, a paywall, a preview or any page change (`docs/canonical/16` §59, `docs/canonical/20` §13).
- Gating TASK-111's checkout: its tiers promise no surname report (fact 7). The first surname-report offer (RPT-001 or later) must check ELIGIBLE.
- Storing eligibility, a research run, RESEARCHING.
- Changing what TASK-116 counts.

## 5. Acceptance criteria

- AC-1: `assessPremiumEligibility` gives every resolved surname a state, and every surname that is not ELIGIBLE at least one reason.
- AC-2: a meaning the free page shows never counts; one the PAID surface allows and the free page cannot show does.
- AC-3: paid rights that leave no premium item give RIGHTS_BLOCKED.
- AC-4: `pnpm premium:eligibility` runs over the register, and its surnames read equal the active surnames; it is run once on production through the read-only role.
- AC-5: the §44 cases that `eligibility@0` can reach pass: RICH and STANDARD eligible, LIMITED and MINIMAL not, RIGHTS_BLOCKED, UNCONFIRMED_ONLY, ONE_CATEGORY_ONLY.

## 6. Decisions of the owner (2026-10-05)

- **U-1. Decided: two kinds and STANDARD.** Asked what a surname must have before a paid report may be offered, given one kind, two kinds or the coverage tier alone, the owner chose "at least two kinds of deeper evidence with countable items, coverage tier STANDARD or better, and not only unconfirmed items". Under it no surname is eligible today: the only countable inventory is meanings, one kind.
- **U-2. Decided: content shown free does not count.** Asked whether evidence already on the free page counts, the owner chose that it does not, as `PRODUCT.md` §6 says.

## 7. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `test:integration`, `test:golden`, `build`; then `pnpm premium:eligibility` locally, and once on production through the read-only role (the owner's).
