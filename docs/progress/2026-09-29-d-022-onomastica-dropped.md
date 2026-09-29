# 2026-09-29 — D-022 resolved: *Onomastica* is dropped as a meaning source

**Scope:** recording the project owner's answer to D-022, given on 2026-09-29 in the session that ran TASK-032: "Drop Onomastica", option (c). Documents only. Branch `claude/procent-continuation-7c2e00`, restarted from `main` @ `5636e95` (Merge #15).

## Changed

- **`docs/DECISIONS_NEEDED.md`:** D-022 is resolved in place, in the D-002 pattern:
  - a **Resolution** paragraph comes first;
  - the original record follows for reference. Only its heading changed, and its status line now reads "when raised".
- **`STATUS.md`:**
  - the last-rewritten line;
  - the CI line, from #13's merge to #19's;
  - Next no longer lists an *Onomastica* ingestion task, which only D-022 blocked;
  - open pull requests: #15 is merged, and this change's pull request is the only open one;
  - the delete list:
    - `claude/jolly-ramanujan-din7m6` is merged (#15);
    - the `claude/procent-continuation-7c2e00` entry now names the pull requests it carried: #14, #17, #18 and #19. The old line called #14 the ADR-0014 pull request; that was #17, and #14 was TASK-034.
  - the decisions line: one entry is open, D-021.
- **`docs/sources/onomastica.md`:** a dated line at the top says the journal is dropped. Its findings are unchanged.
- **`docs/sources/INVENTORY.md` §6 and `docs/CODEMAP.md`:** the *Onomastica* rows now say it is dropped, instead of "no article is admissible today".
- **`docs/sources/candidate-sources.md`, item 6:** a dated line says it is dropped; the notes below it stay as they were.
- **`tasks/032-onomastica-source-spike.md`:** the status line says D-022 was resolved the same day.

Unchanged:

- **D-002 and ADR-0008.** Meaning still comes from attributed Path B sources, or it is a stated gap.
- **No new ADR.** Nothing in the code or the model changes.
- **Code, migrations, fixtures, tests.** None changed.
- **TASK-032's progress record, `docs/progress/2026-09-29-onomastica-source-spike.md`.** It is not rewritten (`docs/progress/README.md`).

## Verified

Every command was run from the repository root on the branch's working tree.

| Command | Result |
|---|---|
| `pnpm check:ids` | exit 0: "check-unique-ids: every task, ADR, migration and decision number is used once" |
| `pnpm format:check` | exit 0: "All matched files use Prettier code style!" |
| `git diff --stat origin/main -- docs/canonical docs/library docs/archive docs/reference docs/review prompts packages apps fixtures` | empty: nothing under those paths changed |
| `grep -rn 'D-022'` over the repository's Markdown | Read line by line. Every mention says D-022 is resolved, except three kinds that are kept as they were: the original record in `DECISIONS_NEEDED.md`; TASK-032's own findings in `onomastica.md` (its opening list and §14), which now sit under the dated line; and TASK-032's progress record |

## Not verified

- **Tests and build.** Not run: no code changed. CI runs them on the pull request.
