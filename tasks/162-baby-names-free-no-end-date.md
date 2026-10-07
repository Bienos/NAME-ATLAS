# TASK-162 — No end date on the baby-names free card

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-baby-names-free-no-end-date.md`).
- **Requested by:** the project owner, 2026-10-07, after TASK-160 went live: first "say tomorrow but it won't end tomorrow, we will keep it open"; told that a false deadline is not allowed, the owner chose option 1, to show no end date.
- **Decision:** D-051, amended in this change.
- **Numbers:** TASK-162 (161 is on `main`, #193). `pnpm check:ids` exit 0.

## In scope

Remove the line "Za darmo dla zalogowanych do …" / "Free for signed-in readers until …" from the free card (`BabyFreeWindow`), its text key and its date formatter; the test now asserts the card names no end date. The window itself (`BABY_NAMES_FREE_UNTIL`) is unchanged.

## Out of scope

Any change to who sees the view, the surfaces, the price line or the button.

## Acceptance

- **AC-1:** in the window, the card shows the struck price, "dziś 0 zł" and the button, and no end date, in both languages.
- **AC-2:** everything else as TASK-160.

## Verification

`pnpm format:check`, `check:ids`, `lint`, `typecheck`, `test`.
