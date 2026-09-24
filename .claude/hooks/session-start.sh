#!/bin/bash
# SessionStart hook for Claude Code on the web: warns when this checkout does
# not contain the latest origin/main. It never changes the branch and never
# fails the session; its only output is a warning the session reads at start.
#
# Why it exists: in September 2026 the GitHub default branch pointed at a
# stale branch. Sessions started from it, and the same tasks were built two
# or three times on a base that main had long since left (AGENTS.md §11).

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

if ! timeout 30 git fetch --quiet origin main >/dev/null 2>&1; then
  echo "Branch check (AGENTS.md §11): could not fetch origin/main. Confirm by hand that this branch is built on the latest main before changing anything."
  exit 0
fi

if git merge-base --is-ancestor origin/main HEAD 2>/dev/null; then
  exit 0
fi

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
behind="$(git rev-list --count HEAD..origin/main 2>/dev/null)"
ahead="$(git rev-list --count origin/main..HEAD 2>/dev/null)"

cat <<MSG
WARNING (AGENTS.md §11): branch '${branch}' is not built on the latest origin/main.
It is ${behind:-?} commit(s) behind main and has ${ahead:-?} commit(s) main does not.
Work on this base can repeat or contradict what main already has. Before changing anything:
- If this session has committed nothing yet, move the branch onto main: git checkout -B ${branch} origin/main
- Otherwise, rebase this session's commits onto origin/main, or ask the project owner.
Stay on this base only if the task says to continue an existing branch.
MSG
exit 0
