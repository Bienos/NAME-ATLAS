# 2026-10-03 — The share studio, specified (ADR-0034, TASK-093)

Branch `claude/tender-curie-ybiyaj`, on `origin/main` @ `4a81607` (rebased from `08516bd`). The owner asked for the deck's end to lead out of the cards to a page where a signed-in reader downloads, copies and shares the card, and later makes a video. Offered a hard wall or a soft gate, they chose "soft gate, no music in v1, write task A". This change writes the decision and the task. It builds nothing.

## Changed

- `docs/adr/0034-share-studio-and-soft-gate.md` (proposed): the deck's last card leads to a studio page; the preview is free and the full image needs a session when accounts are on; sign-in returns to the studio; with accounts off the studio is open; the video comes later without music.
- `tasks/093-share-studio.md`: task A.
- Numbers: this change first took ADR-0033 and TASK-084. #99 (Google sign-in), opened after it, took the same two, so on 2026-10-04 this change moved to ADR-0034 and TASK-093: no file on `main`, in an open pull request or on any branch of `origin` uses either. TASK-088 and 089 are unused on `main` but were skipped, since their history is not known.
- `STATUS.md` (a "Next" line, "Last rewritten"), `docs/CODEMAP.md` (the ADR row).

## Checked

- The numbers: `tasks/` and `docs/adr/` on `origin/main` and the files each open pull request's branch adds (`git diff --name-only origin/main...<branch>` for #30, #44, #65, #76, #79, #81, #91; #30 has no merge base with `main` and was not checked this way).
- The task's §2 facts were read from `apps/web/src/lib/deck.tsx`, `deck-client.tsx`, `share-route.ts`, `share-facts.ts`, `share-card.tsx`, `account-paths.ts` and `surname-page.tsx` on `08516bd`.

## Verified

- `pnpm check:ids`: exit 0, "every task, ADR, migration and decision number is used once".
- `pnpm format:check`: exit 0, "All matched files use Prettier code style!".

## Not verified

- No code was changed, so `typecheck`, `lint`, `test` and `build` were not run.
