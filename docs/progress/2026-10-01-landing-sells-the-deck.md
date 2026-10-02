# 2026-10-01 — TASK-065: the landing sells the deck — a question, four examples, the cards, the offer

Branch `claude/optimistic-gauss-sp4p9d`, built on `main` @ `fd6a871` (#64). Task file: `tasks/065-landing-sells-the-deck.md`.

## Why

The project owner asked for the landing to be "more commercial na clear and engaging and interesting", and, on the proposals that followed, "do changes". On production at about 21:00 UTC the landing read "Każde nazwisko gdzieś się zaczęło.", showed nothing of the deck before a search, named the offer nowhere but the header and footer links, and ran the top-10 lists and the seven plates (about eight phone screens) before how it works and the comparison.

## What changed

- **`messages.ts`** (both languages): the headline is a question ("Ile osób nosi / Twoje nazwisko?", "How many share / your surname?"); the lede names what the answer holds (the count, the rarity, where it is most common, the change since 2019, and the meaning and old prints where sources exist); the trust line adds "za darmo · bez konta"; new words for the example surnames, the cue, "Co dostaniesz" and the offer's strip.
- **`landing-sections.tsx`**: `LANDING_TRIES` (NOWAK, ZAREMBA, KOWALSKA, ŻMUDA-TRZEBIATOWSKI) and `LandingTries`, each a `/?surname=` search, which opens the deck (ADR-0019 §2.6); `LandingCue`, the link down the page; `LandingPreview`, the example surname's deck faces laid flat with their numbers in the deck and a link to the whole deck; `LandingOffer`, the three tiers as `offerDocument` words them (status, name, price, lede) with links to the offer page and its `#tier-family` waiting list. `LandingHow` gained `id="how"`. None of them derives a figure.
- **`page.tsx`**: `exampleDeck(lang)` reads ZAREMBA (`LANDING_EXAMPLE`) through `querySurnameResult`, parses the contract, takes the stored address with `currentPathFor`, renders the faces with `deckCards` and keeps rarity, where and change; it fails soft (no answer, no section; logged as `landing_example_failed`) and keeps an answer ten minutes per process. The hero carries the tries and, at its foot, the promises and the cue; the ground is ordered preview, how, offer, compare, the most common surnames, then the atlas under `#atlas`.
- **`globals.css`**: the tries, the foot and the cue (hidden on phones, where the ground follows at once), the preview row (a swipe row on a phone, three abreast from 64rem; `.dk-card.preview-card` undoes the pile's positioning and the row grows to its tallest face), the offer's strip, the ground's `#atlas` scroll margin. The headline's measure is 16ch.
- **`landing-sections.test.ts`**: five new tests (the tries' links and encoding, the cue, the preview's faces and numbers and its empty states, the strip's words and links with nothing to buy); the "never says where a family lives" test now covers the new sections and strings.
- `STATUS.md`, `docs/CODEMAP.md`, the task file.

## Verified

Run on 2026-10-01 after the last code edit (only Markdown changed afterwards):

- `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm check:ids` ("every task, ADR, migration and decision number is used once"), `pnpm test` and `pnpm build` — each exit 0. `apps/web`: 39 files, 428 tests, all passing; the workspace's other packages all passing.
- The built app, served with `next start` and no `DATABASE_URL`, looked at in headless Chromium: `/` and `/?lang=en` at 390 × 844, `/` at 1440 × 900. The question, the lede, the pill, the four surnames, the two promises under the map, the cue at the foot from a tablet up; no "Co dostaniesz" and no common surnames (both fail soft, logged as `landing_example_failed` and `common_surnames_failed`), then how it works, the offer's strip, the comparison, the atlas.
- "Co dostaniesz" looked at from a static render (a temporary test, not committed) of `LandingPreview`, `LandingHow` and `LandingOffer` with the site's stylesheet, the faces from `deckCards` over ZAREMBA's production answer (`/api/v1/surname-results?surname=ZAREMBA`, fetched 21:24 UTC), both languages, 390 × 844 and 1440 × 900: the rarity, where and change faces numbered 02, 04 and 05, each with its source and date; three abreast on desktop, a swipe row with the next card peeking on a phone.

## Not verified

- The landing with a database, end to end: `exampleDeck`'s path through `querySurnameResult`, `currentPathFor` and `deckCards` was exercised only in the static render, from the production JSON. It deploys with the merge; the go-live check should look at `/` for the three cards and the link to `/pl/nazwisko/zaremba?view=cards`.
- The ten-minute keep per process: not measured.
- The dusk zoom with the hero's new children: the stylesheet hides every child of the stage but the status and the analysis panel during the zoom, as before; not run in a browser.
- `pnpm test:integration` and `pnpm test:golden`: not in this task's verification; nothing on the read path changed.
