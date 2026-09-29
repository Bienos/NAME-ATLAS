# 2026-09-29 — CODEMAP: list TASK-033 and TASK-034 as implemented

**Scope:** one line of `docs/CODEMAP.md`, the `tasks/` row.

## Changed

- The `tasks/` row named `001`–`006`, `008`–`028`, `030` and `031` as implemented, and omitted two tasks whose headers say "IMPLEMENTED":
  - `033-surname-links-and-section-rights.md` (2026-09-24, merged in #10);
  - `034-web-section-registry-and-design-tokens.md` (2026-09-29, merged in #14).

  Both are now listed, with their records. TASK-034's own change should have added it.

## Verified

| Command | Result |
|---|---|
| `pnpm format:check` | "All matched files use Prettier code style!" |
| `pnpm check:ids` | "every task, ADR, migration and decision number is used once" |
| `grep -m1 Status tasks/033-*.md tasks/034-*.md` | both "IMPLEMENTED" |

## Not verified

- Nothing else. No code changed, so no tests were run.
