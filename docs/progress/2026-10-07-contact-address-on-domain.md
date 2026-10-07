# 2026-10-07 — the owner's details off the site; the only contact is kontakt@name-atlas.pl

At the owner's request, so that the site no longer publishes their name, town or private mailbox.

## What changed

- `apps/web/src/lib/contact.ts`: `CONTACT_EMAIL` is `kontakt@name-atlas.pl` instead of the owner's Gmail address. The legal pages, the contact pages, `/.well-known/security.txt` and the contact form's delivery read it.
- `apps/web/src/lib/contact-routes.ts`: unchanged in behaviour; the form still delivers to `CONTACT_EMAIL`, now the domain address.
- `apps/web/src/lib/legal-text.ts`: `CONTROLLER_NAME` and `CONTROLLER_PLACE` removed. The privacy notice says the controller is the service's owner ("jego właściciel" / "the owner of the service") and gives `CONTACT_EMAIL` as the contact for everything, personal data included; the terms give `CONTACT_EMAIL` as the contact, with no operator's name. `LEGAL_UPDATED` is 2026-10-07 for both documents. The accepted-terms versions (`ACCOUNTS_LEGAL_UPDATED`, `TREE_LEGAL_UPDATED`) are unchanged, so no reader is asked to accept again.
- Tests: `legal-page.test.ts` checks that neither document, in either language, contains the owner's surname, the town or "gmail"; `offer-page.test.ts` expects the terms' date 2026-10-07.

## Verification

After rebasing onto `main` @ `f08738a`:

- `pnpm exec vitest run` in `apps/web`: 114 files, 1341 tests passed.
- `pnpm exec tsc --noEmit -p .` in `apps/web`: exit 0.
- `pnpm -s lint`: exit 0.
- `pnpm -s check:ids`: every number used once.

## Not verified

- That `kontakt@name-atlas.pl` receives mail. Both direct mail and the contact form need forwarding on the domain (for example Cloudflare Email Routing or ImprovMX), which is the owner's to set up.
- Whether a privacy notice that does not name the controller meets GDPR art. 13(1)(a): a legal question, decided by the owner, not checked here.
- The deployed pages: not merged, so not on staging or production.
- Earlier records (`tasks/046-*.md`, `tasks/047-*.md`, `docs/progress/2026-09-30-*.md`) and the git history still contain the owner's details; they are not served by the site.
