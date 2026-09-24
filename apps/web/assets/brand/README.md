# Name Atlas — brand marks

**Name Print** is the Name Atlas mark, chosen on 2026-09-24. It is a fingerprint drawn as
map contour lines, ending on one point: identity and place in one shape.

The geometry is generated, not hand-drawn. It has seven open rings whose gaps drift
ring by ring (a whorl, never a target), round caps, and a dot at the centre of the
whorl. The component `src/lib/name-print.tsx` holds the same paths, so the pages and
the share card draw exactly these marks.

| File | Use |
| --- | --- |
| `name-print.svg` | Default. Ink rings, Atlas Blue point, on Paper. 48px and up. |
| `name-print-night.svg` | On Archive Night or any dark ground. Paper rings, Atlas Light Blue point. |
| `name-print-mono.svg` | One colour (Ink), for print, stamps and embossing. |
| `name-print-small.svg` | 16–32px. Three heavier rings, so it stays a fingerprint and not a smudge. |
| `name-print-small-night.svg` | The small version on dark grounds. |
| `name-print-app.svg` | App icon master. Paper rings on Atlas Blue, rounded square. |
| `icon-512.png` | App icon, 512 × 512, for stores and PWA manifests. |

The live favicon and touch icon are in `src/app/`: `icon.svg`, which switches to the
night colours when the browser is in dark mode, `apple-icon.png` (180 × 180) and
`favicon.ico` (16, 32 and 48). Next.js serves them automatically.

## Rules

- **Lockup:** the mark sits to the left of the wordmark "Name Atlas" (Newsreader
  Medium). The mark's height is about 1.35× the wordmark's cap height, with a gap of
  about a third of the mark's width.
- **Colour:** rings in `text-primary` and the point in `accent`. Never recolour the
  rings Atlas Blue on Paper, and never put the point in Signal Red except in
  campaign work.
- **Clear space:** at least the width of two rings on every side.
- **Don't** rotate it, stretch it, add rings, close the gaps, fill the rings, or put
  it inside a circle. The open whorl is the mark.
- **Minimum size:** 16px, using the small version below 48px.
