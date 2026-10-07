# TASK-177 — The baby-names meaning tile as one card per work

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-baby-names-meaning-cards.md`).
- **Requested by:** the project owner, 2026-10-07, with a screenshot of the "Co znaczy" tile for Tomasz: "zrob widok tych danych ladniej zaprezentowany i czy mozemy cos wiecej od[...]".
- **Decision:** ADR-0045 (meanings in a work's own words), ADR-0046 (Brand System v1). No new ADR, no migration, no D- number.
- **Numbers:** TASK-177 (176 is the highest on `main` @ `f0b9828`).
- **Model guidance:** implementation session.

## In scope

The "Co znaczy" / "What it means" tile on `/pl/imiona-dla-dziecka` and `/en/baby-names` (`Meaning` in `baby-names-page.tsx`):

1. Each work as its own card: "Dzieło n z m" when there is more than one, the author and the year as the card's head, the gloss first and largest with Name Atlas's translation under it, then the origin.
2. The work's own line (`quotation`, already in `GivenNameMeaningFacts` and already shown in the report PDF) quoted verbatim under "W dziele" / "In the work".
3. The assessment as the page language's word (`assessmentWord`) in the confidence badge, not the raw status; for CONFLICTING, one line saying the works disagree and that we show each one.
4. `ConfidenceBadge` takes an optional `label`; without it, it renders as before.

## Out of scope

The meaning data, its derivation and its confidence rule; the couple-names and full-name views; the free-view teaser; new data from any source.

## Acceptance

- **AC-1:** each work's quotation is shown verbatim; nothing is composed or derived from it.
- **AC-2:** the existing meaning-tile tests still hold, apart from the English page's check against "mądrość", which now targets the translation only (a Polish work's own line may contain the word).
- **AC-3:** no horizontal overflow at 390 px.

## Verification

`pnpm format:check`, `check:ids`, `lint`, `typecheck`, the web tests; Chromium at 390 and 1150 px.
