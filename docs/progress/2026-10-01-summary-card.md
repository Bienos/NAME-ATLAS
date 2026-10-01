# 2026-10-01 — TASK-060: one richer summary card, from one set of facts, for the preview and the story image

Branch `claude/friendly-brown-6n5iwu`, built on `main` @ `e77194a` (#62). Task file: `tasks/060-summary-card.md`.

## Why

The project owner, on the "Twój wynik" screen: "make it look better, more info into one and presented more creative but not too much". The page's 1200 × 630 preview showed the surname and two counts; the story-size summary showed six plain tiles. The same message asks for a login before the download; that waits for accounts and is not in this change.

## What changed

- `share-facts.ts`: `summaryFacts(response, lang)` (new, pure) is the summary's whole vocabulary: the counts with their lists, the rarity of the surname's main list with its rank and its place on the page's scale, the top voivodeship with the map's bands, the change with its years, old-print pages, the meaning's line with its confidence word and its own source, and the figures' sources. A section that is not ready is null; a map whose coverage is low is left out, as the page withholds its figures. The rarity scale and the map bands are now shared helpers, used by the rarity and where cards too. The summary card's `recap` visual carries this structure instead of six tiles.
- `share-card.tsx`: `Recap` draws it in story size (two count tiles, the rarity as the hero on its scale, the lit map beside three figures, the meaning's quote). It routes the change figure through `Figure` (TASK-059), so a growing surname's "+" is never set in Fraunces. The explanation is smaller on this card, and a name of more than 17 letters, which wraps, drops the meaning line.
- `og-card.tsx`: `renderOgCard(facts, summary)` draws the same facts in landscape (the surname, the counts, "1 na X · #n · list", two pills, the lit map) when there is a summary and `ogFacts` states no caveat; every other state renders the plain card as before. The header and the thread were pulled into `Head` and `Foot` so both layouts share them. `surnameSize` takes an optional measure (its default is unchanged).
- The two `opengraph-image.tsx` routes pass `summaryFacts` to it.
- `deck.tsx`: the end card's rarity cell names its list. `messages.ts`: the "Twój wynik" lede says what the card carries.
- **A decision, recorded in the task file:** `og-facts.ts`'s rule of 2026-09-21 kept a "1 in X" off a 1200 × 630 card unless both lists share a denominator, so no unnamed denominator invites a comparison. The summary shows one list's figure and names it beside the figure, which meets the rule's concern; `ogFacts` itself and the plain card are unchanged.

## Verification

Run on 2026-10-01 after the last edit:

- `pnpm format:check`, `typecheck`, `lint`, `check:ids`, `build` — exit 0.
- `pnpm test` — exit 0, 1,679 tests (10 new in `deck.test.ts`: the figures are the page's own in both languages; the main list leads and each figure names its list; the meaning's source stays out of the figures' sources; a low-coverage map is left out; a count-only response has only its counts; an unresolved surname has no summary; the change chip's sign is in Instrument Sans; `Recap` draws only the slots that have facts).
- Both images rendered through a temporary route (not committed) from the saved production responses and looked at: NOWAK, KOWALSKA, ZAREMBA (a "+0,9%" chip with a clean plus), KOWALSKI, AALAM (three of seven sections ready: the card holds the count, the rarity and the scale only) and two synthetic 21-letter double-barrelled names used for layout only (the name wraps on both cards and nothing overlaps; the story card drops the meaning).

## Not verified

- Production: the change deploys with the merge.
- The plain card for a state `ogFacts` refuses (rights-blocked, not derived): `renderOgCard` takes that branch on `facts.caveat`, a condition under `og-facts.test.ts`'s existing facts tests but not itself rendered or unit-tested here.
- "Twój wynik" in a browser at desktop and phone sizes: only its lede's wording changed.
- `pnpm test:integration` and `pnpm test:golden`: not in this task's verification; nothing on the read path changed.
