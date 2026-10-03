# 2026-10-03 — The SEO and content strategy, reviewed and adopted (ADR-0031)

Branch `claude/great-wozniak-5wwxf8`, on `origin/main` @ `7363889`. The owner supplied *NameAtlas_SEO_GEO.docx* (*Name Atlas — SEO + GEO Research & Content Strategy*, research date 3 October 2026) and asked for it to be reviewed and applied. The strategy covers twelve months of work, so this change adopts it as a decision and a queue. It builds no page and writes no post: each piece is its own task (ADR-0031 §2.7).

## Changed

- `docs/adr/0031-search-and-editorial-content.md`: the strategy's rules (one surname URL per surname, editorial pieces for general questions, original data studies, no separate GEO layer, extend rather than duplicate, the banned list) and nine review amendments. ADR-0028, 0029 and 0030 are held by open pull requests #65, #67 and #81, so this takes 0031.
- `docs/SEO_CONTENT_PLAN.md`: the query → surface map, the surname-page intents, the thirty-piece queue with a status for each, four briefs, the data studies split into ungated and gated, the flagship index, the roadmap and the hundred-title backlog.
- `AGENTS.md` §1 (a row for the plan), `docs/CODEMAP.md` (the ADR and the plan), `STATUS.md` (a "Next" line and "Last rewritten").

## Review findings, checked against the repository

- Every page is `noindex` while `SEO_INDEXING_ENABLED` is unset (`apps/web/src/lib/seo.ts`; STATUS.md's blog line). The strategy's month 1 "index first qualified surname cohort" is left to the owner and `PLAN.md` M8.
- Regional suppression per (surname, voivodeship) cell is NOT VERIFIED (`docs/sources/pesel-regional.md` item 9). So "found in only one województwo" and the other concentration studies are gated.
- The national 2026-01-20 files sum to 42,757,839 occurrences against GUS's ~37.3 million residents (`docs/sources/candidate-sources.md`). Studies report occurrences, not people.
- The strategy's statement that single-occurrence forms are excluded matches `docs/sources/pesel-regional.md` item 9 (`PESEL_MIN_VALID_COUNT = 2`).
- The 2019–2026 series has no 2022 women's edition, and `PRAWDA` has no 2020–2022 point (STATUS.md).
- `PRODUCT.md` §8 non-goal 5 (no coat-of-arms or noble-descent claims) limits pieces 18 and 30 to correcting the myth. Non-goal 14 (no programmatic SEO) agrees with the strategy.
- The blog is already bilingual (TASK-071), which contradicts month 11's "begin English content".
- Pieces 5, 6, 15–17, 25 and 26 overlap the live posts `genealogia`, `koncowki-nazwisk` and `jak-szukac-przodkow` (their `##` headings were read).
- The strategy names two domains for "Szukaj Nazwiska" (`szukajnazwiska.pl`, `szukaj-nazwiska.pl`).

## Verified

- `pnpm check:ids`: exit 0, "every task, ADR, migration and decision number is used once".
- `pnpm format:check`: exit 1, with warnings on nine `.ts` files this change does not touch (`account-paths.ts`, `deck-client.tsx`, `resolution.ts`, `onomastics.ts`, `alto.ts`, `rights.ts`, `registry.ts`, `confidence.ts`, `query.ts`). The same nine fail with this change stashed. `node_modules` was not installed, so the Prettier that ran may not be the pinned one. None of this change's files is flagged.
- `typecheck`, `lint`, `test` and `build` were not run: the change touches Markdown only.

## Not verified

- The strategy's competitor descriptions and its source URLs: none was fetched in this session.
- Its demand labels and scores: the strategy states they are directional, and no volume data exists in the repository.
