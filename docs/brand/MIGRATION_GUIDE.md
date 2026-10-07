# Migration Guide — current dusk site → Brand System v1.0

TASK-148 establishes the foundation. It does not claim the site migration is finished.

## Mapping

| Current | New | Risk |
|---|---|---|
| `--dusk-surface` | `--color-bg-primary` | SAFE |
| `--dusk-surface-raised` | `--color-bg-secondary/elevated` | SAFE |
| `--dusk-ink` | `--color-text-primary` | SAFE |
| global dusk amber `--accent` | Atlas Blue `--color-accent-primary` | MODERATE |
| Name Print | Evolved Contour N | MODERATE |
| `landing-dusk.png` | code-driven `AtlasHero` / contour system | MODERATE |
| existing factual map ramp | semantic map tokens preserving truth | HIGH-RISK |
| feature-level cards | surface hierarchy + component primitives | MODERATE/HIGH |
| evidence foot/meta | EvidenceCard / SourceCard grammar | HIGH-RISK |
| current search zoom | RESOLVE/LOCATE transition | MODERATE |

## Phase 1 — foundation

TASK-148:
- docs;
- semantic tokens;
- SVG masters;
- graphics;
- components;
- private brand lab.

No public-page migration.

## Phase 2 — shell

Move shared nav/footer/body onto `.atlas-v1`.

Key change: primary action/focus moves from amber to Atlas Blue. Verify every inherited link/control.

## Phase 3 — homepage

Replace the static scenic landing image with a deterministic abstract terrain composition.

Preserve:
- search semantics;
- no invented analysis steps;
- current claims and copy unless separately approved.

## Phase 4 — surname result

Migrate:
- surname type hierarchy;
- source/evidence modules;
- distribution map styling;
- history/timeline;
- rare paper surfaces.

Do not alter DTOs/claims.

## Phase 5 — secondary pages

Directory, blog, how-it-works, offer, legal/contact.

## Phase 6 — interaction-heavy products

Deck, share studio, report/PDF, account/tree, couple, baby names.

These are high-risk because visual components interact with download/session/data behavior.

Migrated: the baby-names single-name page family (TASK-151, 2026-10-06; `apps/web/src/lib/baby-names-page.tsx`, rules under `.baby-names.atlas-v1`), and its share sheet and share cards (TASK-152, 2026-10-06; `baby-names-share-page.tsx` in the same scope; `baby-names-share-card.tsx` draws the cards with `next/og` from the semantic tokens' values, Atlas Blue for the lit point, amber for the peak bar alone). The baby-names list page is not.

Migrated: the account's pages, sign-in steps and account dashboard (TASK-153, 2026-10-07; `apps/web/src/lib/account-page.tsx`, `account-dashboard.tsx`, rules under `.account-shell.atlas-v1`). The tree's pages are not; they keep the shared `.account…` rules.

Migrated: the baby-names comparison of two first names (TASK-158, 2026-10-07; `apps/web/src/lib/baby-names-compare-page.tsx`, rules under `.baby-names.atlas-v1 .bnc-…`): Atlas Blue for the submit and the focus ring, the two chart series in `--chart-current` and `--chart-context`, no amber on the page.

## Phase 7 — cleanup

Only after no consumer remains:
- remove Name Print legacy masters;
- remove scenic hero image;
- remove legacy amber global-accent mapping;
- remove superseded styles.

## Regression gates

For every phase:
- desktop + mobile;
- keyboard;
- reduced motion;
- screen reader smoke;
- contrast;
- no-data map behavior;
- long Polish surnames;
- OG/share output where affected;
- existing truth/honesty tests.
