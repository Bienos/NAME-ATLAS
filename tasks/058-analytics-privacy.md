# TASK-058 — The privacy notice names Vercel Web Analytics, and the analytics never sees a surname

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu` (`docs/progress/2026-10-01-analytics-privacy.md`).
- **Requested by:** nobody directly. #58 ("Install Vercel Web Analytics", opened by the Vercel bot) was merged by the project owner on 2026-10-01 (`main` @ `99ff59f`). The privacy notice's header (`legal-text.ts`) says the text must change in the same change as anything new the site does with data; it did not, so the notice on production is now untrue.
- **Decision:** `legal-text.ts`'s rule; TASK-024's rule that a raw surname never reaches a log (`events.ts`); TASK-048 (the CSP is report-only, so the script is not blocked).
- **Depends on:** #58 and #60, on `main`.
- **Model guidance:** implementation session.

## 1. Goal

- The privacy notice, in both languages, says what Vercel Web Analytics collects and for how long, and no longer claims the site has no third-party analytics.
- The analytics never receives a surname: the page address it records is the route, `/pl/nazwisko/[slug]`, not the surname, as the site's own logs already do.

## 2. Facts (checked on `main` @ `c0d19b7`, 2026-10-01)

1. `app/layout.tsx` renders `<Analytics />` from `@vercel/analytics/next` (2.0.1) after the page.
2. Vercel's documentation (`/docs/analytics/privacy-policy`, read 2026-10-01): no cookies; visitors are told apart by a hash of the request, discarded after 24 hours; each page view stores the timestamp, the URL path, the dynamic path, the referrer, filtered query parameters, geolocation (country, region, city), OS, browser and device type. `/docs/analytics/limits-and-pricing`: the Hobby plan's reporting window is one month and Vercel "may store your data for longer"; 50,000 events a month, then collection pauses. `/docs/analytics/redacting-sensitive-data`: `beforeSend` rewrites or drops an event before it is sent.
3. The notice says (PL §"Czego nie robimy") "nie ma kont, reklam ani zewnętrznych narzędzi analitycznych" and lists Vercel only as hosting, with request logs kept "from one hour to one day". Both are now incomplete.
4. The site's own logs hold neither the IP address nor the surname searched for (the notice's "Jak długo"; `events.ts`). Analytics storing `/pl/nazwisko/kowalski` for a month with a city would be the first place the site keeps a searched surname beside a place.
5. `security-headers.ts`: the CSP is report-only and the script is same-origin (`/_vercel/insights/`), so nothing is blocked.
6. TASK-058 is free on `main` and in the open pull requests (#30, #44).

## 3. In scope

- **`beforeSend`** in a small client component (`analytics.tsx`) that `layout.tsx` renders instead of `<Analytics />` directly: a surname page's slug is replaced by `[slug]` (`/pl/nazwisko/[slug]`, `/en/surname/[slug]`, and the same under the card and image routes, whose last segment is not a surname), and the query string and hash are dropped. Everything else passes.
- **The privacy notice**, both languages: "Czego nie robimy" no longer claims no analytics; a new paragraph says what Vercel Web Analytics records, that it uses no cookies, that the surname is removed before sending, and the one-month window; "Komu powierzamy dane" names it. The privacy date becomes 2026-10-01 (it already is).
- Tests: the rewrite for every surname and card route in both languages; the notice's new text; the layout renders the wrapper.
- `STATUS.md`'s stale "#58 is a draft" line.

## 4. Out of scope

- Turning the analytics off, or Speed Insights, custom events or a consent banner.
- Enforcing the CSP.

## 5. Acceptance criteria

- **AC-1.** `beforeSend` turns `/pl/nazwisko/kowalski`, `/en/surname/kowalski`, `/pl/nazwisko/kowalski/karta/rarity`, `/en/surname/kowalski/card/rarity` and `…/opengraph-image` (with or without a query) into the same with `[slug]` for the surname, drops every query string, and leaves `/`, `/pl/oferta` and `/pl/porownaj` as they are (unit tests).
- **AC-2.** The privacy notice in both languages names Vercel Web Analytics, what it records, no cookies, the surname removal and the one-month window; it no longer says the site has no third-party analytics (unit tests on the text).
- **AC-3.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then, on production after the merge, a surname page's analytics request in headless Chromium carries the route, not the surname (`/_vercel/insights/view` body).
