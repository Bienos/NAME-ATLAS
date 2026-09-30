# `sources/onomastics/` — real onomastic source files

Committed because they are lawful to commit: each work here is public domain or openly
licensed, and its file states the basis (ADR-0008 §4). Synthetic test data lives in
`fixtures/onomastics/`, never here.

| File | Work | Basis |
|---|---|---|
| `buryan-1933.json` | ks. Józef Buryan, *Skąd pochodzi twoje imię i nazwisko…*, Warszawa 1933 | Public domain: author died 1950 (art. 36) |
| `onomastica-64-16-walkowiak.json` | Justyna B. Walkowiak, „Współczesne nazwiska Polaków o możliwej genezie litewskiej…”, *Onomastica* LXIV (2020), s. 211–228 | CC BY-ND 4.0, as printed; relied on by D-022 (2026-09-30). Verbatim excerpts only |

Import with `pnpm import-onomastics --file sources/onomastics/<file>.json`, then derive
with `pnpm truth:derive-batch --all` or `pnpm demo:surname-meaning "<surname>"`.
