# TASK-159 — The baby-names page for a signed-out reader, redesigned

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-baby-names-signed-out.md`).
- **Requested by:** the project owner, 2026-10-07, in a Claude Code session, with a screenshot of the signed-out page: "zrob redeisgn tego i daj mock up najpierw" ("redesign this and show a mock-up first"). The mock-up (desktop and phone) was approved the same day: "ok wdrażaj, zostaw zamaskowany podgląd" ("ok, ship it, keep the masked preview").
- **Decision:** none new. D-044 (lists never mixed, an absence is below the cut-off and never 0), ADR-0023 §2.5 (no buy button), ADR-0046 (Brand System v1) and TASK-157 (only the sexes a name is on) stand.
- **Numbers:** TASK 159. `main` holds TASK-157 (#188) and TASK-155 (#185, `5eff587`); open #187 is TASK-156 and open #189 TASK-158. No ADR, no migration, no D- number.
- **Model guidance:** implementation session.

## 1. Goal

A signed-out reader sees what the page does and can start using it. Today the page is the title, the lede, the source and one paragraph with a "Zaloguj się" link. After this change it is a hero with the search box, a preview of the result with every number masked, what a signed-in reader gets, what is free and what is in the 8,99 zł tier, and the source at the bottom.

## 2. Facts (2026-10-07)

1. Signed out, `BabyNamesView` renders `t.title`, `t.lede`, `t.source`, `t.signedOut` and a sign-in link carrying `next=/pl/imiona-dla-dziecka` (`apps/web/src/lib/baby-names-page.tsx`).
2. `safeNext` accepts the page's two bare addresses only (TASK-141), so a name typed before signing in is lost on the way back.
3. The redirect target travels in a form field, the sign-in page's query and the Google flight cookie, where `.` separates the cookie's four parts (`google-routes.ts`).
4. Signed-in readers get, free: the latest year's count and share, the rank, the direction with its two shares, the register's figure, and the meaning in a work's own words when the rights allow it. Holders of the 8,99 zł tier also get every year from 2000 and the whole list. The tier is a one-time payment shown as "Wkrótce", with no button.

## 3. In scope

1. **Signed-out view:** a hero (eyebrow, title, lede, a GET form to the page with the language's field, `imie` or `name`), a hint with sign-in and sign-up links, and a preview figure built from the result's own classes with every number masked (no count, rank, share or direction is read or shown) and a neutral noun ("dzieci"), so no sex is implied. Then "Co zobaczysz po zalogowaniu" (six cards), "Za darmo i w pakiecie" (the free list with sign-up and sign-in; the tier with 8,99 zł, "jednorazowo", "Wkrótce" and no button), and the source with the cut-off line. Polish and English.
2. **A typed name, signed out:** `?imie=Zofia` shows the name in the preview (only a name the return address carries, so never one with a dot) and "Zaloguj się, a od razu pokażemy wynik dla imienia „Zofia”", with sign-in carrying `next=/pl/imiona-dla-dziecka?imie=Zofia`. A name over 60 characters shows the existing "Wpisz jedno imię, do 60 znaków." No database read for a signed-out reader.
3. **`safeNext`:** additionally accepts `/pl/imiona-dla-dziecka?imie=<v>` and `/en/baby-names?name=<v>` (the language's own field, nothing else in the query), `<v>` made only of `A–Z a–z 0–9 * _ -`, `+` and `%XX`, no literal `.` (the flight cookie's separator), decoding to text with no control character and not blank. The 200-character cap stands; when the encoded address does not pass, the sign-in link falls back to the bare page.
4. **Tests:** the signed-out view in both languages (the sections, the form, the links, no figure, no buy button), a typed and an over-long name, the loader, and `safeNext`'s new addresses and refusals.

## 4. Out of scope

The signed-in page (its form, tiles, notes and source line stay as they are); the list page; the share sheet; the site header; sign-up carrying `next` (sign-up still ends on the account page); any real figure on the signed-out page; the copy of the signed-in states.

## 5. Not decided

Whether the signed-out page should ever show a real example name's figures. The owner chose the masked preview for now.

## 6. Acceptance criteria

- **AC-1:** signed out, both languages: the hero with the form, the masked preview, the six cards, the free and tier cards, and the source; no figure from a claim, no buy button.
- **AC-2:** a typed name is shown as typed and carried through sign-in (`next` with the language's field); an over-long one shows the length line; an address with any other field, another field name, a literal `.`, a control character or another path is still refused.
- **AC-3:** nothing is summed across sexes; an absence is never presented as 0.

## 7. Verification

`pnpm format:check`, `check:ids`, `typecheck`, `lint`, `test`, `build`.
