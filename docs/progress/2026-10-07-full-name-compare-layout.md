# 2026-10-07 — TASK-164: the full-name comparison, laid out as the owner's design canvas shows

## What changed

- `apps/web/src/lib/full-name-compare-page.tsx` (views only; the loader, the gates and the reads are unchanged):
  - **Before a result:** `Steps` (three steps, the current one `aria-current="step"`, step 2 done with the product). `PeopleForm` became a row per person (`PersonRow`, a visually hidden label for each field); persons 3 and 4 sit behind a native `<details class="fnc-more">`, open when the query carries them. The disclaimer sits inside the form, above the submit. Locked, the line "Najpierw odblokuj porównanie…" sits beside the submit, which stays enabled.
  - **The locked card** (`Locked`, now an `<aside class="fnc-locked">`) sits beside the form: the "Zablokowane" chip, the price and "Wkrótce", the body, three benefit lines and the free comparison link. Still no buy button and no checkout link (ADR-0023 §2.5).
  - **Below the form:** `Contains` became four numbered tiles with decorative drawings (`aria-hidden`); `Together` is a heading and a paragraph side by side.
  - **Signed out:** the sign-in and free links beside a decorative preview with no figure (`SignedOutPreview`, `aria-hidden`).
  - **The result:** the "Odblokowane" chip, the plates, "Zmień osoby" (a link to the form's `<details id="fnc-change">`) and the steps; the disclaimer and the "together" statement as one notice before any figure. A sticky chapter bar (`nav.fnc-chapters`, plain anchors, "Braki" only when something is unresolved). `Glance`, the "W skrócie" table, has a row per person and repeats figures the chapters show from the same claims: register count, list and rank per list, never summed; the latest year's births with sex, year and direction; the origins the works state; the surname's count and "1 na X" per group, "najrzadsze" only where `rarestOf` names that person in a comparable pairing; an absent figure is a word. The register chapter draws a bar row only for a person on that list and names the rest in one line ("Nie ma na tej liście: …"). Chapters get `id`s (`fnc-ch-1` to `fnc-ch-4`). "Czego nie znaleźliśmy" moved to the end, after the chapters.
- `full-name-compare-text.ts`: the new strings in Polish and English (steps, the form, the locked chip and hint, the benefits, the tiles' heading, the preview, the chapter bar, the overview's heading, note, columns and absent words, `notOnList`). `lockedTier` is removed: the card's heading already names the product.
- `apps/web/src/design-system/compare.css`: a `main.cmp-full.atlas-v1` block (`.fnc-…`) in Brand System v1 tokens (Atlas Blue for the submit, the current step, the unlocked chip, links and focus; amber only for the price and the "Wkrótce"/locked outline, as before). The rules only the full-name page used (`.cmp-people`, `.cmp-person`, `.cmp-optional`, `.cmp-together`, `.cmp-locked`) are removed or retargeted to the new classes. The free comparison's markup (`compare-view.tsx`) is untouched, and its rules keep the same effect.
- `full-name-compare-page.test.ts`: the register test now expects the one line for JAN and one bar row; `fnc-locked` replaces `cmp-locked`; five new tests (the steps, the rows and the fold for persons 3–4, open when typed, step 2 done with the product, signed out with no form, the notice before the first figure, the chapter bar, one overview row a person with ZOFIA's two lists apart and no 0, "Braki" only when something is unresolved).
- Records: `tasks/162-full-name-compare-layout.md` (status), this file, `STATUS.md`.

## Verification (run in this session)

- `pnpm format:check`: exit 0.
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm typecheck`: exit 0.
- `pnpm lint`: exit 0.
- `pnpm test`: exit 0; apps/web 108 files, 1207 tests passed; every other package passed. Again after rebasing onto `origin/main` @ `fc8d3f7`: exit 0, apps/web 108 files, 1209 tests passed; `format:check`, `check:ids`, `typecheck`, `lint` and the build exit 0 there too. `full-name-compare-page.test.ts`: 20 tests passed.
- `pnpm test:integration` (before the rebase, on `d6846be`; local PostgreSQL 16 with PostGIS 3 installed in this session, `TEST_DATABASE_URL` on the local server): 49 files passed, 1 failed: `accounts.test.ts` with `duplicate key value violates unique constraint "pg_authid_rolname_index"` (two files creating the same cluster-wide role at once on one shared server). Run alone, `accounts.test.ts`: 45 tests passed. This change touches no database code.
- `pnpm --filter web build`: exit 0.
- Chromium (before the rebase; Playwright 1.56, the pre-installed browser): the page's own markup rendered from the test fixtures (signed out; locked with four people, one with a 32-letter surname; the result with four people, one unresolved; the English result with two), with the build's stylesheets and the layout's `body.dusk`, at 390 and 1280 px. `scrollWidth` equals the viewport in all eight, so there is no horizontal overflow. The first pass found the overview table stretching its parent and a long typed surname overflowing its plate; both are fixed (`.fnc-glance` `min-width: 0`, the scroll box bounded; `overflow-wrap: break-word` on the plates). Not the running app: no `next dev`, no database, no real sign-in.

## Built differently from the task's wording

- The people on the result stay the shared `NamePlates` (the page's `<h1>`), styled smaller, rather than new chips; no "częściowo" mark on a plate. The unresolved ones are named under "Czego nie znaleźliśmy", reached from "Braki".
- The "Odblokowane" chip carries no date: each chapter keeps its own date and source line.
- Chapters 02–04 keep their gated bars, panels and sources (TASK-155), restyled only, so that every figure stays drawn exactly as the gates allow. Only chapter 01 changed shape.
- "W pakiecie" (board 3) is not shown: the entitlement check answers yes or no, not which tier granted it.

## Not verified

- The running app on a database; staging; production. CI: GitHub Actions starts no job in this repository (account-level block, `STATUS.md`).
