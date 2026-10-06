# TASK-148 — Name Atlas Brand System v1.0

- **Status:** IMPLEMENTED 2026-10-06 on `task-147-brand-system-v1`; draft PR #177 is awaiting repository CI/local verification before merge.
- **Requested by:** the project owner, 2026-10-06. The approved visual direction is **Evolved Contour — Dark Atlas** and the request is to turn it into the production brand/design foundation before any full-page frontend migration.
- **Decision:** ADR-0046.
- **Milestone:** brand/design foundation; no product/data contract change.
- **Depends on:** ADR-0021 (current dusk site), TASK-034 (token discipline), TASK-052 (shared dusk shell), TASK-055 (cards-first surname view).

## 1. Goal

Create a complete, documented, reusable and code-ready Name Atlas Brand System v1.0. It must be specific enough that a later implementation task can say “rebuild the Name Atlas frontend using Brand System v1.0” without inventing visual rules.

This task establishes the foundation only. It does **not** redesign all existing pages.

## 2. Facts checked on `main` @ `13b0b40`

1. The public app is Next.js 16.3.5 / React 19.3.0 in `apps/web`; there is no Tailwind or CSS framework.
2. `apps/web/src/app/globals.css` is the current global stylesheet. `apps/web/src/lib/design-tokens.ts` is the existing token source; `design-tokens.test.ts` verifies exact CSS parity and forbids raw hex colours in TypeScript outside that file.
3. Every public page already renders inside the dusk shell from ADR-0021/TASK-052. `body.dusk` currently remaps the product accent from Atlas Blue to dusk amber.
4. Brand type is already Fraunces + Instrument Sans + IBM Plex Mono through `next/font/google`; static TTF files with OFL notices exist in `apps/web/assets/fonts/` for OG/share rendering.
5. The current mark is **Name Print**, a seven-ring fingerprint/contour whorl with a central Atlas Blue point. Since TASK-052 it is not used in the page header, but its masters and favicon remain.
6. The landing hero still depends on `apps/web/public/images/landing-dusk.png`, a generated static dusk landscape, while `dusk-world.tsx` also contains deterministic procedural point rendering for Poland.
7. Existing map geometry and result/evidence behavior are domain-sensitive and must not be replaced by decorative brand logic.

## 3. In scope

- Audit the current UI/brand implementation and migration risks.
- Canonical brand documentation under `docs/brand/`.
- ADR-0046 recording the Evolved Contour — Dark Atlas implementation decision.
- A machine-readable token layer and semantic CSS custom properties, without breaking the existing token contract during migration.
- Production SVG assets for the refined Evolved Contour N and Atlas Point.
- Reusable code-driven graphics: contour field, topographic crop, data trace, coordinate label, atlas grid and fold layer.
- Brand-ready component primitives and documentation.
- Brand-specific map/chart tokens and evidence/confidence styles.
- Motion and accessibility guidance.
- A living `/dev/brand` route for local/preview use; hidden on the production environment.
- Social/print templates as reusable SVG masters/rules, not invented historical content.
- A migration guide from the current Dusk implementation to Brand System v1.0.
- Update `docs/CODEMAP.md`, `STATUS.md` and add a factual progress record after implementation.

## 4. Out of scope

- Rebuilding the landing page, surname page, directory, blog, account, family tree, offer or baby-name surfaces.
- Changing any product/data contract, claim derivation, confidence logic, source rights, map facts or wording.
- Replacing existing production favicon/header/OG assets before the later migration task.
- Deleting Name Print assets. They become legacy/deprecated assets until migration is approved.
- Fabricating surname statistics, historical records, archival documents or map data.
- Adding a new UI library or CSS framework.
- Making `/dev/brand` public in production.

## 5. Acceptance criteria

- **AC-1.** `docs/brand/CURRENT_UI_AUDIT.md` accurately inventories the current implementation and identifies conflicts, preservation targets, deprecations, risk and migration order.
- **AC-2.** `docs/brand/NAME_ATLAS_BRAND_GUIDELINES.md` is the canonical Brand System v1.0 and covers the requested visual, product, motion, accessibility, social, print and implementation rules.
- **AC-3.** Semantic design tokens and CSS variables exist under `apps/web/src/design-system/`, with no page-by-page magic colours.
- **AC-4.** The Evolved Contour N has full, responsive, one-colour and 32/16px SVG masters plus an Atlas Point primitive; no raster is embedded in SVG.
- **AC-5.** Deterministic reusable graphic primitives exist and do not depend on generated photographs.
- **AC-6.** A typed component foundation exists for controls, evidence, confidence, source/data presentation, loading/empty/error states, timelines and common overlays.
- **AC-7.** Map and chart semantic tokens preserve “no data is not zero” and avoid arbitrary/rainbow colouring.
- **AC-8.** `/dev/brand` demonstrates the system and is unavailable when `VERCEL_ENV=production`.
- **AC-9.** Documentation explains migration from current Dusk tokens/components without claiming the migration itself is complete.
- **AC-10.** Existing product truth/evidence behavior is untouched.
- **AC-11.** Verification runs the task’s targeted tests plus repository typecheck/lint/format/build when execution is available.

## 6. Verification

```bash
pnpm --filter web test -- design-system
pnpm --filter web typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm --filter web build
```

If the connected GitHub environment cannot execute commands, record them as **not run** rather than claiming success.
