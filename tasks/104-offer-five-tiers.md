# TASK-104 — The offer page shows the owner's five tiers (ADR-0037)

- **Status:** IMPLEMENTED 2026-10-04 (`docs/progress/2026-10-04-offer-five-tiers.md`).
- **Requested by:** the project owner, 2026-10-04: an ADR superseding ADR-0026's tiers with the set recorded in D-025, a task for it, and the offer page updated.
- **Decision:** ADR-0037 (proposed here).
- **Depends on:** TASK-057 (the offer page), TASK-065 (the landing's offer strip), all on `main` @ `f56f86e`.
- **Model guidance:** implementation session.

## 1. Goal

`/pl/oferta` and `/en/offer` show ADR-0037's five tiers with their prices and only what the owner has confirmed they hold. The paid four stay "Wkrótce" / "Coming soon" with no way to buy.

## 2. Facts (checked on `main` @ `f56f86e`, 2026-10-04)

1. `apps/web/src/lib/offer-text.ts` holds the tiers' words in both languages (`offerDocument`) and builds the two `mailto:` addresses; `offer-page.tsx` renders them; `offer-form.tsx` is the forms' client island.
2. The landing's offer strip (`LandingOffer` in `landing-sections.tsx`) renders every tier `offerDocument` holds and links to the waiting list at `#tier-family`.
3. The waiting list's subject names "Nazwisko i rodzina (29,99 zł)"; the enquiry's names "Genealogia z DNA (499 zł)".
4. Nothing on the page sells: a test forbids "kup", "zamów", "zapłać", "buy", "checkout", "pay now" and "stripe".

## 3. In scope

1. `offer-text.ts`: five tiers in both languages, in ADR-0037 §2.1's order: free, "Małe poszukiwania" / "Smaller research" 28,99 zł, "Para" / "Couple" 89,99 zł, "Przegląd rodziny" / "Family review" 199 zł, "Badanie genealogiczne" / "Genealogist research" 800 zł.
   - Free: the cards, a share card per answer, the full page and the comparison, famous bearers; a note that a free account is coming, with a tree of up to 5 people connected to others through ancestors who have died, matches up to second cousins.
   - Every paid tier: the tree unlock, one shared line.
   - "Couple": the couple report as ADR-0035 frames it, with no score.
   - 800 zł: ADR-0026 §2.4's service description, kept.
   - 28,99 zł and 199 zł: the unlock only.
   - The page's lede says the paid tiers are one-time payments.
2. The waiting-list email for each of the 28,99, 89,99 and 199 zł tiers, with the tier and price in its subject; the enquiry email for 800 zł.
3. The landing strip's waiting-list link points at the first paid tier, `#tier-smaller`.
4. Tests updated; one test that the paid tiers hold only the confirmed items and the two languages have the same shape.
5. Docs: ADR-0037, `PRODUCT.md` §6 and §8, `docs/CODEMAP.md`, `docs/DECISIONS_NEEDED.md` (D-025, D-024), ADR-0026's status line, `STATUS.md`, a progress record.

## 4. Out of scope

- The tree's 5-person cap, the second-cousin limit, the unlock, an entitlement (a later task).
- Checkout, Stripe, accounts.
- Linking the couple report from the offer page (it is dark and cannot be sold).
- Contents for the 28,99 zł and 199 zł tiers beyond the unlock.
- The tree landing's and the bearers chapter's references to "Nazwisko i rodzina" (ADR-0037 §4).

## 5. Acceptance criteria

- **AC-1** Both pages show the five tiers with their prices, the paid four as "Wkrótce" / "Coming soon", and no way to buy.
- **AC-2** Each paid tier lists the tree unlock; 28,99 zł and 199 zł list nothing else; Polish and English have the same tiers, items and notes.
- **AC-3** Each paid tier has a prefilled email: a waiting list naming the tier and price, or for 800 zł the enquiry; the DNA request stays on the page.
- **AC-4** Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm check:ids` pass.
