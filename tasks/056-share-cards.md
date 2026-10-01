# TASK-056 — A share card for each answer in the deck

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu` (`docs/progress/2026-10-01-share-cards.md`).
- **Requested by:** the project owner, 2026-10-01: "please also add cool share card and explanation give me some examples". They were shown eight examples on real figures, then confirmed the order "1. Share cards" first.
- **Decision:** ADR-0025 (the deck), ADR-0012 (evidence travels with a figure), TASK-024's rule for the existing share image: drawn only from the validated public projection.
- **Depends on:** TASK-055 (the deck), on `main`.
- **Model guidance:** implementation session.

## 1. Goal

From any card in the deck, a reader can share that answer as an image in story size (1080 × 1920). On a phone the system share sheet opens with the image; elsewhere it downloads. Every image carries:
- one figure;
- one line explaining what it means and what it does not;
- its source and date;
- the way back to the site.

## 2. Facts (checked on `main` @ `9a7b421`, 2026-10-01)

1. The page already serves one share image per surname, `…/opengraph-image` (1200 × 630). It is built by `og-facts.ts` (what it may say) and `og-card.tsx` (how it looks), with the brand fonts read from `apps/web/assets/fonts/` and listed in `next.config.ts`'s `outputFileTracingIncludes`.
2. The deck's cards are built in `apps/web/src/lib/deck.tsx`. Since #57, each section is reordered so the surname's main list leads.
3. TASK-056 is free on `main` and in the open pull requests #30 and #44.

## 3. In scope

- **What a card may say** (`share-facts.ts`, pure). For each of these, the figure, the explanation and the source and date, from the validated response in the deck's order:
  - rarity, neighbours, where, change, the other form, meaning, old print, and the summary.

  Null when the section is not ready.
- **How it looks** (`share-card.tsx`). One renderer, both languages, the dusk look (paper for old print), the brand fonts. A low-coverage warning stands above the map's figure.
- **Routes:**
  - `/pl/nazwisko/{slug}/karta/{card}` and `/en/surname/{slug}/card/{card}`, answering a PNG;
  - 404 for an unknown card, or one whose section is not ready.
- **The deck** gets a "Udostępnij" / "Share" button for the card in view:
  - Web Share with the image file where the browser can share files, a download otherwise;
  - a card without an image of its own (the surname, the catalogue) shares the summary.

## 4. Out of scope

- A video or animated card, and music.
- Cards for famous bearers, localities or first names: their own tasks.
- Any change to the contract, the read path or the page's chapters.

## 5. Acceptance criteria

- **AC-1.** For a response with every section ready, each card's figure is one the page prints, in both languages (unit tests on the facts and the rendered page).
- **AC-2.** A section that is not ready yields no card, and its route answers 404.
- **AC-3.** Every card carries an explanation, a source and a date (the summary: its sources). The map card carries the coverage warning when the entry's coverage is not `READY`.
- **AC-4.** The images render at 1080 × 1920 with the brand fonts in a production build, and the deck's button shares or downloads the card in view.
- **AC-5.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:integration` and `test:golden` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
TEST_DATABASE_URL=… pnpm test:integration && pnpm test:golden
```

Then the images and the button, in headless Chromium against a local build, at desktop and phone sizes.
