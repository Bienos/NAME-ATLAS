# 2026-10-04 — TASK-108: a better share video

## Changed

- `apps/web/src/lib/share-card.tsx`: `CARD_LAYERS` (`base`, `reveal`, `intro`, `intro-name`), `isCardLayer`; `cardFace` hides parts by opacity per layer; the figure, its note and the visual sit in one block the video brings in; `introFace` draws the opening plate; `renderShareCard` takes an optional layer and question. The plain card's drawing is unchanged.
- `apps/web/src/lib/share-route.ts` and the two card routes: `?layer=` passed through; an unknown layer is 404 before any read.
- `apps/web/src/lib/share-video.ts`: a new timeline (`videoSchedule(count, options)`: opening, cards, closing for the full length), `layerUrls`, drawing with the surname wiped in from the left and each card's figures rising in whole and faded, a push from below or from the side. `makeCardVideo` reads every layer in parallel and takes the reader's options.
- `apps/web/src/lib/studio-client.tsx`, `share-studio.tsx`, `messages.ts`, `globals.css`: two choices above "Pobierz wideo" (length, transitions), in both languages.
- Tests: `share-video.test.ts` (the timeline rewritten, the layer addresses), `share-route.test.ts` (layers).
- `tasks/108-better-video.md`, `STATUS.md`.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`, `pnpm build`: exit 0. `apps/web`: 825 tests in 77 files.
- Local PostgreSQL 16 + PostGIS 3 with the PESEL fixture register (as in `docs/progress/2026-10-04-surname-pdf.md`), `next start` of this build, accounts off:
  - `/pl/nazwisko/nowak/karta/summary?layer=` `base`, `reveal`, `intro`, `intro-name`: 200 each; `?layer=x`: 404.
  - `base` with `reveal` composited over it against the plain card (Pillow): differences only inside the figures' box, at most 2/255 per channel (anti-aliasing).
  - **Chrome for Testing 154.0.8037.92**, headless, the studio at `/pl/nazwisko/nowak/udostepnij?card=summary`: the two choices showed ("Długość", "Przejścia"); "Pełne" + "Z dołu" downloaded `nowak-wideo.mp4` in 3.2 s, "Krótkie" + "Z boku" in 2.2 s; no page errors. `ffprobe` of both: one stream, h264 High, 1080 × 1920, 30/1, 210 frames, 7.000 s, no audio. Frames taken at 0.15, 0.7, 1.3, 2.0, 2.4, 2.9 and 5.0 s showed the plate without the surname, the surname part drawn ("NOWA"), the whole plate, the push to the card, the card without its figures, the figures in, and the held card; at 2.0 s the side clip showed the push from the side.

## Not verified

- A clip of several cards from a live server: the fixture surname has only the summary card. The order, the closing summary and the lengths are covered by the unit tests.
- Safari, Firefox and phones. Where H.264 encoding is missing the button stays hidden, as before.
- The time to read 16 images for seven cards in production.
