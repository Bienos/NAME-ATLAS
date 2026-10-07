# 2026-10-07 — TASK-169: the family surnames view

Task: `tasks/169-family-surnames.md`, which was the draft `tasks/drafts/family-surnames-stateless.md`. The project owner approved its scope and §13 U-1–U-6 on 2026-09-30 and confirmed it on 2026-10-07.

## Numbering

First numbered TASK-163 against `main` at `f753f4e`. Before this pull request merged, `main` took 163 (the logo, #195), 164, 166 and 168, and open pull requests hold 165 (#196) and 167 (#201). The branch was rebased onto `origin/main` (`ae14c98`) and the task renumbered TASK-169, the next number free on `main` and in open pull requests. The draft was moved with `git mv` and its content kept; only the title, status and numbers lines changed. `pnpm check:ids` → exit 0.

## Preconditions (§4), confirmed in preflight

- **§4.2 holds.** The response carries `surname.id`, the surname UUID (`publicSurnameIdentitySchema`, present exactly when `RESOLVED`). AC-07 merges on it. The contract still has no slug (ADR-0009's Consequences). AC-15 therefore links with `result-view.tsx`'s existing `href(display_name, lang)`. That is `/?surname=NOWAK` (`&lang=en`), and the search redirects it to the surname's **stored** address (`currentPathFor`). This is the same link the result page already uses for suggestions and neighbours. A slug recomputed from the display form would be wrong for the 850 surnames whose slug carries a collision suffix (`lib/slug.ts`). No contract change.
- **§4.4 holds.** `result-view.tsx` imports nothing server-only. Its exported chapters (`Population` with an `anchor` prop, TASK-100) and `Result` render in a `"use client"` component. The build compiled the page, and Chromium rendered it from the endpoint's JSON (e2e below).
- §4.1, 4.3, 4.5 and 4.6: as the task states. No browser caller of `/api/v1/surname-results` existed, so no caller sends `surface=FREE`, and this page sends `surname` alone (AC-02).

## What was built

- `apps/web/src/lib/family-surnames-state.ts` (pure): up to 4 inputs, the four fixed labels, the submission (non-blank inputs, as typed), the per-input outcome (`LOADING`, `RESULT`, `INVALID`, `RATE_LIMITED`, `ERROR`) and the cards. Cards are merged by returned id only and kept in input order, with nothing computed across them.
- `apps/web/src/lib/family-surnames-lookup.ts`: one `fetch(url)` per input, with no init object, and `fetch` injected. It maps 200, 400, 429 and other statuses or a network failure to an outcome. A 200 must pass `surnameResultResponseSchema`; otherwise it is an error, never "unknown".
- `apps/web/src/lib/family-surnames-view.tsx`: the cards and the AC-11 notice. A resolved card shows the surname page's own `Population` chapter, under a per-card id, and the link. Unresolved and ambiguous cards show `Result`'s own state. Invalid, error and rate-limited cards show their own message, and the last two have a retry for that card only.
- `apps/web/src/lib/family-surnames-client.tsx`: the client island. It holds memory only and has no `<form>`, because a form submitted before hydration would put the surnames into the query string.
- `apps/web/src/lib/family-surnames-page.tsx`, `app/pl/nazwiska-w-rodzinie/page.tsx`, `app/en/family-surnames/page.tsx`: static pages with `robots: noindex, nofollow`. They are in no sitemap and linked from nowhere.
- `apps/web/src/design-system/family-surnames.css`, imported in `app/layout.tsx`: styles for the fields and cards, from existing tokens, scoped to `main.family.atlas-v1`. §6 does not list a stylesheet. Without one the inputs rendered as bare browser controls and the cards ran together (seen in a screenshot), so the page was not usable as built. No other style changed.
- `messages.ts`: the page's strings, Polish and English (U-2, U-4, AC-11 wording as proposed).
- Records: `PRODUCT.md` §5 (one paragraph, U-1), `docs/CODEMAP.md`, `STATUS.md`, this file.

Not changed: `packages/` (no contract or migration change), `middleware.ts`, `lib/events.ts`, TASK-025's files, any route handler, `pnpm-lock.yaml`. No dependency was added.

## Tests

- `apps/web/src/lib/family-surnames.test.ts` has 36 tests, all pure and in the `node` environment. They cover AC-01, AC-07, AC-08 / §10, AC-10, AC-12 and AC-14's label set. A `fetch` spy covers AC-02, AC-03 and AC-04: one GET per non-empty input, `surname` the only parameter, no label in any URL or argument, and `fetch` given the URL alone. A source scan of the 7 new source files covers AC-05 / §9.3: `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `cookies()`, `pushState`, `replaceState`, the router or `redirect`, search-parameter APIs, `location` writes, and `<form`. The scan also checks that the only network call is the lookup. Other tests cover §9.4 (each route folder holds `page.tsx` alone) and AC-13 (no dynamic segment, no sitemap source names a route). Mutation check: with `localStorage` and `history.pushState` appended to the client file, the two matching tests failed. After the file was restored they passed.
- `apps/web/src/lib/family-surnames-view.test.ts` has 23 tests, rendered with `renderToStaticMarkup` in the `node` environment as TASK-017's view tests are, so no new test dependency. They cover AC-06, AC-09, §10, AC-10, AC-11, AC-13, AC-14 and AC-15. AC-06: `autocomplete="off"`, `name="surname-1…"`, the generic prompt, no "rodowe", "panieńsk", "maiden" or "nazwisko matki". AC-09: the card's count chapter is `Population`'s own, and each count's claim (statement, assessment, source, scope, date) is byte-identical to the one on the full result page; a surname with no count shows the absence, not 0. AC-10: two cards render exactly as the notice plus each card rendered alone. AC-14: four options plus "no label", no textarea, no form. AC-15: the link through the search, and no offer, price, checkout, share or card route in the markup.
- `tests/e2e/specs/family-surnames.spec.ts` (`tests/e2e` exists): three surnames, the third request aborted, give two results (NOWAK, WIŚNIEWSKI) and one error card with retry. The address stays `/pl/nazwiska-w-rodzinie` with no query, three requests are made, each with only `surname`, and none carries the label chosen.

## Verification (§15), run 2026-10-07 on this branch

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm check:ids` | exit 0, "every task, ADR, migration and decision number is used once" |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0, "All matched files use Prettier code style!" |
| `pnpm test` | exit 0; `apps/web` 1314 tests passed (re-run after the rebase onto `ae14c98`); every other package passed |
| `pnpm build` | exit 0; `/pl/nazwiska-w-rodzinie` and `/en/family-surnames` prerendered as static (`○`) |
| `pnpm test:integration` | exit 0; 547 tests passed (after the rebase) |
| `pnpm test:e2e` | exit 0; 12 passed (the new spec on desktop and phone, plus the 5 journey tests on each) |

Limits:

- Docker is not available in this session. `test:integration` ran with `TEST_DATABASE_URL` against the session's local PostgreSQL 16, with `postgresql-16-postgis-3` installed by `apt` for the run, not against the pinned Testcontainers image. A first run without PostGIS failed at migration 0001 ("extension postgis is not available"). That failure was the environment, not this change.
- `test:e2e` ran against `pnpm db:migrate` and `pnpm e2e:seed` into the same local server, with `PLAYWRIGHT_CHROMIUM=/opt/pw-browsers/chromium`.
- `pnpm test:golden` was not run. §15 does not list it, and nothing it covers changed.
- Not verified: CI on GitHub, staging, and production. The page was checked by screenshot on a local `next start` at 1280 px and 390 px only.

## Not done, by design

- **The U-6 privacy sign-off was given by the project owner on 2026-10-07, in this session, after the build** (answer: "I sign off §9 now; merge"). It confirms §9 and accepts the residual IP/timing correlation risk of §5. Before signing, the owner was told that the page sends no event of its own and that, like every page, it is counted by Google Analytics 4 (consent-gated cookies) and Vercel Web Analytics as a page view of an address that carries no surname. Production still changes only when the owner runs the Release workflow (ADR-0039).
- No link to the page from navigation, the landing or the sitemap. No `robots.txt` change: the page carries `noindex`, and §6 asks for nothing more.
- §9.5 and §9.6 (a future event or session replay) apply to later tasks only.
