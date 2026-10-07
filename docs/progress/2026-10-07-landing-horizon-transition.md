# 2026-10-07 — the landing's horizon dissolves into the ground

Owner request (no task file): make the passage from the landing's hero to the sections below smoother and more polished, in the same style.

## What changed

- `apps/web/src/app/globals.css`, presentation only:
  - The hero photograph no longer ends at a hard edge. Its last rows fade out (a mask on the image), past the hero's edge: `.site-hero .dusk-world` now clips across only (`overflow: clip visible`).
  - Below it, a thin scatter of lit points in a warm haze (`.dusk-horizon::before`, an inline SVG with fixed positions). No point stands for a value.
  - `.landing-atlas` draws its full-bleed ground with a border image that starts clear and closes over `min(38vh, 22rem)`, instead of a solid background and a spread shadow. Its layout is unchanged.
  - Scroll-driven motion, only under `prefers-reduced-motion: no-preference` and `@supports (animation-timeline: scroll())`, and never while the search zoom runs: the horizon sinks (individual `translate`/`scale`, so the zoom's `transform` is untouched) and dims while the points rise. Without support the fade is static.
- `STATUS.md`: "Last rewritten" line.

## Verification (run in this session, on `3dd8ae2` plus this change; rebased onto `d31d88d` and re-checked as below)

- `pnpm --filter web test`: 113 files, 1330 tests passed (after the rebase).
- `pnpm --filter web typecheck`: exit 0.
- `pnpm format:check`: all files pass. `pnpm lint`, `pnpm check:ids`, `pnpm --filter web build`: exit 0.
- `next dev` and headless Chromium screenshots of `/` at 1440×900 (scroll 0, 300, 600, 900), at 390×844 (0, 500, 800), and at 1440×900 with `reducedMotion: "reduce"` (500): no hard edge under the hero; with reduced motion the fade and points show still.

## Not verified

- Safari and Firefox (Firefox has no `animation-timeline` by default, so it gets the static fade). Not checked on staging or production.
- Integration and e2e suites were not run.
- The hero image is still 1677×938. It was not upscaled.
