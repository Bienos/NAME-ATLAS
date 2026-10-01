# 2026-10-01 — TASK-059: a share card's figure draws its sign in the interface face

Branch `claude/friendly-brown-6n5iwu`, built on `main` @ `a459afa` (#61). Task file: `tasks/059-share-card-sign.md`.

## Why

While rendering a new summary card from ZAREMBA's saved production response, its change figure read "−0,9%". `formatPercentChange(0.9, "pl")` gives "+0,9%" and the response says the count grew from 6,154 to 6,208. The cause is the font: the static `Fraunces-Medium.ttf` the share cards ship draws "+" under `next/og` as a bar with its vertical stroke displaced under the next digit. A test image in the three brand fonts showed Instrument Sans and IBM Plex Mono drawing "+" correctly, and Fraunces drawing "−" correctly. Production's `/pl/nazwisko/zaremba/karta/change` (TASK-056, #59) had the same defect, so a growing surname's change card said the opposite of the page.

## What changed

- `share-card.tsx`: a `Figure` component draws a leading "+" or "−" in Instrument Sans (semi-bold, 78% of the figure's size, a small gap) and the rest in Fraunces; the card's headline figure uses it. Both signs are set apart so they look alike.
- `share-figure.test.ts` (new): four tests.
- `STATUS.md`: the Production line brings #61's deploy and the live defect; the analytics line records what was seen on production; the share-cards line names the fix.

## Verification

Run on 2026-10-01 after the last edit:

- `pnpm format:check`, `typecheck`, `lint`, `check:ids`, `build` — exit 0.
- `pnpm test` — exit 0, 1,669 tests (4 new in `share-figure.test.ts`).
- Rendered through a temporary route (not committed) from the saved production responses: ZAREMBA's change card reads "+0,9%" and NOWAK's "−3,6%", each with a clean sign (looked at).
- On production (before the fix), `/pl/nazwisko/zaremba?view=cards` in headless Chromium: the deck's change card, which draws its figures as HTML in the page's web Fraunces, reads "+0,9%" and "+6,5%" correctly. The defect is confined to the images.
- `grep` for signed figures in non-test source: the only server-drawn ones are the change card's headline (`share-facts.ts`, now through `Figure`) and sentences set in Instrument Sans.

## Not verified

- Production after the merge (the deploy follows it): `/pl/nazwisko/zaremba/karta/change` should read "+0,9%".
- `pnpm test:integration` and `pnpm test:golden`: not in this task's verification; nothing on the read path changed.
