# TASK-057 — The offer page: free, 29.99 zł and 499 zł, with a sign-up that reaches the owner

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu` (`docs/progress/2026-10-01-offer-page.md`).
- **Requested by:** the project owner, 2026-10-01:
  - the order of builds: "1. Share cards 2. The offer page with 599.99 "Wkrótce" and the waitlist …";
  - then the tiers: "Free → 29.99 → 499". The next tier (29.99) holds famous people, a little genealogy, extra research, more inputs and a tree people build and connect. 499 is "coming soon" genealogy, with "the contact form … coming to me";
  - on DNA: "only mention the [services] they provide and form to fill in that I will take over", naming no partner;
  - for the footer: "a section for blog posts + (instagram + Tiktok + youtube) … right now just direct to main website".
- **Decision:** ADR-0026 (this task), which supersedes ADR-0023's two products.
- **Depends on:** TASK-055 (the deck) and TASK-056 (share cards), both on `main`.
- **Model guidance:** implementation session.

## 1. Goal

A reader who has seen the free cards finds what comes next, and can ask for it:
- one page sets out the three tiers, and only the free one is on sale;
- the 29.99 zł and 499 zł tiers say "Wkrótce";
- a short form for each prepares an email to the owner;
- the footer carries the blog and the three social links.

## 2. Facts (checked on `main` @ `ba8e06f`, 2026-10-01)

1. **The web app writes nothing.** It connects as `nameatlas_web`, a `SELECT`-only role with `default_transaction_read_only = on` (ADR-0017 §2.3). A form that stored a sign-up would need a writing role, a table and a retention rule.
2. **The prefilled email has a precedent.** "Zgłoś problem" (TASK-050) is a prefilled `mailto:` to `CONTACT_EMAIL`, by the owner's ruling of 2026-09-30. The reader's own mail program sends it, and the site stores nothing.
3. **The privacy notice says Name Atlas has "no accounts, forms, advertising…"** (`legal-text.ts`). Its header requires that text to change in the same change as a new form.
4. **The current offer is out of date.** `PRODUCT.md` §6 and ADR-0023 name two products, at 24.99 and 149.99 zł, which "never [trace] the buyer's family". §8 lists the family tree and DNA as non-goals.
5. **Nothing paid can be bought.** There is no business, Stripe account or consumer terms (ADR-0023 §2.5; `STATUS.md`).
6. **The numbers are free.** TASK-057, ADR-0026 and D-024 are free on `main` and in the open pull requests (#30, #44, #58).

## 3. In scope

- **ADR-0026**, recording the owner's tiers:
  - Free: the cards, the share cards and the full page; a free account later.
  - 29.99 zł "Nazwisko i rodzina": the full surname report, famous bearers, a family tree the reader builds and may connect, more inputs.
  - 499 zł "Genealogia z DNA": research by professional genealogists and DNA analysis, enquiries by email to the owner.
  - It also records:
    - that the tree may hold living people only after the reader accepts terms that say so;
    - what stays a promise: §7's rules, and that the public surname cache never holds a family;
    - and what the tiers do not change.

  `PRODUCT.md` §6 and §8 are rewritten to match.
- **`/pl/oferta` and `/en/offer`.** One static page:
  - the three tiers side by side (stacked on a phone);
  - what the free tier holds today;
  - the two coming tiers marked "Wkrótce", with their prices;
  - a line that nothing paid is on sale and signing up costs nothing.
- **Two forms, both a prefilled `mailto:` to `CONTACT_EMAIL`:**
  - 29.99 zł waitlist: the surname, optional;
  - 499 zł enquiry: name, surname(s), what the reader wants to find, whether they have a DNA test and which kind.

  With script, the form composes the subject and body. Without script, a plain prefilled `mailto:` link stands in its place. The page states that the reader's own mail program sends the message and the site keeps nothing. It also asks the reader not to send DNA results.
- **Links to the page:** in the header ("Oferta" / "Pricing"), in the footer, and on the deck's last card.
- **Footer:** a row with Blog, Instagram, TikTok and YouTube. All four point to the home page until the owner gives addresses, and are kept in one constant.
- **Privacy notice**, both languages:
  - the forms, and what happens to a sign-up or an enquiry;
  - the request not to send DNA or health data;
  - a new "last changed" date.

## 4. Out of scope

- Accounts, login, the family tree, famous bearers and the report itself: their own tasks.
- Checkout or any payment, including in test mode.
- A blog with posts, and real social accounts.
- Storing anything on the server: a sign-up table, an email provider, a newsletter.
- Naming the genealogy partner.

## 5. Acceptance criteria

- **AC-1.** `/pl/oferta` and `/en/offer` show three tiers with prices "0 zł", "29,99 zł" and "499 zł" ("PLN 29.99" and "PLN 499" in English). The two paid tiers carry "Wkrótce" / "Coming soon". No buy button exists (unit tests on the rendered page).
- **AC-2.** Both forms produce a `mailto:` to `CONTACT_EMAIL` whose subject names the tier and whose body holds what the reader typed, percent-encoded as RFC 6068 requires. Without script, a prefilled link stands in for each form (unit tests).
- **AC-3.** The header, the footer and the deck's last card link to the page in the page's language. The footer shows Blog, Instagram, TikTok and YouTube (unit tests).
- **AC-4.** The privacy notice in both languages names the forms and the DNA request, with a new date (unit tests). `PRODUCT.md` §6 and §8 agree with ADR-0026.
- **AC-5.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0. The page is looked at in headless Chromium at desktop and phone sizes, and the form opens a `mailto:` with the expected subject.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then the page in headless Chromium against a local build, at 1440 × 900 and 390 × 844.
