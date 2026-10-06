# Name Atlas production brand assets

Brand System: **Evolved Contour — Dark Atlas**.

## Logo

- `logo/name-atlas-primary-dark.svg` — stacked lockup on Deep Plum.
- `logo/name-atlas-primary-light.svg` — stacked lockup on Paper.
- `logo/name-atlas-horizontal-dark.svg` — horizontal lockup on Deep Plum.
- `logo/name-atlas-horizontal-light.svg` — horizontal lockup on Paper.
- `logo/name-atlas-mark.svg` — monochrome/currentColor-compatible mark.
- `logo/name-atlas-mark-dark.svg` — Warm Ivory + Atlas Blue.
- `logo/name-atlas-mark-light.svg` — Ink + Atlas Blue.
- `logo/name-atlas-mark-32.svg` — 3-contour small cut.
- `logo/name-atlas-mark-16.svg` — 2-contour favicon cut.
- `logo/name-atlas-monochrome.svg` — print/stamp/emboss master.

These are clean SVG geometry with no embedded raster, gradients or filters.

The old `apps/web/assets/brand/name-print*` files are legacy assets and are intentionally not deleted in TASK-147.

Raster exports are not checked in by TASK-147 because the SVG is the production master and no current consumer requires duplicate PNGs. Generate raster derivatives only for a concrete platform/export requirement.

## Other assets

- `primitives/atlas-point.svg`
- `contours/contour-field-a.svg`
- `topography/topographic-crop-a.svg`
- `icons/` brand-specific semantic icons
- `marks/app-icon.svg`
- `social/og-master.svg`, `social/square-1080.svg`, `social/portrait-1080x1350.svg`, `social/story-1080x1920.svg`
- `print/research-card-master.svg`, `print/report-cover-master.svg`

Decorative contour/topography assets do not encode research data.
