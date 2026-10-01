# 2026-10-01 — TASK-052: the dusk site, every page

Scope authority: `tasks/052-dusk-landing-and-journey.md`. Decision: ADR-0021.

## What changed

- `apps/web/src/lib/design-tokens.ts`, `apps/web/src/app/globals.css`: 26 `dusk-*` tokens, in the module and the `:root` block; `TYPE_FAMILIES` is Fraunces, Instrument Sans and IBM Plex Mono. A dusk section at the foot of the stylesheet: `body.dusk` re-points the system's tokens, the world and its three modes, the zoom, the header and the phone menu, the search as a pill (hero and compact), the landing, the reading pages, the journey's chapters, the comparison picker, the footer and the phone rules. The Visual System v1 masthead, landing and Atlas field styles are removed.
- `apps/web/src/app/layout.tsx`: the three faces through `next/font/google`; `<body class="dusk">`.
- `apps/web/assets/fonts/`: Fraunces Medium and Instrument Sans Regular and SemiBold (with their OFL texts) replace Newsreader and Inter; IBM Plex Mono Medium is kept. `README.md` lists each file's source and SHA-256. `scripts/build-display-metrics.ts` and the regenerated `display-metrics.ts` measure Fraunces Medium.
- `apps/web/src/lib/og-card.tsx`: the share card on the dusk colours and faces, with the name in type.
- `apps/web/src/lib/site-shell.tsx`, `site-nav.tsx`, `site-links.ts` (new): one header, footer and world for every page.
- `apps/web/src/lib/dusk-world.tsx`, `dusk-world-input.ts` (with its test), `dusk-zoom.tsx` (new): the world in hero, journey and quiet modes; the surname's shares as its light; the zoom on a submitted search.
- `apps/web/src/app/page.tsx`: the landing is the mockup's hero, then the most common surnames and the atlas plates on the dusk ground; the search page's other answers are in the shell. `apps/web/src/lib/atlas-field.tsx` is removed.
- `apps/web/src/lib/surname-page.tsx`, `compare-view.tsx`, `compare-page.tsx`, `contact-page.tsx`, `legal-page.tsx`, `app/pl/porownaj/page.tsx`, `app/en/compare/page.tsx`: every page in the shell. The comparison gains a picker; `compare-request.ts` (new, with its test) turns two typed surnames into the pair's address.
- `apps/web/src/lib/how-text.ts`, `how-page.tsx` (with its test), `app/pl/jak-to-dziala/page.tsx`, `app/en/how-it-works/page.tsx`, `app/not-found.tsx` (new).
- `apps/web/src/lib/messages.ts`: the landing's copy as the mockup has it, the header's places and language names, the picker's and the 404's text; `searchAction` is "Odkryj" / "Discover".
- `apps/web/src/lib/search-form.tsx`: the pill, in a hero and a compact size. `list-atlas-sky.tsx`: plate I's canvas on the dusk colours. `voivodeship-map.tsx`: a comment.
- Tests brought to the new markup: `contact-page.test.ts`, `legal-page.test.ts`, `compare-view.test.ts` (the language switch is `PL | EN` with the language's name as its label), `result-view.test.ts` and `surname-fit.test.ts` (NOWAK's width in Fraunces: 3.883 em of advances less 5 × 0.04 em).
- `docs/adr/0021-dusk-visual-direction.md`, `docs/CODEMAP.md`, `docs/DECISIONS_NEEDED.md` (D-020 is superseded for the whole site), `STATUS.md`, this task's file.

## Verification (run 2026-10-01, on this branch)

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`: each exit 0.
- `pnpm test`: exit 0; `apps/web` 33 files, 330 tests passed. The first run on the whole-site code had 5 failures: the language-switch markup in three tests, NOWAK's width in Newsreader, and "comes from" in the how-it-works text. The tests were brought to the new markup and width, and the sentence was reworded.
- `pnpm build`: exit 0; the route list includes `/pl/jak-to-dziala` and `/en/how-it-works`.
- Read with headless Chromium at 1344 × 752 and at 390 × 844, against the app run locally without `DATABASE_URL`: `/`, `/?lang=en`, `/pl/porownaj` (the picker), `/pl/porownaj?a=nowak&b=kowalski` (both sides unresolved, as without a database), `/pl/jak-to-dziala`, `/pl/kontakt`, `/pl/prywatnosc` and a missing path (the 404 page). The phone menu was opened by a tap. Faults found and fixed on the way: the body's ground painted over the world (the shell is now its own stacking context); a generic section rule drew a line under the landing's header and above the contact page's title; the older comparison and profile footer widths outranked the shell's; the sticky chapter bar had no ground.
- The landing was compared by eye with the owner's mockup: the map's tilt and place, the headline's optical size, the lede's measure and the land's light were tuned to it.
- The zoom: a search typed and submitted on `/` was photographed at 0.15, 0.6, 1.1 and 1.8 s with the form's final `submit()` stubbed out. The words leave, the map comes up from the horizon (to the right on the desktop, centred on the phone) and the borders draw in; the status line reads "Sprawdzamy rejestr PESEL…".
- A surname page with data: production's `GET /api/v1/surname-results?surname=Nowak` response (HTTP 200) was rendered through `CanonicalSurnamePage` by a temporary local route, removed before commit, and read at both sizes. The snapshot, the chapters, the regional map and table and the sources render on the dusk ground; the world lights WIELKOPOLSKIE, the strict leader in that response, and steps back past the first screen.
- The share card for that response was rendered with `renderOgCard` to a PNG and read: Fraunces surname, Instrument Sans figures, the dusk ground.

## Not verified

- `pnpm test:integration` and `pnpm test:golden`: not run.
- The site on a real phone or in Safari or Firefox; every browser check above was Chromium.
- The pages on production: recorded on the merged pull request once deployed (`AGENTS.md` §8.5).
