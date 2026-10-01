# ADR-0021 — the dusk visual direction replaces Visual System v1 on the landing and the surname journey

- **Status:** Proposed. It is accepted when the project owner merges TASK-052's pull request.
- **Date:** 2026-10-01
- **Deciders:** the project owner chose the dusk direction from the redesign mockups of 2026-09-30 and 2026-10-01, approved its design system ("Name Atlas", the Dusk and Paper themes) and the coded prototype, and asked for it in the Next.js app (2026-10-01).
- **Supersedes:** D-020's resolution of 2026-09-24 ("light only"), for the landing page and the surname page. The Visual System v1 document (`docs/library/NAME_ATLAS_VISUAL_SYSTEM_v1(1).md`) is not edited; this ADR records what the site now does instead.
- **Relates to:** ADR-0012 (evidence at the foot), TASK-023 (the claim unit and the snapshot), TASK-034 (one set of tokens).
- **Code:** `apps/web/src/lib/design-tokens.ts`, `apps/web/src/app/globals.css` (the dusk section), `apps/web/src/lib/dusk-world.tsx`, `dusk-world-input.ts`, `dusk-zoom.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/lib/surname-page.tsx`.

## 1. Context

- The site rendered Visual System v1: Paper, Ink, Atlas Blue, light only (D-020). The owner asked for a redesign built from the product's purpose rather than the current look, chose the dusk direction (the last light over Poland, every surname a lit point) out of ten, and had it written up as a design system and built as a working prototype.
- The product's rules do not change with its look: every figure is a validated claim with its assessment word, source kind, scope and date; the evidence sits once at the foot of the page; the two register lists are never summed; a figure without its date is not a figure; the map is drawn only from a lawful regional dataset; confidence is a word and a symbol, never colour alone.
- The web app keeps its tokens in one place and tests the stylesheet against it (TASK-034).

## 2. Decision

1. **The dusk direction is the product's look for the landing page and the surname page.** A dark ground that is the sky at dusk, one accent that means light (amber), warm cream text, the register drawn as points on Poland's public-domain outline. The design system's tokens are added to `design-tokens.ts` under `dusk-*` names and mirrored in the stylesheet's `:root` block.
2. **One scope re-points the system's tokens.** `.dusk` sets `--surface-*`, `--text-*`, `--border-*`, `--accent`, the confidence tints and the map ramp to dusk values. Components keep their markup and rules; the result view's markup is unchanged, so its honesty tests hold.
3. **The world is atmosphere, not a figure.** The canvas is `aria-hidden`. Register points are placed at random inside the outline and carry no count. On the surname page the surname's own points follow the first `READY` distribution entry's `share_of_covered` values, keyed by TERC code, exactly as the chapter prints them with their source and date; the lit region is the strict leader, as the snapshot names it, and a tie lights nothing. One entry only, never a sum across lists. Without a ready distribution the world shows the register alone.
4. **The zoom is the one choreography.** A submitted search on the landing brings the camera from the horizon down to the map over 1.6 s and draws the sixteen borders; the status line says the register is being checked; the plain `GET` search leaves the page after 0.9 s, at once under reduced motion. No invented analysis steps: the product runs one request.
5. **Below the hero the landing stays on Paper.** The most common surnames, the atlas plates and the footer keep their ground, so the plates' own canvas and colours are untouched.
6. **The map ramp on dusk runs dim to lit**, lowest share darkest, with lightness rising at every step; "not listed" is the sunk ground with a muted hatch, never the palest band. The ramp was checked by hand against the dusk ground: the dataviz validator the Paper ramp was checked with models light surfaces only.
7. **Confidence keeps its symbols**; the tints are verified = amber, likely = ink, possible = soft ink, unconfirmed = muted ink, sources disagree = the dusk warning.
8. **What stays on Paper for now:** the comparison, contact and legal pages, the search page's unresolved answers, and the share card. The type faces are unchanged: the design system's Fraunces and Instrument Sans are stand-ins, and the share card loads the faces by name from files.

## 3. Why not the alternatives

- **Restyle every component by hand.** Two sets of rules for one component drift; re-pointing the tokens keeps one.
- **Move the result view into chapter screens of its own.** Its markup is what the honesty tests assert against; the chapters are laid out by the stylesheet instead.
- **An analysis checklist during the zoom.** The server does one lookup; ticking invented steps would be theatre.
- **Dark everywhere, now.** The plates and the comparison page have their own palettes and would need their own pass; they follow in later tasks.

## 4. Consequences

- `design-tokens.test.ts` holds the dusk tokens to the stylesheet like every other token.
- The landing no longer renders `atlas-field.tsx`; the file and its styles are removed.
- A later task may move the remaining pages into the scope, switch the faces (with the share card's files), and let chapters move the world.
