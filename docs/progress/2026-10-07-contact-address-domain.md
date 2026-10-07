# 2026-10-07 — TASK-165: the contact address on the domain

## What changed

The project owner gave `kontakt@name-atlas.pl` on 2026-10-07 as the one address people write to and the only one shown on the site.

- `apps/web/src/lib/contact.ts`: `CONTACT_EMAIL` is `kontakt@name-atlas.pl` (was `cihypatryk@gmail.com`); its comment names TASK-165 and the contact form's delivery. Every use reads this constant, so the contact page, the form's delivery through Resend, the `mailto:` fallbacks, the legal pages, the offer forms, the "report a problem" link and `security.txt` all change with it. No other code changed.
- `tasks/163-contact-address-domain.md` (new).

## Verification (run 2026-10-07, `main` @ `fd0d75b` plus this change)

- `grep -rn cihypatryk apps packages` (`.ts`, `.tsx`): no match.
- `pnpm format:check`, `check:ids`, `lint`, `typecheck` each exit 0.
- `pnpm test` exit 0; `apps/web`: 108 files, 1,209 tests passed.

## Not verified

- That mail to `kontakt@name-atlas.pl` arrives. The domain's MX is `SMTP.GOOGLE.COM` (seen in the owner's home.pl DNS panel on 2026-10-07); whether the mailbox or alias exists in Google Workspace was not checked.
- The pages on a deployment.
