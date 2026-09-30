# 2026-09-30 — TASK-040: the family surnames view

Scope authority: `tasks/040-family-surnames-stateless.md`, the draft approved on 2026-09-30 and numbered TASK-040 when the project owner scheduled it the same day.

## Changed

- **Two routes, both static and `noindex, nofollow`:** `/pl/nazwiska-rodzinne` and `/en/family-surnames` (`apps/web/src/app/{pl/nazwiska-rodzinne,en/family-surnames}/page.tsx`). Neither reads a parameter. `next build` lists both as `○` (prerendered static content).
- **`apps/web/src/lib/family-state.ts`** is the pure state module. It holds the four fixed slots (U-3) and the four fixed labels (U-4), and decides which inputs cause a request. It builds the request path (`surname` only) and maps an HTTP status and body to a card state (§10). It merges cards **only** on the `surname.id` the endpoint returns (AC-07). It uses no React, no `fetch` and no browser API.
- **`apps/web/src/lib/family-card.tsx`** renders one card and holds `FAMILY_METADATA` and the two paths.
  - A resolved card renders each count, 1-in-X and regional figure through the page's own `Claim` unit and its own accepted sentences, with the coverage warning as the claim's lead.
  - An unresolved or ambiguous card renders the result view's own `Result`.
  - The card sees only its own props, so nothing can be computed across surnames.
- **`apps/web/src/lib/family-view.tsx`** is the client component (`"use client"`). It sends one `fetch(path)` per non-empty input, with no second argument.
  - It has no `<form>` element. A form submitted before the script loads would put the typed surnames into the page's query string.
  - Spellcheck and autocorrect are off on the inputs.
  - Answers to an older "Show results" are dropped. Retry re-fetches that card only.
- **`apps/web/src/lib/messages.ts`** gains the page's strings in Polish and English. They are the decided prompt (U-2), labels (U-4) and notice (AC-11), plus words for loading, rate-limited, retry and the link.
- **`apps/web/src/app/globals.css`** gains a `family surnames (TASK-040)` section that uses existing tokens only.
- **Tests:** `family-state.test.ts` (23) and `family-view.test.ts` (48).
- **Docs:**
  - The draft moved to `tasks/040-family-surnames-stateless.md`, and only its header changed. `tasks/drafts/` is now empty and removed.
  - `PRODUCT.md` §5 gained one line (U-1).
  - `docs/CODEMAP.md` and `STATUS.md` were updated.
- **Not changed:** anything under `packages/`, any migration, any route handler, `middleware.ts`, `lib/events.ts`, TASK-025's files, and `pnpm-lock.yaml`. No dependency was added.

## Preconditions (§4), confirmed in preflight

1. **Facts exist.** Holds.
2. **Stable identity.** Holds through `surname.id`, a UUID, which `publicSurnameIdentitySchema` carries on every resolved response. The contract still has **no slug** (its comment cites TASK-006 §15 U-2).
   - AC-07's merge uses the id.
   - AC-15's link does not need a slug and needs no contract change. It uses the result view's existing `href()` (`/?surname=<display_name>[&lang=en]`), the link its suggestions already use. The search page answers a resolved query with a redirect to the surname's stored canonical address.
   - Checked against the built app: `/?surname=NOWAK` answered `307 → /pl/nazwisko/nowak`, and `/?surname=WÓJCIK&lang=en` answered `307 → /en/surname/w%C3%B3jcik`.
3. **Browser-callable endpoint.** Holds.
4. **Client-renderable view components.** Holds. `claim.tsx`, `messages.ts`, `result-view.tsx` and `snapshot.tsx` import only React and contract types, with no server-only module. `Snapshot` was **not** reused, because it hard-codes `id="today"` and four cards would repeat that id.
5. **Rate limit.** Holds. The middleware's 429 is plain text, so the card state is decided by status alone.
6. **Decisions.** Met.

## Found by running the built page, and fixed

**The browser added `Referer: …/pl/nazwiska-rodzinne` to every lookup.** That one header marks a request as a family-view lookup and lets an access log group a visitor's surnames as family, which breaks AC-04 and §9 item 2.

- No `fetch` spy can see it, because the browser adds it. It was found by driving the built page in Chromium and recording every request's headers.
- **Fixed** with `referrer: "no-referrer"` in `FAMILY_METADATA`, which renders `<meta name="referrer" content="no-referrer">`.
- Asserted by a unit test. Re-checked in Chromium after the rebuild: no request carried a `Referer`.

## Verified

Run on the final tree, on this branch built on `origin/main` @ `fefd78b` (Merge #28).

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed. `pnpm-lock.yaml` unchanged. |
| `pnpm check:ids` | Passed: "every task, ADR, migration and decision number is used once". |
| `pnpm typecheck` | Passed, every package. |
| `pnpm lint` | Passed, no findings. |
| `pnpm format:check` | Passed: "All matched files use Prettier code style!" |
| `pnpm test` | Passed: 1,202 tests. `apps/web` has 301, up from 230: 23 in `family-state.test.ts`, 48 in `family-view.test.ts`. |
| `pnpm build` | Passed. The final run printed "✓ Compiled successfully" for `apps/web` and `apps/admin`, and lists both new routes as `○` static. An earlier run of the same command in this session printed "Compiled with warnings". Its one warning's import trace was Next's own (`next/dist/esm/server/web/exports`, reached through the middleware) and named none of this change's files. |
| `pnpm test:integration` | Passed: 26 files, 310 tests. Run against a local PostgreSQL 16 with PostGIS 3.4.2 (`postgresql-16-postgis-3`) through `TEST_DATABASE_URL`. Docker is unavailable in this environment, so the pinned container image was not exercised. |

**Mutation checks.** Each was applied, run and reverted:

- Adding a header to the real `fetch` call failed "calls the real fetch with a single argument too".
- Adding a `localStorage` write failed the AC-05 source scan for `family-view.tsx`.

**Built app in Chromium** (Playwright 1.56.1, headless Chromium 141). The server was `next start` over a local database. It held the committed 22- and 23-row national fixture excerpts, imported through `importPeselResource` with their own checksums, as the integration suite imports them. Population claims were derived for NOWAK, KOWALCZYK and WÓJCIK with `pnpm demo:surname`. The throwaway seed script was deleted.

- **At 390 px, in Polish:** the inputs held `Nowak` (Strona ojca), `NOWAK` (Strona matki), `Kowalska-Nowak` (Twoje nazwisko) and `Błąd` (Inne), and the lookups were started with Enter. `Błąd` was forced to a 503 with a route stub.
  - Five GETs: one per input, plus one retry.
  - Each carried only `surname`, had no body, and matched none of the eight label strings.
  - After the fix, each carried only the browser's own `accept`, `user-agent` and `sec-ch-ua*` headers.
  - Three cards appeared: NOWAK (both inputs merged, both labels listed), `Kowalska-Nowak` (unresolved, sent unsplit, with the contract's suggestion KOWALSKA), and `Błąd` (error with retry). The retry re-fetched that card only.
  - The page URL was unchanged, `localStorage` and `sessionStorage` were empty, `document.cookie` was empty, and `robots` was `noindex, nofollow`.
- **At 1280 px, in English:** two cards (WÓJCIK, KOWALCZYK), each count with its scope, date, publisher and assessment.

## Not verified

- **The end-to-end path of §11.** `tests/e2e` does not exist, so none was added, as the task says. The Chromium check above was run by hand and is not a committed test.
- **Screen readers.** Not tested with one.
- **The hosted deployment.** Nothing was deployed.

## Release

**Not released, and must not be until the §13 U-6 privacy sign-off confirming §9 exists.** No page links to either route. Deploys are manual (`STATUS.md`), so merging does not publish the page. A later production deployment of `main` would, though, serve both routes to anyone who knows the address. The sign-off belongs before that deployment.
