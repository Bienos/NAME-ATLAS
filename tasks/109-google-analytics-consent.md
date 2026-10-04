# TASK-109 — Google Analytics behind a consent banner, and never a surname

- **Status:** IMPLEMENTED 2026-10-04 on `claude/sleepy-bell-1gkwqj` (`docs/progress/2026-10-04-google-analytics-consent.md`).
- **Requested by:** the project owner, 2026-10-04: a screenshot of Google's "Set up a Google tag" page for `G-ZC9D1RK4NN` with "do this for analytics". Told that pasting the tag as given would set cookies the privacy notice says the site does not set, without consent, and send searched surnames to Google, they chose **"Consent banner"** from: consent banner, cookieless with no banner, paste as given, don't add GA.
- **Decision:** ADR-0038 (amends `docs/canonical/18`'s "do not add another analytics vendor in P0").
- **Depends on:** TASK-058 (`analytics-path.ts`), TASK-046 (the privacy notice), TASK-048 (the report-only CSP).
- **Model guidance:** implementation session.

## 1. Goal

Google Analytics 4 runs on every page for visitors who accept it, and for nobody else; it never receives a searched surname, a tree's id or a query string; the privacy notice says so in both languages and offers a way to withdraw.

## 2. In scope

- `google-analytics.ts` (pure): the measurement id, the stored choice, the banner's copy, and `gaPageParams`, which passes the address, the title and the referrer through `analyticsUrl`.
- `consent-banner.tsx` (client): the banner with two equal buttons; Google's script added only after "Accept", from consent mode with everything denied, granting `analytics_storage` only, Google signals and ad personalisation off, `send_page_view: false` and one redacted `page_view` per route; "Reject" after an acceptance turns GA off and deletes the `_ga` cookies. The privacy page's button reopens the banner.
- `layout.tsx` renders it; `legal-page.tsx` renders the button on the privacy page.
- The privacy notice (base and accounts variant, both languages): no longer says the site stores no cookies without qualification; a paragraph on GA (basis Art. 6(1)(a), what Google receives, the redaction, the cookies), retention, and the processor.
- The report-only CSP allows Google's script and collection hosts.

## 3. Out of scope

- Google Tag Manager, Google Ads, remarketing, custom events, enhanced-conversion data.
- Changing Vercel Web Analytics.
- Settings inside the GA property (data retention, enhanced measurement): the owner's, listed in the progress record.

## 4. Acceptance criteria

- **AC-1.** `gaPageParams` replaces the surname in the address and the title, drops queries and hashes, redacts the referrer, and returns null for an unreadable address (unit tests).
- **AC-2.** Consent starts denied for every type; only a stored `granted` or `denied` is read (unit tests). In a browser, no request goes to a Google host before "Accept"; after it, the collect request carries `[slug]` and not the surname.
- **AC-3.** The privacy notice in both languages names Google Analytics, the consent basis and the cookies, and the privacy page renders the button that reopens the banner (unit tests).
- **AC-4.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then AC-2's browser half in headless Chromium against `next start`.
