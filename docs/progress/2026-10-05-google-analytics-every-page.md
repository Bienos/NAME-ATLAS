# 2026-10-05 — TASK-114: Google Analytics on every page, its cookies only with consent

**Task:** `tasks/114-google-analytics-every-page.md`. **Decision:** ADR-0040 (amends ADR-0038 §1); the legal question it leaves is D-042. **Numbers:** TASK-114, ADR-0040 and D-042, the next free on `main` @ `de39642` (TASK up to 113, ADR up to 0038, D up to 041) and in the open pull requests (#108: TASK-099, ADR-0036; #132: ADR-0039). **Requested by:** the project owner, who, told that GA loaded only after "Accept" (TASK-109), answered "it should be there always, not only when users say ok". Google's cookies without consent were not built.

## What changed

- `apps/web/src/app/layout.tsx`: Google's script (`GA_SCRIPT_URL`) in every page's `<head>`, on every host.
- `apps/web/src/lib/google-analytics.ts`: `GA_SCRIPT_URL`; `GA_HOSTS` (`name-atlas.pl`) and `gaCounts`; the banner's label and text in both languages now say page views are counted without cookies and cookies wait for consent.
- `apps/web/src/lib/consent-banner.tsx`: on production's host, for every visitor, `startGa` configures GA from consent mode with every type denied, grants `analytics_storage` when the stored choice is "granted", sets the redacted address before `config`, and the island sends one redacted `page_view` per route. A change of choice updates `analytics_storage`. "Reject" deletes the `_ga` cookies and no longer sets `ga-disable-…`. The client no longer adds the script itself.
- `apps/web/src/lib/legal-text.ts` (both languages): the summary names Google Analytics beside Vercel; the GA paragraph says the script loads on every page, what Google receives with each page view, no cookies without consent on art. 6(1)(f), the cookies on consent (art. 6(1)(a)), and that withdrawing deletes the cookies while page views go on; the processor line; `LEGAL_UPDATED.privacy` is 2026-10-05. `legal-accounts.ts`: the same summary sentence.
- `apps/web/src/lib/security-headers.ts`: the CSP's comment only.
- Tests: `google-analytics.test.ts` (TASK-114 AC-1 and AC-3; TASK-109's "script not loaded" assertions removed), `legal-page.test.ts` (each document's own date), `legal-google.test.ts` (the later of the Google variant's date and the base's).
- `docs/adr/0040-google-analytics-on-every-page.md` (new), ADR-0038's "Amended by" line, `docs/DECISIONS_NEEDED.md` D-042, `docs/CODEMAP.md`, `STATUS.md`, the task file.

No new dependency.

## Verification

Run on 2026-10-05 in this container, on `main` @ `de39642` plus this change:

- `pnpm typecheck` — exit 0. `pnpm lint` — exit 0. `pnpm format:check` — exit 1 at first (`google-analytics.test.ts`), exit 0 after `prettier --write`. `pnpm check:ids` — exit 0 ("every task, ADR, migration and decision number is used once").
- `pnpm test` — exit 1 at first: `legal-google.test.ts` expected the Google variant's date (2026-10-04) where the later base date (2026-10-05) is shown. After the test was changed to expect the later of the two: exit 0, web 83 files, 874 tests.
- `pnpm build` — exit 0. The first run printed "Compiled with warnings" (text not captured); a second `pnpm --filter ./apps/web build` printed "Compiled successfully" with no warning. TASK-109's record names a known Edge Runtime `process.cwd` warning from Next itself.
- Headless Chromium against `next start -p 3100`, with `name-atlas.pl` and `staging.name-atlas.pl` resolved to it (`--host-resolver-rules`), Google reached through the container's proxy (`scratchpad/ga-local.cjs`, `ga-staging.cjs`, `ga-spa.cjs`):
  - `http://name-atlas.pl/pl/nazwisko/kowalski?view=cards`, a fresh visitor: the server's HTML carries `gtag/js?id=G-ZC9D1RK4NN`; before any choice the banner shows, `gtag/js` loads and one `/g/collect` `page_view` goes to `www.google-analytics.com` with `gcs=G100`, `dl` `http://name-atlas.pl/pl/nazwisko/[slug]`, `dt` `/pl/nazwisko/[slug]`; no `_ga` cookie; `localStorage` and `sessionStorage` empty.
  - After "Zgadzam się": cookies `_ga` and `_ga_ZC9D1RK4NN`, hits with `gcs=G101`. On `/pl/oferta` the `page_view` carries `gcs=G101`.
  - On `/pl/prywatnosc`, "Zmień zgodę…" then "Nie zgadzam się": no `_ga` cookie, stored choice `denied`. Then `/en/surname/kowalski`: no banner, no `_ga` cookie, and a `page_view` with `gcs=G100` and `dl` `…/en/surname/[slug]`.
  - No Google request in any run contained "kowalski".
  - On `/pl/oferta`, `history.pushState` to `/pl/nazwisko/kowalski?view=cards` produced one `page_view`, `dl` `…/pl/nazwisko/[slug]`, and no other.
  - `http://staging.name-atlas.pl/pl/nazwisko/kowalski`: the HTML carries the script and `gtag/js` loads, but no `/g/collect` request is sent, before or after "Zgadzam się" and a second page; no `_ga` cookie; `window.gtag` undefined.
- Seen, not changed: with consent granted, and once after "Reject" on the same page, gtag also sent `/g/collect` to `www.google.com`, which the report-only CSP's `connect-src` does not list. Enhanced measurement sends `scroll` and `user_engagement`, with the redacted address.

## Not verified

- Production: this change is not deployed. After the release, on name-atlas.pl, a fresh visitor's `page_view` should go with `gcs=G100` before any choice, and GA's Realtime report should show visitors who did not accept.
- Google's "Test installation" result: the tag is now in the HTML, but how the test decides was not checked.
- `localhost`: Playwright sends it through the container proxy, which answered 405, so the non-production case was checked on `staging.name-atlas.pl` instead.
- D-042: whether page views without consent are lawful is counsel's question.
