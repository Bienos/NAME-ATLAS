# ADR-0026 — Three tiers: free, 29.99 zł and 499 zł genealogy with DNA

- **Status:** Accepted 2026-10-01, by the project owner's decision in the session that wrote it.
- **Date:** 2026-10-01
- **Deciders:** the project owner.
  - On the tiers: after the cards, readers "click login to share it with friends and access the next tier". That tier is 29.99 zł and holds "the famous people and also … the genealogy, … a little bit of it", "extra research", "more inputs" and "a tree that people can connect to". The next is 499 zł, "coming soon", genealogy through a partner, with "the contact form … coming to me".
  - Asked to choose, they answered:
    - "Free → 29.99 → 499" for the tiers;
    - "Email + password" for the login;
    - on living people in a tree: "real people could be [built] and added but only after approving T[&]C that would highlight that … when they create [an] account".
  - On DNA: "only mention the [services] they provide and form to fill in that I will take over". The partner is not to be named.
- **Supersedes:** ADR-0023 §2.1–§2.3 (the two products at 24.99 and 149.99 zł, and "no other tiers"). ADR-0023 §2.4–§2.5 still hold: build order, test mode first, and no real payments before the owner's legal and tax gates.
- **Changes:** `PRODUCT.md` §6 and §8 (non-goals 1–3 and 11, for the paid tiers only).
- **Relates to:** ADR-0017 (the web app's read-only role), TASK-050 (a prefilled email as the contact channel), TASK-057 (the offer page).

## 1. Context

- ADR-0023 had two paid products, a report and a researcher's study. Both stayed about the surname and never traced the buyer's family.
- The owner now wants the reverse in the paid tiers: a tree the reader builds and connects, and research into the reader's ancestors, with DNA.
- The free cards (TASK-055) and share cards (TASK-056) are live. Accounts, the tree, famous bearers and the report are not built.
- No business, Stripe account or consumer terms exist (ADR-0023 §2.5).
- The web app connects with a read-only role and writes nothing (ADR-0017 §2.3).

## 2. Decision

1. **Three tiers, prices in PLN including whatever VAT applies:**
   - **Free:**
     - the cards after a search, a share card for each answer, the full page with its sources, and the comparison;
     - later, a free account to keep cards and share them with friends.
   - **"Nazwisko i rodzina", 29.99 zł:**
     - the full surname report (ADR-0023's "Raport nazwiska");
     - famous bearers of the surname, under the owner's card rules: "shares the surname — not your relative", public facts only, a Wikipedia link, ordered by how widely known, no photos at first;
     - a family tree the reader builds, with more inputs (parents, grandparents, places, dates, maiden names), which they may connect to other readers' trees;
     - extra research drawn from the sources the site holds.
   - **"Genealogia z DNA", 499 zł:** research into the reader's family by professional genealogists, with DNA analysis. A partner carries it out, and the owner takes each enquiry over by email.
2. **Both paid tiers are "Wkrótce" until they exist and can lawfully be sold.** The offer page shows them with their prices and a way to ask, and never a buy button.
3. **A sign-up or an enquiry is an email to the owner.** The reader's own mail program sends it, prepared by the page as TASK-050's report link is. The site stores nothing, so the web app stays read-only. A stored waitlist waits for accounts, which need a writing role and a retention rule of their own.
4. **The partner is not named.** The page describes the service, not the provider:
   - archival research;
   - a tree with its documents;
   - help choosing a DNA test (autosomal, Y-DNA for the father's line, mtDNA for the mother's line) and analysis of one already taken;
   - a written report.

   The page asks readers not to send DNA results or health data by email.
5. **The tree and living people.**
   - A tree may hold living people only after the reader accepts terms at sign-up that say so, and say what the reader is responsible for.
   - A tree is private to its owner and the people they invite.
   - Connecting trees matches only people who have died.

   The accounts task specifies this, with a privacy notice update and an ADR of its own for the data it stores.
6. **What does not change:**
   - `PRODUCT.md` §7's rules hold in every tier.
   - The public surname pages never hold a family or a reader (§7.9).
   - No paid tier implies that a famous bearer or a surname's history is the reader's family.
   - The free answer is never put behind the paid tiers (§5).

## 3. Why not the alternatives

- **Keep ADR-0023's 24.99 and 149.99 zł.** The owner replaced them.
- **A sign-up form that stores emails on the server.** It needs a writing database role, a table and a retention rule. Accounts will need the same, so building it twice gains a little convenience for a page with no product behind it yet.
- **Naming the partner.** The owner asked not to.

## 4. Consequences

- `PRODUCT.md` §6 names the three tiers. §8's non-goals 1–3 (ancestor identification, the family tree, DNA) and 11 (subscriptions) are scoped to the free surname product. The paid tiers lift 1–3 under §2.5's conditions.
- Open, and recorded as D-024:
  - is 29.99 zł one payment or recurring?
  - is 499 zł paid to Name Atlas or to the partner?

  Both block checkout, not the offer page.
- The accounts task follows the offer page. It needs email + password sign-in, the terms acceptance of §2.5, a writing role, and a privacy notice update.
