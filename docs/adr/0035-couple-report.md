# ADR-0035 — The couple report: two surnames' facts side by side, with no score

- **Status:** Proposed 2026-10-04. It becomes accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-04
- **Deciders:** the project owner.
  - Asked whether "a name and couple compatibility" had been added, they were told it had not. Then, offered what a couple report could show from the data already held, and three framings, they were offered:
    - **A**, "Wasze nazwiska razem": a keepsake report on two families' names, facts side by side, no score;
    - **B**, A plus one stated overlap figure for where the two names live;
    - **C**, a playful compatibility percentage, advised against.
  - They answered **"A"**.
  - Asked in the same message to "confirm 'couple' replaces the current tiers (D-025)" and to approve "an ADR plus a task", they answered **"ok, ok"**.
- **Amends:** ADR-0026 §2.1, by D-025 §1 (below). It does not yet replace ADR-0026's tier list on the offer page: D-025 §2–§4 are still open.
- **Relates to:** D-025 (the owner's tier set of 2026-10-01, which names "couple" at 89,99 zł), D-033 (no count of an exact first name and surname), ADR-0001 (confidence and rights apart), ADR-0023 §2.5 (no real payments before the legal and tax gates), TASK-025 (the two-surname comparison).
- **Implemented by:** TASK-100.

## 1. Context

- The two-surname comparison (TASK-025, `/pl/porownaj`, `/en/compare`) is free, `noindex`, and sets two surnames' register facts next to each other.
- The surname result (`docs/contracts/surname-result.md`) already carries, per surname: population and rank, the voivodeship distribution, change over time across stored editions, the other grammatical form (`other_form`, for -ski/-cki/-dzki), a sourced meaning or a stated absence, famous bearers, and localities of the same name.
- The PESEL lists hold hyphenated surnames as surnames of their own (`docs/sources/pesel.md` "Nazwisko aktualne"; ADR-0018's `HYPHENATED_TOP`).
- No source states that two names are compatible. A score would be a figure nothing measures, which `AGENTS.md` §9 and `PRODUCT.md` §7 forbid.
- No checkout exists, and ADR-0026 §2.2 shows paid tiers as "Wkrótce", never with a buy button.

## 2. Decision

1. **The couple report** is a page about two surnames, one per partner. Working title: **"Wasze nazwiska razem"** / "Your names together". It belongs to the "couple" tier (D-025, 89,99 zł).
2. **It shows only validated claims that already exist,** for each of the two surnames, side by side:
   - **The names a couple could carry:** each surname, its other grammatical form where `other_form` gives one, and the two joined orders (A-B, B-A). Each one shows how many people the register lists under it, or that it is not on the list. A name that is not on the list is never shown as zero (`AGENTS.md` §10).
   - **Where each name lives:** each surname's voivodeship distribution, on two maps or one table with two columns. The page does not compute an overlap, a shared region or any figure from the two together.
   - **How common each name is, and its change** across the stored editions, each with its own list.
   - **What each name means,** or the stated absence of a sourced meaning (contract invariant 16).
   - **Famous bearers** and **localities of the same name**, under their existing card rules ("shares the surname — not your relative").
3. **No score, percentage, verdict or prediction about the couple.** No wording says the names "match", "suit" or "belong together". That includes playful wording.
4. **No figure for the exact first name and surname** (D-033). Given names are not on the first version of the report.
5. **Not sold yet.** The report is built dark behind a flag, `noindex`, and outside any sitemap, until accounts are live and checkout exists (ADR-0023 §2.5). Its place on the offer page waits for D-025 §2–§4.

## 3. Why not the alternatives

- **B, one overlap figure.** The owner chose A. A defined overlap index would need its own stored claim and method. It can be added later by a new ADR without changing what A shows.
- **C, a compatibility percentage.** No source measures it. It would put on a paid page the kind of number the product promises never to show.
- **Building it into the free comparison.** The owner placed it in the "couple" tier. The free comparison keeps its current contents.

## 4. Consequences

- One new page per language, dark behind a flag, built from existing claims and up to a few extra register lookups for the joined names. No new source, claim type or migration.
- D-025 §1 is answered. D-025 §2–§4 (the 800 zł tier and DNA, where the tree and famous bearers sit, payment shape and who takes 800 zł) remain open, and so does what the other new tiers hold.
- If double surnames turn out to be rare on the lists, most couples will see "not on the list" for the joined forms. That is the honest answer, and the page states it.
