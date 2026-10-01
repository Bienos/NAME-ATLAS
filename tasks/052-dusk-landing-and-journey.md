# TASK-052 — The dusk landing and the surname journey

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu` (`docs/progress/2026-10-01-dusk-landing-and-journey.md`).
- **Requested by:** the project owner, 2026-10-01 ("put it into the Next.js app"), after choosing the dusk direction from the redesign mockups and approving its design system and coded prototype.
- **Decision:** ADR-0021.
- **Milestone:** none in `PLAN.md`.
- **Depends on:** nothing new. The voivodeship geometry (`voivodeship-geometry.ts`) and the list-facts artefact already exist.
- **Model guidance:** implementation session.

## 1. Goal

The public site looks like the chosen design: the landing is the dusk hero — Poland as a lit landmass on the horizon under the search field — a submitted search brings the camera down into Poland and draws its voivodeship borders, and the surname page is the same world with its chapters read over it. Every rule the pages already keep (ADR-0012's evidence at the foot, the claim unit, the two lists never summed, no figure without its date) is unchanged.

## 2. Facts (checked on `main` @ `fed0c7c`, 2026-10-01)

1. The web app renders Visual System v1, light only (D-020, resolved 2026-09-24). Its tokens are declared once in `design-tokens.ts` and mirrored in the single `:root` block of `globals.css`; `design-tokens.test.ts` fails on any difference, counts the map band rules, and forbids a hex colour in TypeScript.
2. `result-view.test.ts` asserts the honesty rules against rendered markup, and that the result view hides nothing (`display: none`, `hidden`, `aria-hidden` are refused in it).
3. The landing (`app/page.tsx`) renders the headline, the search form (a `GET` form with the combobox island) and `atlas-field.tsx`, a decorative Atlas Thread, then the most common surnames and the landing atlas's plates.
4. The surname page (`surname-page.tsx`) renders the masthead, the search, `Result` (snapshot, chapter links, four chapters, sources) and the actions.
5. TASK-051 (pull request #43) holds the next task number and ADR-0020; this task is 052 and its ADR is 0021.

## 3. In scope

- **The dusk tokens**, added to `design-tokens.ts` and the `:root` block under `dusk-*` names, with their contrast notes.
- **One scope, `.dusk`**, that re-points the system's tokens (surfaces, text, rules, accent, confidence tints, the map ramp) at the dusk values, so existing components keep their markup and rules.
- **The world** (`dusk-world.tsx`, a client island): the sky gradient, the sun, the curved ground and Poland as points on a canvas inside the existing public-domain outline, with the sixteen borders as SVG paths. Hero mode on the landing; journey mode on the surname page, where the points follow the first `READY` distribution entry's `share_of_covered` values (`dusk-world-input.ts`) and the strict leader is lit. No weights, no lit region.
- **The zoom** (`dusk-zoom.tsx`): a submitted search on the landing sets `data-dusk-zoom` on `<html>`, the stylesheet brings the camera down over 1.6 s and draws the borders, the status line says the register is being checked, and the plain `GET` search follows after 0.9 s (at once under reduced motion). The combobox's own submit behaviour is unchanged.
- **The landing**: the hero in the `.dusk` scope with the register line (the artefact's date, never a count), the existing headline and lede, the search as a pill, the hint, the status line and the three promises; below it, on Paper, the most common surnames, the atlas and the footer. `atlas-field.tsx` and its styles are removed.
- **The surname page**: the whole page in the `.dusk` scope, the world behind it in journey mode, the snapshot and each chapter one screen tall on desktop, the search compact in the masthead, the actions as ghost pills.
- **Copy**: `landingEyebrow`, `landingSearching`, `landingTrust`; `searchAction` becomes "Odkryj" / "Discover".
- ADR-0021; `docs/CODEMAP.md`; D-020's entry notes the supersession.

## 4. Out of scope

- The comparison, contact and legal pages, and the search page's unresolved answers: they stay on Paper until a later task.
- The share card (`og-card.tsx`) and its font files; the type faces (Newsreader, Inter, IBM Plex Mono) are unchanged.
- An analysis checklist: the product runs one request, so the status line says only that.
- Chapter-driven movement of the world on the surname page (dimming, moving left): the world stays at the right; the chapter's own choropleth and table carry the figures.
- Any change to claims, contracts or the result view's markup.

## 5. Unknowns

- **U-1.** The design system names Fraunces and Instrument Sans as stand-ins; the app keeps its own faces until the owner chooses, because the share card loads font files by name.

## 6. Acceptance criteria

- **AC-1.** The bare `/` renders the dusk hero with the world behind it and the status line empty; a submitted search sets `data-dusk-zoom` and still issues the `GET` to `/`.
- **AC-2.** `/pl/nazwisko/{slug}` and `/en/surname/{slug}` render in the `.dusk` scope with the world in journey mode; `Result`'s markup is unchanged.
- **AC-3.** `worldInput` takes the first ready entry's shares by TERC code, lights only a strict leader, and returns nothing for a surname without a ready distribution (unit test).
- **AC-4.** `design-tokens.test.ts` passes: one `:root` block equal to the token module, five map bands styled once each, no hex colour in TypeScript.
- **AC-5.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 7. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```
