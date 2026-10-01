# TASK-052 — The dusk site: every page, desktop and phone

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu` (`docs/progress/2026-10-01-dusk-landing-and-journey.md`).
- **Requested by:** the project owner, 2026-10-01. First "put it into the Next.js app", after choosing the dusk direction from the redesign mockups and approving its design system and coded prototype. Then, on the first build, which covered the landing and the surname page: "redesign the whole thing … replacing the current Name Atlas deployment, not creating the new one … apply the changes for the mobile and the desktop view … using the brand guidelines", with the dusk landing mockup attached.
- **Decision:** ADR-0021.
- **Milestone:** none in `PLAN.md`.
- **Depends on:** nothing new. The voivodeship geometry (`voivodeship-geometry.ts`) and the list-facts artefact already exist.
- **Model guidance:** implementation session.

## 1. Goal

The whole public site is the chosen design, on desktop and on a phone. The landing is the dusk hero of the owner's mockup: Poland as a lit landmass on the horizon under the search field. A submitted search brings the camera down into Poland and draws its voivodeship borders, and the surname page is the same world with its chapters read over it. Every other page sits under the same sky with the same header and footer. Every rule the pages already keep (ADR-0012's evidence at the foot, the claim unit, the two lists never summed, no figure without its date) is unchanged.

## 2. Facts (checked on `main` @ `fed0c7c`, 2026-10-01)

1. The web app renders Visual System v1, light only (D-020, resolved 2026-09-24). Its tokens are declared once in `design-tokens.ts` and mirrored in the single `:root` block of `globals.css`; `design-tokens.test.ts` fails on any difference, counts the map band rules, forbids a hex colour in TypeScript, and holds `layout.tsx`'s font imports and the share card's font files to `TYPE_FAMILIES`.
2. `result-view.test.ts` asserts the honesty rules against rendered markup, and that the result view hides nothing (`display: none`, `hidden`, `aria-hidden` are refused in it).
3. The landing (`app/page.tsx`) renders the headline, the search form (a `GET` form with the combobox island) and `atlas-field.tsx`, a decorative Atlas Thread, then the most common surnames and the landing atlas's plates.
4. Each page renders its own masthead: the Name Print mark, the product name and a language link. There is no site navigation, and no page explains the method on its own.
5. `/pl/porownaj` and `/en/compare` read `a` and `b` slugs only. Without them the page renders two sides that resolve to no surname; there is no way to pick two surnames on the page.
6. The share card (`og-card.tsx`) loads Newsreader, Inter and IBM Plex Mono from `apps/web/assets/fonts/` by name, and `display-metrics.ts` is generated from the Newsreader file.
7. TASK-051 (pull request #43) holds the next task number and ADR-0020; this task is 052 and its ADR is 0021.

## 3. In scope

- **The dusk tokens**, added to `design-tokens.ts` and the `:root` block under `dusk-*` names, with their contrast notes.
- **One scope on `<body>`**, that re-points the system's tokens (surfaces, text, rules, accent, confidence tints, the map ramp) at the dusk values, so existing components keep their markup and rules.
- **The brand's faces**: Fraunces (display, with its optical-size axis), Instrument Sans (interface) and IBM Plex Mono (data), through `next/font/google`; the share card's TTFs and `display-metrics.ts` regenerated from Fraunces.
- **The site shell** (`site-shell.tsx`, `site-nav.tsx`, `site-links.ts`): every page has the same header — the wordmark, the places (Atlas, Porównaj, Jak to działa), `PL | EN` — folding into a native disclosure menu on a phone; answer pages carry the search, compact, in the header; the footer is shared.
- **The world** (`dusk-world.tsx`, a client island): the sky gradient, the sun, the curved ground and Poland as points on a canvas inside the existing public-domain outline, with the sixteen borders as SVG paths. Hero mode on the landing; journey mode on answers, where the points follow the first `READY` distribution entry's `share_of_covered` values (`dusk-world-input.ts`) and the strict leader is lit, stepping back once the reader is past the first screen; quiet mode (the sky alone) on every other page.
- **The zoom** (`dusk-zoom.tsx`): a submitted search on the landing sets `data-dusk-zoom` on `<html>`, the stylesheet brings the camera down over 1.6 s and draws the borders, the status line says the register is being checked, and the plain `GET` search follows after 0.9 s (at once under reduced motion).
- **The landing**: the mockup's hero — the register line (the artefact's date, never a count), the headline, the lede, the search as a pill, the status line, the two promises — and below it, on the dusk ground, the most common surnames and the atlas plates. `atlas-field.tsx` and its styles are removed.
- **Every other page in the shell**: the surname page and the search page's other answers (journey), the comparison, contact, privacy, terms and not-found pages (quiet).
- **The comparison picker**: `/pl/porownaj` and `/en/compare` without both slugs show a form for two surnames; typed surnames become the pair's address by redirect (`compare-request.ts`). The surname page links to it with its own surname filled in.
- **How it works**: `/pl/jak-to-dziala` and `/en/how-it-works`, static, restating rules the product already keeps (`how-text.ts`).
- **Copy** in `messages.ts` for the above; `searchAction` becomes "Odkryj" / "Discover".
- ADR-0021; `docs/CODEMAP.md`; D-020's entry notes the supersession.

## 4. Out of scope

- Any change to claims, contracts or the result view's markup.
- A surname count in the register line: no claim gives a count of surnames across both lists, and the lists are never summed.
- An analysis checklist during the zoom: the product runs one request, so the status line says only that.
- The favicon and the mark's masters in `assets/brand/`: unchanged. The pages and the share card show the wordmark in type, as the mockup does.
- The sitemap: static pages are not listed in it today, and the new ones follow that rule.

## 5. Unknowns

- **U-1.** Resolved by the owner's second request: the design system's faces, Fraunces and Instrument Sans, are the brand's, and the share card's files follow them.

## 6. Acceptance criteria

- **AC-1.** The bare `/` renders the dusk hero with the world behind it and the status line empty; a submitted search sets `data-dusk-zoom` and still issues the `GET` to `/`.
- **AC-2.** `/pl/nazwisko/{slug}` and `/en/surname/{slug}` render in the shell with the world in journey mode; `Result`'s markup is unchanged.
- **AC-3.** `worldInput` takes the first ready entry's shares by TERC code, lights only a strict leader, and returns nothing for a surname without a ready distribution (unit test).
- **AC-4.** `design-tokens.test.ts` passes: one `:root` block equal to the token module, five map bands styled once each, no hex colour in TypeScript, the layout's faces and the share card's files equal to `TYPE_FAMILIES`.
- **AC-5.** Every page has the shared header with the page's place marked and the language switch to the same page in the other language (unit tests on the contact, legal, comparison and how-it-works pages).
- **AC-6.** The comparison route turns two typed surnames into the pair's address, keeps an untyped side in the form, and says which name gave no address (unit test).
- **AC-7.** The how-it-works pages have the same sections in both languages and never say a surname tells where a family lives or comes from (unit test).
- **AC-8.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 7. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```
