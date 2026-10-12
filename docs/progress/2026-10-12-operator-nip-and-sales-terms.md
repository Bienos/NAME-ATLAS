# 2026-10-12 — The operator's NIP, and the terms for real sales (TASK-182)

**Changed.** The owner gave the business's NIP and asked that the name not be published.

- `apps/web/src/lib/contact.ts`: `OPERATOR_NIP` (`7441837423`, checksum valid).
- `legal-text.ts`: the privacy notice's controller and the terms' "Usługa" / "The service" name the owner of the service with the NIP; "bezpłatny" / "free" leaves the terms' first line, since paid products exist; both documents dated 2026-10-12. `SALES_LEGAL_UPDATED`, and `legalDocument` / `legalUpdated` take `sales`.
- `legal-sales.ts` (new): the terms' "Zakupy" / "Purchases" and the notice's "Zakupy" / "Purchases" with Stripe among the processors, applied only while `checkoutMode()` is `live` (`legal-page.tsx`).
- `contact-page.tsx`, `messages.ts`: a line with the NIP under the contact address.
- `checkout-section.tsx`, `globals.css`: under the withdrawal statement, a link to the terms.
- `packages/accounts/src/mail-text.ts`, `checkout-routes.ts`: the purchase confirmation states the seller by NIP.
- `DECISIONS_NEEDED.md`: D-054 item 4 (the seller's identity without a name or address).
- Tests: `legal-sales.test.ts` (new), `offer-page.test.ts` (the terms' date), `checkout-routes.test.ts`, `mail-text.test.ts`.

**Verified** (this session).

- `pnpm typecheck`: no errors. `pnpm lint`: exit 0. `pnpm format:check`: all files formatted.
- `pnpm --filter web test`: 119 files, 1392 passed before the last edit to `legal-sales.test.ts` (which removed one assertion); that file, `offer-page.test.ts` and `checkout-routes.test.ts` after it: 43 passed. `pnpm --filter @name-atlas/accounts test`: 52 passed.
- `git diff` contains no part of the owner's name.

**Not verified.** The pages in a browser. The legal text has had no review by counsel (D-054). The sales sections are not visible anywhere until checkout runs live. name-atlas.pl answered `402 DEPLOYMENT_DISABLED` on 2026-10-12 (the Vercel team is paused), so no change reaches readers until it is unpaused.
