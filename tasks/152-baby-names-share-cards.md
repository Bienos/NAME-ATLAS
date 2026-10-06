# TASK-152 — Baby-names share cards (story, square, paid) and the share sheet, in Brand System v1

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-baby-names-share-cards.md`). Dark behind the same flag as the page.
- **Requested by:** the project owner, 2026-10-06: the baby-names result should be "easy to share to close ones": image cards a parent can send to family, showing the name's rarity and figures. Four boards on the design canvas (the free story card 1080 × 1920, the free square card 1080 × 1080, the paid "rok po roku" story card 1080 × 1920, a phone share sheet at 390 px).
- **Decision:** ADR-0046 (Brand System v1: Atlas Blue for the lit point and the action, amber for the peak year's bar alone, the semantic tokens by value since `next/og` reads no CSS), ADR-0043 §4 (the shares), ADR-0045 (no meaning on a card: out of scope), ADR-0023 §2.5 (no buy button, no checkout link; the paid option is inert and "Wkrótce" without the entitlement), D-044, D-045, D-047. No new ADR, no migration, no D- number: nothing here needed a decision the owner has not made.
- **Numbers:** TASK 152. 151 is the last on `main` (`0d0b2a2`, #182); open #179 holds TASK-150 and open #181 takes no number. `pnpm check:ids` exit 0.
- **Model guidance:** implementation session.

## 1. Goal

From a sex's section on the baby-names page a signed-in reader reaches a share sheet, chooses a card (the free one, or the year-by-year one when the account holds it), a format (portrait or square; the paid card is portrait only), sees the card, and shares it through the phone's share sheet, saves it, or copies the page's link for that name and sex. The cards are drawn on the server from the page's own facts, with only what the chosen view shows, and never carry 0 where data is absent.

## 2. Facts (2026-10-06)

1. The page (TASK-151) shows per sex the latest year's count with its share and "1 na N" (`BirthCountFigure.share_per_million`, `one_in`), the rank, the direction with the claim's two shares (`BirthTrendFigure.latest_share_per_million`, `earlier_share_per_million`, the earlier null when the name was below the earlier list's cut-off), the register's count and rank (`readGivenNameFacts`, `stockListOfSex`); entitled, the history from 2000 with a chart, "×N", callouts and a ladder. Every figure is a claim's or a list's stored figure through `packages/truth`.
2. The surname share cards (TASK-056) are drawn by `next/og` from a facts object (`share-facts.ts` → `share-card.tsx`), with the brand fonts in `assets/fonts/` loaded by `loadFonts` (`og-card.tsx`), and served by one handler for both languages (`share-route.ts`). Their client actions (`share-actions.ts`) fetch the image and share it as a file where `navigator.canShare({ files })`, else download it.
3. The page family is in the `.atlas-v1` scope (`<main class="baby-names atlas-v1">`, rules under `.baby-names.atlas-v1` in `globals.css`); the middleware sets `private, no-store` on `isBabyNamesPath`; the pages are `noindex` and in no sitemap; a sign-in comes back to the page without its query (`safeNext`, `BABY_NAMES_HOMES`).
4. The Evolved Contour mark is `public/brand/logo/name-atlas-mark.svg`: five contour strokes and the Atlas Point, in `currentColor`.
5. `next/og` under vitest draws a real PNG with the committed fonts (checked here; the surname tests had mocked the renderer). It lays out a React fragment's children in one row: a card's frame must be an element.
6. On the committed fixtures the register's lists are not imported, so a local card has no register line; MYROSLAVA (girls, 2025) is on the latest list and was below the 2020 list's cut-off, the "poniżej progu" case; its share, 275 per million, is 0,0% at one decimal.

## 3. In scope

1. **Facts** (`apps/web/src/lib/baby-names-share-facts.ts`, pure): `babyFreeCardFacts` and `babyPaidCardFacts` from `BirthNameFacts` and `GivenNameFacts` for one sex and language, every figure formatted by `messages.ts`; null (no card) when the name has no count on that sex's latest list, or no count in any year since 2000 for the paid card; an absent rank, share, direction or register leaves its element out. The dot grid by the page's rule (`DOT_GRID_MAX`). A share that would read 0,0% takes two or three decimals. The card keys (`story`, `square`, `paid`), sizes, addresses (`babyCardPath`, `babySharePath`, `babyPagePath`), the file name and the query parser.
2. **Cards** (`baby-names-share-card.tsx`, `next/og`): the free story, the free square and the paid story after the boards: the mark and wordmark, the eyebrows in mono, the name in Fraunces sized to fit, the count as the one big figure in the accessible blue, the three tiles (rank, "1 na N", the direction with "4,0% → 3,7% · 2020→2025" or "poniżej progu → …"), the dot grid with the first dot lit in Atlas Blue, the caption, the register line, the source line (`PESEL · dane.gov.pl, zbiór 219 · lista 2025, rejestr <date>`), "Nic o Twoim dziecku, tylko o imieniu" and the request's host. The paid card: "×N" when both counts exist, one bar a year (the peak amber, the first and latest lighter, a year with no count a cut-off tick, a year with no list a gap, never a zero bar), the three callouts, the ladder (2000, 2005, …, the latest lit; "—" without a rank claim), "Numer 1 w …", the register sentence.
3. **Routes** (`baby-names-share-route.ts`; `app/pl/imiona-dla-dziecka/karta/[card]/route.ts`, `app/en/baby-names/card/[card]/route.ts`): `?imie=|name=` and `?sex=boys|girls` as the page reads them; a 404 unless the flag and accounts are on, without a session, for an unknown card, a query without a sex, a name on no list, a sex without a card, and for the paid card an account without `hasPurchaseOf(userId, BABY_NAMES_FULL_TIERS)`, decided before any claim is read; `private, no-store` on every image. The same deps as the page (`runningBabyNamesDeps`).
4. **The sheet** (`baby-names-share-page.tsx`, `baby-names-share-client.tsx`; `/pl/imiona-dla-dziecka/udostepnij`, `/en/baby-names/share`): a page in the `.baby-names.atlas-v1` scope with the card picker (Podstawowa · za darmo; Rok po roku · 8,99 zł, inert and "Wkrótce" without the entitlement, no link, no button), the format toggle (Pionowa 9:16 / Kwadrat 1:1; story-only for the paid card), the preview `<img>`, and the actions: "Udostępnij" (Web Share with the file, else a download), "Zapisz obraz" (a download link; through the share sheet on iPhone and iPad), "Kopiuj link" (the page's address for this name and sex; the sheet says it opens after signing in), the footer line. Without script: the picker and toggle are links, the preview an image, the save a download link. Gated like the page; signed out it links to sign-in, which comes back to the page.
5. **The way in:** "Udostępnij" with one line of explanation under each sex's free tiles on the page, only where the free view has figures.
6. **Plumbing:** `BABY_NAMES_SHARE_PATHS` in `baby-names-config.ts`; `isBabyNamesPath` matches everything under either page, so the middleware covers the sheet and the cards; `BABY_NAMES_SEX_VALUES`/`BABY_NAMES_SEX_PARAM` exported from the page; `shareOrSaveImage`, `shareImage`, `saveImage` in `share-actions.ts` for an address with a query (the surname `shareOrSave` now calls the first).
7. **Copy** in `baby-names-share-text.ts`, both languages; two lines in `baby-names-text.ts`.
8. **Tests:** facts (pure), the routes (gating and real PNGs), the sheet's markup, the page's entry, the middleware, the sitemaps; integration on the committed fixtures (the cards' inputs for ZOFIA, JAKUB and MYROSLAVA). **Records:** this file, `docs/progress/2026-10-06-baby-names-share-cards.md`, `docs/CODEMAP.md`, `STATUS.md`, `docs/brand/MIGRATION_GUIDE.md`.

## 4. Out of scope

Comparing two names (the mockup's third picker option); the list page's restyle; a buy button or checkout link; a public or unauthenticated card address; meanings on cards; changes to the surname share cards or the deck; dependency upgrades; production configuration; the VM.

## 5. Not decided

- An image address without a session answers 404, as the paid card does without the entitlement, rather than the surname cards' 401 challenge: there is no public card address, and a 404 says nothing about which names exist. The sheet's `<img>` needs the session the sheet already has.
- The square card carries no register line, as its board shows; the story card does.
- A share below 0,05% reads "0,03%" on a card, where the page still reads "0,0%" (`baby-names-page.tsx` `formatShare`); the page is not changed here.
- The sign-in from the sheet comes back to the page, not to the sheet with its query, as the page's and the list's sign-ins do (`BABY_NAMES_HOMES`).
- On the committed fixtures the register's lists are absent, so no local card showed the register line; the unit tests cover it.

## 6. Acceptance criteria

- **AC-1:** the free story and square cards render for a name with a count on its latest list, with only free-view facts; the dot grid matches the page's rule; an absent earlier share reads "poniżej progu"; nothing reads 0 where data is absent.
- **AC-2:** the paid story card renders only for an entitled account; the chart has no zero bar; the "×" appears only with both counts.
- **AC-3:** every card route is flag-gated, signed-in only, `noindex` (the sheet), `private, no-store`, not in the sitemap.
- **AC-4:** the sheet offers share (Web Share with the file, download fallback), save and copy-link; the paid option is inert without the entitlement and nothing links to a checkout.
- **AC-5:** Brand System v1 tokens and fonts; Atlas Blue for the lit dot and the action; amber only for the peak bar; the sheet has no horizontal overflow at 390 px in Chromium.

## 7. Verification

`pnpm format:check`, `check:ids`, `typecheck`, `lint`, `test`, `test:integration`, `build`; the cards for ZOFIA (girls), JAKUB (boys) and MYROSLAVA (girls, below the 2020 cut-off) rendered from a local database built from the committed fixtures and read; Chromium at 390 and 1280 px for the sheet. Results in the progress record.
