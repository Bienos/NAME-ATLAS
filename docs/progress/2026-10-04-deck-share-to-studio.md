# 2026-10-04 — The deck's "Udostępnij kartę" leads to the share studio

Branch `claude/tender-curie-ybiyaj`, on `origin/main` @ `8ed3533` (rebased from `78cf936`). A follow-up to TASK-093 (#101) and TASK-097 (#109). The owner said "Do pls" to the proposal that the deck's top button should lead to the studio, so there is one way to share.

## Changed

- `deck-client.tsx`: the top-bar "Udostępnij kartę" was a button that fetched the card's image, shared or saved it, and on a 401 showed "Obraz zapiszesz po zalogowaniu." with a sign-in link. It is now a link to the share studio for the card in view.
  - The studio already holds the image, the card, the video, the download gate and the sign-in that returns to it.
  - The fetch, the "sharing" state, the in-card prompt (`DeckSignIn`, `.deck-gate`) and the `signIn` prop are removed.
- `deck.tsx`: a card's `share` is now the studio address (`/pl/nazwisko/{slug}/udostepnij?card={card}`): its own image's card, or the summary where it has none (the catalogue card shares `print`, as before). `deckSignIn` is removed.
- `surname-page.tsx`: no longer passes the prompt or the "sharing" label, and no longer reads `accountsEnabled` for the deck.
- `messages.ts`: `deckSharing`, `deckSignInToSave` and `deckSignIn` removed in both languages.
- `globals.css`: the share link loses its underline. The `.deck-share:disabled` and `.deck-gate` rules are removed.
- `deck.test.ts`:
  - The share addresses now expect the studio; added the rarity and catalogue cards.
  - TASK-064 AC-8's tests of `deckSignIn` are replaced by tests that the button is a link to `current.share`, that no image fetch or prompt is left, and that every share address is one `safeNext` accepts.
- `STATUS.md` and ADR-0034 §4 are updated to say so.

## Verified

- `pnpm typecheck`, `format:check`, `check:ids`: exit 0.
- `pnpm test`: exit 0, with `apps/web` at 780 tests in 71 files; after the rebase onto `8ed3533`, 786 in 72, and `typecheck`, `lint`, `format:check`, `check:ids` and `build` exit 0 again.
- `pnpm build`: exit 0.
- `pnpm lint`: the first run failed on an `accountPath` import left unused in `deck.tsx`. It was removed, and the run passed.
- **In a browser:** headless Chromium against `next start` of this build and the local fixture register. On `/pl/nazwisko/nowak?view=cards`, the deck's "Udostępnij kartę" has `href="/pl/nazwisko/nowak/udostepnij?card=summary"`. Clicking it opened the studio ("Twoja karta"), no `.deck-gate` element was left, and there were no page errors.

## Not verified

- A card with its own image other than the summary, in a browser: the fixture surname has only the summary card. The unit tests cover the rarity and catalogue cards' addresses.
