# TASK-065 — The landing sells the deck: a question, four examples, the cards, the offer

- **Status:** IMPLEMENTED 2026-10-01 on `claude/optimistic-gauss-sp4p9d` (`docs/progress/2026-10-01-landing-sells-the-deck.md`).
- **Requested by:** the project owner, 2026-10-01: "focus only on landing page could you make it more commercial na clear and engaging and interesting", then, on the proposals, "do changes".
- **Decision:** ADR-0021 (the dusk look, one shell, the zoom), ADR-0022 (the journey's screens), ADR-0025 (the deck), ADR-0026 (the tiers) and ADR-0019 §2.6 (a surname named on the landing is linked to its search answer). D-025 (the owner's newer tiers) blocks a change to the offer page: this task changes none of its words. The landing reads the offer's own document, so the tier change, when it comes, updates both pages in one place.
- **Depends on:** TASK-055 (the deck), TASK-057 (the offer page) and TASK-060 (the summary card), all on `main`.
- **Model guidance:** implementation session.
- **Number:** 062–064 have no file on `main`, but `STATUS.md` and TASK-061 §2.4 already give them to the account pages, the VM role and the sign-in download. 065 is the next number free on `main` and in the open pull requests (#30, #44, #65).

## 1. Goal

A visitor who lands on `/` sees in one screen what the answer holds and can try it with one tap. A visitor who scrolls sees the cards before searching, the three promises, the offer, the comparison, and only then the reference material: the most common surnames and the atlas.

## 2. Facts (checked on `main` @ `fd6a871`, 2026-10-01, and on production at about 21:00 UTC)

1. The bare `/` renders, in order: the hero (the register line, "Każde nazwisko / gdzieś się zaczęło.", the lede, the search pill, the hidden analysis screen, the trust line at the foot of the stage), then on the dark ground `CommonSurnames`, `ListAtlas` (seven plates, about eight phone screens), `LandingHow`, `LandingCompare`, the footer. On a phone, half of the first screen between the pill and the horizon is empty sky.
2. The deck's faces are rendered on the server by `deckCards` from the validated response (`deck.tsx`), each with its source and date; `deck-client.tsx` only lays them out. The faces' classes (`dk-*`) are global; `.dk-card` is positioned for the pile.
3. `offerDocument(lang)` holds the tiers' words (name, price, `soon`, lede); `offerPath(lang)` and `#tier-family` address the offer page and its waiting-list tile.
4. Nothing on the landing names the offer but the header and footer links. No example answer is shown before a search.
5. `landing-sections.test.ts` checks the how-it-works and compare sections, and that no landing copy says a surname tells where a family lives or comes from.
6. ZAREMBA is the search field's placeholder. On production its deck has rarity, neighbours, where, change and old-print cards: `/pl/nazwisko/zaremba/karta/{rarity,neighbours,where,change,print}` answered `200 image/png` at 21:03 UTC.
7. Vercel Web Analytics records page views only; nothing says whether a visitor searched.

## 3. In scope

- **The hero:** a question as the headline, a lede that names what the answer holds, four example surnames as links that open their decks through the search, then, at the foot of the stage under the map, the two promises and, from a tablet up, a link down to the next section (on a phone the ground follows at once, and the foot has no room for both).
- **"Co dostaniesz":** a new section after the hero with three of the real cards (rarity, where, change) for one example surname, rendered by `deckCards` from its validated response so each carries its source and date, a link to that surname's whole deck and one line about sharing. The example is loaded at render time, kept for ten minutes per process, and fails soft: no answer, no section.
- **The offer on the landing:** a new section with the three tiers from `offerDocument` (status, name, price, lede), a link to the offer page and one to its waiting list.
- **The order below the hero:** what you get, how it works, the offer, compare, the most common surnames, the atlas. The header's "Atlas" link keeps landing on the atlas.
- Copy in both languages in `messages.ts`; styles in `globals.css`; tests in `landing-sections.test.ts`.

## 4. Out of scope

- Moving the atlas to a page of its own; a surname of the day; counts in the suggestions; an FAQ; funnel events; any change to the offer page's words (D-025); any new figure, score or claim. The deck, the surname page, the share cards and the atlas's plates are unchanged.

## 5. Acceptance criteria

- AC-1: the bare `/` and `/?lang=en` render the hero with the question headline, four example links that open a search, the two promises at the foot of the stage and, from a tablet up, a link down the page.
- AC-2: with a database, the landing shows three cards for the example surname, each the deck's own face with its source and date; without one it shows no such section and no error.
- AC-3: the landing names the three tiers with the offer page's own name, price and status and links to `/pl/oferta` (`/en/offer`) and to `#tier-family` there.
- AC-4: the sections follow §3's order and `#atlas` is the atlas.
- AC-5: no landing copy says a surname tells where a family lives or comes from; the two lists are never summed; every figure shown is one the deck prints, with its date and source.

## 6. Verification

`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`, `pnpm build`; the page looked at in a browser at phone and desktop widths.
