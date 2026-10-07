# TASK-161 — "Jak to działa" / "How it works", redrawn

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-how-it-works-redesign.md`).
- **Requested by:** the project owner: "redo the whole section for jak to działa — cool, creative and easy to understand".
- **Decision:** none new. The page keeps every statement of TASK-052; the dusk tokens of ADR-0021.
- **Numbers:** TASK-161: 158 is on `main`; 159 and 160 are claimed by open branches. `pnpm check:ids` exit 0.

## 1. Goal

The same facts, read at a glance: what every answer is made of, a jump strip, and each section as a numbered, illustrated step.

## 2. In scope

1. `how-text.ts`: every section gains an anchor `id`, a `visual` and a `short` label; the document gains `labels` (the illustrations' words, one plain gloss per confidence word, the closing link), in both languages.
2. `how-page.tsx`: the hero with three promises (source, date, certainty word); "what every answer is made of" — a sample answer with placeholders and four pinned parts; a sticky jump strip; the sections as numbered cards with an icon and, for the count, rarity, voivodeships and no-data sections, a decorative drawing; the confidence words as a ladder with a gloss each; "what we do not do" as three crossed items; a link back to the search.
3. Styles in `globals.css` (`.how-…`), dusk tokens only; the shimmer only without reduced motion.
4. Tests in `how-page.test.ts`.

## 3. Out of scope

Other reading pages; new facts or figures (the drawings carry no measured value: bars and pips are drawn, the sample answer's figure and date are placeholders); new dependencies.

## 4. Acceptance criteria

- **AC-1:** every section and confidence word renders in both languages, each section anchored and linked from the jump strip.
- **AC-2:** no figure is drawn that a dataset did not give.
- **AC-3:** no horizontal overflow at 390 and 1280 px in Chromium.

## 5. Verification

`pnpm format:check`, `lint`, `check:ids`, `--filter web typecheck`, `--filter web test`; Chromium at 390 and 1280 px, `next dev --webpack`.
