# TASK-104 — The surname's PDF: every card in one file, for a reader who may download

- **Status:** IMPLEMENTED 2026-10-04 on `claude/surname-pdf`; record: `docs/progress/2026-10-04-surname-pdf.md`.
- **Requested by:** the project owner, 2026-10-04: "pełen pdf do ściągnięcia powinien być też". Asked who may take it, they chose "Zalogowani za darmo": the same gate as the card's image.
- **Decision:** no new ADR. The PDF is the studio's card images put together (ADR-0034); it adds no claim, fact or data path, and uses TASK-064's gate.
- **Depends on:** TASK-056 (the card images), TASK-064 (the gate), TASK-093 (the studio).

## 1. Goal

A reader who may download a card (accounts off, or a session) can download one PDF with every card the studio offers for the surname, summary first, one per page.

## 2. In scope

- `/pl/nazwisko/{slug}/pdf` and `/en/surname/{slug}/pdf`: a PDF of the studio's cards (`studioCards`), each page 405 × 720 pt (9:16) filled by that card's 1080 × 1920 image, drawn by the same `renderShareCard` from the same validated facts, with each card's source and date. Title "{SURNAME} — Name Atlas", language set, `Content-Disposition: attachment; filename="{stem}-name-atlas.pdf"`, `X-Robots-Tag: noindex`.
- The card's gate: 401 without a session, 503 when the accounts database cannot say, private and uncached with a session, public and cached with accounts off. A retired address 308s to the new one's PDF; an unknown surname or one with no card is 404.
- The studio: "Pobierz PDF ze wszystkimi kartami" / "Download a PDF of every card", shown where the card's own buttons are; never to a reader the gate turns away.
- One dependency, `pdf-lib` 1.17.1 (MIT, pure JavaScript): no installed package writes a PDF.

## 3. Out of scope

- Text, chapters or figures that are not on the cards; a cover or contents page.
- A preview PDF for a reader without a session.
- Payment: the PDF is part of the free account (the owner's answer).

## 4. Acceptance criteria

- **AC-1.** `cardsPdf` makes one 405 × 720 pt page per image, in order, with the title (unit).
- **AC-2.** Without a session the route answers 401 and reads nothing; with an unavailable accounts database, 503 (unit).
- **AC-3.** The studio shows the link with `off` and `open`, and not with `sign-in` (unit).
- **AC-4.** Against `next start` and a local register, `/pl/nazwisko/{slug}/pdf` answers `application/pdf` as an attachment named after the surname, and the page shows the card.
- **AC-5.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
