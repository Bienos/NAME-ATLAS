@AGENTS.md

# Claude-specific context rules

`AGENTS.md` above is the operating contract. This file adds only what is specific to running Claude Code in this repository. It does not repeat those rules.

## Session shape

- One task per session, in a fresh context. Do not chain one task into the next.
- First, check that the branch is built on the latest `origin/main` (`AGENTS.md` §11). A web session's start hook prints a warning when it is not; act on it before anything else. Then read `STATUS.md` for the current state and the next task.
- Prefer a stronger model for architecture/decision sessions; implementation tasks are written to be executable by a mid-tier model.

## Context budget

The canonical corpus is roughly 1.1 MB of Markdown and `docs/archive/` alone is ~1.7 MB. Loading it will exhaust the context before the work is done.

- Locate sections with `grep -n` on headings, then read only the line ranges you need.
- Never `cat` a canonical document in full.
- Never read `docs/archive/` or `docs/library/` unless the task names the exact file and section.
- `PROGRESS.md` is a 373 KB frozen log. `grep -n` it; never read it whole.

## When compacting or summarising

Preserve, verbatim and at the top of the summary:

1. **Current task ID** (e.g. TASK-001) and its acceptance criteria status.
2. **Changed files** — full list of paths created, modified or deleted so far.
3. **Commands run and their real results** — the verification commands and their actual pass/fail output.
4. **Unresolved blockers** — anything that stopped work, and what is needed to unblock it.

Everything else (exploration notes, discarded approaches, file contents that can be re-read) may be dropped.

## Reporting

- Report what was actually run and what it actually returned. If a command was not run, say so.
- If the task is partially blocked, complete every unblocked part and state precisely what was left and why.
- Do not claim a verification passed from inspection alone.

## Plan mode

Use plan mode for decision/architecture sessions. Implementation sessions should produce a short plan in-line, then execute — the task file already contains the plan.
