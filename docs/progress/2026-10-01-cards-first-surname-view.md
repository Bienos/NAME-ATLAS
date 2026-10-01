# 2026-10-01 — TASK-055: after a search, the surname opens as a deck of cards

Scope authority: `tasks/055-cards-first-surname-view.md`. Decision: ADR-0025, accepted by the project owner on the prototype ("ok, lets do it", 2026-10-01). Built on `main` @ `02e988f`.

## What changed

- **Contract `surname-result` 1.10.** Two sections, required and nullable. `neighbours`: per list the surname is ranked on, the surname and up to two surnames either side, with rank and count. A list holds the surname exactly once, in rank order, with counts never rising. `other_form`: the -ski/-cki/-dzki ↔ -ska/-cka/-dzka counterpart ranked on the other list, under the literal rule code `ADJECTIVAL_SKI_CKI_DZKI`, never the surname itself. `docs/contracts/surname-result.md` records 1.9 → 1.10 and rules 25–28.
- **Read path.** `packages/truth/src/neighbours.ts` reads both from active `CURRENT_RANK` claims, which already carry `rank`, `count`, `universe.comparability_group` and `snapshot_date`; no new derivation. A tie at the surname's own place is not listed. Where more surnames share a neighbouring place than fit, which of them are listed is fixed by the surname id.
- **Migration 0026**, one partial index on active rank claims keyed by list, rank and surname id. Without it a rare surname's neighbours took 290–660 ms on the full register (see Verification). The page works without it, only slower, so the deploy may come before the migration. `query.ts` sets both on rarity's state and surface: when rarity is not `READY`, neighbours are `UNAVAILABLE` or `RIGHTS_BLOCKED` with rarity's reason, and the other form is null.
- **The page.** The rarity chapter shows the neighbours under each list and the other form, with a note that it says nothing about kinship. The archive chapter shows Polona's catalogue records by kind (Polona's own labels; English names for the known ones). `sections.ts` lists `neighbours` and `other_form` as the rarity chapter's `also` fields, so the registry test still covers every contract section.
- **The deck.** `apps/web/src/lib/deck.tsx` renders the faces on the server from the validated response, with the page's formatters: the surname, rarity (a dot field up to 1 in 400, the page's log scale above), neighbours (radio tabs when there are two lists), where (the page's map, the coverage warning first), change (a line over the known points and both percentages), the other form, meaning, old print (pages by period and one quoted public-domain page), Polona's catalogue by kind, and a summary with share, full page, compare and search. A section that is not ready has no card. Each card has its source and date at its foot. `deck-client.tsx` draws nothing before hydration. Once hydrated, it renders the pile in a node at the end of `<body>` and makes the rest of the page inert while open. It moves by swipe, drag, arrow and Page keys, Home and End, buttons, a tap on the card's outer thirds, or the list of cards on a desktop. "Cała strona" or Escape closes the deck and removes `view` from the address. With the deck closed, a "Zobacz karty" button opens it.
- **Opening it.** The search redirect on `/` adds `view=cards` after any `intent`. A surname picked from the search box's suggestions gets it too. Neither changes the canonical URL.
- **Docs.** ADR-0025 accepted, TASK-055 implemented, `STATUS.md` (and its Production line, now `02e988f`), `docs/CODEMAP.md`.

## Verification (run 2026-10-01, on this branch)

- `pnpm typecheck`, `lint`, `check:ids`: each exit 0. `format:check`: exit 0 after Prettier rewrapped two new test files.
- `pnpm test`: exit 0, 1,634 tests. They include `deck.test.ts` (14), which checks:
  - the card order with every section ready;
  - only the surname and summary cards when only the count is ready;
  - no deck for an unresolved surname;
  - every figure on a card in both languages also appears in the page's rendered text;
  - the coverage warning before the map;
  - no kinship words on the other-form card;
  - no server markup from the deck;
  - `view=cards` after the intent, and no `view` in the canonical URL.

  `surname-result.test.ts` gained 8 tests for the new schemas, and `neighbours.test.ts` 4 for the pairing rule.
- `TEST_DATABASE_URL=… pnpm test:integration` against a local PostgreSQL 16 with PostGIS: exit 0, 29 files, 342 tests. They include `rank-neighbours.test.ts` (8): two places either side with counts, one list per list ranked on, ties, a superseded rank never listed, KOWALSKI ↔ KOWALSKA both ways, NOWAK and WÓJCIK unpaired, JANKOWSKI unpaired when JANKOWSKA has no rank, the plan using `claims_current_rank_value_idx`, and a response the contract accepts.
- `TEST_DATABASE_URL=… pnpm test:golden`: exit 0, 4 files, 364 tests.
- `pnpm build`: exit 0.
- **Timing on the full register.** A local database held the two official 2026 lists from `data/` as 598,476 surnames and 828,264 active rank claims, ranked by competition (production holds 828,262: two mixed-script surnames have none). On it, the neighbours query (`PREPARE`d, run three times each):
  - through 0021's index alone: NOWAK 2–4 ms, ZAREMBA 1.5–3.7 ms, AALAM (3 people, a place shared by 53,958 surnames) 549–658 ms, KURTISHVILI (2 people, 106,813) 291–311 ms. The plan walked 55,826 and 118,775 rows of the other list.
  - through 0026's index: every one 1.0–1.8 ms.
  - the home page's most-common read still takes 0021's index on that database.
- A fresh database migrated through 0026, then `pnpm db:generate-types`: `db.ts` unchanged.
- The deck, with headless Chromium at 1440 × 900 and at 390 × 844 with touch:
  - It ran on `next dev` through a temporary local route, removed before commit.
  - The route rendered `CanonicalSurnamePage` from production's own 1.9 responses for KOWALSKI, ZAREMBA and NOWAK, fetched at 14:13 UTC. To each it added `neighbours` and `other_form`, computed from the two official 2026 lists in `data/` by competition ranking. For example: KOWALSKI #2 between NOWAK and WIŚNIEWSKI, #6 103 on the women's list (535), and KOWALSKA 67,308, #2.
  - Every card was reached by arrow key on the desktop and by a tap on the right edge on the phone: 9, 8 and 9 cards.
  - Escape and "Cała strona" closed the deck and removed `view`, and the button reopened it.
  - While open, every other child of `<body>` was inert and `<html data-deck>` was set. Focus moved to the deck, and back to the button after closing.
  - No console or page errors. No horizontal overflow on the full page at either width.

## Not verified

- The deck on production, and migration 0026 on the production database. It is applied by the next Register VM `shift` or `archive` step; until then the neighbours of a rare surname are read the slow way.
- A real touch swipe on a phone. Only Chromium's emulated taps were run; drag was exercised only by the code path shared with the mouse.
- Screen readers. The deck announces "n z N: title" in a live region, but no assistive technology was run.
