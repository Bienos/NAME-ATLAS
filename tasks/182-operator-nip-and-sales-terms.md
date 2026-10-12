# TASK-182 — The operator's NIP, and the terms for real sales

- **Status:** IMPLEMENTED 2026-10-12 (`docs/progress/2026-10-12-operator-nip-and-sales-terms.md`).
- **Requested by:** the project owner, 2026-10-12: publish the business's NIP for VAT and not its name, and "do the rest" of what selling needs on the site.
- **Decision:** none new. ADR-0052 (live checkout), D-054 (what needs counsel; item 4 added).
- **Numbers:** TASK 182. 181 was the last on `main` (`8b33bdb`); no pull request was open.
- **Model guidance:** implementation session.

## 1. Goal

The site identifies its operator by NIP, without a name, and states the rules of a purchase before the first real sale.

## 2. In scope

1. `OPERATOR_NIP` in `contact.ts`, shown in the terms and the privacy notice (always), on the contact page and in the purchase confirmation email. No name or address anywhere.
2. `legal-sales.ts`: a terms section "Zakupy" / "Purchases" (seller, prices with VAT, one-time payment, how a contract is made, the right of withdrawal and its loss, complaints within 14 days, refunds and disputes ending access, invoices on request, consumer help) and a notice section on purchase data with Stripe among the processors. Shown only while checkout runs live.
3. A link to the terms under the withdrawal statement on every buy form.

## 3. Out of scope

- The business name or an address, at the owner's request (D-054 item 4).
- Any Vercel variable, Stripe setting, invoice (KSeF) or legal review.

## 4. Acceptance criteria

1. The NIP passes its checksum and appears in both documents in both languages, with or without accounts.
2. No file the change adds or edits contains the owner's name.
3. The sales sections appear only with live checkout; Stripe is listed as a processor only then.
4. The purchase confirmation states the seller by NIP.

## 5. Verification

```
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm --filter web test
pnpm --filter @name-atlas/accounts test
pnpm build
```
