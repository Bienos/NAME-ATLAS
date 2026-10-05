# 2026-10-05 — Vercel Speed Insights, with the surname kept out

Branch `claude/keen-mayer-a15tlc`, on `origin/main` @ `512e48b` (#139, TASK-117). It replaces Vercel's bot's #137, which added `<SpeedInsights />` with no filter. No task file, migration or ADR.

## Changed

- `apps/web/src/lib/site-analytics.tsx`: `SiteSpeedInsights`, `speedInsightsBeforeSend` and `speedInsightsRoute`. A measurement's address goes through `analyticsUrl`, as the visit statistics' does (TASK-058): the slug becomes `[slug]`, tree and person ids become `[tree]` and `[person]`, and the query and hash are dropped. An address that cannot be read is not sent.
- The route is ours. Vercel's script (version 0.1.3, read at `name-atlas.pl/_vercel/speed-insights/script.js` and `va.vercel-scripts.com/v1/speed-insights/script.debug.js` on 2026-10-05) passes only a measurement's address through `beforeSend`. It keeps `href: n.url` and sends `route` as the page gave it. `@vercel/speed-insights/next` builds that route with `computeRoute`, which matches the page's params against its path, and a slug is Unicode (`canonicalSlug`, ADR-0009) and percent-encoded in a URL. So the component uses `@vercel/speed-insights/react` with `route` = the filtered `usePathname()`, and passes `framework="next"`, `basePath` and `configString` from the same two `NEXT_PUBLIC_VERCEL_OBSERVABILITY_*` variables the Next.js wrapper reads. A path that cannot be read gives a null route, and the library then injects no script.
- `apps/web/src/app/layout.tsx`: renders `<SiteSpeedInsights />` after `<SiteAnalytics />`.
- `apps/web/package.json`, `pnpm-lock.yaml`: `@vercel/speed-insights` 2.0.0, pinned. Needed to load Vercel's script; it is already switched on for the project in Vercel. MIT licence.
- Privacy notice, both languages (`legal-text.ts`; the accounts variant's opening paragraph in `legal-accounts.ts`): what Speed Insights sends, from Vercel's page "Vercel Speed Insights Privacy & Compliance" (read 2026-10-05: route, URL, network speed, browser, device type, OS, country, the Web Vital and its attribution, SDK version, time received); that it sets no cookie; that the surname is replaced in the address and the route; the basis (art. 6(1)(f), as for the visit statistics); 7 days' retention, the Hobby plan's reporting window on Vercel's "Limits and Pricing" page; Vercel's recipient line. `LEGAL_UPDATED.privacy` stays 2026-10-05.
- Tests: `analytics-path.test.ts` (the address and the route, a percent-encoded `dąbrowski`, a tree path, an unreadable address); `legal-page.test.ts` (the notice names Speed Insights and the filter, PL and EN).
- `docs/DECISIONS_NEEDED.md` D-037: Speed Insights added to the facts. It asks the same art. 399 question.

## Verified (run locally on this branch, 2026-10-05)

- `pnpm typecheck`, `pnpm lint`, `pnpm check:ids`, `pnpm check:vm`: exit 0. `pnpm format:check`: exit 0 after `prettier --write` on `analytics-path.test.ts`.
- `python3 scripts/test-backup.py`: 6 tests, OK.
- `pnpm test`: exit 0. `apps/web`: 83 files, 876 tests passed. Every other package's suite passed.
- Against a throwaway PostgreSQL 16 cluster with `postgresql-16-postgis-3` installed in this session: `pnpm e2e:seed` exit 0; `pnpm db:generate-types`, generated types unchanged; `TEST_DATABASE_URL=… pnpm test:integration`, 37 files, 458 tests passed; `pnpm test:golden`, 4 files, 364 tests passed.
- `pnpm build`: exit 0. A cold build of `web` warns that Next's own `dynamic-rendering.js` uses `process.cwd` in the Edge Runtime (the middleware bundle); the warning names no file of this change.
- `pnpm test:e2e` against `next start`: 10 tests passed.
- In Chromium against `next start` and the seeded database: on `/pl/nazwisko/wi%C5%9Bniewska`, `/pl/nazwisko/nowak?view=cards` and `/pl/nazwisko/wi%C5%9Bniewski?view=cards`, the Speed Insights script tag's `data-route` was `/pl/nazwisko/[slug]`, its `data-sdkn` `@vercel/speed-insights/next`, its `src` `/_vercel/speed-insights/script.js`, and the queued `beforeSend` turned the page's full address into `http://localhost:3311/pl/nazwisko/[slug]`. On `/pl/oferta` the route was `/pl/oferta`. Vercel Web Analytics' queued page view on the same pages carried `route: "/pl/nazwisko/[slug]"`: its `computeRoute` matched the percent-encoded slug there.

## Not verified

- What reaches Vercel from production. Locally the script is not served, so only what the page hands it was read; the script's source shows what it sends.
- Whether the project is on Vercel's Hobby plan; the 7 days and the Web Analytics month in the notice both assume it. The free tier holds 10,000 events over 30 days; above it Vercel pauses collection for at least 14 days.
- D-037's legal question, which now covers Speed Insights too.
