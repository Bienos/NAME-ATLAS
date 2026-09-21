# TASK-025 — surname comparison

- **Status:** IMPLEMENTED_UNVERIFIED 2026-09-21.
- **Priority:** P1 (directive §72: P1-1; §24–§25).
- **Depends on:** TASK-024.

## 1. Goal

`/pl/porownaj?a={slug}&b={slug}` shows two surnames side by side and compares a figure **only** when
scope, date and denominator match; otherwise it says the figures are not directly comparable.
`noindex`. Never implies shared ancestry, family relation or ethnic similarity.

## 2. Acceptance criteria

- **AC-1** Population compares per partition only when `comparability_group` and `snapshot_date` are
  equal on both sides.
- **AC-2** Rarity compares only when `denominator`, `comparability_group` and `snapshot_date` are
  equal; otherwise the not-comparable sentence.
- **AC-3** The page carries the fixed disclaimer that surname evidence alone establishes no family
  relation, in both languages.
- **AC-4** `robots: noindex`.
- **AC-5** A side that did not resolve renders its own unresolved state and no comparison.
