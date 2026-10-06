# TASK-143 — The baby-names page in the header, and the full figures at 8,99 zł

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-baby-names-header-link-and-price.md`).
- **Requested by:** the project owner, 2026-10-06, after the page and Google sign-in worked in production: "działa ale to powinno byc dostepne tez z gornego panelu jakos i potem cala lista dostepna za 8.99 PLN".
- **Decision:** D-045 (new, in this change): the paid view of D-044 §2 costs 8,99 zł instead of 5,99 zł. D-044 §1–8 otherwise stands; ADR-0037 §2.1; ADR-0023 §2.5 (no real payment is sold yet). No new ADR, no new contract.
- **Number:** 143. 142 was the last on `main` (`d0ac2fb`); open #168 holds TASK-140 and ADR-0044.
- **Model guidance:** implementation session.

## 1. Goal

A visitor finds the baby-names page from the site's header, and the paid view's price reads 8,99 zł everywhere this repository states it.

## 2. Facts (2026-10-06)

1. The header (`apps/web/src/lib/site-nav.tsx`) draws its places twice, once in the header and once in the phone's menu: atlas, comparison, how it works, the offer, the trees (only when the tree is on) and the account (only when accounts are on).
2. The page answers 404 unless `BABY_NAMES_ENABLED` is exactly `1` and accounts are on (TASK-141). Signed out it explains and links to sign-in, so a link for every visitor leads somewhere useful.
3. Static pages draw the header at build time. A deployment made after the flag is set carries the link.
4. With a seventh place the header's seven links no longer fit on one line below about 1200 px: measured in Chromium, labels wrapped onto two lines at 1024 px and the page grew wider than the window at 780 and 900 px.
5. The price appears as copy in `baby-names-text.ts` and in comments, tests and records. No payment can be taken for it: there is no product, no checkout and no buy button (ADR-0023 §2.5).

## 3. In scope

1. **The link:** "Imiona dla dziecka" / "Baby names", between the offer and the trees, to `/pl/imiona-dla-dziecka` or `/en/baby-names`. Drawn only when `BABY_NAMES_ENABLED` is `1` and accounts are on, so it never leads to a 404. For every visitor, signed in or not. The page marks it `aria-current="page"`.
2. **Layout:** from 761 to 1199 px the places fold into the menu, as they do on phones; labels never wrap.
3. **The price:** 8,99 zł in the locked card and everywhere the repository states it as the current price (`PRODUCT.md` §6, ADR-0037 §2.1, ADR-0032, ADR-0042 and ADR-0043's pointers, `STATUS.md`, comments).
4. **Records:** D-045, `docs/CODEMAP.md`, the progress record, `STATUS.md`.

## 4. Out of scope

The 8,99 zł product, its checkout and TASK-114's change that this purchase must not unlock the tree; a browsable list of all names (see D-045 "Not decided"); a footer link; production config; the VM.

## 5. Acceptance criteria

- **AC-1:** the header's link is absent with the flag unset, and absent with accounts off; present in both languages, before the account, in the header and the menu, when both are on.
- **AC-2:** on the page itself the link is `aria-current="page"`; elsewhere it is not.
- **AC-3:** no horizontal overflow and no wrapped label at 390, 780, 1099, 1200, 1280 and 1440 px, on the landing, the offer and the baby-names pages.
- **AC-4:** the locked card reads 8,99 zł; "Wkrótce"; no button or link to buy. `grep` finds 5,99 zł only in records of what was decided or built on 2026-10-06 before D-045.

## 6. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`; `next dev --webpack` with `BABY_NAMES_ENABLED=1` and accounts' variables, in Chromium at the widths of AC-3.
