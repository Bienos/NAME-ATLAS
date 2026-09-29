# TASK-037 — The share card tells the truth about a surname not yet derived

- **Status:** IMPLEMENTED 2026-09-29. The record is in `docs/progress/2026-09-29-share-card-not-derived-wording.md`.
- **Found by:** the 2026-09-29 re-verification of TASK-023–025 (#21), "Found, not fixed", item 1.
- **Requested by:** the project owner, 2026-09-29 ("do the share card fix").
- **Milestone:** none. This is a defect fix.

## 1. Goal

For a surname the register lists but whose figures are not derived yet, the Open Graph card says "Zbiór nie podaje liczby dla tego nazwiska" / "The dataset publishes no count for this surname". That is false: the dataset does publish a count, and Name Atlas has not prepared it yet.

The read path already tells the two cases apart. It returns population `UNAVAILABLE` with `reason_code = NOT_DERIVED_YET` when the national register holds a count, and `NO_APPLICABLE_EVIDENCE` when it does not (`packages/truth/src/query.ts`). The page and its metadata description already use that difference (`snapshot.tsx`, `surname-page.tsx`, fixed in `3fbd477`). Only `ogFacts` ignores it.

## 2. In scope

- `apps/web/src/lib/og-facts.ts`: when population is `UNAVAILABLE` with `NOT_DERIVED_YET`, the card's caveat is the page's own sentence, `UI[lang].heroNotDerived`, so the card and the page cannot disagree.
- `apps/web/src/lib/og-facts.test.ts`: tests for that case in both languages, and for `NO_APPLICABLE_EVIDENCE`, which keeps its current sentence.

## 3. Out of scope

- Any other wording on the card: the rights-blocked and the no-count sentences stay as they are, because both are true for their cases.
- The card's layout or styling.
- The page, the API, the contract and the read path. None of them is wrong.

## 4. Acceptance criteria

- **AC-1** For population `UNAVAILABLE` with `NOT_DERIVED_YET`, the card's caveat equals `UI[lang].heroNotDerived` in Polish and in English. It says neither "nie podaje liczby" nor "publishes no count".
- **AC-2** That card carries no number: no line, and no digit run of two or more anywhere in its facts.
- **AC-3** For population `UNAVAILABLE` with `NO_APPLICABLE_EVIDENCE`, the caveat is unchanged: the dataset publishes no count.
- **AC-4** The rights-blocked, READY and unresolved cards are unchanged; their existing tests pass as they are.

## 5. Verification

```
pnpm check:ids && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

Plus, against a local register with some surnames left underived: the built app's card for such a surname (`/pl/nazwisko/{slug}/opengraph-image`) is rendered and inspected.
