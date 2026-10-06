# 2026-10-06 — the owner's name, place and address withdrawn from the site

Branch `claude/serene-knuth-d687ux`, on `origin/main` at `3d12f1a` (#177 merged). No task file: the project owner asked on 2026-10-06, in the session, for their name and e-mail address to be removed from the site "for now". The place named next to the controller went with them, since it identified the same person.

## Changed

- `apps/web/src/lib/legal-text.ts`: `CONTROLLER_NAME` and `CONTROLLER_PLACE` removed. The privacy notice names the controller as the natural person who runs the service; both documents point to the contact form by its address (`contactPath`) wherever they gave the e-mail address. The notice's sentences on the offer's forms and the "Zgłoś błąd" link say what they now do (below). `LEGAL_UPDATED` is 2026-10-06 for both documents.
- `apps/web/src/lib/contact.ts`: `CONTACT_EMAIL` removed. New: `contactFormHref(lang, { topic?, message })`, the contact page with the form prefilled through the address's fragment, and `readContactPrefill(hash)`. The fragment is never sent to the server, so a prefilled message reaches nothing but the reader's browser until they send it.
- `apps/web/src/lib/contact-routes.ts`: `CONTACT_INBOX`, the address the form delivers to through Resend. Server-side only; `contact-form.tsx` imports a type alone from this module.
- `apps/web/src/lib/contact-form.tsx`: reads the fragment (`useSyncExternalStore`, server snapshot empty) and starts from its topic and message until the reader types; the `mailto:` link on a failed or unavailable send is gone.
- `apps/web/src/lib/contact-page.tsx`, `site-footer.tsx`: the address line under the form and the footer's re-export of the address are gone.
- `apps/web/src/lib/security-txt.ts`: `Contact` is the two contact pages (origin + path; the path alone when no origin is configured, as `Canonical` is then left out).
- `apps/web/src/lib/report-link.tsx`: `reportHref` (was `reportMailto`) opens the contact form on the "error in the data" topic with the surname(s) and the page's address in the message.
- `apps/web/src/lib/offer-text.ts`: `contactHref`, `waitlistHref`, `enquiryHref` (were `mailtoHref`, `waitlistMailto`, `enquiryMailto`) hand the same subject and lines to the contact form under its last topic ("Inne" / "Something else"). The words that named e-mail (`howFormsWork`, `writeYourself`, the submit labels) say the contact form instead. `offer-form.tsx` renamed its imports; `offer-page.tsx` renders `writeYourself` as a link to the contact page.
- `apps/web/src/lib/messages.ts`: `contactMailInstead` and `contactDirect` removed; `contactFailed`, `contactUnavailable` and `contactReportHint` no longer send the reader to their own mail program.
- Tests: `contact-page.test.ts` (no address or `mailto:` on the contact page; the prefill's round trip; `security.txt`'s `Contact` lines), `legal-page.test.ts` (both documents name the contact path, describe a natural person, and hold no address, `mailto:` or place), `report-link.test.ts`, `offer-page.test.ts` (the hand-off decoded from the fragment; `LEGAL_UPDATED.terms` is 2026-10-06), `contact-routes.test.ts` (`CONTACT_INBOX`).
- `docs/CODEMAP.md`: the four rows that described the address, the `mailto:` links and the footer's address line. `STATUS.md`: the offer and launch-hygiene lines.

Not changed: the address stays in the source as the form's recipient (`contact-routes.ts`), and in the repository's records (`tasks/046`, `tasks/047`, `docs/progress/2026-09-30-contact-address.md`, `docs/progress/2026-10-01-offer-page.md`), which are not rewritten. The 2026-09-30 ruling for TASK-050 (option A, a `mailto:`) could not stand without an address; the contact form is its replacement until the owner decides otherwise.

## Verified

- `pnpm --filter ./apps/web run typecheck`: passed (no output).
- `pnpm lint`: passed (no output).
- `npx prettier --check` on the 17 changed `.ts`/`.tsx` files: "All matched files use Prettier code style!" (after `--write` on four of them).
- `npx vitest run` in `apps/web`: 96 files, 1015 tests, all passed (one new test first failed on the attribute order of the server-rendered `<textarea>` and was corrected; the rerun of the five changed test files: 44 passed).
- `grep -rn "CONTACT_EMAIL\|CONTROLLER_NAME\|CONTROLLER_PLACE\|mailto" apps/web/src` (sources, not tests): only `blog.ts` (which links `mailto:` in blog posts, unchanged) and two comments naming what was replaced.
- `pnpm run build` in `apps/web` (`tsx scripts/check-blog-content.ts && next build --webpack`): exit 0. Its only warnings are Next's own Edge Runtime notes about `process.cwd`, unrelated. In the output, the address string occurs in no file under `.next/static` (the browser's chunks) and in one under `.next/server`: `app/api/contact/route.js`. The owner's surname occurs in no emitted page or chunk (one hit in `.next/cache/webpack`, a build cache that is not served).

## Not verified

- A browser: the hydration of the prefilled form (the fragment is read after the server-rendered empty form) was not watched in Chromium; the server markup and the round trip of `contactFormHref` → `readContactPrefill` are tested.
- Delivery through Resend to `CONTACT_INBOX`: unchanged code path, not exercised here.
