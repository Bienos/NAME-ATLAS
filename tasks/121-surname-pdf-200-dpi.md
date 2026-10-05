# TASK-121 — The surname's PDF at 200 dpi, to make it faster

- **Status:** IMPLEMENTED 2026-10-05 on `claude/tender-albattani-d4y0ch`; record: `docs/progress/2026-10-05-surname-pdf-200-dpi.md`.
- **Requested by:** the project owner, 2026-10-05, after TASK-118's deploy check measured about 10.7 s for a first download: "make it faster, use 200 dpi".
- **Decision:** no new ADR. The sheet's layout and facts are unchanged; it is drawn at a lower resolution.
- **Depends on:** TASK-118 (the one-page sheet).

## 1. Goal

The surname's PDF is quicker to make, by drawing the sheet at 200 dpi instead of 300.

## 2. In scope

- `share-sheet.tsx`: `SHEET_SCALE` 4/3 instead of 2, so the 1240 × 1754 layout is drawn at 1653 × 2339 px, A4 at 200 dpi.
- The comments and test that name the resolution.

## 3. Out of scope

- Any change to the sheet's layout, text or facts, the route, the gate, headers or file name.
- Other ways to make it faster (caching, the PNG's alpha channel, the database read).

## 4. Acceptance criteria

- **AC-1.** The sheet's image is A4 at 200 dpi in both directions (unit).
- **AC-2.** The sheet looks as it did at 300 dpi, and its smallest text stays legible at print size (rendered and inspected).
- **AC-3.** Making the PDF from the KOWALSKI fixture is measurably quicker than at 300 dpi on the same machine.
- **AC-4.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
