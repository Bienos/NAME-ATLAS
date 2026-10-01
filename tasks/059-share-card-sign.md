# TASK-059 — A share card's figure draws its sign in the interface face

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu` (`docs/progress/2026-10-01-share-card-sign.md`).
- **Requested by:** nobody directly. Found by the session while rendering a new card (TASK-060, not yet built): ZAREMBA's change card on production reads "−0,9%", and the surname grew by 0,9%.
- **Decision:** TASK-056 §3 and TASK-012's rule that a figure on a card is the page's own: a card that reverses the direction of a change states something the page does not.
- **Depends on:** TASK-056 (share cards), on `main`.
- **Model guidance:** implementation session.

## 1. Goal

A positive change reads as positive on every share card: "+0,9%", not "−0,9%".

## 2. Facts (checked on `main` @ `a459afa`, 2026-10-01)

1. `formatPercentChange` returns the right string: ZAREMBA's saved production response gives `count_change_percent` 0,9 for both lists and the function gives "+0,9%".
2. `share-card.tsx` draws the card's headline figure in the display face. The static `Fraunces-Medium.ttf` in `apps/web/assets/fonts/` draws "+" wrongly under `next/og`: a horizontal bar with the vertical stroke displaced under the next digit. Rendered in all three brand fonts, Instrument Sans and IBM Plex Mono draw "+" correctly and Fraunces draws "−" correctly.
3. On production (checked 2026-10-01, `/pl/nazwisko/zaremba/karta/change`) the figure reads "−0,9%" under the headline "Zmiany w czasie", with the card's own line below it saying the whole list changed "+6,5%". Any surname whose count grew is affected.
4. TASK-059 is free on `main` and in the open pull requests (#30, #44).

## 3. In scope

- A `Figure` component in `share-card.tsx` that draws a leading "+" or "−" in Instrument Sans (semi-bold) beside the digits in Fraunces, used by the card's headline figure.
- Tests: the sign is in the interface face and the digits are in the display face, in both languages; the text stays whole; an unsigned figure is untouched.

## 4. Out of scope

- Replacing the Fraunces file, or the page's own typography (the page loads Fraunces from Google Fonts, a different file).
- Any other card or the redesign of the summary card (TASK-060).

## 5. Acceptance criteria

- **AC-1.** `Figure` draws the sign of "+0,9%" and "−3,6%" in the interface face and the rest in the display face, and leaves "1 na 318" whole (unit tests).
- **AC-2.** The change cards for ZAREMBA (+0,9%) and NOWAK (−3,6%), rendered from their production responses, show the correct sign (looked at).
- **AC-3.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then, on production after the merge, `/pl/nazwisko/zaremba/karta/change` shows "+0,9%".
