# TASK-118 — The surname's PDF as one designed page

- **Status:** IMPLEMENTED 2026-10-05 on `claude/tender-albattani-d4y0ch`; record: `docs/progress/2026-10-05-surname-one-page-pdf.md`.
- **Requested by:** the project owner, 2026-10-05, of the studio's "Pobierz PDF ze wszystkimi kartami": "for pdf can you design a cool onepager? instead of all".
- **Numbering:** first opened as TASK-117; #139 took 117 on `main` first, so this is TASK-118.
- **Decision:** no new ADR. The sheet is the studio's cards laid out on one page (ADR-0034); it adds no claim, fact or data path, and keeps TASK-064's gate and TASK-107's route.
- **Supersedes:** TASK-107's page layout ("one per 9:16 page"). TASK-107's route, gate, headers and file name are unchanged.
- **Depends on:** TASK-056 (the cards' facts), TASK-060 (the summary), TASK-107 (the PDF route).

## 1. Goal

The surname's PDF is one A4 page that shows everything the studio's cards show, laid out as one designed sheet instead of a 9:16 card on each page.

## 2. In scope

- `sheetFacts` in `share-facts.ts`: the sheet's vocabulary, the facts of every card the studio offers with the summary's counts and sources. Pure; it says nothing a card does not.
- `share-sheet.tsx`: the sheet drawn with `next/og` in the cards' dusk, fonts and tokens, 1240 × 1754 (A4 at 150 dpi) drawn at twice that (300 dpi). The surname, its rarity on the scale and its counts across the top; the map beside where the surname is most common; a panel each for the neighbours, change, other form, meaning and old prints (on paper); the sources and the way back at the foot. Each panel keeps its card's explanation, source and date, and a coverage warning before its figure. A card the surname lacks leaves its panel out; a surname with only its count sits in the middle of the page.
- `share-pdf.ts`: `sheetPdf` makes one A4 page (595.28 × 841.89 pt) from the sheet's image; `surnamePdfResponse` draws the sheet instead of every card.
- The studio's link reads "Pobierz jednostronicowy PDF" / "Download a one-page PDF".

## 3. Out of scope

- A figure, text or chart that no card shows; a selectable text layer or links inside the PDF.
- Any change to the route, the gate, caching, headers or the file name.
- The share cards, the video and the studio's layout.

## 4. Acceptance criteria

- **AC-1.** `sheetPdf` makes one A4 page with the title; the sheet's image has A4's proportions at 300 dpi (unit).
- **AC-2.** `sheetFacts` holds exactly the studio's cards, each equal to `shareFacts` for that card, the summary's counts and sources, only the summary for a count-only surname, and null for no answer (unit).
- **AC-3.** The sheet, drawn from the contract-parsed KOWALSKI fixture with every card at its longest (five neighbours, six periods of old prints, a meaning near the card's 220-character clip and a page at its 140-character clip), fits the page in both languages, and so does a 19-letter surname (rendered and inspected).
- **AC-4.** The route's gate tests still pass: 401 without a session and nothing read, 503 when the accounts database cannot say (unit).
- **AC-5.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
