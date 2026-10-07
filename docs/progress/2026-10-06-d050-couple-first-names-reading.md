# 2026-10-06 — D-050 recorded: a paid, AI-written reading of two first names' meanings for a couple

**Changed:**

- `docs/DECISIONS_NEEDED.md`: new entry D-050 (open), placed above D-047. The owner asked in a Claude Code session for first-name compatibility for couples, judged from the names' meanings, with an explanation written by AI, paid, one's own name free, and for a proposed price. The entry records the facts that bind it (ADR-0035 §2.3 and TASK-100 §3.4, ADR-0045 and D-046, ADR-0013, PRODUCT.md §5, §7 and non-goal 11), three framings (A, a reading of the two sourced meanings with no verdict, recommended; B, A plus shared motifs; C, a verdict or percentage), the free/paid line, a proposed price of 14,99 zł one-time held also by `couple` and above, the coverage gate, and four questions for the owner.
- `STATUS.md`: the "Decisions" line under "Blocked on the project owner" names D-050; "Last rewritten" names this change.
- No code, contract, ADR or task changed. Nothing is built.

**Verified:**

- `pnpm check:ids` → `check-unique-ids: every task, ADR, migration and decision number is used once`.
- D-050, ADR-0047 and TASK-156 are free on `main` @ `3d12f1a` and on the one open pull request's branch (`task-149-dark-atlas-frontend`, #178): `git grep` of `^## D-050` in its `docs/DECISIONS_NEEDED.md` and `git ls-tree` of its `tasks/` and `docs/adr/` found none.
- Counted on the committed files with a script over `sources/given-name-meanings/buryan-1933.json` (112 entries, 24 with `literal_gloss`) and `yonge-1884.json` (86 entries, all with `literal_gloss`): 168 names in the union, 107 with a meaning, 61 with an origin only.

**Not verified:**

- The share of couples for which both names carry a meaning (D-050 fact 3 says "3–4 in 100") is an estimate from the per-work shares of people in `docs/sources/given-name-meanings.md` §2, assuming the two partners' names are independent. The full 2026-01-20 lists are not in the repository (`fixtures/pesel-given-names/` holds 22 and 24 rows), so it was not measured.
- No test suite was run: the change is documentation only.
