# NAME ATLAS — CLAUDE-READY PACKAGE

**Prepared:** 2026-09-18

This is the package to give to Claude before implementation.

## What is authoritative

Use this order:

```text
current task file
→ accepted ADRs / contracts
→ PRODUCT.md / ARCHITECTURE.md once Claude creates them
→ docs/canonical/10–23
→ docs/library/
→ docs/archive/
```

`docs/canonical/` is read-only source material.

`docs/library/` is supporting product/UX/data research and must be read only when a task needs it.

`docs/archive/` contains large/duplicative material and should not be read routinely.

## Important corrections already decided

The first Claude session must formalise these rules:

1. P0 runtime is TypeScript/Node.js + Next.js + PostgreSQL/PostGIS + `pg_trgm`.
2. The earlier FastAPI/Python recommendation is superseded for P0.
3. Redis/Valkey and BullMQ are delayed until historical/asynchronous research needs them.
4. `ConfidenceAssessment` is epistemic and is separate from rights/surface eligibility.
5. `DistributionSnapshot` remains surname-scoped; PESEL national values can use `place_id = null`.
6. The old oversized BUILD-001 approach is superseded. Implementation must be split into bounded tasks.

## First action

Do NOT build the application immediately.

Open a fresh Claude session, preferably Opus for this architecture/control-plane pass, and paste:

```text
prompts/00_FIRST_CLAUDE_PROMPT_CONTROL_PLANE.md
```

That session creates the repository memory/control plane and only one detailed implementation task: `tasks/001-project-foundation.md`.

After the control-plane session is reviewed and committed, start a fresh Sonnet session with:

```text
prompts/01_IMPLEMENT_TASK_001_FOUNDATION.md
```

Do not continue automatically into TASK-002.


## Claude Code note

For Session 0, prefer **Opus** and use **Plan Mode** if available. The supplied first prompt is intentionally concise in repeated project context and points Claude to repository sources instead of duplicating the corpus.
