# 2026-09-30 — Candidate-source records recovered from `claude/peaceful-planck-u659j1`; the unreviewed branches reviewed

No task file. The project owner asked for a review of the branches nobody had reviewed, then for the useful work on them to be brought into `main` ("yes, do that").

## Changed

- **Recovered, byte for byte from `claude/peaceful-planck-u659j1`** (34 of 36 files):
  - `docs/sources/onomastics-open-access.md`, `rymut-1990.md`, `sgkp.md`, `us-census-surnames.md`: rights and availability records for four candidate sources.
  - `docs/sources/acquisition/2026-09-30/`: the provenance record, source lists, checksums, verbatim publisher metadata and evidence manifests behind them. No raw source bytes.
- **Recovered and edited** (2 of 36):
  - `docs/sources/pesel-earlier-editions.md`: a note at the top that the branch's decision numbers (its D-006 and D-007) are not `main`'s, and an appendix recovered from `claude/optimistic-thompson-gy5uoc`: placeholder surnames (`BRAK DANYCH`, `BRAK NAZWISKA`) in the earlier editions. The appendix's counts were not re-verified.
  - `docs/sources/acquisition/2026-09-30/README.md`: the same note at the top.
- **`docs/sources/pesel.md`**: one paragraph, the branch's update, with its "(D-007)" pointer replaced by what `main` later did (TASK-044 and the registry).
- **`docs/CODEMAP.md`**: two rows.
- **`STATUS.md`**: the branch section rewritten from the review; a "Next" line on the placeholder and PRAWDA findings; open pull requests; "Last rewritten".

## Left behind on purpose

- The branch's `PROGRESS.md` entry: that file is frozen (`AGENTS.md` §1).
- The branch's `docs/DECISIONS_NEEDED.md` edits: a "D-007" (earlier editions as a time series) that would collide with `main`'s D-007 (PESEL resource-level licence, resolved), and a D-002 update that `main` has since resolved by ADR-0008. `check:ids` would fail on the first, and ADR-0019 decides the question it asks.

## The review

Method: `git cherry` (commits already on `main` by patch), a per-file comparison with `origin/main` of every file each branch adds, and `git merge-tree --write-tree` against `main` @ `7067266`. No branch had a commit on `main` by patch, so the file comparison decided. The verdicts are in `STATUS.md`. One correction to what was said in the session: the placeholder finding was not in `peaceful-planck`, only on `optimistic-thompson`. It is recovered here.

## Verified

| Command | Result |
|---|---|
| `git ls-remote --heads origin` | 24 heads including `main`, after the owner deleted the 18 merged branches |
| Recovered files against `origin/claude/peaceful-planck-u659j1`, by `git hash-object` | 34 of 36 identical; the 2 that differ are the two edited above |
| `pnpm format:check`, `pnpm lint`, `pnpm check:ids` | exit 0 each |
| `grep` for `BRAK DANYCH` and `PRAWDA` in `main` (outside `docs/progress/`, `PROGRESS.md`, `fixtures/`) and in `tasks/`, `packages/`, `ops/` and `docs/progress/` of `claude/inspiring-bohr-vten7x` | no match |

## Not verified

- The recovered records' own facts (checksums, licence readings, counts). They are that session's observations, made on 2026-09-29 and 2026-09-30, and none was re-fetched.
- `SHA256SUMS.txt` against any file: no raw source bytes are stored here.
- `pnpm test` and `pnpm build`: nothing in this change is TypeScript.
- Whether `main`'s importer has a rule that rejects placeholder surnames without naming them.
- The diff of #30 and of `claude/amazing-allen-zjl819`, `claude/friendly-tesla-kv125o`, `claude/inspiring-bohr-vten7x` and `claude/awesome-darwin-af7l50`: their merge state with `main` was tested, their content was not reviewed line by line.
