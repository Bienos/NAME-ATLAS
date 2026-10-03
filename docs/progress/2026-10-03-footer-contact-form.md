# Footer redesign and a contact form that sends email

## Trigger

The owner asked, on 2026-10-03, for the footer to be redesigned ("it looks bad now"), for the
footer's "Kontakt · address" pair to be replaced by a contact page that sends email, and for the
footer's contents to be put in a better order. No task file; the request is the scope.

## Change

- **Footer** (`apps/web/src/lib/site-footer.tsx`, `globals.css`): a lit amber horizon line; a
  wide "Coś się nie zgadza? Masz pytanie? → Napisz do nas" card linking to the contact page
  (hidden on the contact page itself); the wordmark, tagline and the data note; four groups —
  Odkrywaj (Atlas, Porównaj, Jak to działa, Oferta), Czytaj (Blog), Serwis (Kontakt,
  Prywatność, Regulamin), Obserwuj (Instagram, TikTok, YouTube as pills); and a closing line
  "© year Name Atlas · Na górę ↑". The bare `mailto:` address is gone from the footer. Two
  columns on a phone. No link the footer had before was dropped.
- **Contact page** (`contact-page.tsx`, new `contact-form.tsx`): the existing text on the left,
  a form on the right (name, email, a topic as chips, message with a counter, a hidden trap
  field). The address stays on the page as a quiet "Wolisz pisać bezpośrednio?" line, and
  `security.txt` is unchanged.
- **`POST /api/contact`** (new `app/api/contact/route.ts`, `lib/contact-routes.ts`): same-site
  check (`isSameSiteRequest` from the account routes), form body ≤ 32 KB, address checked by
  `checkEmail`, message 1–5000 characters with control characters removed, unknown topic →
  "Inne". Sends one mail through Resend to `CONTACT_EMAIL` with `reply_to` the writer; stores
  nothing. Answers a 303 to the page with `?status=sent|invalid|failed|unavailable#form`, or
  JSON `{ status }` for the form's script. A failed send logs the provider's status only.
  Middleware bucket: 5 a minute per client (`CONTACT_POLICY`).
- **Mailer** (`packages/accounts`): `OutgoingMail.replyTo`, sent as Resend's `reply_to` only when
  set.
- **Privacy notice**: says the contact form passes the message through Resend to the mailbox and
  stores nothing, and lists Resend as a processor; in the accounts variant the one Resend item
  covers both uses. `LEGAL_UPDATED.privacy` stays 2026-10-03 (main had already moved it there for
  TASK-073); `ACCOUNTS_LEGAL_UPDATED` is unchanged, because the tree's consent step needs it to
  stay earlier than `TREE_LEGAL_UPDATED`.
- Wording for the form and footer in `messages.ts` (PL and EN). `contactPath` moved to
  `site-links.ts` (re-exported from `site-footer.tsx`).
- No new dependency.

## Configuration needed to send

The form sends only when `RESEND_API_KEY` and `CONTACT_MAIL_FROM` (a sender on a domain verified
with Resend; `ACCOUNTS_MAIL_FROM` is used if `CONTACT_MAIL_FROM` is unset) are set in Vercel.
Production has neither today, so after deploy the form answers "Wysyłka z formularza nie jest
jeszcze włączona" and offers the typed message as a `mailto:` link.

## Verification

Node 22, pinned pnpm, run on this branch:

| Command | Result |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | "All matched files use Prettier code style!" |
| `pnpm check:ids` | "every task, ADR, migration and decision number is used once" |
| `pnpm --filter web test` | 63 files, 673 tests passed (after rebasing onto `main` @ `6e61716`) |
| `pnpm --filter @name-atlas/accounts test` | 5 files, 28 tests passed |
| `pnpm --filter web build` | succeeded; `/api/contact` dynamic, contact pages static |

With `next start` on the build, Playwright (Chromium) screenshots of `/pl/kontakt` (1440 and
390 wide) and the footer on `/en/how-it-works` were inspected. Filling the English form and
submitting it with no mail configuration showed "Sending from the form is not switched on yet…
Open in your mail program".

## Not verified

- A real send through Resend (no key in this environment).
- The integration and golden suites (`test:integration`, `test:golden`) were not run; this change
  touches no database code.
- The no-script path was covered by unit tests of the 303, not in a browser.
