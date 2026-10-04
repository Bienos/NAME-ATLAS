# 2026-10-04 — TASK-109: Google Analytics behind a consent banner

**Task:** `tasks/109-google-analytics-consent.md`. **Decision:** ADR-0038. **Numbers:** TASK-109 and ADR-0038, the next free on `main` (TASK up to 105, ADR up to 0035) and in the open pull requests (TASK-099, 103, 104, 106, 107, 108; ADR-0036, 0037). First numbered 105, which `main` gave the blog post of #123. **Requested by:** the project owner, with Google's "Set up a Google tag" page for `G-ZC9D1RK4NN`; they chose the consent banner over the tag pasted as given.

## What changed

- `apps/web/src/lib/google-analytics.ts` (new, pure): `GA_MEASUREMENT_ID`, the `localStorage` key, `parseConsent`, `consentLang`, `CONSENT_DEFAULT` (all four types denied), the banner's copy in both languages, `gaPageParams` (address, title and referrer through `analyticsUrl`).
- `apps/web/src/lib/consent-banner.tsx` (new, client): `GoogleAnalytics` (banner; Google's script added only after "Accept"; consent default denied, then `analytics_storage` granted; Google signals and ad personalisation off; `send_page_view: false`, one redacted `page_view` per route; "Reject" sets `ga-disable-…` and deletes `_ga*` cookies) and `ConsentSettingsButton`.
- `app/layout.tsx` renders `GoogleAnalytics`; `legal-page.tsx` renders the button on the privacy page.
- `legal-text.ts` and `legal-accounts.ts`, both languages: the cookie sentence is now conditional on consent; a GA paragraph (Art. 6(1)(a), what Google receives, the redaction, the cookies, `localStorage`); GA's retention; Google Ireland Limited and Google LLC as processors. Privacy date 2026-10-04.
- `security-headers.ts`: the report-only CSP allows `www.googletagmanager.com` (script, img, connect), `*.google-analytics.com` and `*.analytics.google.com`.
- `app/globals.css`: the banner and button styles.
- Tests: `google-analytics.test.ts` (new); `legal-page.test.ts` (date), `legal-tree.test.ts` (the tree's date unless the document changed later), `legal-google.test.ts` (Google Ireland now also appears for GA; the sign-in item stays absent), `security-headers.test.ts` (script-src).
- `docs/adr/0038-google-analytics-consent.md`, `docs/CODEMAP.md`, `STATUS.md`, the task file.

No new dependency.

## Verification

Run on 2026-10-04 in this container:

- `pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build` — exit 0 (web: 78 files, 827 tests). The web build prints the Edge Runtime `process.cwd` warning from Next's own `dynamic-rendering.js`; it is not from this change.
- Headless Chromium against `next start` (`scratchpad/e2e/ga.mjs`): on `/pl/nazwisko/kowalski?view=cards` the banner shows and **0** requests go to a Google host before a choice; after "Zgadzam się" the banner closes, `dataLayer` holds consent default (all denied), update (`analytics_storage` granted), config with `send_page_view: false`, and `page_view` with `page_location` `…/pl/nazwisko/[slug]` and title `/pl/nazwisko/[slug]`; no "kowalski" in any Google request or the `dataLayer`; the only Google request was `gtag/js?id=G-ZC9D1RK4NN`. After a reload the banner stays closed. On `/pl/prywatnosc` "Zmień zgodę…" reopens it and "Nie zgadzam się" closes it. A fresh visitor who rejects on `/en/privacy` and then opens `/`: 0 Google requests, no banner.

## Not verified

- Google's collect request and the `_ga` cookies in the browser: the container's Chromium does not use the egress proxy, so `gtag.js` did not load (curl through the proxy returns 200). To check on production after the merge: after "Accept", the `/g/collect` request's `dl` carries `[slug]`, and Realtime in GA shows the view.
- GA property settings, which are the owner's in Google's console: data retention (the notice says the default, 2 months), and enhanced measurement's "page changes based on browser history events", which should be off so GA sends no page view of its own.
