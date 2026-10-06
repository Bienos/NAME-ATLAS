# Design Tokens

Brand System v1 uses two layers.

## Layer A — foundation

Values live in `apps/web/src/lib/design-tokens.ts` and are mirrored in the single `:root` block of `globals.css`. Existing tests enforce exact parity.

Families added by TASK-147:
- `atlas-plum-*`
- `atlas-aubergine-*`
- `atlas-dusk-*`
- `atlas-ink-*`
- `atlas-ivory-*`
- `atlas-paper-*`
- `atlas-blue-*`
- `atlas-amber-*`
- status colours
- brand motion, spacing, radius and shadows.

## Layer B — semantic

`apps/web/src/design-system/brand-system.css` exposes semantic roles inside `.atlas-v1`:

- `--color-bg-primary`
- `--color-bg-secondary`
- `--color-bg-elevated`
- `--color-surface-*`
- `--color-text-*`
- `--color-border-*`
- `--color-accent-*`
- `--color-signal-atlas`
- `--color-signal-amber`
- confidence/map/chart roles.

Product components should consume semantic roles, not plum/blue numeric steps.

## Accessibility rule

The base Atlas Blue is a brand/action colour, not normal body text on Deep Plum. Dark-surface text links use the lighter accessible blue semantic token or an ivory link with blue focus/marker treatment.

## Migration rule

Do not rename old tokens globally in one pass. Each page family migrates into `.atlas-v1`, then legacy mappings can be removed after all consumers move.
