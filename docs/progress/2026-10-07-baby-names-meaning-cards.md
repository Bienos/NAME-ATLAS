# 2026-10-07 — TASK-177: the baby-names meaning tile as one card per work

## What changed

- `apps/web/src/lib/baby-names-page.tsx` (`Meaning`): the works are an ordered list of cards. Each card has "Dzieło n z m" (only with more than one work), the author and year as its head, the gloss first and largest with the Name Atlas translation under it, the origin, the work's own line (`quotation`) verbatim under "W dziele" / "In the work", and the citation with its source link at the foot. The assessment shows `assessmentWord` (e.g. "Źródła się różnią") instead of the raw status; for CONFLICTING one line follows: the works say different things and we show what each says.
- `apps/web/src/lib/baby-names-text.ts`: `quotationLabel`, `workOf`, `conflictingNote` in Polish and English.
- `apps/web/src/design-system/components/index.tsx`: `ConfidenceBadge` takes an optional `label`; without it, unchanged.
- `apps/web/src/app/globals.css`: the cards (auto-fit grid, one column on a phone), the gloss at heading size, the quotation with an accent rule.
- `apps/web/src/lib/baby-names-page.test.ts`: the meaning test checks the quotations, "Dzieło 1 z 2" and the Polish word; the English page's check against "mądrość" now targets the translation only, since Buryan's own line contains the word; a new test covers CONFLICTING in both languages.

No data, derivation, confidence rule or contract changed. `quotation` was already in `GivenNameMeaningFacts` and in the report PDF.

## Verification

- `pnpm format:check` — "All matched files use Prettier code style!"
- `pnpm check:ids` — "every task, ADR, migration and decision number is used once"
- `pnpm lint` — exit 0.
- `pnpm typecheck` — exit 0.
- `apps/web`: `pnpm exec vitest run` — 114 files, 1342 tests passed.
- `pnpm --filter ./apps/web build` — exit 0 (after the rebase onto `main` @ `f0b9828`).
- Chromium (Playwright) at 1150 and 390 px on a static page carrying the tile's markup and the app's CSS: two cards side by side on desktop, stacked on a phone, no horizontal overflow seen. The Tomasz quotations in that page were placeholders, not the stored lines.

## Not verified

- The real page with the stored Tomasz claim (no database in the session); not opened on staging.
