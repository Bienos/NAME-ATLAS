# 2026-10-07 — the contact address on the site's domain, the town out of the legal pages

At the owner's request, so that the site no longer publishes their private mailbox or town.

## What changed

- `apps/web/src/lib/contact.ts`: `CONTACT_EMAIL` is `kontakt@name-atlas.pl` instead of the owner's Gmail address. The legal pages, the contact pages and `/.well-known/security.txt` read it. A new `CONTACT_INBOX` keeps the owner's mailbox, which no page shows.
- `apps/web/src/lib/contact-routes.ts`: the contact form delivers to `CONTACT_INBOX`, so the form works whether or not the domain forwards mail.
- `apps/web/src/lib/legal-text.ts`: `CONTROLLER_PLACE` ("Iława") removed; the privacy notice and the terms name the controller as "Patryk Cicbowski" (the English text keeps ", Poland"). `LEGAL_UPDATED` is 2026-10-07 for both documents. The accepted-terms versions (`ACCOUNTS_LEGAL_UPDATED`, `TREE_LEGAL_UPDATED`) are unchanged, so no reader is asked to accept again.
- Tests: `legal-page.test.ts` checks that neither document contains "Iława" or `CONTACT_INBOX`; `contact-routes.test.ts` expects delivery to `CONTACT_INBOX`; `offer-page.test.ts` expects the terms' date 2026-10-07.

## Verification

- `pnpm exec vitest run` in `apps/web`: 113 files, 1330 tests passed (after rebasing onto `main` @ `0356a33`).
- `pnpm exec tsc --noEmit -p .` in `apps/web`: exit 0.
- `pnpm -s lint`: exit 0.
- `pnpm -s check:ids`: every number used once.
- `prettier --check` on the changed files: clean after `--write` on `legal-page.test.ts`.

## Not verified

- That `kontakt@name-atlas.pl` receives mail. It needs forwarding on the domain (for example Cloudflare Email Routing or ImprovMX), which is the owner's to set up.
- Whether the privacy notice may name the controller without a place: a legal question, not checked here.
- The deployed pages: not merged, so not on staging or production.
