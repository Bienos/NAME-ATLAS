# TASK-165 — The contact address on the domain: kontakt@name-atlas.pl

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-contact-address-domain.md`).
- **Requested by:** the project owner, 2026-10-07: "dodaj do kontaktu email kontakt@name-atlas.pl, i tyle z danych kontaktowych starczy"; asked about open PR #181, the owner answered that people should write to this address, and that if any address is visible on the site, it is this one.
- **Numbers:** TASK-165 (163 and 164 are on `main`, #195 and #197; open PRs #181, #190, #191 hold no 165). `pnpm check:ids` exit 0.

## In scope

`CONTACT_EMAIL` in `apps/web/src/lib/contact.ts` becomes `kontakt@name-atlas.pl`. Every place that shows or uses the address reads that constant: the contact page, the contact form's delivery (`contact-routes.ts`), the `mailto:` fallbacks, the legal pages, the offer forms, the "report a problem" link and `/.well-known/security.txt`.

## Out of scope

The controller's name and place in the privacy notice and terms (`legal-text.ts`), which TASK-046 put there; PR #181, which would withdraw every published address and stays open for the owner to decide; the mailbox itself (Google Workspace, MX `SMTP.GOOGLE.COM`).

## Acceptance

- **AC-1:** `cihypatryk@gmail.com` appears nowhere in `apps/` or `packages/`.
- **AC-2:** the existing tests, which assert the pages, the form route, the offer forms, the report link and `security.txt` against `CONTACT_EMAIL`, pass.

## Verification

`pnpm format:check`, `check:ids`, `lint`, `typecheck`, `test`.
