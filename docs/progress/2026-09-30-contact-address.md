# 2026-09-30 — TASK-047: a published contact address

## What changed

The project owner gave the address on 2026-09-30: `cihypatryk@gmail.com`.

- `apps/web/src/lib/site-footer.tsx` (new): `CONTACT_EMAIL`, stored once, plus `contactPath` and `SiteFooter`. `SiteFooter` renders the existing data note, then "Kontakt / Contact" and the address as a `mailto:` link.
- `app/page.tsx`, `lib/surname-page.tsx` and `lib/compare-view.tsx` now render `<SiteFooter lang={lang} />` in place of their own `<footer>`. The note text is unchanged.
- `apps/web/src/lib/contact-page.tsx` and `app/pl/kontakt/page.tsx`, `app/en/contact/page.tsx` (new): static pages. Each gives the address and three reasons to write: a wrong or missing fact, a data-rights or source-rights request, or a security problem. Each also says that no reply time is promised and that a report is checked against the source before a page changes. Each page names its own canonical address and the other language.
- `apps/web/src/lib/security-txt.ts` and `app/.well-known/security.txt/route.ts` (new) serve RFC 9116's `Contact` and `Expires: 2027-09-30T00:00:00.000Z` plus `Preferred-Languages: pl, en`. `Canonical` is included only when `SITE_ORIGIN` is set, as `robots.txt` does.
- `lib/messages.ts`: the contact strings in both languages. `app/globals.css`: `.footer-contact`.
- `lib/contact-page.test.ts` (new): 7 tests. They cover both pages, the language switch, the canonical addresses, the footer on its own and inside the comparison page, and security.txt's fields. One test requires `Expires` to be more than 30 days and at most a year away.

## Verification (run 2026-09-30, `main` @ `f9ea573` plus this change)

- `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` each exit 0. `apps/web`: 28 files, 306 tests passed.
- `pnpm start -p 3100` without a database:
  - `/pl/kontakt` and `/en/contact`: 200, `<h2>Kontakt` / `<h2>Contact`, and the `mailto:` link.
  - `/.well-known/security.txt`: 200, `text/plain; charset=utf-8`, the `Contact`, `Expires` and `Preferred-Languages` lines. No `Canonical`, because `SITE_ORIGIN` was unset.
  - `/`: the footer carries the contact line. TASK-048's headers are on every one of these responses.

## Not verified

- The pages on a deployment, and `Canonical` with production's `SITE_ORIGIN`.
- That mail sent to the address arrives. That is the owner's mailbox.
