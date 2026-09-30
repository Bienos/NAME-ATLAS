# 2026-09-30 — TASK-050: a report-a-problem link

## What changed

The project owner ruled U-1 on 2026-09-30: option A, a prefilled email.

- `apps/web/src/lib/report-link.tsx` (new):
  - `reportMailto(surnames, pageUrl, lang)` builds a `mailto:` to `CONTACT_EMAIL`. Subject: "Name Atlas, zgłoszenie: NOWAK" (en: "Name Atlas, report: …"). Body: the page's address, then blanks for what is wrong and for a source. Both are `encodeURIComponent`-encoded, so a space is `%20`, as RFC 6068 requires.
  - `ReportLink` renders nothing without a surname.
- `lib/surname-page.tsx`: the link sits in the result's actions, beside "search another". It carries the absolute canonical URL when an origin is known, and the path otherwise.
- `lib/compare-view.tsx`: the link names the resolved surnames of the pair and is absent when neither side resolved. `ComparisonView` takes an optional `origin`, and the two comparison routes pass `siteOrigin()`.
- `lib/contact-page.tsx` and `messages.ts`: a line on the contact page pointing to the link, and the link's strings in both languages. `globals.css`: `.report`.
- `lib/report-link.test.ts` (new): 6 tests. They cover the addressee, subject and body; encoding that a surname or query string cannot split; nothing rendered without a surname; the link on a surname result page (the result body mocked out) and on the comparison page; and the line on the contact page.

No route was added. Nothing stores or logs free text, so the privacy notice (TASK-046) is unchanged and still true.

## Verification (run 2026-09-30, `main` @ `73012f2` plus this change)

- `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` each exit 0. `apps/web`: 318 tests passed.

## Not verified

- Opening the link in a real mail program. The tests parse the `mailto:` URL instead.
- The link on a real surname page in a browser. There was no database in the session.
- The link on production. Production has none of #45–#48 yet: Vercel's daily deployment limit (see `STATUS.md`).
