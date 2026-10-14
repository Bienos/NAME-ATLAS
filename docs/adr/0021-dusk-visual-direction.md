# ADR-0021 — the dusk visual direction replaces Visual System v1 across the site

- **Status:** Proposed. It is accepted when the project owner merges TASK-052's pull request.
- **Date:** 2026-10-01
- **Deciders:** the project owner chose the dusk direction from the redesign mockups of 2026-09-30 and 2026-10-01, approved its design system ("Name Atlas", the Dusk and Paper themes) and the coded prototype, asked for it in the Next.js app, and then asked for the whole site, desktop and phone, to replace the current deployment (2026-10-01).
- **Supersedes:** D-020's resolution of 2026-09-24 ("light only"). The Visual System v1 document (`docs/library/NAME_ATLAS_VISUAL_SYSTEM_v1(1).md`) is not edited; this ADR records what the site now does instead.
- **Relates to:** ADR-0012 (evidence at the foot), TASK-023 (the claim unit and the snapshot), TASK-034 (one set of tokens).
- **Code:** `apps/web/src/lib/design-tokens.ts`, `apps/web/src/app/globals.css` (the dusk section), `apps/web/src/app/layout.tsx`, `apps/web/src/lib/site-shell.tsx`, `site-nav.tsx`, `dusk-world.tsx`, `dusk-world-input.ts`, `dusk-zoom.tsx`, `og-card.tsx`.

## 1. Context

- The site rendered Visual System v1: Paper, Ink, Atlas Blue, light only (D-020). The owner asked for a redesign built from the product's purpose rather than the current look, chose the dusk direction (the last light over Poland, every surname a lit point) out of ten, and had it written up as a design system and built as a working prototype.
- The product's rules do not change with its look: every figure is a validated claim with its assessment word, source kind, scope and date; the evidence sits once at the foot of the page; the two register lists are never summed; a figure without its date is not a figure; the map is drawn only from a lawful regional dataset; confidence is a word and a symbol, never colour alone.
- The web app keeps its tokens in one place and tests the stylesheet against it (TASK-034).

## 2. Decision

1. **The dusk direction is the product's look on every page.** A dark ground that is the sky at dusk, one accent that means light (amber), warm cream text, the register drawn as points on Poland's public-domain outline. The design system's tokens are added to `design-tokens.ts` under `dusk-*` names and mirrored in the stylesheet's `:root` block.
2. **One scope re-points the system's tokens.** The `dusk` class on `<body>` sets `--surface-*`, `--text-*`, `--border-*`, `--accent`, the confidence tints and the map ramp to dusk values. Components keep their markup and rules; the result view's markup is unchanged, so its honesty tests hold.
3. **The brand's faces are the site's.** Fraunces for display, with its optical-size axis (the landing's headline uses the text cut, as the mockup does), Instrument Sans for the interface, IBM Plex Mono for data. The share card's files and the snapshot's measured widths follow them.
4. **One shell for every page.** The same header (the wordmark in type, the three places, `PL | EN`), a phone menu that is a native disclosure and needs no script, and the shared footer. The world sits behind every page in one of three modes: hero on the landing, journey on an answer, quiet (the sky alone) on reading and form pages.
5. **The world is atmosphere, not a figure.** The canvas is `aria-hidden`. Register points are placed at random inside the outline and carry no count. On an answer the surname's own points follow the first `READY` distribution entry's `share_of_covered` values, keyed by TERC code, exactly as the chapter prints them with their source and date; the lit region is the strict leader, as the snapshot names it, and a tie lights nothing. One entry only, never a sum across lists. Without a ready distribution the world shows the register alone. Past the first screen the world steps back, so a chapter is never read over two maps.
6. **The zoom is the one choreography.** A submitted search on the landing brings the camera from the horizon down to the map over 1.6 s and draws the sixteen borders; the status line says the register is being checked; the plain `GET` search leaves the page after 0.9 s, at once under reduced motion. No invented analysis steps: the product runs one request.
7. **The register line carries a date, never a count.** No claim gives a number of surnames across both lists, and the lists are never summed, so the mockup's "598 476 nazwisk" is not shown.
8. **The map ramp on dusk runs dim to lit**, lowest share darkest, with lightness rising at every step; "not listed" is the sunk ground with a muted hatch, never the palest band. The ramp was checked by hand against the dusk ground: the dataviz validator the Paper ramp was checked with models light surfaces only.
9. **Confidence keeps its symbols and words**; the tints are verified = amber, likely = ink, possible = soft ink, unconfirmed = muted ink, sources disagree = the dusk warning. The design system's four-segment confidence bar is not used: it reads as a quantity, and the product shows confidence as a word and a symbol with no number or percentage (ADR-0012; canonical/16 §35 transmits no internal probability).

## 3. Why not the alternatives

- **Restyle every component by hand.** Two sets of rules for one component drift; re-pointing the tokens keeps one.
- **Move the result view into chapter screens of its own.** Its markup is what the honesty tests assert against; the chapters are laid out by the stylesheet instead.
- **An analysis checklist during the zoom.** The server does one lookup; ticking invented steps would be theatre.
- **Keep the Name Print mark in every header.** The chosen mockup sets the name in type alone. The mark's geometry (`name-print.tsx`), its masters and the favicon are kept, so it can return without redrawing.

## 4. Consequences

- `design-tokens.test.ts` holds the dusk tokens to the stylesheet like every other token, and the faces to the layout and the share card.
- The landing no longer renders `atlas-field.tsx`; the file and its styles are removed.
- The comparison gains a picker and the site a how-it-works page; both restate rules the product already keeps.
- The Paper tokens stay in the module and the `:root` block, under the names the dusk scope re-points.

## 5. Landing refinement, 2026-10-02

The owner supplied the polished `15-landing-zmierzch.png` reference and requested that the landing match it. The hero now uses a text-free background made from that reference with the built-in image generator: the plum sky, sunset, curved ground and lit Poland outline. It is stored at `apps/web/public/images/landing-dusk.webp`, loaded through `next/image` with a preload and responsive optimization, and excluded from the accessibility tree. The headline, description, navigation and search remain HTML. No number is inferred from the illustration; the register line still follows decision 7.

The landing's header shows the reference's three primary links. The offer remains in the phone menu, second screen and footer. The hero's spacing, cream typography and translucent search pill follow the reference; on a phone the scene occupies the lower part of the hero so the Poland outline fits. The illustration fades into the existing canvas world when a search starts. Journey and reading pages retain their existing world and data behavior; reduced motion still submits without the hold.
