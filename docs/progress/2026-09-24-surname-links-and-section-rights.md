# 2026-09-24 — TASK-033: surname links from stored slugs; every section gated on its own rights

Scope authority: `tasks/033-surname-links-and-section-rights.md`. Both defects were found by reading the code in the 2026-09-24 review; neither was observed in production. Production holds seven surnames, none of them with a collision suffix, and every section there comes from PESEL under one rights profile.

## Changed

- **Surname links.**
  - `lookupSlug` (`packages/seo/src/lookup.ts`) now returns the stored slug it matched.
  - `apps/web/src/lib/slug.ts` loses `surnamePath`, which rebuilt an address from the display form, and gains `currentPathFor`, which reads the stored current slug. `SlugResolution` becomes an alias of the seo type instead of a second hand-written union.
  - The home-page redirect, `canonicalPathFor` (canonical, Open Graph and share URL), the language switch and the compare page's links use the stored address.
  - A search whose surname has no stored address yet now renders on the home page instead of redirecting to an address that would not resolve.
- **Rights per section.**
  - `sectionEligibility` (`packages/truth/src/rights.ts`): a section's decision starts from the result's and can only be tightened by the section's own claims.
  - `querySurnameResult`: population is gated on all its claims, not just the first; rarity and distribution on their own claims as well; meaning on every supporting work's citation, which `readSurnameMeaning` now returns as `citation_rights`.
  - No output can become less restrictive than before, and no contract change was needed (schema `1.5`).

## Verified

Against a local PostgreSQL 16.13 with PostGIS 3.4.2 and `pg_trgm` 1.6, through `TEST_DATABASE_URL`, the path `packages/testing` provides:

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed |
| `pnpm format:check` | Passed |
| `pnpm test` | Passed: 704. That is 694 before plus 10 new: web +4 (`pathForSlug` ×3 replacing `surnamePath` ×2, `canonicalPathFor` ×2, compare links ×1), truth +6 (`sectionEligibility`) |
| `pnpm test:integration` | Passed: 280, 278 before plus the two new meaning cases. `canonical-route.test.ts` gained `slug` and `currentPathFor` assertions in the existing collision test |
| `pnpm test:golden` | Passed: 364 |
| `pnpm build` | Passed |
| The meaning gate temporarily put back to the first citation only | The new case that blocks work B failed; the case blocking work A passed, because A was the display citation. Restored afterwards |
| `canonicalPathFor` temporarily put back to the display-form rule | Failed: expected `/pl/nazwisko/test-collision-0a1b2c3d`, received `/pl/nazwisko/test-collision`, the other surname's address. Restored afterwards |

## Not verified

- **Rarity and distribution against a real database.** No integration test reaches a READY rarity or distribution section: the committed fixtures are excerpts, and the completeness gate refuses them without a bypass. That wiring is covered by `sectionEligibility`'s unit tests and by review, not by a query-level test.
- **The fix on production.** It is not deployed.
- **The home-page redirect and the language switch in a browser.** Both read the same `currentPathFor`, which the integration test covers.
