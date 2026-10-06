# TASK-155 — The comparison, redesigned, and the 15,99 zł full-name comparison

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-comparison-redesign-full-names.md`).
- **Requested by:** the project owner, 2026-10-06, in a Claude Code session: "redesign me the whole porównanie nazwisk a za 15.99 PLN możesz porównać imię i nazwisko i innym też" ("redesign the whole surname comparison, and for 15.99 PLN you can compare first name and surname, with others too").
- **Decision:** D-049 (this session's reading of those words; the owner may correct it). ADR-0023 §2.5 (no real payment is sold yet), ADR-0032 §7 and D-033 (no count of people with both names), D-044 §5 (only the tiers from 28,99 zł up unlock the tree). No new ADR.
- **Numbers:** TASK-155, D-049, migration 0046: free on `main` and in open pull requests on 2026-10-07 (`main` holds TASK-151 to TASK-154 from #182, #183, #184 and #186; open #187 holds TASK-154, D-048, ADR-0047 and migration 0045). This task was numbered 151, 153 and 154, with D-048 and migration 0045, on its branch while those merged or opened.
- **Model guidance:** implementation session.

## 1. Goal

The free surname comparison reads as one designed page in Brand System v1 (its own `.atlas-v1` scope), and a signed-in reader holding the 15,99 zł product can put up to four people's first names and surnames side by side, from the same claims every other page reads.

## 2. Facts (2026-10-06)

1. `/pl/porownaj` and `/en/compare` (TASK-025, TASK-052) are a stack of plain tables under the shared shell; the gate on what may be ranked is `compare.ts` (same partition, same date, same denominator).
2. The truth package already reads every first-name figure a page may show: `readGivenNameFacts` (register count and rank per list), `readBirthNameFacts` (children given the name, by year, with the direction), `readGivenNameMeaning` (origin and meaning, quoted per work), and `findBirthGivenName` (a typed name to its row).
3. `mapInputs` draws any number of regional breakdowns on one shared scale.
4. The 8,99 zł product (TASK-144) is the pattern for a product sold only in test-mode checkout: a `PurchaseTier`, a `CHECKOUT_TIERS` entry, a migration widening `purchases_tier_known`, an entitlement list checked by `hasPurchaseOf`, a locked card with "Wkrótce" and no button.

## 3. In scope

1. **The free comparison, redesigned** (picker and result) in Brand System v1, page by page in the `.atlas-v1` scope as `docs/brand/MIGRATION_GUIDE.md` and TASK-151 do (the global migration, TASK-149, is reverted), same address, same facts, same gates: two name plates with the "a / vs" mark, the disclaimer first, each comparable count drawn as two bars on one scale, rarity as two figures with the verdict, the two maps and their table, the surnames' own pages, and a second comparison started from the page. The picker: two fields with the mark between, example pairs, what the comparison shows. The couple picker keeps its own words through the same component.
2. **N-way gates** in `compare.ts` for two to four people: a partition is ranked or drawn on one scale only when every present figure shares its date (and unit, or denominator for rarity); an absent figure is said, never drawn as zero.
3. **The full-name comparison**: `/pl/porownaj/imie-i-nazwisko` and `/en/compare/full-name`, a 404 unless `FULL_NAME_COMPARE_ENABLED` is exactly `1` and accounts are on; `noindex`, `private, no-store`, in no sitemap, disallowed in `robots.txt` with the comparison. Signed out: what it is and a sign-in link that returns here. Signed in without the product: the form and the locked card ("15,99 zł · Wkrótce", no button) and nothing is read. With it: two to four people (first name and surname each); per person the first name's register count and rank per list, the children given it in the latest year with rank and direction, its origin and meaning as quoted; the surname's count, rarity and map; across people, bars on one scale where the gates allow; the plain statement that no source counts people with both names.
4. **The product**: key `fullnames`, 1599 grosze, "Porównanie imion i nazwisk" / "Full-name comparison", in `PurchaseTier`, `CheckoutTier`, `CHECKOUT_TIERS`; `FULL_NAME_COMPARE_TIERS` = `fullnames` and the three tiers from 28,99 zł up; migration 0046 (the CHECK; down refuses while a `fullnames` purchase is stored). It does not unlock the tree or the baby-names figures.
5. Links: the free comparison links to the full-name comparison only while it exists.
6. Tests, and the records: D-049, a one-line note in ADR-0037 §2.1, `docs/CODEMAP.md`, the progress record, `STATUS.md`.

## 4. Out of scope

Live payments, a live key, a buy button or checkout link on any public page; production or Vercel variables; the Register VM; the offer page's tiers (a seventh needs the owner's wording); a count of people with a first name and a surname together; ranking first names across the two sexes' lists or summing them; a page per name pair; the couple report's content.

## 5. Acceptance criteria

- **AC-1:** the free comparison renders the same figures as before through the same pairwise gates; a not-comparable pair still says why and draws nothing; the disclaimer comes before any figure.
- **AC-2:** a figure absent on one side is never drawn as a zero bar, on either page.
- **AC-3:** with the flag off, or accounts off, both full-name addresses answer 404 and nothing links to them.
- **AC-4:** signed out, no figure and a sign-in link; signed in without `fullnames` or a tier from 28,99 zł up, the locked card, no button, and no claim read.
- **AC-5:** with the product, two to four people are compared; fewer than two complete people gives the form with an error; a fifth is never read.
- **AC-6:** the two sexes' register lists are never summed or ranked against each other; a name not on a list says so.
- **AC-7:** `fullnames` is accepted by the type, the constraint, checkout and the webhook at 1599 grosze only; it does not lift the tree cap; `babynames` does not open the full-name comparison.
- **AC-8:** the page states that no source counts people with both names, and shows no such count.

## 6. Verification

`pnpm format:check`, `pnpm check:ids`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`, `pnpm --filter web build`.
