# TASK-165 — The offer page redesigned with every product, and test-mode checkout for testers

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-pricing-page-redesign.md`).
- **Requested by:** the project owner, 2026-10-07, in a Claude Code session: "redesign me pricing page with correct info and we connect checkout as well, give me mock up and then we code". After the mockup: "prosze czy mozesz to teraz zrobic mi tak samo" ("please build it now the same way").
- **Mockup:** https://claude.ai/artifact/LfJ7prnaaYzQVELeuK2QPx (private to the owner).
- **Decision:** none new. The owner did not answer the mockup's four questions; this task takes the mockup's stated defaults: (1) buy buttons only for listed testers in test mode, the exception TASK-111 and TASK-154 already made for the account page, and no button for anyone else (ADR-0023 §2.5 still holds); (2) the 15,99 zł product in the mockup's words, which answers D-049's "the offer page's wording"; (3) the addresses stay `/pl/oferta` and `/en/offer`; (4) no FAQ line about invoices. Then, the same day, the owner answered three follow-ups: "B, tak, zostaw" — the baby-names card states the window's true end, and "the last week" only in its last 7 days (D-051 amended, option B); "Co mówią Wasze imiona razem" is listed in the three packs as coming (D-050 §3 already holds it in every dearer pack); the 199 zł pack gets nothing new. ADR-0037 §2.1's "not yet on the offer page" is amended.
- **Numbers:** TASK-165. 163 and 164 are on `main` (`fd0d75b`); open pull request #196 also names TASK-164; #190 (TASK-159), #191 and #181 hold no newer number.

## 1. Facts (`main` @ `f753f4e`)

1. The offer page says the free account is "coming soon"; accounts and the 5-person tree are on in production since 2026-10-06.
2. It lists neither "Imiona dla dziecka" (8,99 zł, D-045, free for signed-in readers while `BABY_NAMES_FREE_UNTIL` is open, D-051) nor "Porównanie imion i nazwisk" (15,99 zł, D-049).
3. Every tier from 28,99 zł up also holds both of those (D-044 §4, D-049 §3).
4. Test-mode checkout (`/api/checkout`) exists for accounts on `CHECKOUT_TESTERS`; its only buttons are on the account page.

## 2. In scope

- The offer page redrawn as the mockup: a hero, the free plan as a band, "Pojedyncze raporty" (8,99 zł and 15,99 zł), "Pakiety z większym drzewem" (28,99, 89,99, 199 zł), the 800 zł research, a "Co jest w czym" table, "Jak wygląda płatność" and a short FAQ.
- In the free window the baby-names card says "Za darmo dla zalogowanych do {date}", the window's last day in Warsaw; within 7 days of its end, "Ostatni tydzień: …".
- The three packs list "Co mówią Wasze imiona razem" as coming (D-050 §3).
- The page reads the session cookie: a signed-out reader is offered sign-up and, in the free window, sign-in to the baby-names page; a signed-in reader the account and the baby-names page.
- A signed-in reader on `CHECKOUT_TESTERS`, with checkout on, gets a "Kup testowo" form per sellable product posting to the existing `/api/checkout`. Everyone else: the waiting-list email, as now.
- The landing page's offer strip keeps its five tiers; its lede follows the offer page's.

## 3. Out of scope

Any change to `/api/checkout`, the webhook, prices, entitlements, the 800 zł enquiry, the URL, the nav, real (live) payments, the payment-method list (it depends on the Stripe account) and invoices.

## 4. Acceptance

- **AC-1:** both languages list 0, 8,99, 15,99, 28,99, 89,99, 199 and 800 zł with the names of ADR-0037 §2.3, D-045 and D-049, and the free plan as on now.
- **AC-2:** in the free window the baby-names card shows the struck 8,99 zł, 0 zł and the window's true last day, with "Ostatni tydzień" only within 7 days of its end; outside it, 8,99 zł and "Wkrótce".
- **AC-3:** a reader who is not a listed tester, or with checkout off, sees no buy form, and the page contains no "/api/checkout".
- **AC-4:** a listed tester sees one form per `CHECKOUT_TIERS` product posting `tier` and `lang` to `/api/checkout`, and none for 800 zł.
- **AC-5:** the comparison table matches `TREE_UNLOCK_TIERS`, `FULL_NAME_COMPARE_TIERS` and the baby-names tiers.

## 5. Verification

`pnpm format:check`, `pnpm check:ids`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
