# TASK-060 — One richer summary card: the page's preview and the story-size recap, from the same facts

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu` (`docs/progress/2026-10-01-summary-card.md`).
- **Requested by:** the project owner, 2026-10-01, on the "Twój wynik" screen: "make it look better, more info into one and presented more creative but not too much". The same message asks for a login button before the download; that waits for accounts (§4).
- **Decision:** ADR-0025 §2.7 (the cards), ADR-0012 (evidence travels with a figure), TASK-024's rule: a share image is drawn only from the validated public projection, and `og-facts.ts`'s rule of 2026-09-21 (a "1 in X" invites a comparison the data does not support when its list is not named). **This task relaxes that rule for the summary only:** the card shows one list's figure (the surname's main list) and names it beside the figure, so there is no unnamed denominator and no second list to compare. `ogFacts`, and the plain card for every state it refuses, are unchanged.
- **Depends on:** TASK-056 (share cards), TASK-057 (the offer page) and TASK-059 (the sign fix), all on `main`.
- **Model guidance:** implementation session.

## 1. Goal

The card at the end of the surname page — the one social previews use (1200 × 630) — and the story-size summary (1080 × 1920) say the same richer thing from one vocabulary (`summaryFacts`). The preview omits the meaning line, which has no room; the story card carries it, except for a name long enough to wrap:
- the surname;
- both counts, each with its list;
- rank and "1 na X" on the surname's main list, named;
- where it is most common, on a small map of Poland with that voivodeship lit;
- the change since the first stored edition, as one figure;
- old-print pages, when searched;
- one line of meaning, when ready, with its confidence word;
- the sources and their dates.

One composition, two sizes; the dusk look; "not too much": at most seven figures and one map. A growing surname's change is drawn with its sign in the interface face (TASK-059).

## 2. Facts (checked on `main` @ `e77194a`, 2026-10-01)

1. The page's preview is `og-facts.ts` + `og-card.tsx` (1200 × 630): the surname, a count per list, "1 in X" only where both lists share a denominator (they never do on PESEL), the thread, the PESEL date. `/pl/nazwisko/{slug}/opengraph-image` serves it, and `surname-page.tsx`'s "Twój wynik" shows it with "Udostępnij" and "Zapisz obraz".
2. The story-size summary is `shareFacts(response, "summary")` → `visual.kind = "recap"`: up to six tiles (women, men, rank, rarity, top voivodeship, old-print pages). Its rarity tile does not name the list, which the 2026-09-21 rule forbids; the deck's end card has the same gap.
3. The map and the scale are already drawn in `share-card.tsx` (`"map"`, `"scale"`); the band inputs come from `mapInputs` (`voivodeship-map-input.ts`).
4. `og-card.test.ts` pins `surnameSize` and the fonts; `og-facts.test.ts` pins the vocabulary's refusals (rights-blocked, not derived, no count). Those states still need a card that says so.
5. TASK-060 is free on `main` and in the open pull requests (#30, #44).

## 3. In scope

- **`share-facts.ts`:** the summary's `"recap"` visual becomes structured: `counts[]` (value + list), `rank` (+ list), `rarity` (+ list), `where` (name + bands, or null), `change` (figure + years, or null), `print` (pages, or null), `meaning` (line + confidence word, or null), `sources[]`. Every figure is one the page prints; nothing is added.
- **`share-card.tsx`:** draws the structured recap in story size.
- **`og-card.tsx`:** draws the same recap at 1200 × 630 when the response resolves with figures; keeps today's plain card for the refusal states from `og-facts.ts`.
- **`deck.tsx`:** the end card's rarity line names the list.
- **"Twój wynik":** the lede says what the card now carries; the buttons stay as they are.
- Tests: every figure on both cards appears in the page's rendered text, in both languages; a refusal state renders the plain card; the rarity names its list wherever it is shown.

## 4. Out of scope

- The login button before the download: it comes with accounts (TASK-061, email + password, the terms that allow living people in a tree). Until then the download stays free.
- A video, animation or music.
- Any change to the contract or the read path.

## 5. Acceptance criteria

- **AC-1.** For a response with every section ready and the map's coverage above its threshold, `summaryFacts` carries the surname, the counts with their lists, rank and rarity with the main list named, the top voivodeship, the change and the old-print pages, and every figure in them is in the page's rendered text, in both languages (unit tests). The story card also carries the meaning line and its confidence word; the preview does not.
- **AC-2.** A section that is not ready leaves its slot out, and a map whose coverage is low is left out as the page withholds its figures (unit tests). A state `ogFacts` refuses renders the plain card with its caveat and no figure: the one-line condition in `renderOgCard` is not unit-tested (the card cannot be rendered under vitest), and the plain layout was not re-rendered for a refusal state.
- **AC-3.** The 1200 × 630 and 1080 × 1920 images render with the brand fonts; looked at for NOWAK, KOWALSKA, ZAREMBA, KOWALSKI, AALAM (few sections ready) and two synthetic 21-letter double-barrelled names used for layout only and never published.
- **AC-4.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then both images for those surnames, from production's saved responses, looked at. "Twój wynik" in headless Chromium at desktop and phone sizes is not part of this task's verification: only the lede's wording changed on that screen.
