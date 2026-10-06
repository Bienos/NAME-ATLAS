# TASK-150 — The baby-names page redesigned in Brand System v1: tiles, the share, "1 na N", the year chart

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-baby-names-page-redesign.md`). Dark behind the same flag as before.
- **Requested by:** the project owner, 2026-10-06: a redesign of the baby-names result page from two mockups (the free view and the view after paying), "build it".
- **Decision:** ADR-0046 (Brand System v1, the build follows it rather than the mockups' amber accent), ADR-0043 §4 (the share's definition; one amendment line in its Consequences), ADR-0045 (what a meaning may show), ADR-0023 §2.5 (no buy button), D-044, D-045, D-047. No new ADR, no migration, no D- number.
- **Numbers:** TASK 150. 148 was the last on `main` (`3d12f1a`, #177); open draft #178 holds TASK-149.
- **Model guidance:** implementation session.

## 1. Goal

The single-name page shows the same facts as before in the Brand System's tiles: per sex the count as the one big number, its share of the list's children, the rank with a track, "1 na N" with a dot grid, the direction with the two shares it was decided on, the register; then the name's origin and meaning in a work's own words or one line saying there is none, and the locked card unchanged. An entitled reader gets a year chart, the "×N" against 2000, three callouts, a rank ladder and the year table folded behind `<details>`.

## 2. Facts (2026-10-06)

1. The page (TASK-141, 145, 146) showed, per sex, the latest count and rank, the direction, the register block, and for an entitled reader a plain year table. Signed-in only, flag-gated, `noindex`, `private, no-store`.
2. The trend claim's `structured_value` carries `latest` and `earlier` with `share_per_million` (ADR-0043 §4); the reader did not expose them.
3. `given_name_birth_lists.people_sum` is the children on the published list (ADR-0042); `BirthListInfo` did not expose it.
4. The locked card reads "8,99 zł · Wkrótce" with no button (ADR-0023 §2.5).
5. TASK-147 (ADR-0045) imported Buryan 1933 and Yonge 1884; `readGivenNameMeaning(db, givenNameId, surface)` in `packages/truth/src/given-name-facts.ts` reads a name's claim and is usable by this page.
6. #178 (TASK-149) migrates the shell to `.atlas-v1` on the body and touches `layout.tsx`, `site-shell.tsx`, `dusk-world.tsx`, the nav, footer, icon and OG/share renderers; none of them is edited here. The page carries `.atlas-v1` on its own `<main>` so it renders in the scope before and after #178.

## 3. In scope

1. **Truth** (`packages/truth/src/given-name-birth-facts.ts`): `BirthListInfo.people_sum`; `BirthCountFigure.share_per_million` (floor of count × 1 000 000 ÷ the list's `people_sum`) and `one_in` (the sum ÷ the count, rounded), by `birthShare`, null only on a stored contradiction, never 0; `BirthTrendFigure.latest_share_per_million` and `earlier_share_per_million` from the claim. No new claim type.
2. **The free view**, per sex: the hero tile (eyebrow, the count, the noun, the share with one decimal, "Miejsce N · z M imion", the rank track at rank ÷ universe, the source line); "Jak częste" ("1 na N", a dot grid of N dots with one lit when N ≤ 60, the caption); the direction tile (chip, "Udział: 2020 r. 4,0% → 2025 r. 3,7%", "poniżej progu" when the earlier count was absent, the basis, the sources); the register tile; then "Co znaczy" (each work's origin and meaning with its citation, the Polish translation marked as Name Atlas's; otherwise "Brak danych o pochodzeniu i znaczeniu."); the locked card unchanged.
3. **The paid view**, per sex: an inline-SVG bar chart of every year from 2000 (the peak amber, the first and latest lighter, an absent year a cut-off tick, no zero bar, no library); "×N · tyle razy częściej/rzadziej niż w 2000 r." only when both counts exist; three callouts; the ladder (2000, 2005, 2010, 2015, 2020, the latest; "—" without a rank claim; the years at no. 1); the year table newest first, six open, the rest behind `<details>`; the other sex's line when it is on no list.
4. **Layout and accessibility:** one column at 390 px, two from 900 px; `<section>`s with headings; sex tabs as in-page links with `aria-current`; semantic tokens only; Atlas Blue for action, focus and the lit point; amber for the peak bar alone; no animation.
5. **Tests:** truth, page, integration on the committed fixtures. **Records:** this file, `docs/CODEMAP.md`, the progress record, `STATUS.md`, ADR-0043's amendment line, a note in `docs/brand/MIGRATION_GUIDE.md`.

## 4. Out of scope

Share cards and the share sheet; the list page's restyle; comparing two names; any buy button, checkout link or price change; the header, footer, favicon, OG/share renderers, `dusk-world.tsx` and `site-shell.tsx` (#178's files); a new claim type or migration; new dependencies; production configuration; the VM.

## 5. Not decided

Whether the lit dot should be the first of the grid (as built) or another; whether the "×" should compare shares rather than counts (the mockup's figure was a ratio of counts); the thousands separator (the site's formatter writes a no-break space, not a thin space).

## 6. Acceptance criteria

- **AC-1:** free view shows per sex: count, share (one decimal), rank with the track, "1 na N" with the dot grid when N ≤ 60, the direction with both shares when present, the register tile, the meaning tile (data or the one "Brak danych" line), the locked card unchanged in facts and rule.
- **AC-2:** paid view shows the chart from `history` with the peak bar amber and no zero bar for an absent year, the "×" headline only when both counts exist, the callouts, the ladder, the `<details>` table.
- **AC-3:** every figure reaches the page through claims or the list's stored `people_sum`; `given_name_birth_counts` and `given_name_counts` are not read; nothing is summed across sexes; nothing is 0 where data is absent.
- **AC-4:** the page uses Brand System v1 semantic tokens/components; Atlas Blue for action/focus/the lit point; amber only for the peak bar; contrast rules kept.
- **AC-5:** no horizontal overflow at 390 px if checked in Chromium; otherwise the record says it was not.

## 7. Verification

`pnpm format:check`, `check:ids`, `typecheck`, `lint`, `test`, `test:integration`, `test:golden`, `build`; Chromium at 390 and 1280 px where a local database can be built.
