# 2026-10-01 — TASK-057: the offer page, three tiers, two forms that email the owner, and the footer's links

Branch `claude/friendly-brown-6n5iwu`, built on `main` @ `ba8e06f` (#59). Task file: `tasks/057-offer-page.md`. Decision: ADR-0026.

## What changed

- **ADR-0026** records the owner's three tiers — free; "Nazwisko i rodzina" 29,99 zł; "Genealogia z DNA" 499 zł — and supersedes ADR-0023 §2.1–§2.3 (its header says so). `PRODUCT.md` §6 names the tiers; §8's non-goals 1–3 are scoped to the free product. D-024 (one payment or recurring; who takes the 499 zł) is raised in `docs/DECISIONS_NEEDED.md`.
- **`/pl/oferta` and `/en/offer`** (`offer-page.tsx`, `offer-text.ts`, two route files): the three tiers side by side (stacked on a phone), the paid two marked "Wkrótce" / "Coming soon", no buy button, a line that nothing paid is on sale. The genealogy partner is described by its service and not named.
- **Two forms** (`offer-form.tsx`, a client island): the 29,99 zł waiting list (a surname, optional) and the 499 zł enquiry (name, surnames, places and years, the goal, whether the reader has a DNA test). Each composes a `mailto:` to `CONTACT_EMAIL` with the tier in the subject and the answers in the body, percent-encoded as RFC 6068 requires; the button and Enter open it; each answer is capped at 600 characters. Before and without script, one prefilled link stands in. Nothing reaches the server.
- **Links:** the header gains "Oferta" / "Offer" (`site-nav.tsx`, `NavPlace` gains `"offer"`); the footer gains the offer link and a row of Blog, Instagram, TikTok and YouTube, all to the home page until the owner gives addresses (`followLinks` in `site-links.ts`); the deck's last card gains "Więcej: Twoja rodzina i DNA" (`deck.tsx`).
- **Privacy notice** (`legal-text.ts`), both languages: the forms send nothing to the site; a sign-up or enquiry is processed to reply and to announce the start (art. 6(1)(b) GDPR); a request not to send DNA or health data; consent before details go to the genealogists; the waiting-list retention. `LEGAL_UPDATED` is now per document: privacy 2026-10-01, terms 2026-09-30 (`legal-page.tsx` reads it by kind).
- **Styles** in `globals.css`: `.offer-*` and `.footer-follow`.
- `docs/CODEMAP.md` gains the row; `STATUS.md` is rewritten (including the Production line for #59's deploy, checked at 15:46–15:50 UTC).

## Verification

Run on 2026-10-01 after the last edit (the send control became a `<button type="submit">`):

- `pnpm typecheck` — exit 0.
- `pnpm lint` — exit 0.
- `pnpm format:check` — exit 0 (after `pnpm format` on seven new or changed files).
- `pnpm check:ids` — exit 0.
- `pnpm test` — exit 0 (the full suite; `offer-page.test.ts` adds 8 tests, `deck.test.ts` one, `legal-page.test.ts` reads the date by kind).
- `pnpm build` — exit 0; `/pl/oferta` and `/en/offer` are listed as static.
- Headless Chromium against `next start` of that build, at 1440 × 900 and at 390 × 844 with touch, both languages: two forms rendered, no horizontal overflow, no page errors. On the Polish desktop page, typing "Zaremba" and clicking "Zapisz się e-mailem" requested `mailto:cihypatryk@gmail.com` with subject "Lista oczekujących: Nazwisko i rodzina (29,99 zł)" and the surname as the body's last line; filling the enquiry and pressing Enter requested the enquiry address with subject "Zapytanie: Genealogia z DNA (499 zł)" and all five answers in the body (read through CDP's `Page.frameRequestedNavigation`, since `Location.assign` cannot be stubbed and headless Chromium drops `mailto:`). The header marked "Oferta" as the current page; the footer's four follow links pointed to `/`. With JavaScript off: no form, two prefilled links.

## Not verified

- A real mail program opening with the prepared message (headless Chromium cannot).
- The page on production: it deploys with the merge.
- `pnpm test:integration` and `pnpm test:golden`: not in this task's verification; nothing on the read path changed.
