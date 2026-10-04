# TASK-108 — A better share video: an opening plate, figures that move in, and the reader's choice of length and motion

- **Status:** IMPLEMENTED 2026-10-04 on `claude/better-video`; record: `docs/progress/2026-10-04-better-video.md`.
- **Requested by:** the project owner, 2026-10-04: "zrób jakoś lepszą kreację video". Asked what to make better, they chose "Animowane liczby i mapa", "Intro z nazwiskiem" and "Wybór stylu/długości".
- **Decision:** ADR-0034 §2.6 (the video is drawn from the same validated facts as the card). No new ADR. TASK-097 §4 left "counters, maps drawn in" out of its scope; this task brings figures and the map in **without counting**: a counter from 0 would show numbers that are not the register's, and presentation never derives facts (`AGENTS.md` §10). Each figure, its note and the visual (the map among them) rise in whole and faded.
- **Depends on:** TASK-097 (the video), TASK-056 (the card images).

## 1. In scope

- **Card layers** on the existing card routes, behind the same gate: `?layer=base` (the card with its figure, note and visual hidden), `?layer=reveal` (only those, on a transparent ground, in the same places), `?layer=intro` (the opening plate: wordmark, the question "Ile osób nosi to nazwisko?" / "How many people carry this surname?", the host) and `?layer=intro-name` (the surname alone, larger). Hiding uses opacity, so every layer keeps the full card's layout. An unknown layer is 404. A coverage warning is never held back.
- **The clip:** the opening plate with the surname drawn in from the left (0.9 s), then each card pushed in and held while its figures rise in (0.6 s, 56 px, faded in); the full clip ends on the summary again.
- **Choices in the studio:** length "Pełne (wszystkie karty)" (up to seven cards, about 7–20 s) or "Krótkie (ok. 7 s)" (up to three cards, no closing); transitions "Z dołu" or "Z boku".
- **Tests:** the timeline (segments, lengths, wipe, reveal, push), the layer addresses, the route's layers.

## 2. Out of scope

- A count-up or any number not on the card; music; themes other than the cards' own.

## 3. Acceptance criteria

- **AC-1.** The timeline opens on the surname, gives the cards in order, closes on the summary in the full clip only, and lasts 7–20 s (full) or 7–8 s (short) for one to seven cards (unit).
- **AC-2.** A known layer is drawn behind the card's gate; an unknown one is 404 and reads nothing (unit).
- **AC-3.** Against a local server, `base` with `reveal` laid over it matches the full card.
- **AC-4.** In Chrome, the studio's button makes an H.264 1080 × 1920 30 fps MP4 with no audio for each choice.
- **AC-5.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
