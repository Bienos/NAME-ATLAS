# TASK-160 — A free window for the baby-names 8,99 zł view: "Sprawdź dziś za darmo"

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-baby-names-free-window.md`). Off until `BABY_NAMES_FREE_UNTIL` is set on a deployment.
- **Requested by:** the project owner, 2026-10-07, in a Claude Code session, on a screenshot of the locked card "Rok po roku od 2000 · Imiona dla dziecka 8,99 zł · Wkrótce": "instead wrotce click check this today for freee and then there will be a full dashboard". A mockup was made first; the owner then said "build it and go live" and chose: free for every signed-in reader until a set date (D-051); split into two changes, this one the free button and the unlock on the existing paid view, the next the new dashboard panels; a pull request the owner merges and releases.
- **Decision:** D-051 (this session). D-044 and D-045 stand: the view stays 8,99 zł; the window only opens it free for a time. ADR-0023 §2.5 stands: no buy button, no checkout link. ADR-0001: during the window the claims are read on the FREE surface, so the rights decide as for any free reader; only an account holding the view reads on PAID.
- **Numbers:** TASK-160 (TASK-159 is open in #190), D-051. `pnpm check:ids` exit 0.
- **Model guidance:** implementation session.

## 1. Goal

While the window is open, a signed-in reader without a purchase sees the locked card with the price struck, "dziś 0 zł", the window's end, and a button "Sprawdź dziś za darmo" that opens the existing 8,99 zł view (every year since 2000, the ladder, the table, the way to the comparison). The list, the comparison and the paid share card open the same way. Outside the window, nothing changes.

## 2. In scope

1. `BABY_NAMES_FREE_UNTIL` (an ISO 8601 instant with offset), `babyNamesFreeUntil`, `readBabyNamesAccess` (`paid`, `full`, `freeUntil`) in `baby-names-config.ts`.
2. The page, the list, the comparison, the share sheet and the card route decide access through `readBabyNamesAccess`; the surface is PAID only when `paid`. The meaning is read on PAID only when `paid`.
3. The card in the window (`BabyFreeWindow`): a `<details>` whose `<summary>` is the button, so it works without script; the view inside it. Atlas Blue for the button (ADR-0046).
4. Copy in both languages; styles under `.baby-names.atlas-v1`; tests.

## 3. Out of scope

The dashboard panels of the mockup (summary tiles, moments, year-to-year tiles, decades, sortable table, comparison overlay): the next task. A countdown; a per-account trial; any change to prices, tiers or the offer page; production configuration (the owner sets the variable).

## 4. Acceptance criteria

- **AC-1:** window open, no purchase: the button, the struck price, "dziś 0 zł", the end in Warsaw time; the view opens; claims read on FREE; no "Wkrótce", no checkout.
- **AC-2:** window open, with a purchase: as before, on PAID, no free card.
- **AC-3:** window unset, malformed or past: as before.
- **AC-4:** the list, the comparison and the paid share card open in the window, on FREE.

## 5. Verification

`pnpm format:check`, `check:ids`, `lint`, `typecheck`, `test`; the card closed and open rendered in Chromium from the page's own markup at 390 and 1280 px.
