# TASK-055 — After a search, the surname opens as a deck of cards

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu` (`docs/progress/2026-10-01-cards-first-surname-view.md`).
- **Requested by:** the project owner, 2026-10-01: cards to swipe by default, on desktop and phone, with a button to the full page, opening when someone types a surname. Prototype accepted ("ok, lets do it … and carry on with rest").
- **Decision:** ADR-0025.
- **Depends on:** TASK-053 (the journey and summary), TASK-054 (archive), TASK-051 (change over time), all on `main`.
- **Model guidance:** implementation session.

## 1. Goal

After a search on the site, the surname's address opens with a deck of cards over the full page: one answer per card, swiped on a phone and stepped through with arrows, keys or clicks on a desktop. "Cała strona" closes it. A visit without the search shows the page with a button that opens the deck.

## 2. Facts (checked on `main` @ `02e988f`, 2026-10-01)

1. The search answers on `/` and redirects to the surname's address, carrying `?intent=` only (`apps/web/src/app/page.tsx`).
2. The response (schema 1.9) holds population, rarity with the rank, distribution, change, meaning and archive. The archive section carries Polona's catalogue counts by category.
3. Every active `CURRENT_RANK` claim carries `rank`, `count`, `universe.comparability_group` and `snapshot_date`, and migration 0021 indexes the rank of active rank claims.
4. The register holds both forms of an adjectival surname as two surnames (KOWALSKI 66,589 on the men's list, KOWALSKA 67,308 on the women's list), with no link between them.
5. TASK-055, ADR-0025, contract 1.10 and migration 0026 are free on `main` and in the open pull requests #30 and #44.
6. Timed on the full 2026 lists (828,264 rank claims in a local database), a rare surname's neighbours took 290–660 ms through migration 0021's index: the two lists share rank values, and near the foot of a list one place is shared by up to 106,813 surnames.

## 3. In scope

- **Contract 1.10.** `neighbours`: per list, the surnames within two places of the surname's rank, from active rank claims, with counts, the list's date and the rarity section's surface. `other_form`: the -ski/-cki/-dzki ↔ -ska/-cka/-dzka counterpart, its list, count and rank, present only when both forms are in the register and the other form has a rank on the other list.
- **The deck.** A client component over the page, built from the validated response: the surname, rarity, neighbours, where, change, the other form, meaning, old print, Polona's catalogue, summary. No card for a section that is not ready. Swipe and drag, arrow keys, buttons, tap edges on touch, story-style progress, Escape and "Cała strona" to close. Polish and English.
- **Opening it.** The search redirect adds `view=cards`, and so does a surname picked from the search box's suggestions; the page shows a "Zobacz karty" button otherwise.
- **An index for the neighbours** (migration 0026): keyed on the list, the rank and the surname, so the neighbours of any surname are read without a sort (fact 6).
- **The page shows what the deck shows** (ADR-0025 §2.1). The rarity chapter gains the neighbours on each list and the other form; the archive chapter gains Polona's catalogue records by kind. Without them a card would carry a figure the page does not.

## 4. Out of scope

- Famous bearers (Wikidata) and localities with the same name (TERYT): their own tasks (ADR-0025 §2.7).
- A story video with music, and the paid report.
- Any other change to the full page's chapters.

## 5. Acceptance criteria

- **AC-1.** Against PostgreSQL: `neighbours` lists the surnames two places either side on the same list, with ties; `other_form` pairs KOWALSKI with KOWALSKA and leaves a surname without the ending unpaired.
- **AC-2.** The contract refuses a `neighbours` list without the surname itself, out of rank order, or with more than two places either side, and an `other_form` that is the surname itself or not on the fixed rule.
- **AC-3.** The deck renders one card per ready section and none for the rest; every figure on a card is the one the page prints (unit tests on rendered markup).
- **AC-4.** A search redirect carries `view=cards`; the canonical URL does not.
- **AC-5.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:integration` and `test:golden` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
TEST_DATABASE_URL=… pnpm test:integration && pnpm test:golden
```
