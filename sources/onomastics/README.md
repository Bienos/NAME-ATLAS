# `sources/onomastics/` — real onomastic source files

Committed because they are lawful to commit: each work here is public domain or openly
licensed, and its file states the basis (ADR-0008 §4). Synthetic test data lives in
`fixtures/onomastics/`, never here.

| File | Work | Basis |
|---|---|---|
| `buryan-1933.json` | ks. Józef Buryan, *Skąd pochodzi twoje imię i nazwisko…*, Warszawa 1933. 1,304 surnames from chapter B (TASK-081; 25 before it) | Public domain: author died 1950 (art. 36) |

Import with `pnpm import-onomastics --file sources/onomastics/<file>.json`; a changed file
imports as a new version of the work and the earlier one becomes `UPDATED`. Then derive
with `pnpm truth:derive-batch --all` or `pnpm demo:surname-meaning "<surname>"`.
