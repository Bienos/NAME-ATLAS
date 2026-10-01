# 2026-10-01 — TASK-052: the dusk landing and the surname journey

Scope authority: `tasks/052-dusk-landing-and-journey.md`. Decision: ADR-0021.

## What changed

- `apps/web/src/lib/design-tokens.ts`, `apps/web/src/app/globals.css`: 26 `dusk-*` tokens, in the module and the `:root` block; a dusk section at the foot of the stylesheet with the `.dusk` scope (the system's tokens re-pointed), the world, the zoom states, the landing's hero and its Paper remainder, the search as a pill, the journey's chapters and phone rules. The Atlas field's styles are removed.
- `apps/web/src/lib/dusk-world.tsx` (new, client): the sky, sun, ground and Poland as points on a canvas inside the public-domain outline, with the borders as SVG paths; hero and journey modes.
- `apps/web/src/lib/dusk-world-input.ts` (new) and its test: the first ready distribution entry's shares by TERC code and the strict leader; nothing otherwise.
- `apps/web/src/lib/dusk-zoom.tsx` (new, client): a submitted search sets `data-dusk-zoom`, fills the status line, and lets the `GET` leave after 0.9 s (at once under reduced motion).
- `apps/web/src/app/page.tsx`: the bare landing is the dusk hero (register line, headline, lede, the pill, hint, status line, the three promises) over the world; the lists, atlas and footer below on Paper. Other answers on `/` are unchanged.
- `apps/web/src/lib/surname-page.tsx`: the page in the `.dusk` scope with the world in journey mode fed by `worldInput`.
- `apps/web/src/lib/messages.ts`: `landingEyebrow`, `landingSearching`, `landingTrust`; `searchAction` is "Odkryj" / "Discover".
- `apps/web/src/lib/atlas-field.tsx`: removed.
- `docs/adr/0021-dusk-visual-direction.md`, `docs/CODEMAP.md`, `docs/DECISIONS_NEEDED.md` (D-020 notes the supersession), `STATUS.md`.

## Verification (run 2026-10-01, on this branch)

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`: each exit 0.
- `pnpm test`: exit 0; `apps/web` 31 files, 321 tests passed (one new file, `dusk-world-input.test.ts`).
- `pnpm build`: exit 0 for every workspace; `apps/web` builds its routes as before.
- The built app was started locally without `DATABASE_URL` and read with headless Chromium: `/` answers 200 and renders the dusk hero with the register line "Rejestr PESEL · 20 stycznia 2026 r.", the headline, the pill, the hint, an empty status line and the three promises, the world behind them, the masthead above (desktop 1200 px and phone 390 px); `/pl/nazwisko/nowak` answers 200 and renders the unavailable notice inside the dusk scope with the world at the right. A first render had the masthead under the world; the world is now `z-index: -1` inside the scope.

## Not verified

- The zoom in a real browser session: a submitted search and the `GET` that follows after the hold. The mechanism is the same attribute-and-stylesheet one as the coded prototype, which was exercised.
- A surname page with data (the local run had no database), so the world's weighted points and the lit region were exercised only by the unit test; the chapters' styling on real figures was seen only on the prototype.
- Production, which has not deployed since #42 (see `STATUS.md`).
