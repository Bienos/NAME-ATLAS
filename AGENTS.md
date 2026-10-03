# AGENTS.md — Name Atlas operating rules

Operational contract for any coding agent or engineer working in this repository.
Read this before touching anything. It is short on purpose.

## 1. Source ownership

Each kind of truth has exactly one owner. Never duplicate truth across files.

| Truth | Owner |
|---|---|
| Product definition, scope, promises, non-goals | `PRODUCT.md` |
| System shape, boundaries, invariants | `ARCHITECTURE.md` |
| Milestones (coarse) | `PLAN.md` |
| Current state: what is live, what is next, what is blocked | `STATUS.md`, rewritten in place and never appended to |
| Record of each verified change | `docs/progress/YYYY-MM-DD-<slug>.md`, one file per change (`PROGRESS.md` is the frozen log up to 2026-09-24) |
| Binding technical decisions | `docs/adr/` |
| API/data contracts | `docs/contracts/` |
| Scope of the work in front of you | the current `tasks/NNN-*.md` file |
| Engineering specification | `docs/canonical/10–23` |
| Source classification/ownership map | `docs/SOURCE_MAP.md` |
| Repository areas | `docs/CODEMAP.md` |
| Open decisions that block work | `docs/DECISIONS_NEEDED.md` |
| Search and editorial content queue (rules in ADR-0031) | `docs/SEO_CONTENT_PLAN.md` |

## 2. `docs/canonical/` is read-only

- Never edit, reformat, move, rename or "tidy" anything in `docs/canonical/`.
- The same applies to `docs/library/`, `docs/archive/`, `docs/reference/`, `docs/review/` and `prompts/`.
- If a canonical document is wrong or contradicts another, record it in `docs/DECISIONS_NEEDED.md` or supersede it with an ADR. Do not silently resolve it in code.

## 3. The current task file is the scope authority

- One task = one bounded outcome = one reviewable change.
- The task file's **In scope** and **Out of scope** sections win over every other document, including this one, for the question "may I build this?".
- If the task cannot be completed as specified, stop and report. Do not substitute a different task.

## 4. Reading order for a task session

1. `tasks/NNN-*.md` (the assigned task)
2. `STATUS.md`
3. ADRs and contracts **referenced by that task**
4. `ARCHITECTURE.md` sections relevant to the task
5. Canonical documents **only** where the task names them

Do not read the canonical corpus, `docs/library/`, `docs/archive/`, `PROGRESS.md` (a 373 KB log) or `docs/progress/` in bulk. `grep` them for what the task needs. They are large and will crowd out the work.

## 5. Preflight before editing

Run a targeted, read-only preflight: check `git status`, read the files you are about to change, confirm existing behaviour. Then state a short plan. Then edit.

No generic repo-wide exploration. No "let me understand the whole codebase first".

## 6. Change discipline

- No unrelated refactors.
- No reformatting of files you were not asked to change.
- No dependency upgrades unless the task requires them.
- No new dependency without a one-line justification in the change description.
- Preserve existing contracts and behaviour. A contract change requires a contract/ADR update in the same change.
- Implement the **smallest complete** version that satisfies the acceptance criteria. Complete, not partial; smallest, not speculative.
- Do not add abstraction for future tasks. The next task will add it when it needs it.

## 7. Verification

- Run the exact verification commands listed in the task file.
- Report actual commands and actual output. Never report a command as passing unless it was run and passed.
- A failing verification is a result, not a reason to widen scope.

## 8. Before you finish

1. Inspect the complete diff, file by file.
2. Remove accidental changes, debug code, stray files.
3. Update `docs/CODEMAP.md` if the repository structure changed.
4. Record facts only in a new `docs/progress/YYYY-MM-DD-<slug>.md`: what changed, the exact verification commands with their real results, and what was not verified. Then rewrite whatever lines of `STATUS.md` your change made untrue. Replace its "Last rewritten" line with your change alone; do not chain earlier changes onto it.
5. **No record-only changes.** A merge, a deploy or a go-live check gets no commit, pull request or progress file of its own. Write what you checked as a comment on the merged pull request. The next change that touches `STATUS.md` brings its Production lines up to date.
6. **STOP after the current task.** Do not start the next task, do not create the next task file, do not "get a head start".

## 9. Facts only

- `STATUS.md` and `docs/progress/` record observed state, not intentions and not narrative.
- Never invent data values, counts, licence terms, source metadata or test results.
- `INSUFFICIENT_DATA` and "not verified" are valid, preferred outcomes over plausible fabrication.

## 10. Standing domain invariants

These hold in every task and may not be traded away for convenience:

- Epistemic confidence and rights are separate dimensions. Rights never change factual confidence. See `ARCHITECTURE.md` §5–6 and ADR-0001.
- Suppressed or absent source data is not zero.
- `DistributionSnapshot` is surname-scoped.
- Presentation layers never derive facts; they render validated claims.

## 11. One trunk: branches and numbers

`main` is the only line of development. Parallel sessions that built on other bases have repeated work `main` already had, and have given the same number to different things.

- **One session at a time.** Only one session commits toward `main` at once. Start the next when the last one's pull request is merged or closed. Parallel sessions are where the renumbering, the reverted work and the stale branches came from.
- **Start from the latest `origin/main`.** Run `git fetch origin main` and `git merge-base --is-ancestor origin/main HEAD`. If that fails and the session has committed nothing, move the branch onto `origin/main`. If the session has commits of its own, rebase them onto `origin/main` or stop and ask. Build on another branch only when the task says so. In Claude Code on the web, `.claude/hooks/session-start.sh` prints a warning when this check fails.
- **One task, one branch, one pull request into `main`.** When it is merged or closed, delete the branch.
- **Numbers come from `main`.** A new `TASK-NNN`, ADR, `D-NNN` or migration takes the next number that is free on `origin/main` *and* in open pull requests. Numbers that live inside a task (`U-n`, `AC-nn`) are cited with their task: `TASK-004 §14 U-1`. CI runs `pnpm check:ids`, which fails when two files or decisions share a number.
- **Found it already on `main`? Stop.** If the work in front of you already exists on `main`, report that instead of building it again.
