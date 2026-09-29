# TASK-033 — Surname links from stored slugs, and every section gated on its own rights

- **Status:** IMPLEMENTED 2026-09-24. The record is in `docs/progress/2026-09-24-surname-links-and-section-rights.md`.
- **Requested by:** the project owner, who picked "fix the two bugs" after the 2026-09-24 code review.
- **Milestone:** none. These are defect fixes.
- **Numbering:** TASK-032 is claimed by pull request #9; this takes the next number.

## 1. Goal

Fix two defects the 2026-09-24 review found by reading the code:

1. **Links to the wrong surname.**
   - The home-page redirect after a search, the canonical and share URL, the language switch and the compare page's links all rebuilt a surname's address from its display form (`surnamePath`).
   - That ignores the collision suffix ADR-0010 §2 gives one of two surnames that share a slug. On the full register 850 surnames have one, and every such link opened the *other* surname of the pair.
2. **Sections shown against their own rights.**
   - `querySurnameResult` gated the population, rarity and distribution sections on the first population claim's rights only. A rarity or distribution claim whose own citation's rights block the surface was still shown.
   - The meaning section was gated on its first citation only, although `meaning.ts` states that "the most restrictive posture governs, because publishing the claim publishes all of its evidence".

## 2. In scope

- **Stored slugs for every link:**
  - `@name-atlas/seo` `lookupSlug` returns the stored slug it matched.
  - `apps/web` gets `currentPathFor`, a surname's stored address in a language, and `surnamePath` is removed.
  - The home-page redirect, `canonicalPathFor` (canonical, Open Graph and share URL), the language switch and the compare links all use the stored slug.
- **Rights per section:**
  - `sectionEligibility` in `packages/truth/src/rights.ts`: a section's decision starts from the result's and can only be tightened by the section's own claims.
  - `query.ts` gates population on all its claims, rarity and distribution on their own claims as well, and meaning on every supporting work's citation (`readSurnameMeaning` now returns `citation_rights`).
- Tests for both fixes.

## 3. Out of scope

- **Any contract change.** The contract already gives each section its own `surface` and a `RIGHTS_BLOCKED` state, so the schema stays at `1.5`.
- **The derivation-side copy of the meaning rule.** `meaning.ts` still computes the `surface_eligibility` it returns to its CLI from the first work. Follow-up.
- **The compare page and the English Open Graph image route resolve their slugs in the Polish locale.** Pre-existing, and unchanged here.

## 4. Acceptance criteria

1. **AC-1:** For a surname whose stored slug carries a collision suffix, `currentPathFor` returns the suffixed address in both languages. `canonicalPathFor` and the compare link use it too.
2. **AC-2:** A section's surface decision is never less restrictive than the result's, and never less restrictive than any of its own claims' rights.
3. **AC-3:** With two works supporting a meaning, blocking **either** work closes the meaning section with no interpretation text in the payload.
4. **AC-4:** No contract version change. Typecheck, lint, format, unit, integration, golden and build all pass.

## 5. Verification

```bash
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
TEST_DATABASE_URL=postgres://… pnpm test:integration
TEST_DATABASE_URL=postgres://… pnpm test:golden
pnpm build
```

Also, with the old behaviour temporarily restored, the new AC-1 and AC-3 tests must fail.
