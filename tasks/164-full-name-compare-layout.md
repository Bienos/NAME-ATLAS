# TASK-164 — The full-name comparison, laid out as the owner's design canvas shows

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-full-name-compare-layout.md`, which also records where the build differs from §3).
- **Requested by:** the project owner, 2026-10-07, in a Claude Code session: the screenshot of the locked full-name comparison, "can you draft mockups for this", then "redesign create me better layout that is advanced but easy to read" and, asked whether to write the task, "tak". The canvas is the owner's private design artifact "Full-name comparison mockups" (https://claude.ai/artifact/EWGKz5aA2eQjY98cWSknnr): board 1 `Main.dc.html` (signed in, locked), board 2 `SignedOut.dc.html`, board 3 `Status.dc.html` (access statuses), board 4 `Result.dc.html` (the result).
- **Decision:** D-049 (the product and its gates, unchanged), ADR-0023 §2.5 (no buy button, no checkout link; "Wkrótce"), ADR-0032 §7 and D-033 (no count of people with both names), ADR-0046 (Brand System v1: Atlas Blue for action and focus, amber for historical and geographic emphasis only). No new ADR, no migration, no D- number: this changes the layout of a page whose facts and gates are already decided.
- **Colours:** the canvas was drawn from an older amber-only copy of the brand and its notes say "no blue". ADR-0046 is binding and wins: take the canvas's layout, hierarchy and copy, and take every colour from the Brand System v1 tokens of the `.atlas-v1` scope (Atlas Blue for the submit, the active chapter link, links and focus; the people's markers and bars in the brand's chart colours, told apart by letter as well as colour).
- **Numbers:** TASK-164. This task was written as TASK-162 and then TASK-163 on its branch; `main` took 162 (#194) and 163 (#195) for other changes, and open #196 also claims 163. On `origin/main` @ `fc8d3f7` the tasks run to 163; 164 is free on `main` and in open pull requests. `pnpm check:ids` exit 0.
- **Model guidance:** implementation session.

## 1. Goal

The full-name comparison (`/pl/porownaj/imie-i-nazwisko`, `/en/compare/full-name`) reads as the canvas shows: before the result, a three-step progress line, one row per person and the locked card beside the form; after it, the people as one row of chips, a sticky chapter bar, an at-a-glance table with one row per person, and the four chapters made shorter. Same facts, same gates, same addresses.

## 2. Facts (2026-10-07)

1. The page is `apps/web/src/lib/full-name-compare-page.tsx` (TASK-155): `PeopleForm` draws four `fieldset`s, each with a first-name and a surname field (`f1`–`f4`, `s1`–`s4`); `Locked` is the card with "15,99 zł · Wkrótce" and no button; `Contains` lists the four chapters; `Result` draws the plates, the disclaimer, `cmp-together`, the unresolved list, `RegisterChapter`, `BirthsChapter`, `MeaningChapter`, `SurnameChapters`, the surname pages and the form again in `<details class="cmp-change">`. The copy is `full-name-compare-text.ts`; the request is `full-name-compare-request.ts`.
2. The page renders under `mainClassName="compare cmp cmp-full atlas-v1"`; its styles are the `.cmp` block in `apps/web/src/app/globals.css`, shared with the free comparison.
3. Signed in without the product, nothing is read (TASK-155 AC-4); the form submits by `GET`; the page has no client script.
4. Production has the flag on and accounts on since 2026-10-07; nothing can be bought there (`STATUS.md`).

## 3. In scope

1. **Before the result** (signed in, locked or entitled with no query; boards 1 and 3):
   - A three-step line beside the heading: "Wpisz osoby", "Odblokuj porównanie · 15,99 zł", "Zobacz wynik obok siebie", the current step marked in text as well as visually (`aria-current="step"`). Entitled readers see step 2 as done.
   - The form as rows: one header row "Imię | Nazwisko" (visual; each input keeps its own `<label>`, visually hidden), then a row per person with its letter marker. Persons 1 and 2 always show; persons 3 and 4 sit behind a native `<details>` "Dodaj osobę" with no script, and open by default when the query carries them. Field names and the request are unchanged.
   - The disclaimer inside the form card, under the rows; the submit under it. Locked: the submit stays enabled (the request already returns the locked card and reads nothing), with the line "Najpierw odblokuj porównanie. Wpisane osoby zostaną." beside it.
   - The locked card beside the form (stacking below it under ~900 px): the "Zablokowane" status chip, the heading, the price with "Wkrótce", "Jedna płatność, bez abonamentu.", three short benefit lines, "Masz pakiet od 28,99 zł? To porównanie już w nim jest.", the free comparison link. Still no button and no checkout link.
   - `Contains` as four numbered tiles, each with a small decorative drawing (`aria-hidden`) and one line, headed "Co zobaczysz po odblokowaniu".
   - The "Ile osób nazywa się dokładnie tak?" block as a heading and a paragraph side by side.
2. **Signed out** (board 2): the heading, the sign-in line and link, the free comparison link and the disclaimer on one side, and on the other a decorative layout preview with no figure (`aria-hidden`, labelled "bez danych" in text).
3. **The result** (board 4):
   - The status chip "Odblokowane" with the register date, the heading, the three-step line with steps 1–2 done.
   - The people as one row of chips (letter and name; a person with something unresolved marked "częściowo"), and "Zmień osoby" opening the existing `<details>` form.
   - The disclaimer and the together statement as one short block, before any figure.
   - A chapter bar (`position: sticky`, plain anchor links, horizontal scroll on narrow screens): "W skrócie", 01–04, and "Braki" only when something is unresolved.
   - **"W skrócie"**: one table, a row per person, columns: first name in the register (count, list and rank), children in the latest year (count, direction word and arrow), origin (the language, or "brak danych"), surname count, rarity. Every cell repeats a figure the chapters below already show from the same claims; an absent figure is said in words, never 0; the "najrzadsze" mark appears only where the rarity gate names one. The table scrolls in its own box.
   - Chapter 01: the two lists side by side, a bar row only for people on that list, and one line "Nie na tej liście: …" for the rest.
   - Chapter 02: one small card per person (count, direction with arrow and word, rank); below the threshold said in words.
   - Chapter 03: one list, a row per name (origin, quote, translation line where there is one, the work and page); "Brak danych" with the plain sentence where none.
   - Chapter 04: count bars on one scale and rarity in one table, the verdict line under it; the maps on one shared legend; "Bez mapy w tym zbiorze: …".
   - "Czego nie znaleźliśmy" as a heading and a list side by side; the surname pages and "Porównaj same nazwiska" at the end as now.
4. **Copy:** new strings in `full-name-compare-text.ts`, Polish and English (steps, benefit lines, the locked line, "Dodaj osobę", "W skrócie", "Braki", "częściowo", "Nie na tej liście", column heads). No new claim about the data.
5. **Styles:** in the `.cmp-full.atlas-v1` scope only, so the free comparison does not change; Brand System v1 tokens only; touch targets ≥ 44 px; the layout works at 390 px with no horizontal page scroll.
6. **Tests:** update `full-name-compare-page.test.ts` for the new markup (steps, the rows, `<details>` for persons 3–4 and open when the query has them, the locked card with no button or checkout link, the overview table's rows and its absent cells in words, the "Nie na tej liście" line, the chapter bar's "Braki" only when needed, the disclaimer before the first figure).
7. **Records:** this file, `docs/progress/YYYY-MM-DD-full-name-compare-layout.md`, `STATUS.md` (the comparison's line), `docs/CODEMAP.md` only if files are added.

## 4. Out of scope

The free surname comparison's layout; any change to which figures are read, the gates in `compare.ts`, the request's fields or the routes; a buy button or checkout link; the payment-pending status chip of board 3 (it needs a state the page does not know); client-side script; new dependencies; production configuration; the offer page; the couple or baby-names pages.

## 5. Not decided

- The canvas's figures are placeholders; the page shows the claims' figures.
- Board 3's "W pakiecie" chip needs the name of the tier that granted access; if the entitlement check does not return it, show "Odblokowane" alone and say so in the progress record.
- The breakpoint at which the locked card stacks under the form is the implementer's, within 390 px working.

## 6. Acceptance criteria

- **AC-1:** every figure on the page is the same as before for the same query and fixtures; nothing is summed across the two register lists; an absent figure is never drawn as a zero bar or written as 0 (TASK-155 AC-1, AC-2, AC-6 still hold).
- **AC-2:** signed in without the product: the form and the locked card, no button, no checkout link, no claim read (TASK-155 AC-4).
- **AC-3:** the disclaimer and the statement that no source counts both names come before the first figure.
- **AC-4:** persons 3 and 4 behind a native `<details>`, open when the query carries them; the page has no client script.
- **AC-5:** Brand System v1 tokens only; Atlas Blue for action and focus; amber only for historical or geographic emphasis; every person told apart by letter as well as colour.
- **AC-6:** no horizontal page overflow at 390 px in Chromium with four people and long names (or the record says it was not checked).
- **AC-7:** the free comparison's markup and styles are unchanged.

## 7. Verification

`pnpm format:check`, `pnpm check:ids`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`, `pnpm --filter web build`; Chromium (the pre-installed browser) at 390 and 1280 px: signed out, locked with two and with four people typed, entitled with four people one of whom is partly unresolved, English. Results in the progress record.
