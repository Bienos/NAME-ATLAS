# TASK-115 — Google Analytics on every page, its cookies only with consent

- **Status:** IMPLEMENTED 2026-10-05 on `claude/wizardly-dirac-9ik3dv` (`docs/progress/2026-10-05-google-analytics-every-page.md`).
- **Requested by:** the project owner, 2026-10-05: Google's "Set up a Google tag" page for `G-ZC9D1RK4NN` with "install google analytics"; told it was already installed behind the consent banner (TASK-109), "but it should be there always, not only when users say ok".
- **Decision:** ADR-0040 (amends ADR-0038 §1). The legal question it leaves is D-042.
- **Depends on:** TASK-109.
- **Model guidance:** implementation session.

## 1. Goal

Google's tag is in every page, and GA counts every page view on production, whatever the visitor chooses; Google's cookies still wait for "Accept". Everything else of TASK-109 holds: no surname, tree id or query reaches Google, ad signals stay off, the privacy page reopens the banner.

## 2. In scope

- `app/layout.tsx`: Google's script (`GA_SCRIPT_URL`) in every page's `<head>`.
- `consent-banner.tsx`: on production's host (`gaCounts`), configure GA for every visitor from consent mode with everything denied, granting `analytics_storage` when the stored choice is "Accept", then one redacted `page_view` per route; a change of choice updates `analytics_storage`; "Reject" deletes the `_ga` cookies and no longer turns GA off.
- `google-analytics.ts`: `GA_SCRIPT_URL`, `GA_HOSTS` and `gaCounts`, and the banner's copy (both languages).
- The privacy notice (both languages; the base and the accounts summary): GA on every page, what Google receives, the cookies only with consent, art. 6(1)(f) for page views and 6(1)(a) for cookies, the processor line, and the notice's date.
- `DECISIONS_NEEDED.md`: D-042 for counsel.

## 3. Out of scope

- Google's cookies without consent (PT art. 399): not built.
- Google Tag Manager, Google Ads, custom events; Vercel Web Analytics.
- Gating on `VERCEL_ENV`; a separate GA property for staging.
- Settings inside the GA property.

## 4. Acceptance criteria

- **AC-1.** `gaCounts` is true for `name-atlas.pl` only; `GA_SCRIPT_URL` names `G-ZC9D1RK4NN` (unit tests).
- **AC-2.** In a browser against `next start`: every page's HTML carries Google's script. On production's host, before any choice, a collect request goes to Google with `[slug]` and not the surname, and no `_ga` cookie is set; after "Accept" a `_ga` cookie is set; after "Reject" it is gone and the next page view is still sent. On `localhost` no collect request is sent.
- **AC-3.** The privacy notice in both languages says the script loads on every page, that without consent Google stores no cookies, and names both bases (unit tests).
- **AC-4.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then AC-2 in headless Chromium against `next start`, with `name-atlas.pl` resolved to the local server.
