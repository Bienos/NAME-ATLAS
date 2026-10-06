# 2026-10-06 — Name Atlas Brand System v1.0

**Task:** TASK-147  
**Decision:** ADR-0045  
**Branch:** `task-147-brand-system-v1`  
**Pull request:** #177  
**Code head when this record was written:** `4287ff99491c3e691193ad4ac36cb14821ed3db2`

## What changed

- Audited the existing Next.js dusk UI before modifying the visual foundation.
- Added the canonical **Evolved Contour — Dark Atlas** guidelines, token, typography, graphic-language, motion, accessibility, component and migration documentation under `docs/brand/`.
- Kept the existing Fraunces / Instrument Sans / IBM Plex Mono type system.
- Added Dark Atlas foundation values to the repository's existing tested token source and matching `:root` CSS block.
- Added the semantic Brand System v1 layer under `apps/web/src/design-system/`.
- Added typed low-level components for actions, fields, navigation, badges, confidence, sources/evidence, data stats, overlays, timeline, citations, region/search presentation and loading/empty/error states.
- Added deterministic code-driven `ContourField`, `TopographicCrop`, `AtlasPoint`, `DataTrace`, `CoordinateLabel`, `AtlasGrid`, `FoldLayer` and configurable `AtlasHero` primitives.
- Added map/chart visual tokens without changing existing factual map geometry or presentation objects. The map theme has five data bands plus a separate no-data state.
- Added clean SVG masters for the Evolved Contour N, responsive 32/16 px cuts, monochrome mark, transparent lockups and the Atlas Point.
- Added reusable contour/topography and brand-specific source/archive/distribution/historical-occurrence SVGs.
- Added 1200×630, square, portrait and story social masters plus research-card/report-cover print masters.
- Added the internal `/dev/brand` living guide; it returns not-found in production, while remaining available locally and in Vercel preview.
- Loaded Brand System v1 CSS globally but scoped its semantic product rules under `.atlas-v1`, so existing public pages remain visually unchanged.
- Updated `docs/CODEMAP.md` and `STATUS.md`.

## Deliberately unchanged

- No public page family was migrated to Brand System v1.
- Name Print remains the production favicon/legacy mark until a later migration task.
- `landing-dusk.png` remains the current public landing artwork until the homepage migration.
- Existing `body.dusk` amber action mapping remains in legacy pages.
- No claim, source-right, confidence, API contract, factual map geometry, database or product wording changed.

## Verification

The connected GitHub editing environment does not provide a repository command runner, so the following task commands were **not run locally**:

```bash
pnpm --filter web test -- design-system
pnpm --filter web typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm --filter web build
```

Draft PR #177 was opened so the repository's normal GitHub Actions CI can perform repository-level verification on the final branch head. Do not infer a passing result from this progress record; check the PR's CI result before merge.

## Migration state

Brand System v1 is a production-ready **foundation**, not a claim that the site redesign is complete. The next visual task should migrate the shared shell first, then the homepage, surname result, secondary reading pages and only then the interaction-heavy deck/share/report/account/tree surfaces, following `docs/brand/MIGRATION_GUIDE.md`.
