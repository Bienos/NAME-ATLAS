# TASK-093 — The share studio: the deck's last card leads to a page with the card's preview, a soft sign-in gate, and download, copy and share

- **Status:** IMPLEMENTED 2026-10-04 on `claude/tender-curie-ybiyaj`; record: `docs/progress/2026-10-04-share-studio.md`.
- **Requested by:** the project owner, 2026-10-03: the deck's end should "leave the cards" for a page where a signed-in reader can "copy, download the card … share on Instagram", and later make a video. Asked to choose, they said "soft gate, no music in v1, write task A". This is task A; the video is a later task.
- **Decision:** ADR-0034 (proposed here). It amends ADR-0022 §2.4, ADR-0025 and ADR-0027 §5.4.
- **Depends on:** TASK-056 (the share cards), TASK-062 and TASK-064 (accounts and the gate), all on `main` @ `08516bd`.
- **Model guidance:** implementation session.

## 1. Goal

The deck's last card ends the deck. Its main action, "Twoja karta jest gotowa", leads out of the deck to a share studio for that surname. Every reader sees the studio with a preview of the card. Downloading, copying and sharing the full image need a session when accounts are on, and sign-in returns to the studio. **With accounts off, the studio gives everyone the full actions**, so production behaves as today apart from the new page.

## 2. Facts (checked on `main` @ `08516bd`, 2026-10-03)

1. The last card is `key: "end"` in `apps/web/src/lib/deck.tsx` (around line 715). It holds up to four recap cells (`dk-recap`) and five links of equal weight in `dk-actions`: `ShareButton` (the page's link), `deckFullPage`, `compareFromHere`, `searchAnother`, `deckOffer`.
2. Each deck card has `share`, the path of its story image, or the summary's where it has none (`deck.tsx` around line 785, `shareCardPath`). The keys that have an image are `SHARE_CARDS` in `share-facts.ts`; `summary` is one of them.
3. The story image is 1080 × 1920 (`SHARE_SIZE`, `share-card.tsx`), drawn by `renderShareCard(facts, host, headers)`. `shareCardResponse` in `share-route.ts` answers 404 for an unknown card, then applies the gate (`download-gate.ts`: `off`, `open`, `sign-in`, `unavailable`), then reads the register. `open` is served `private, no-store`, `off` publicly cached.
4. `SurnameDeck` (`deck-client.tsx`) clamps `go()` at the last card, so "next" and `ArrowRight` do nothing there. Its top-bar "Udostępnij kartę" fetches `current.share` and, on a 401, shows `DeckSignIn`'s line beside that card.
5. `safeNext` (`account-paths.ts`) accepts only `/pl/nazwisko/{slug}` and `/en/surname/{slug}`, optionally with `?view=cards`.
6. The surname page does not read the session and must not (TASK-064 §2.3). `deckSignIn(lang, path, accountsEnabled())` builds the deck's prompt (`surname-page.tsx` line 392).
7. The messages are in `apps/web/src/lib/messages.ts`, Polish and English, with a parity test.

## 3. In scope

### 3.1 The deck's end

- On the `end` card the recap cells stay. Above the links, one primary link: **"Twoja karta jest gotowa →" / "Your card is ready →"**, to the studio (`?card=summary`). It is a plain link, so the deck closes by navigation.
- Below it, only `deckFullPage` and `searchAnother`. `ShareButton`, `compareFromHere` and `deckOffer` move to the studio (§3.3).
- On the last card the deck's "next" control becomes a link to the same address, labelled with the same words for screen readers. `ArrowRight` on the last card follows it. On every other card nothing changes.

### 3.2 The preview image

- `/pl/nazwisko/{slug}/karta/{card}/podglad` and `/en/surname/{slug}/card/{card}/preview`: the same card at 540 × 960, with a band across its lower third reading **"Podgląd · Name Atlas" / "Preview · Name Atlas"**. It is public and cached like the image with accounts off (`CACHE`), **whatever the gate**. It is not a way to get the full image: half the size, marked, and no larger variant.
- One handler for both languages, in `share-route.ts` beside `shareCardResponse`, with the same 404, 308 and 503 rules and no gate. `renderShareCard` takes the size and the band as options. The full image is unchanged.

### 3.3 The studio page

- `/pl/nazwisko/{slug}/udostepnij` and `/en/surname/{slug}/share`, `?card={key}` with `key` in `SHARE_CARDS`. A missing or unknown `card` means `summary`. A retired slug redirects as the page does; a surname with no answer is a 404.
- **Dynamic and private:** it reads the session cookie through `downloadGate`, answers `Cache-Control: private, no-store`, and carries `robots: noindex`. It is not in any sitemap.
- **Contents, in this order:** the surname and "Twoja karta" / "Your card"; a row to pick the card among those the surname has (`SHARE_CARDS` that are not 404 for it, summary first), each a link to `?card=`; the image; the actions; then `ShareButton` (the page's link), `compareFromHere`, `searchAnother`, `deckOffer`, and a link back to the deck (`?view=cards`).
- **By gate verdict:**
  - `off` or `open`: the full image (`<img>` of the existing route) and three buttons. **"Udostępnij"** uses the phone's share sheet with the file where `navigator.canShare({ files })` is true, and is hidden otherwise. **"Pobierz"** downloads `{fileStem}-{card}.png`. **"Kopiuj obraz"** writes the image with `navigator.clipboard.write` and a `ClipboardItem` built from a promise (Safari requires it), and is hidden where `ClipboardItem` is missing. Each says what happened ("Skopiowano", "Nie udało się skopiować") in a `role="status"` line. Under them, one line: **"Na Instagramie: udostępnij z telefonu albo pobierz i wyślij obraz na telefon."** / "For Instagram: share from your phone, or download and send the image to your phone." The share and download logic now in `deck-client.tsx`'s `shareCard` moves to one module that the deck and the studio both import, unchanged in behaviour.
  - `sign-in`: the preview image, and in place of the buttons **"Zaloguj się, aby pobrać i udostępnić kartę."** / "Sign in to download and share the card." with a sign-in button (`next` = this studio address with its `card`) and a sign-up link. The rest of the page is the same.
  - `unavailable`: the preview image and "Pobieranie jest chwilowo niedostępne. Spróbuj za chwilę." / "Downloads are unavailable for a moment. Try again shortly."; the page answers 200, not 503, since the page itself is fine.
- **The return:** `safeNext` also accepts `/pl/nazwisko/{slug}/udostepnij` and `/en/surname/{slug}/share`, each optionally with `?card={key}` for a key in `SHARE_CARDS`, under the same slug and length rules.

### 3.4 Tests and docs

- Tests: the preview route (size, band text in both languages, public cache header for every verdict, 404/308/503); the studio's verdict branches and headers; the card picker's default and an unknown `card`; `safeNext` for the new addresses and hostile variants (another `card`, two `card`s, an extra parameter, a fragment); the end card's primary link and its reduced links; the last card's "next" target; the shared share/download module (the deck's existing tests keep passing against it); the messages' parity.
- Docs: ADR-0034, ADR-0027 §5.4 (marked "Amended by TASK-093"), ADR-0022 §2.4 and ADR-0025 marked as amended, `docs/CODEMAP.md`, `STATUS.md`, a progress record.

## 4. Out of scope

- **The video** (a later task, no music in v1), and any placeholder for it in the studio.
- A QR code from the desktop studio to the phone (a new dependency, and the phone would need its own session).
- Carrying `next` through sign-up and its mail (TASK-064 §4, ADR-0034 §4); social sign-in or magic links (ADR-0027 §2.1).
- Changing the deck's top-bar "Udostępnij kartę" button or its 401 line; gating the 1200 × 630 image, its "Zapisz obraz" link or the page-link button.
- Turning accounts on; the offer's wording (D-025); any new figure, claim or text on the card itself.
- Any analytics or funnel events.

## 5. Acceptance criteria

- **AC-1.** The end card has one primary link to the studio with `?card=summary`, then only the full page and another surname; the deck's "next" on the last card, and `ArrowRight` there, lead to the same address; other cards are unchanged (unit).
- **AC-2.** The preview routes answer a 540 × 960 PNG with the band in the page's language and the public cache header, with accounts on and no cookie as well as off; an unknown card or surname is 404, a retired slug 308, a database down 503 (unit).
- **AC-3.** The studio answers `private, no-store` and `noindex` for every verdict, and never sets the surname page's cache headers (unit).
- **AC-4.** With `off` or `open` the studio shows the full image and the actions; with `sign-in` the preview, the prompt and a sign-in link whose `next` is the studio address with its `card`; with `unavailable` the preview and the message, status 200 (unit).
- **AC-5.** The studio's card row lists only the cards the surname has, summary first; a missing or unknown `card` shows the summary (unit).
- **AC-6.** `safeNext` accepts the studio addresses with or without a valid `card` and refuses every hostile variant in §3.4, and the sign-in action redirects to a valid studio address after success (unit).
- **AC-7.** The deck's top-bar share and the studio's buttons use the same module, and the deck's existing share tests pass unchanged (unit).
- **AC-8.** All new strings exist in both languages (the parity test).
- **AC-9.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then a local run in headless Chromium, accounts on, as in TASK-064 §6: from the deck's last card to the studio; anonymous, the preview and the sign-in prompt; after sign-in, back on the studio with the full image, and the download producing a 1080 × 1920 PNG; with accounts off, the studio's full actions for an anonymous reader. Copy and the share sheet cannot be exercised headless: say so in the progress record rather than claiming them. What the empty local register cannot show also goes there.
