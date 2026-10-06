# ADR-0046 — Evolved Contour — Dark Atlas becomes the production brand-system foundation

- **Status:** Proposed. Accepted when TASK-148 is merged.
- **Date:** 2026-10-06
- **Deciders:** project owner.
- **Supersedes visually:** ADR-0021 only where this ADR explicitly changes brand semantics. ADR-0021's evidence, data and product-behaviour constraints remain.
- **Relates to:** ADR-0012, ADR-0021, TASK-034, TASK-052, TASK-055, TASK-148.

## Context

The owner approved the **Evolved Contour — Dark Atlas** visual direction and requested a production-grade design system before any full-site redesign.

The existing product is already dark-first, uses Fraunces / Instrument Sans / IBM Plex Mono, has one tested token source, shared shell/navigation, factual Poland geometry, evidence-first UI contracts and reduced-motion behavior. The foundation is good, but the visual language is incomplete and the current dusk implementation makes amber the global accent.

## Decision

1. **Dark-first is the canonical product environment.** Target composition is approximately 85–95% dark surfaces and 5–15% paper/ivory surfaces.
2. **Atlas Blue is the primary digital signal.** It means action, focus, discovery and the Atlas Point. Amber is narrowed to historical/geographic emphasis and warm cartographic light.
3. **The core mark is the Evolved Contour N.** It emerges from controlled topographic flow and contains one meaningful Atlas Point. The old Name Print remains a legacy asset until a later migration task replaces every production consumer.
4. **The visual system is code-driven.** Reusable SVG/CSS/Canvas primitives are preferred over generated scenic images. Static imagery may support editorial content but must not be required for brand recognition.
5. **Typography remains Fraunces / Instrument Sans / IBM Plex Mono.** Surname display typography is a brand asset and receives its own responsive rules.
6. **Evidence is a first-class visual language.** Claims connect to source, dataset, date, method and confidence without changing domain semantics.
7. **Semantic design tokens are the migration boundary.** Existing tokens remain operational while Brand System v1 is introduced additively; pages migrate in bounded follow-up tasks.
8. **Maps remain factual.** Existing public-domain geometry, no-data semantics and truth contracts are preserved. Decorative topography must never masquerade as data.
9. **Motion uses four verbs:** RESOLVE, LOCATE, UNFOLD, CONNECT. Reduced-motion support is mandatory.
10. **The system must be recognizable without the logo.** Dark plum spatial composition, editorial surname typography, restrained contour fields, Atlas Point, data traces and evidence coordinates form the larger identity.

## Consequences

- TASK-148 adds documentation, assets, semantic tokens, components, reusable graphics and a private brand lab.
- TASK-148 does not migrate all public pages.
- Later tasks may replace the existing scenic landing image, amber action accent and Name Print consumers after visual regression checks.
- Brand components may not derive research facts or introduce a second map-data model.
