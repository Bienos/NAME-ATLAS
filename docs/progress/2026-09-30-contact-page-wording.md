# 2026-09-30 — Contact page: gender-neutral wording

## What changed

`apps/web/src/lib/messages.ts`: the third reason to write on `/pl/kontakt` read "znalazłeś problem z bezpieczeństwem strony". That form addresses men only. At the project owner's request it now reads "widzisz problem z bezpieczeństwem strony". A search of the Polish strings added by TASK-046, 047 and 050 (`messages.ts`, `legal-text.ts`) for past-tense second-person forms found no other.

## Verification (run 2026-09-30)

- `pnpm typecheck` and `pnpm lint` exit 0; Prettier passes on the file.
- `apps/web`: 318 tests passed.

## Not verified

- The page on production, which has not deployed since #42 (Vercel's daily limit; see `STATUS.md`).
