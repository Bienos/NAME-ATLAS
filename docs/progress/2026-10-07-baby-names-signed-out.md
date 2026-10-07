# 2026-10-07 — TASK-159: the baby-names page for a signed-out reader, redesigned

Task: `tasks/159-baby-names-signed-out.md`. Branch `claude/sweet-euler-iblpiu`, fast-forwarded onto `origin/main` at `2fd44be` (#188) before any commit, then rebased onto `5eff587` (#185, TASK-155) before the push; the conflicts were additive (`account-paths.ts` and its test, where TASK-155 added the full-name comparison's return address, and `STATUS.md`'s "Last rewritten"). Requested by the owner with a screenshot of the signed-out page; a mock-up (desktop and phone, on a Claude design canvas) was approved with "ok wdrażaj, zostaw zamaskowany podgląd". Numbers taken: TASK-159 (155 and 157 on `main`, 156 in open #187, 158 in open #189). No ADR, no migration, no D- number.

## What changed

- **`apps/web/src/lib/baby-names-page.tsx`:** signed out, `BabyNamesView` renders `SignedOut`:
  - **Hero:** an eyebrow, the title, the lede, and a GET form to the page with the language's field (`imie`, `name`), with a decorative `ContourField` behind it.
  - **Under the form:** before a name is typed, the hint ("Wynik zobaczysz po zalogowaniu…") with sign-in and sign-up links. After a name is typed and carried, "Zaloguj się, a od razu pokażemy wynik dla imienia „…”" with both buttons. An over-long name gets the existing length line.
  - **The preview (`SignedOutPreview`):** the result's own tile classes with every number replaced by a hatched block (`Mask`). The noun is "dzieci", so no sex is implied, and there are no tabs, in line with TASK-157. It echoes a typed name only when the name was carried, so a name with a dot, such as an address, never appears in it.
  - **Below the hero:** six cards (`FEATURES`, with glyphs), the free card beside the tier card (8,99 zł, "jednorazowo", "Wkrótce", no button, a masked bar strip), and the source with the cut-off line.
  - **The loader:** `loadBabyNames` gives a signed-out reader `typed`, `invalid`, `carried`, `signInHref` and `signUpHref`, and reads nothing from the database (the test also asserts that `findName` is never called). The signed-in page is unchanged.
- **`apps/web/src/lib/baby-names-text.ts`:** `signedOut` is replaced by `out` (`BabyNamesSignedOutText`), in Polish and English. "Jednorazowo" follows `account-text.ts` ("Pakiety to jednorazowe płatności…").
- **`apps/web/src/lib/account-paths.ts`:** `safeNext` also takes `/pl/imiona-dla-dziecka?imie=<v>` and `/en/baby-names?name=<v>`:
  - The query must be the language's own field and nothing else. `<v>` is made of `A–Z a–z 0–9 * _ -`, `+` and `%XX`, with no literal `.` (the Google flight cookie's separator, `google-routes.ts`).
  - `<v>` must decode without error to text with no control character, and must not be blank. The 200-character cap is unchanged.
  - When the encoded address does not pass, the sign-in link returns to the bare page and the page makes no promise.
- **`apps/web/src/app/globals.css`:** a `.bn-out-*` block scoped to `.baby-names.atlas-v1`, using semantic tokens only and no amber (the page's rule since TASK-151). Layouts wrap by width (flex-basis and `auto-fit`), with no new breakpoint. The `.baby-soon` override now also covers the tier card.
- **Tests:**
  - `baby-names-page.test.ts`: the TASK-141 signed-out test renders the bare page. The TASK-151 "no tile" check became "no `data-figure`", because the preview wears the tiles with every number masked. The loader test also asserts `findName` is not called. +5 in a TASK-159 block: the sections in both languages, a typed name carried, `Łucja` encoded, `Jan.` not carried, and an over-long name.
  - `account-paths.test.ts`: the TASK-141 refusal of `?imie=ZOFIA` is removed, and a TASK-159 block accepts 6 addresses and refuses 14.
  - `google-routes.test.ts`: +1, a typed-name `next` survives the flight cookie.
- **Docs:** this record, the task file, `STATUS.md` (the baby-names line and "Last rewritten").

## Verification

Run from the repository root on this branch after `pnpm install --frozen-lockfile`.

| Command | Result |
|---|---|
| `npx vitest run` in `apps/web` on the three changed test files | first run 2 failed: the TASK-151 "no `bn-tile`" check on the signed-out page, and the new no-digit check, which caught the copy's own "1 na". Both fixed as above, then 79 passed |
| `pnpm format:check` | exit 0 |
| `pnpm check:ids` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm test` | exit 0; web 1,095 tests (100 files), truth 433, sources 615 |
| `pnpm build` | exit 0; `/pl/imiona-dla-dziecka` and `/en/baby-names` are dynamic (ƒ) |

In Chromium (Playwright 1.56.1), on `next start` of that build, with `BABY_NAMES_ENABLED=1` and stand-in accounts variables (`ACCOUNTS_DATABASE_URL` pointing at a closed port, which the signed-out view never opens): `/pl/imiona-dla-dziecka`, `/pl/imiona-dla-dziecka?imie=Zofia` and `/en/baby-names` at 390 and 1280 px answered `200`, with `scrollWidth − clientWidth` 0 and no element under `main` past the viewport's right edge. In the screenshots: at 1280 px the hero and the preview sit side by side, the cards are 3 × 2 and the two plan cards side by side; at 390 px everything is one column. With `?imie=Zofia`, the box under the form reads "Zaloguj się, a od razu pokażemy wynik dla imienia „Zofia”." and the preview's name is "Zofia". The site's cookie banner covers part of the first screen at both widths; it is not part of this change.

After the review, the preview was limited to carried names (+2 assertions in the `Jan.` test). Re-run on the final tree: `npx vitest run` in `apps/web` (all files), `pnpm format:check`, `pnpm check:ids`, `pnpm lint` and `pnpm --filter web typecheck`: each exit 0; web 1,095 tests (100 files). The build and the browser check above ran before this one-line change.

After the rebase onto `5eff587`, re-run on the rebased tree: `pnpm format:check`, `pnpm check:ids`, `pnpm lint`, `pnpm typecheck` (each exit 0), `pnpm test` (exit 0; web 1,141 tests in 102 files, truth 433, sources 615) and `pnpm build` (exit 0). The browser check was not repeated after the rebase.

## Not verified

- `pnpm test:integration` and `test:golden` were not run (no local database in this session). The change reads nothing from the database.
- Sign-in with a typed name end to end (email or Google) against a real accounts database. `safeNext`, the sign-in action's use of it and the flight cookie are covered by unit tests only.
- The live and staging pages. Nothing is deployed by this change.
