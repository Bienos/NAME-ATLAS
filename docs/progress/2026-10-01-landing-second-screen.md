# 2026-10-01 — TASK-065, second cut: the hero as the mockup, the second screen explains the product

Branch `claude/optimistic-gauss-sp4p9d`, on top of `a979f73` (the first cut, `docs/progress/2026-10-01-landing-sells-the-deck.md`, which this record supersedes where the two differ). Task file: `tasks/065-landing-sells-the-deck.md`.

## Why

After the first cut the project owner sent ADR-0021's hero mockup ("Każde nazwisko gdzieś się zaczęło.", the lede, the pill, Poland on the horizon, the two promises at the foot): "this is my ideal starting point but then the next window should better explain it on commercial level". The first cut had changed the hero's words, put four surnames and a cue into it, and led the ground with the cards alone.

## What changed

- **The hero is the mockup again**, word for word and in layout: `landingHeadline`, `landingHeadlineEm`, `landingLede` and `landingTrust` are the values production had before TASK-065, the trust line is alone at the foot of the stage, and the cue and the surnames are gone from it (`page.tsx`, `globals.css`: `.landing-trust` as before, no `.landing-foot`, no `.landing-cue`, the phone's stage height as before). The mockup's "598 476 nazwisk" stays off the line (ADR-0021 §2.7: the lists are never summed).
- **The second screen is `LandingPitch`** (`landing-sections.tsx`, replacing `LandingPreview`): an eyebrow ("Co dostaniesz · za darmo · bez konta"), "Wpisz nazwisko i dostań karty z odpowiedziami.", a lede naming the sources, six numbered questions each with what answers it (`pitchAnswers` in `messages.ts`: the count, the rarity, where it is most common, the change since 2019, the meaning "gdy je ma", old prints), the note that a missing answer is said plainly, the four surnames to try (`LandingTries`), and, when the example loaded, "Trzy z kart dla nazwiska ZAREMBA" with the three faces and the link to the whole deck. Without an example the cards are left out and the rest stands.
- **The order on the ground** is now pitch, the offer's strip, how it works, compare, the most common surnames, the atlas (the offer moved up, before how it works).
- `landing-sections.test.ts`: the second-screen tests replace the cue and preview tests (six questions in both languages, the cards when given, none when not, the surnames to try, the strip); the "never says where a family lives" test covers the pitch and its strings.
- `STATUS.md`, `docs/CODEMAP.md`, the task file (§1, §3, AC-1, AC-2).

## Verified

Run on 2026-10-01 after the last code edit (only Markdown changed afterwards):

- `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm check:ids`, `pnpm test` and `pnpm build` — each exit 0. `apps/web`: 39 files, 428 tests, all passing; the workspace's other packages all passing.
- The built app, served with `next start` and no `DATABASE_URL`, looked at in headless Chromium: `/` at 390 × 844 and 1440 × 900, and the scroll from the hero into the second screen at phone width. The hero reads as the mockup; the second screen shows the eyebrow, the heading, the lede, the six questions, the note and the four surnames, then the offer's strip, how it works, the comparison, the atlas. No cards and no common surnames without a database (both fail soft, logged as `landing_example_failed` and `common_surnames_failed`).
- The second screen with cards, from a static render (a temporary test, not committed) of `LandingPitch`, `LandingOffer` and `LandingHow` with the site's stylesheet, the faces from `deckCards` over ZAREMBA's production answer (fetched 21:24 UTC), both languages, 390 × 844 and 1440 × 900: the questions, the surnames to try, then the rarity, where and change faces numbered 02, 04 and 05, each with its source and date, three abreast on desktop and a swipe row on a phone.

## Not verified

- The landing with a database, end to end (as in the first record): `exampleDeck`'s path was exercised only in the static render. The go-live check should look at `/` for the three cards under the six questions and the link to `/pl/nazwisko/zaremba?view=cards`.
- The ten-minute keep per process: not measured.
- `pnpm test:integration` and `pnpm test:golden`: not in this task's verification; nothing on the read path changed.
