# 2026-10-05 — TASK-118: the surname's PDF as one designed page

## Changed

- `apps/web/src/lib/share-sheet.tsx` (new): the sheet drawn with `next/og`, 1240 × 1754 (A4 at 150 dpi) drawn at twice that, 2480 × 3508 px (300 dpi). In the cards' dusk, fonts and tokens: the wordmark and "Arkusz nazwiska" / "Surname sheet"; the surname; the rarity figure, its note, the counts and the rarity scale with its explanation and source; the map beside where the surname is most common (its coverage warning first); a row of neighbours, change and other form; a row of meaning and old prints (on the old-print card's paper); the summary's line, the counts' sources and the host, and "Sprawdź swoje nazwisko". Each panel keeps its card's explanation, source and date. A card the surname lacks leaves its panel out; a surname with no panel below the rarity sits in the middle of the page.
- `share-facts.ts`: `sheetFacts` and `SheetFacts`, the sheet's vocabulary: `shareFacts` for every card, the summary's counts and sources, the summary's line and the call to action. Null for no answer or no card. New words: "Arkusz nazwiska" / "Surname sheet" only.
- `share-card.tsx`: `DUSK` and `PAPER` exported for the sheet. The cards are unchanged.
- `share-pdf.ts`: `cardsPdf` (one 405 × 720 pt page per card) is replaced by `sheetPdf` (one A4 page, 595.28 × 841.89 pt, filled by the sheet's image); `surnamePdfResponse` draws the sheet once instead of every card. Its gate, 308, 404, 503, headers and file name are unchanged.
- `messages.ts`: the studio's link reads "Pobierz jednostronicowy PDF" / "Download a one-page PDF".
- `app/pl/nazwisko/[slug]/pdf/route.ts`, `app/en/surname/[slug]/pdf/route.ts`: comments only.
- Tests: `share-pdf.test.ts` (one A4 page with its title; the sheet in A4's proportions at 300 dpi), `deck.test.ts` (TASK-118: the sheet holds exactly the studio's cards, each equal to its `shareFacts`; the summary's counts and sources; only the summary for a count-only surname; null for no answer).
- `tasks/117-surname-one-page-pdf.md`, `docs/CODEMAP.md`, `STATUS.md`.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`, `pnpm build`: exit 0. `apps/web`: 878 tests in 83 files. The web build reports "Compiled with warnings"; the warnings are Next's own edge-runtime modules (`process.cwd` in `next/dist/esm/server/app-render/dynamic-rendering.js`), none traced to a changed file.
- The sheet rendered with `renderSurnameSheet` from `deck.test.ts`'s contract-parsed KOWALSKI response, by a throwaway script (not committed), and inspected as images: Polish and English; the same with every card at its longest (five neighbours, one an 18-letter name, six periods of old prints, a 216-character meaning (the card clips at 220), a 142-character page clipped to 140 and a 78-character title clipped to 70), in both languages; that with the 19-letter surname ŻMUDA-TRZEBIATOWSKI; and the count-only response. Every panel and the foot are on the page in each. 2.3–4.3 s a sheet in vitest; PNG 0.45–1.1 MB; PDF 0.29–0.97 MB. `pdfinfo` of the Polish file: title "KOWALSKI — Name Atlas", 1 page, 595.28 × 841.89 pts (A4).
- Local PostgreSQL 16 with PostGIS 3 (installed in this session), `pnpm db:migrate` through 0036, the four PESEL fixture files imported with the importers' library API by a throwaway script (not committed), population derived for seven surnames, `pnpm seo:backfill-slugs`. Rank, rarity and distribution were refused (`INCOMPLETE_UNIVERSE`; `NO_APPLICABLE_EVIDENCE`), as they should be over a fixture, so the live sheets show the counts only. Against `next start` of this build, accounts off:
  - `/pl/nazwisko/nowak/pdf`: 200, `application/pdf`, `attachment; filename="nowak-name-atlas.pdf"`, `x-robots-tag: noindex`, `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400`, 293,241 bytes in 2.9 s. `pdfinfo`: title "NOWAK — Name Atlas", 1 page, A4. The page rendered with `pdftoppm` shows NOWAK, kobiety 99 738 and mężczyźni 98 387 in the brand fonts, and "PESEL 20 stycznia 2026 r." at the foot.
  - `/en/surname/kowalski/pdf`: 200, `kowalski-name-atlas.pdf`, 291,587 bytes in 2.4 s.
  - `/pl/nazwisko/nie-ma-takiego/pdf`: 404.
  - `/pl/nazwisko/nowak/udostepnij?card=summary` has `<a class="studio-pdf" href="/pl/nazwisko/nowak/pdf" download="">Pobierz jednostronicowy PDF`.

## Not verified

- A live sheet with every card: the fixture register yields only the counts. The full layout was checked from the contract-parsed fixture through the same renderer, not from a database.
- The gate with accounts on against a real accounts database (401 and 503 are unit-tested and unchanged).
- Time and memory of one 2480 × 3508 render on Vercel.
- Printing the page, and opening the file on a phone.
