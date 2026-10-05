# 2026-10-05 — TASK-121: the surname's PDF at 200 dpi

## Changed

- `apps/web/src/lib/share-sheet.tsx`: `SHEET_SCALE` is 4/3 instead of 2. The 1240 × 1754 layout is drawn at 1653 × 2339 px (A4 at 200 dpi) instead of 2480 × 3508 px (300 dpi), 4/9 of the pixels. The canvas size is rounded to whole pixels. The layout, text and facts are unchanged.
- `share-pdf.ts`: the comment on `PDF_PAGE`.
- `share-pdf.test.ts`: the sheet is A4 at 200 dpi across and down.
- `tasks/121-surname-pdf-200-dpi.md`, `docs/CODEMAP.md`, `STATUS.md`.

## Verification

- **Speed and size:** the renderer and `sheetPdf` were timed on the contract-parsed KOWALSKI fixture from `deck.test.ts`, by a throwaway vitest script (not committed), in this container. Each run was one warm-up, then five timed runs of `renderSurnameSheet` plus `sheetPdf`.
  - 300 dpi, before the change: median 3,923 ms (4,448, 4,226, 3,923, 3,880, 3,891); PDF 834,874 bytes.
  - 200 dpi: median 1,583 ms (2,204, 1,741, 1,533, 1,522, 1,583); PDF 570,682 bytes.
- **The 200 dpi file:** `pdfinfo`: 1 page, 595.28 × 841.89 pts (A4). `pdfimages -list`: one 1653 × 2339 image at 200 × 200 ppi.
- **How it looks:** rendered with `pdftoppm` at 200 dpi, the page has the same layout as at 300 dpi. A full-resolution crop of the meaning panel shows the smallest text, its source line (11.5 layout px, about 5.5 pt), legible.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`, `pnpm build`: exit 0. `apps/web`: 897 tests in 86 files.

## Not verified

- Time on Vercel. TASK-118's deploy check measured 10.8 s for a first download of `/pl/nazwisko/kowalski/pdf` at 300 dpi; that time also includes the database read and a cold start, which this change does not touch.
- Printing the page.
