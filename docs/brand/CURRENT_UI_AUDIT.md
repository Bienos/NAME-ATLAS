# Current UI Audit — before Name Atlas Brand System v1.0

**Audit date:** 2026-10-06  
**Repository:** `Bienos/NAME-ATLAS`  
**Baseline:** `main` @ `13b0b407fae09416136b351de70729672ee28b78`  
**Target system:** **Evolved Contour — Dark Atlas**

This audit is intentionally implementation-focused. It records what is actually in the repository and separates what should be preserved from what the later visual migration should change.

## Executive finding

The product is **not starting from a light SaaS UI**. ADR-0021 and TASK-052 already moved every public page into a dark dusk shell. The strongest foundation is therefore reusable: the shared shell, Fraunces/Instrument Sans/IBM Plex Mono, the evidence-first contracts, the procedural Poland rendering, the map geometry and the existing token-drift test.

The main mismatch is that the current dusk implementation treats **amber as the global accent** and still uses a static generated dusk landscape on the landing. The approved Dark Atlas system instead needs **Atlas Blue to regain the primary digital/action/discovery role**, with amber narrowed to historical/geographic emphasis, and needs a broader code-driven graphic language built from the Evolved Contour mark rather than a scenic background.

## 1. Framework and styling architecture

### Current

- Monorepo with pnpm workspaces.
- Public product: `apps/web`.
- Next.js **16.3.5**, React **19.3.0**, TypeScript **5.9.x**.
- App Router.
- No Tailwind, CSS-in-JS framework or component library.
- One large global stylesheet: `apps/web/src/app/globals.css`.
- Brand and UI values are exposed as CSS custom properties.
- TypeScript token source: `apps/web/src/lib/design-tokens.ts`.
- `design-tokens.test.ts` requires the `:root` CSS token block to equal `TOKENS` exactly and rejects raw hex colours elsewhere in web TypeScript.

### Assessment

**Preserve.** The no-framework CSS approach is compatible with the requested system and avoids a needless styling-architecture rewrite.

**Modify carefully.** Brand System v1.0 should add a semantic layer under `src/design-system/` while keeping the existing token contract operational until page migration is complete.

## 2. Current colour system

### Light/root tokens

The root system still contains the original Paper/Ink/Atlas Blue values:

- Paper `#f3f0e8`
- Ink `#101413`
- Atlas Blue `#1e4fd7`
- light map ramp
- positive/warning/error states

### Dusk tokens

ADR-0021 added:

- `--dusk-surface: #1f071f`
- `--dusk-surface-raised: #32112a`
- `--dusk-surface-sunk: #170a17`
- warm ivory text
- amber family
- dusk line/border values
- dusk map ramp
- paper values for archival/share material

### Critical mismatch

`body.dusk` currently remaps:

```css
--accent: var(--dusk-amber);
--hover-blue: var(--dusk-amber-hover);
--confidence-verified: var(--dusk-amber);
```

and global dusk links are amber.

That was correct for ADR-0021’s “one accent means light” concept, but it conflicts with the newly approved hierarchy:

- **Atlas Blue = primary digital/action/discovery signal**
- **Amber = restrained historical/geographical emphasis**
- **Paper = rare archival/documentary contrast**

### Recommendation

Do **not** change these legacy remaps in this foundation task. Introduce the Brand System v1 semantic variables alongside them and migrate components/page scopes in a later dedicated task.

## 3. Typography

### Current

`layout.tsx` already loads:

- **Fraunces** — display/editorial
- **Instrument Sans** — UI
- **IBM Plex Mono** — evidence/data

with `latin-ext`, including Polish diacritics.

The repository also includes static TTFs for OG/share rendering:

- `Fraunces-Medium.ttf`
- `InstrumentSans-Regular.ttf`
- `InstrumentSans-SemiBold.ttf`
- `IBMPlexMono-Medium.ttf`

Each family has its OFL notice in `apps/web/assets/fonts/`.

### Assessment

**Preserve.** This already matches the approved system closely enough that changing families would add risk without solving a brand problem.

### Needed

- Formal semantic type scale.
- Surname-specific responsive sizing rules.
- Explicit metadata/coordinate styles.
- Rules for long/hyphenated names and Polish diacritics.
- OG/static-font implementation notes.

## 4. Logo / mark

### Current

The current master is **Name Print**:

- seven open contour/fingerprint rings
- central Atlas Blue point
- generated geometry in `src/lib/name-print.tsx`
- full and small cuts
- SVG masters in `apps/web/assets/brand/`
- used in favicon/touch assets
- not currently used in the shared site header

### Conflict

The approved identity is the **Evolved Contour N**, where the letter emerges from topographic flow rather than a fingerprint.

### Recommendation

- Add the Evolved Contour N as the Brand System v1 master under `apps/web/public/brand/`.
- Keep Name Print files in place as **legacy** until a migration task switches production favicon/header/OG assets.
- Do not silently overwrite old masters in this task.
- Reuse the concept of a single point, but redefine it explicitly as the **Atlas Point**.

## 5. Existing shell and layout

### Current

`SiteShell` provides one shared structure:

- `DuskWorld`
- `SiteNav`
- page `<main>`
- `SiteFooter`

World modes:

- `hero`
- `journey`
- `quiet`

`SiteNav` is semantic and responsive, with a native `<details>` mobile menu and optional compact search.

### Assessment

**Preserve.** The shell is a good migration boundary.

### Needed later

- Evolve the visual grid and brand nav styling through tokens/components.
- Add the new mark/lockup only when migration is approved.
- Do not rewrite nav semantics or account/product logic for brand reasons.

## 6. Hero / atmospheric world

### Current

There are two systems:

1. `landing-dusk.png` — generated scenic dusk artwork, loaded in the hero.
2. `dusk-world.tsx` — deterministic canvas/SVG rendering using Poland geometry and seeded points.

The procedural system is explicitly decorative and `aria-hidden`; it never invents data.

### Conflict

The approved system must not depend on a collection of generated scenic images and should feel like abstract terrain/cartography rather than mountain photography.

### Recommendation

- Preserve the deterministic/data-safe philosophy of `DuskWorld`.
- Add reusable SVG-based contour/topography primitives now.
- In the later homepage migration, retire `landing-dusk.png` from the hero and compose the atmosphere from code-driven terrain + typography + Atlas Point.
- Do not turn decorative topography into factual geography.

## 7. Maps and data visualisation

### Current

The repository has:

- generated public-domain voivodeship geometry
- deterministic five-band map scales
- separate no-data state
- hover/focus behavior
- tests around band count and semantics

### Assessment

**Preserve.** This is product truth, not decoration.

### Needed

- Brand System v1 semantic map tokens.
- Dark Atlas colour mapping that keeps “not listed” distinct from zero.
- Rules for selected/hover/focus/Atlas Point overlays.
- Chart tokens for distribution, rank, rarity and time series.

Do not create a second factual map engine inside the brand system.

## 8. Evidence / confidence / sources

### Current

The architecture already enforces:

- validated presentation objects only
- no UI-derived claims
- explicit confidence statuses
- sources/dates attached to facts
- rights and epistemic confidence as separate dimensions

### Assessment

**Preserve completely.**

Brand work should improve the visual grammar of evidence without changing any claim semantics.

### Needed

- Source/evidence UI primitives.
- A consistent visual connection between claim → dataset → date → method → confidence.
- Confidence styles that never rely on colour alone.
- Clear treatment of VERIFIED / LIKELY / POSSIBLE / UNCONFIRMED plus existing system states such as CONFLICTING and INSUFFICIENT_DATA where product contracts expose them.

## 9. Components and cards

### Current

The app has many feature-level React components in `src/lib`, but no dedicated reusable design-system component package.

The visual system also contains many existing card-like surfaces, especially around share/deck/report flows.

### Risk

A new component library that duplicates existing feature logic would create two competing frontends.

### Recommendation

Create **brand primitives and low-level UI components only** under `src/design-system/`. Feature pages continue using existing components until migration.

Cards remain conditional: use a bounded surface only when content behaves as a discrete object.

## 10. Motion

### Current

Existing motion is already limited and purpose-driven:

- search zoom
- scroll-linked landing sequences
- journey/world transitions
- reduced-motion support in the existing dusk experience

### Assessment

**Preserve philosophy.**

Brand System v1 should formalise four verbs:

**RESOLVE · LOCATE · UNFOLD · CONNECT**

and provide shared duration/easing tokens.

## 11. Light/dark assumptions

### Current

- Root tokens retain the old light system.
- Every page uses `body.dusk`.
- Reading surfaces can still use paper-like values where needed.

### Target

The product is now intentionally **85–95% dark**.

Light/cream is secondary and functional:

- archival/document preview
- selected information surface
- tooltips where contrast needs it
- export/print
- occasional editorial interruption

No generic white SaaS card field.

## 12. Hard-coded values and migration risk

### Strength

The web app already has a test banning raw TypeScript hex colours.

### Risk

`globals.css` is large and contains many component-specific values/sizing rules accumulated across more than one hundred tasks. A wholesale rewrite would be high risk and would mix visual migration with product behavior.

### Recommendation

Add a parallel Brand System v1 semantic layer first. Migrate page families in later bounded tasks.

## 13. What can remain unchanged

- Next.js/React architecture.
- `SiteShell` composition.
- Current font families.
- Product claim/evidence boundaries.
- Existing factual map geometry and source data.
- Search semantics and accessibility behavior.
- Existing feature routes.
- Existing Name Print files until migration.
- Static TTF workflow for OG/share.
- Existing tests guarding claims and map behavior.

## 14. What must change during later migration

- Amber-as-global-action-accent.
- Scenic generated hero image dependency.
- Legacy Name Print mark in favicon/brand masters.
- Page-specific/legacy visual values that bypass Brand System v1 semantic roles.
- Repetitive boxed/card layouts where content can live directly in the editorial canvas.
- Any dark treatment that reads as neon/cyberpunk rather than cartographic/editorial.

## 15. Deprecated after migration

Do not delete these in TASK-147; mark them for later removal after all consumers move:

- `apps/web/assets/brand/name-print*.svg`
- `apps/web/assets/brand/icon-512.png`
- `apps/web/public/images/landing-dusk.png`
- legacy dusk accent remap where `--accent` resolves to amber
- legacy brand-specific classes superseded by the new design-system components

## 16. Migration risk classification

| Area | Risk | Why |
|---|---|---|
| Add documentation/assets/tokens | SAFE | additive, no product behavior |
| Add `/dev/brand` | SAFE | internal route, no public product dependency |
| Add graphic primitives | SAFE | decorative, isolated |
| Replace header mark/styles | MODERATE | every route uses the shell |
| Re-map action accent amber → blue | MODERATE | many existing link/control states inherit `--accent` |
| Replace hero static image | MODERATE | responsive composition and existing search zoom |
| Migrate factual maps/charts | HIGH-RISK | data semantics, tests and accessibility |
| Migrate surname journey/deck/share studio | HIGH-RISK | interaction, download and evidence contracts |
| Rewrite all CSS at once | HIGH-RISK / REJECTED | unbounded visual + behavioral regression risk |

## 17. Recommended migration sequence

1. **TASK-147 — foundation:** docs, tokens, assets, primitives, component foundation, brand lab, migration map.
2. **Shell migration:** body/surface/action semantic tokens, nav/footer, new Evolved Contour mark.
3. **Homepage:** replace static scenic hero with reusable AtlasHero/topography system.
4. **Surname result:** typography, section rhythm, evidence modules, map styling.
5. **Secondary reading pages:** directory/blog/how/offer/legal/contact.
6. **Interactive products:** deck/share studio/report/account/tree/baby names.
7. **Asset cleanup:** remove legacy Name Print and `landing-dusk.png` only after no consumers remain.
8. **Regression pass:** visual, responsive, keyboard, screen reader, reduced motion and map differentiation.

## 18. Preflight conclusion

The approved Dark Atlas identity is compatible with the repository. The correct approach is **evolution, not replacement**:

**current dusk infrastructure → semantic Brand System v1 → staged page migration**

This task should therefore be additive and migration-oriented. It must not rewrite the entire public site.
