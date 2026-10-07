# 2026-10-07 — TASK-163: the Evolved Contour logo on the site

## What changed

- `apps/web/src/lib/brand-mark.tsx` (new): `BrandMark`, the five-contour N from `public/brand/logo/name-atlas-mark.svg` as inline SVG, `aria-hidden`, strokes in `currentColor`, the point in `--atlas-blue-500` (`.brand-mark-point`).
- `apps/web/src/lib/site-nav.tsx`, `apps/web/src/lib/site-footer.tsx`: the mark before the wordmark text.
- `apps/web/src/app/globals.css`: `.site-nav .wordmark` and `.dusk .footer-wordmark` are inline-flex with a gap; the mark is 1.35em.
- `apps/web/src/app/icon.svg`: the three-contour small cut on Deep Plum (as TASK-149 had it). `favicon.ico` (16, 32, 48) rendered from it and `apple-icon.png` (180) rendered from `public/brand/marks/app-icon.svg`, in headless Chromium.
- `tasks/163-logo-on-site.md`, `STATUS.md`.

## Verification (run in this session)

- `pnpm format:check`: "All matched files use Prettier code style!"
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm lint`: exit 0. `pnpm typecheck`: exit 0.
- `pnpm --filter ./apps/web test`: 108 files, 1204 tests passed. (A first run failed `design-tokens.test.ts` on a hand-written hex in `brand-mark.tsx`; the colour moved to the token.)
- `next dev`, Chromium: `/` at 1280 and 390 px and `/pl/jak-to-dziala` at 1280 px show the mark beside "Name Atlas" in the header; the footer shows it beside the footer wordmark.

## Not verified

- staging or name-atlas.pl after deployment; the favicon in a real browser tab and on an iOS home screen.
