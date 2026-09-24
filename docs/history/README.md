# docs/history/ — superseded orientation and status files

These files once told a reader where to start or what to do next. Each is out of date, and each disagreed with the others, so they were moved out of the repository root and `docs/implementation/` on 2026-09-24. They are kept for provenance. **Do not act on them. The current state is [`STATUS.md`](../../STATUS.md).**

| File | What it was | Superseded by |
|---|---|---|
| `00_READ_THIS_FIRST.md` | Day-one package orientation (2026-09-18). It sends a new reader to the "Session 0" control-plane prompt and to TASK-001 | `README.md` for people, `AGENTS.md` + `CLAUDE.md` for agents |
| `PACKAGE_MANIFEST.md` | SHA-256 inventory of the corpus as delivered on 2026-09-18. It is still the reference hash list for `docs/canonical/`, `docs/library/` and `docs/archive/`; its root-file entries describe the delivery, not today's tree | Nothing; kept for the hashes |
| `NAME_ATLAS_HANDOFF_2026-09-21.md` | One session's handoff note (branch `claude/elegant-archimedes-w5ony1`) | `STATUS.md` |
| `NAME_ATLAS_TASKS_2026-09-21.md` | A task index with its own status vocabulary, last updated 2026-09-21 | `STATUS.md`, and each task file's own header |

Two byte-identical root duplicates were deleted at the same time. `FIRST_PROMPT_TO_COPY.md` is still in `prompts/00_FIRST_CLAUDE_PROMPT_CONTROL_PLANE.md`, and `NAME_ATLAS_IMPLEMENTATION_PLAN_REVIEWED_2026-09-18.md` is still in `docs/review/`.
