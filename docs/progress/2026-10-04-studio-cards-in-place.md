# 2026-10-04 — The share studio switches cards in place

A follow-up to TASK-093. The project owner, with a screenshot of the studio on a phone: "Tutaj każda karta się ładuje jako nowa strona, zmień to żeby było łatwiej". In the studio, each card chip was a link that loaded the whole page again.

## Changed

- `apps/web/src/lib/studio-viewer.tsx` (new, client): `StudioViewer` draws the card chips, the image and the top of the panel. A chip, a horizontal swipe on the image (at least 48 px, and flatter than steep), or the ← and → keys show another card without loading a page. The address is updated with `history.replaceState`, so a reload or a copied link opens that card. The next and previous cards' images are fetched ahead. The chips are still `<a href>` links, so without script, or with a modifier key, they work as before. Stepping stops at the first and last card. Pure helpers `stepCard` and `swipeStep`.
- `apps/web/src/lib/share-studio.tsx`: the page renders every offered card's top panel on the server (its buttons, or the sign-in that returns to that card) and hands them to `StudioViewer`. The video, the Instagram line and "Więcej" are the same for every card. The server markup for the chosen card is unchanged.
- `apps/web/src/app/globals.css`: `.studio-swipe` (`touch-action: pan-y`, so vertical scrolling stays the page's).
- `apps/web/src/lib/studio-viewer.test.ts` (new): 2 tests.
- `docs/CODEMAP.md`, `STATUS.md`.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`, `pnpm build`: exit 0. `apps/web`: 821 tests in 78 files passed (after merging `main` with #113). The existing `share-studio.test.ts` passes without change.
- **Headless Chromium (Playwright's chromium-1194), phone viewport 390 × 844:** `StudioViewer` bundled with esbuild into a scratch page (`next/image` replaced by a plain `<img>`, three cards with placeholder images). From `?card=summary`: the "where" chip showed "where" with `?card=where` and its own panel; ← showed "rarity"; a leftward drag of 200 px showed "where"; → on the last card stayed. A marker set on `window` after the first load was still there at the end, so no page was loaded.

## Not verified

- The real studio page against a database with several cards (the local PostgreSQL was not running), and a real phone's touch swipe (only a mouse drag was run).
- The header's language switch still points at the card the page was loaded with, not the one shown after switching.
- #113 (save to the gallery) merged first; its labels (`gallery`, `galleryHint`) are carried into each card's panel here.
