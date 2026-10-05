# TASK-103 — End-to-end tests of the reader's journey, in CI

- **Status:** IMPLEMENTED 2026-10-04 on `claude/blissful-johnson-450rie` (`docs/progress/2026-10-04-end-to-end-tests.md`).
- **Requested by:** the project owner, 2026-10-04: "Continue", after the list of next options named end-to-end browser tests for search, the deck, the share card and the well-known bearers.
- **Depends on:** TASK-053 (the journey), TASK-055 (the deck), TASK-056 (share cards), TASK-073 (the bearers), all on `main`.
- **Model guidance:** implementation session.

## 1. Goal

CI drives the built site in a real browser, at a desktop and a phone size, through what a reader does: search a surname, read its page, go through the deck, fetch a card's image, and search a surname that is not in the register. A change that breaks any of these fails the build.

## 2. Facts (checked on `main` @ `85312b9`, 2026-10-04)

1. No browser test exists; `next` lists `@playwright/test` only as an optional peer.
2. CI's `verify` job already runs PostgreSQL with PostGIS, migrates `name_atlas`, and builds the site.
3. The committed PESEL fixtures (`fixtures/pesel/`, 22 + 23 national, 40 + 38 regional rows) import with `--sha256` of the fixture; the batch derives population for all 45 surnames and refuses rank and distribution on so partial a universe.
4. A search posts `/?surname=…`, which answers 307 to `/pl/nazwisko/{slug}?view=cards`.
5. On a phone the deck's list of cards is hidden; the cards and the next-card button are in both layouts.
6. Task number 103 is free on `main` and in open pull requests (094, 101 and 102 went to other changes while this one waited, 2026-10-04).

## 3. In scope

- `tests/e2e`: a workspace package with `@playwright/test` 1.56.1, `seed.sh` (migrate, the four fixtures, page addresses, the batch, NOWAK's bearers from the pinned Wikidata answer via `seed-bearers.ts`), `playwright.config.ts` (`next start` on the build; desktop 1440 × 900 and Pixel 7) and `specs/journey.spec.ts`.
- Root scripts `e2e:seed` and `test:e2e`; three CI steps after Build (seed, install Chromium, run) and the traces kept as an artefact when a run fails.

## 4. Out of scope

- Visual comparison, accessibility audits, the account pages, the family tree, and browsers other than Chromium.
- Rank, rarity, distribution and Polona on the page: the fixtures do not carry them.

## 5. Acceptance criteria

- **AC-1.** At both sizes: a search for Nowak lands on `/pl/nazwisko/nowak?view=cards` with the deck open; the page shows the count and the bearers' sentence, caveat, three people and the "Świat · Wikidata" scope, with no sideways scroll; the deck holds one "Znane osoby" card, moves on a key press, reaches that card with the next-card button and closes; `/pl/nazwisko/nowak/karta/summary` answers a PNG; a surname not in the register reads "Nie znaleziono takiego nazwiska" with no count or bearers.
- **AC-2.** Hiding NOWAK's bearers claim makes the bearers' tests fail.
- **AC-3.** `pnpm typecheck`, `lint`, `format:check`, `check:ids` and `check:vm` exit 0.

## 6. Verification

```
DATABASE_URL=postgres://… pnpm e2e:seed
pnpm --filter web build
DATABASE_URL=postgres://… pnpm test:e2e
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm check:vm
```
