# ADR-0023 — the paid offer: a surname report and a researcher's study

- **Status:** Accepted 2026-10-01, by the project owner's decision in the session that wrote it.
- **Date:** 2026-10-01
- **Superseded in part by:** ADR-0026 (2026-10-01). Three tiers replace §2.1–§2.3's two products: free, 29.99 zł and 499 zł genealogy with DNA. §2.4–§2.5 still hold.
- **Deciders:** the project owner: "Price is 24.99 and 149.99 for some extra pro research". Asked what the higher price buys, they chose "A person researches". Asked whether a business and a Stripe account exist, they chose "Not yet, build in test".
- **Supersedes:** `PRODUCT.md` §6's "No subscription, no credits, no tiers at MVP", for the second product only; and `docs/canonical/23`'s commerce scope of "one product: `FULL_SURNAME_REPORT`". `docs/canonical/23` is not edited; this ADR records what the product now does instead.
- **Relates to:** `PRODUCT.md` §6 (premium scope) and §10 (paid MVP readiness), `docs/canonical/23` M4–M6, ADR-0007 and ADR-0014 (rights).

## 1. Context

- `PRODUCT.md` §6 allowed one one-time purchase at MVP: a report that sells depth and synthesis, offered only where the surname's sources hold real inventory.
- `docs/canonical/23` orders the work: historical discovery (M3), premium viability on a surname sample (M4), the report built and delivered with an internal test entitlement before any payment (M5), then commerce through Stripe-hosted Checkout in PLN (M6).
- The owner set two prices and wants the higher one to buy a person's research.
- No business account, Stripe account, VAT position or consumer digital-content terms exist yet.

## 2. Decision

1. **Two products, both one-time guest purchases, in PLN:**
   - **Raport nazwiska**, 24.99 zł: the automatic report `PRODUCT.md` §6 describes, built from approved claims, immutable and versioned, offered only when the surname's inventory is non-trivial.
   - **Badanie eksperckie**, 149.99 zł: the same report, plus research by a person into the surname's historical forms, places and archive references, delivered as a written addition to the report.
2. **The researcher's study stays about the surname.** It never traces the buyer's family, ancestors, descent, nobility or ethnicity (`PRODUCT.md` §7–§8). What the researcher writes is held to the same rules as the automatic report: every statement cites its source, and where the sources stop, the study says so.
3. **No subscription and no credits.** The two products are the only tiers.
4. **Build order is unchanged.** Data first, then inventory, then the report with a test entitlement, then checkout. Checkout is built against Stripe's test mode and takes no real money.
5. **Going live with real payments waits on the owner**, for: a registered business, a Stripe account approved for it, the VAT and invoice position (KSeF), consumer digital-content terms with the withdrawal flow, and the privacy notice updated for orders and email. These are `docs/canonical/23`'s legal and tax gates, not engineering tasks.

## 3. Why not the alternatives

- **One product at 24.99 zł.** The owner chose two.
- **A deeper automatic report as the 149.99 zł tier.** The owner chose a person's research. An automatic report six times the price, built from the same sources, would sell little that the first does not.
- **Taking payments before the report exists.** A paid order with nothing reliable to deliver is the failure `docs/canonical/23` M5 is ordered to prevent.

## 4. Consequences

- `PRODUCT.md` §6 names both products.
- The researcher's study needs an order queue and a way for a person to deliver their text into the report. That workflow, and how long delivery takes, is specified with the commerce task.
- The checkout task must keep both products' prices in one place, and the offer must show the price with VAT as a Polish consumer sees it.
