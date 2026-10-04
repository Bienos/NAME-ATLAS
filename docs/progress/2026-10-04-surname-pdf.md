# 2026-10-04 — TASK-104: the surname's PDF

## Changed

- `apps/web/src/lib/share-pdf.ts` (new): `cardsPdf` puts card images one per 405 × 720 pt page with `pdf-lib`; `surnamePdfResponse` applies the card's gate, reads the surname once, draws every card `studioCards` offers with `renderShareCard` and answers the PDF (`Content-Disposition: attachment`, `X-Robots-Tag: noindex`; private with a session, cached like the card with accounts off). A retired address 308s; no surname or no card is 404; an unavailable register is 503.
- `apps/web/src/app/pl/nazwisko/[slug]/pdf/route.ts`, `apps/web/src/app/en/surname/[slug]/pdf/route.ts` (new).
- `share-route.ts`: the gate's 401/503 moved into `gateRefusal`, used by the card and the PDF; `CACHE` and `PRIVATE` exported. The card's answers are unchanged.
- `share-facts.ts`: `surnamePdfPath`.
- `share-studio.tsx`, `messages.ts`, `globals.css`: the studio's "Pobierz PDF ze wszystkimi kartami" / "Download a PDF of every card", beside the video, only where the card may be downloaded.
- Tests: `share-pdf.test.ts` (new, 3), `share-studio.test.ts` (the link with `off`/`open`, not with `sign-in`).
- `apps/web/package.json`, `pnpm-lock.yaml`: `pdf-lib` 1.17.1 (MIT, pure JavaScript; its dependencies are `@pdf-lib/standard-fonts`, `@pdf-lib/upng`, `pako`, `tslib`). Justification: no installed package writes a PDF.
- `tasks/104-surname-pdf.md`, `docs/CODEMAP.md`, `STATUS.md`.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`, `pnpm build`: exit 0. `apps/web`: 823 tests in 78 files.
- Local PostgreSQL 16 with PostGIS 3 (installed in this session), `pnpm db:migrate` through 0033, the PESEL fixture register imported with the importer's library API by a throwaway script (not committed), population derived for NOWAK, KOWALSKI, KOWALSKA and WIŚNIEWSKI, `pnpm seo:backfill-slugs`. Against `next start` of this build, accounts off:
  - `/pl/nazwisko/nowak/pdf`: 200, `application/pdf`, `attachment; filename="nowak-name-atlas.pdf"`, `x-robots-tag: noindex`, 142,548 bytes. `pdfinfo`: title "NOWAK — Name Atlas", 1 page, 405 × 720 pts. The page rendered with `pdftoppm` shows NOWAK's summary card (women 99 738, men 98 387, PESEL 20 stycznia 2026 r.).
  - `/en/surname/kowalski/pdf`: 200, `kowalski-name-atlas.pdf`, 138,036 bytes.
  - The studio at `/pl/nazwisko/nowak/udostepnij?card=summary` has `<a class="studio-pdf" href="/pl/nazwisko/nowak/pdf" download="">Pobierz PDF ze wszystkimi kartami`.

## Not verified

- A surname with several cards: the fixture register gives only the summary card, so only a one-page PDF was made from a live server. The order and page count for several images are covered by the unit test.
- The gate with accounts on against a real accounts database (401 and 503 are unit-tested).
- Time and memory for a surname with all eight cards in production.
- Opening the file on a phone.
