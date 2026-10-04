# ADR-0037 — Five tiers: free with an account, 28,99, 89,99, 199 and 800 zł, all one-time

- **Status:** Proposed 2026-10-04. It becomes accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-04
- **Deciders:** the project owner, through the answers recorded in `docs/DECISIONS_NEEDED.md` D-025 (2026-10-04), D-024 and D-034.
  - D-025 §1: the set named on 2026-10-01 replaces ADR-0026's tiers ("a, whole set").
  - D-025 §2: "dna yes in 800 tier".
  - D-025 §3: "famous berers free connecting tress free but then to unlock more than 2nd cousins or add more ppl oyu have to have paid tier"; then, by multiple choice: a free tree holds 5 people, with matches up to second cousins; "Any paid tier" unlocks more.
  - D-025 §4 and D-024: "once as not sure how to make a subscription from it yet"; the 800 zł is paid to Name Atlas.
  - D-034: "tree free with sign up".
- **Supersedes:** ADR-0026 §2.1 (the three tiers and their contents) and §4's open questions (answered by D-024). ADR-0026 §2.2–§2.6 still hold: paid tiers stay "Wkrótce" with no buy button, a sign-up or an enquiry is an email the reader sends, the partner is not named and readers are asked not to send DNA results or health data by email, the tree's rules on living people and on connecting only people who have died, and `PRODUCT.md` §7 in every tier. ADR-0023 §2.4–§2.5 still hold: no real payments before the owner's legal and tax gates.
- **Amends:** ADR-0035 §2.5 (the couple report's place on the offer page no longer waits for D-025).
- **Changes:** `PRODUCT.md` §6 and §8.
- **Implemented by:** TASK-104 (the offer page); TASK-111 (the tree's 5-person cap, on the server, with an entitlement that answers "no paid tier" for every account until checkout exists). The second-cousin limit waits for tree matching; the unlock's wiring and checkout are later tasks.

## 1. Context

- ADR-0026 (2026-10-01) set three tiers: free, "Nazwisko i rodzina" at 29,99 zł and "Genealogia z DNA" at 499 zł. `/pl/oferta` and `/en/offer` show them (TASK-057).
- The same evening the owner described a different set outside this repository: "smaller research" 28,99 zł, "couple" 89,99 zł, "family review" 199 zł, "genealogist research" 800 zł. D-025 recorded it and asked four questions. All four were answered on 2026-10-04.
- The tree is free with an account (D-034). Famous bearers and connecting trees are free too (D-025 §3).
- No checkout, entitlement, business or consumer terms exist (ADR-0023 §2.5).

## 2. Decision

1. **Five tiers, prices in PLN including whatever VAT applies, each a one-time payment:**

   | Tier | Price | Holds (confirmed) |
   |---|---|---|
   | Free, with an account | 0 | the cards, a share card per answer, the full page and the comparison; famous bearers; a family tree of up to 5 people; connecting trees, with matches up to second cousins |
   | "smaller research" | 28,99 zł | the tree unlock |
   | "couple" | 89,99 zł | the couple report (ADR-0035), and the tree unlock |
   | "family review" | 199 zł | the tree unlock |
   | "genealogist research" | 800 zł | research by a partner genealogist with DNA analysis, paid to Name Atlas, "coming soon"; and the tree unlock |

   **The tree unlock** is the same in every paid tier: a tree of more than 5 people, and matches beyond second cousins.

2. **Only what is confirmed is shown.** What else the 28,99 zł and 199 zł tiers hold was drafted in the owner's 2026-10-01 chat and is not confirmed. The offer page lists the tree unlock for them and nothing more until the owner confirms more. A later ADR, or an amendment to this one, adds it.
3. **Names.** The owner's names are working names in English. The English page uses them ("Smaller research", "Couple", "Family review", "Genealogist research"). The Polish page uses this session's renderings, which the owner may change without a new ADR: "Małe poszukiwania", "Para", "Przegląd rodziny", "Badanie genealogiczne".
4. **The 800 zł tier** keeps ADR-0026 §2.4's description of the service (archival research, a tree with its documents, help choosing a DNA test and analysis of one already taken, a written report) and its two rules: the partner is not named, and the page asks readers not to send DNA results or health data by email. The reader pays Name Atlas, which pays the partner (D-024). That makes Name Atlas the seller of the partner's service, which the consumer terms and invoicing (ADR-0023 §2.5) must cover before it is sold.
5. **The way to ask.** Each of the 28,99, 89,99 and 199 zł tiers has the waiting-list email, naming the tier and its price in the subject. The 800 zł tier keeps the enquiry email. Nothing is stored (ADR-0026 §2.3).
6. **Not yet built, and not built by the offer page:** the 5-person cap, the matches limit, the unlock, an entitlement, checkout. Until they are, the free tier's tree is "coming soon" with the account, and every paid tier is "Wkrótce".

## 3. Why not the alternatives

- **Keep ADR-0026's three tiers.** The owner replaced them (D-025 §1).
- **Fill in the 28,99 zł and 199 zł tiers from the 2026-10-01 draft.** The owner did not confirm that draft. `AGENTS.md` §9 prefers a gap to a plausible guess.
- **Hide the 28,99 zł and 199 zł tiers until their contents are confirmed.** The owner confirmed their prices and the unlock; showing them with only that is true.
- **Subscriptions.** The owner chose one-time payments for now. `PRODUCT.md` §8's non-goal 11 holds for every tier.

## 4. Consequences

- `PRODUCT.md` §6 lists the five tiers; §8's line on non-goal 11 records that it holds.
- D-025 and D-024 are closed by this ADR once it is accepted.
- Open, for the owner: what else the 28,99 zł and 199 zł tiers hold.
- Later tasks: the tree's 5-person cap and the second-cousin limit; an entitlement that lifts both for any paid tier; checkout in test mode (ADR-0023 §2.4) with one-time prices; the couple report's link from the offer page once it can be sold.
- Two strings outside the offer page still name the tier that no longer exists: the tree landing's eyebrow and line "Część pakietu Nazwisko i rodzina" (`tree-text.ts`, already untrue since D-034; the tree pages are dark), and the bearers chapter's "Pozostałe osoby ({n}) pokażemy w raporcie „Nazwisko i rodzina”" (`messages.ts`; no bearers are loaded in production). They are left for their own task: which tier, if any, shows the remaining bearers is not decided.
