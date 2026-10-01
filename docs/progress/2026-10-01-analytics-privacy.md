# 2026-10-01 — TASK-058: the privacy notice names Vercel Web Analytics, and the analytics never sees a surname

Branch `claude/friendly-brown-6n5iwu`, built on `main` @ `c0d19b7` (#60). Task file: `tasks/058-analytics-privacy.md`.

## Why

#58 ("Install Vercel Web Analytics", opened by the Vercel bot) was merged on 2026-10-01 (`99ff59f`). The privacy notice still said the site has "no … third-party analytics", and its header requires the text to change in the same change as anything new the site does with data. The analytics would also have recorded `/pl/nazwisko/kowalski` with the visitor's city for a month, which the site's own logs never do (`events.ts`; `docs/canonical/19`, "no raw surname by default").

## What changed

- `site-analytics.tsx` (client component) renders `<Analytics beforeSend>`; `app/layout.tsx` renders it in place of the bare component.
- `analytics-path.ts` (pure): a surname page's slug becomes `[slug]` under `/pl/nazwisko/` and `/en/surname/` (card and image routes keep their last segment); the query string and hash are dropped; an unreadable address sends no event.
- Privacy notice (`legal-text.ts`), both languages: "what we do not do" no longer claims no analytics; a paragraph on what Vercel Web Analytics records, no cookies, the 24-hour hash and the surname removal; the one-month reporting window and "may keep longer"; Vercel named as hosting and statistics. Sources: Vercel's `/docs/analytics/privacy-policy`, `/docs/analytics/limits-and-pricing` and `/docs/analytics/redacting-sensitive-data`, read 2026-10-01. The privacy date was already 2026-10-01 (TASK-057).
- `docs/CODEMAP.md` and `STATUS.md` rewritten for it, including the Production line for #60's deploy and the stale "#58 is a draft" line.

## Verification

Run on 2026-10-01 after the last edit:

- `pnpm format:check`, `typecheck`, `lint`, `check:ids`, `build` — exit 0.
- `pnpm test` — exit 0, 1,665 tests (5 new in `analytics-path.test.ts`; `legal-page.test.ts` now expects the analytics named and "no third-party analytics" gone).
- Headless Chromium against `next start` of that build: the `beforeSend` the package registers (`window.va("beforeSend", fn)`) was run on the page's own address. `/pl/nazwisko/kowalski?view=cards` → `/pl/nazwisko/[slug]`; `/en/surname/nowak` → `/en/surname/[slug]`; `/` and `/pl/oferta` unchanged.

## Not verified

- That Vercel's own script, as loaded on production, sends the rewritten address: locally the script is a stub, and the check ran the registered function, not the intake request. Worth one look in Vercel's Web Analytics dashboard after the deploy (the paths list should show `[slug]` and no surnames).
- `pnpm test:integration` and `pnpm test:golden`: not in this task's verification; nothing on the read path changed.
