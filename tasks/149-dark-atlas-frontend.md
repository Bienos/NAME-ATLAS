# TASK-149 — Migrate the public frontend to Dark Atlas Brand System v1.0

- **Status:** IN PROGRESS on `task-149-dark-atlas-frontend`.
- **Requested by:** project owner, 2026-10-06.
- **Decision:** ADR-0046.
- **Depends on:** TASK-148 Brand System v1.0, ADR-0021 dusk direction, TASK-052 shared shell, TASK-065 landing, TASK-055 surname deck.
- **Outcome:** the actual public Name Atlas frontend adopts the approved **Evolved Contour — Dark Atlas** system. This is a visual migration, not a product/data redesign.

## Goal

Make the real Name Atlas experience feel like the approved dark reference across the entire public product:

- deep plum / aubergine / near-black purple as the continuous environment;
- warm ivory editorial typography;
- Atlas Blue as the primary digital/action/discovery signal;
- amber as restrained historical/geographic emphasis;
- contour/topographic/cartographic graphics used with restraint;
- rare paper/cream surfaces only where they create documentary contrast;
- Evolved Contour mark in the shared shell;
- editorial, spatial composition instead of generic SaaS cards.

The product must still render the same validated facts, routes and interactions.

## In scope

1. Apply the Brand System v1 semantic scope to the public shell.
2. Migrate global dark tokens so Atlas Blue becomes the action/focus/discovery accent and amber becomes secondary.
3. Replace the shared header word-only treatment with the Evolved Contour horizontal lockup/mark plus live text where appropriate.
4. Rework the shared shell background into a continuous Dark Atlas field using code-driven contours/grid/point primitives.
5. Re-art-direct the landing hero to the approved dark atlas composition while preserving the current copy, search behavior and search-zoom behavior.
6. Reduce dependence on the static scenic landing image; it may remain as a subtle atmospheric underlay only if it does not dominate the identity.
7. Migrate surname result surfaces, journey sections, maps, evidence/source modules, timeline/history, deck/share surfaces and common secondary pages through shared CSS/tokens/components rather than route-specific rewrites.
8. Make paper/cream surfaces rare and intentional: search, archival/document previews, export/print, selected editorial interruption.
9. Update favicon/app icon to the Evolved Contour mark if current platform assets can be replaced safely.
10. Preserve mobile quality, keyboard/focus, reduced motion, no-data map semantics and long Polish surname handling.
11. Update visual-regression/reference documentation and record the verified change.

## Out of scope

- Changing research claims, source rights, confidence logic, API contracts or database behavior.
- Rewriting page copy except where needed for accessibility labels or brand-system implementation.
- Changing pricing, account behavior, family tree logic, share permissions or product tier behavior.
- Replacing factual map geometry or deriving facts in UI code.
- Adding a new UI framework or dependency.
- A separate production release branch workflow change.

## Acceptance criteria

- **AC-1.** Every public route renders inside the Brand System v1 dark semantic scope without losing existing product behavior.
- **AC-2.** Public surfaces are approximately 85–95% dark; large generic white/cream card fields are absent.
- **AC-3.** Atlas Blue is the primary action/focus/discovery colour; amber is not the global action colour.
- **AC-4.** Shared header uses the Evolved Contour identity and remains usable at mobile widths.
- **AC-5.** Landing hero visually matches the approved dark plum / contour / Atlas Point / editorial surname/search language and is not dependent on a literal scenic image.
- **AC-6.** Result/evidence/source/map/timeline/deck/share surfaces all inherit the new system without changing their data contracts.
- **AC-7.** Factual maps preserve no-data ≠ zero and keyboard/focus behavior.
- **AC-8.** Long Polish surnames and diacritics remain legible on a 390px phone.
- **AC-9.** `prefers-reduced-motion`, focus visibility and contrast remain supported.
- **AC-10.** Existing public route tests and truth/evidence tests remain green.
- **AC-11.** Current brand-system tests remain green.
- **AC-12.** A production build succeeds.

## Verification

```bash
pnpm --filter web typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm --filter web test
pnpm --filter web build
```

Run the repository CI as the final gate before merge.
