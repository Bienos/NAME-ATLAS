# TASK-163 — The Evolved Contour logo on the site

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-logo-on-site.md`).
- **Requested by:** the project owner, 2026-10-07: "can you apply this logo on website", after being shown the TASK-148 logo files (`apps/web/public/brand/logo/`).
- **Relation to TASK-149:** TASK-149 (reverted, #180) also put the mark in the header and changed the favicon, as part of moving every public page to Dark Atlas. This task brings back only the logo; the pages keep the dusk look.
- **Numbers:** TASK-163 (162 is on `main`, #194; 159 is in open #190). `pnpm check:ids` exit 0.

## In scope

- The Evolved Contour N beside the wordmark in the site header and the footer (`BrandMark`, inline SVG, decorative; the link's name stays "Name Atlas").
- The favicon (`icon.svg`, `favicon.ico`) and `apple-icon.png` (also the logo in the site's structured data) replaced by the TASK-148 marks.

## Out of scope

Any other page styling, the share and OG cards, the social images, the Dark Atlas migration.

## Acceptance

- **AC-1:** every page's header and footer show the mark before "Name Atlas", in the text colour with the Atlas Blue point.
- **AC-2:** the browser tab and home-screen icon are the Evolved Contour N on Deep Plum.

## Verification

`pnpm format:check`, `check:ids`, `lint`, `typecheck`, `--filter ./apps/web test`; the header and footer in Chromium at 390 and 1280 px.
