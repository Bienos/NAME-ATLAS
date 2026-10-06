# TASK-130 — The directory's `inne` page answers 500 on production

- **Status:** IMPLEMENTED 2026-10-06 on `claude/loving-faraday-1pyo0y` (`docs/progress/2026-10-06-directory-one-connection.md`).
- **Found by:** TASK-129's post-merge check on #156, 2026-10-06: `/pl/nazwiska/inne` answered `500` on two of two fetches, and the directory's root links to it. The project owner had asked for that change to be opened and merged.
- **Depends on:** TASK-129.
- **Model guidance:** implementation session.

## 1. Goal

Every directory page the root links to answers, `inne` included. What the directory lists does not change.

## 2. In scope

- `apps/web/src/lib/directory-page.tsx`: `loadDirectoryLetter` runs its queries one after another, not three at once, and does not read entries for a page past the last.
- Its unit tests.

## 3. Out of scope

- The pool's size and timeouts (`lib/db.ts`, TASK-029), the queries themselves, and caching the letter list across pages.

## 4. Acceptance criteria

- **AC-1.** A letter page's render has at most one directory query in flight (unit test that fails against #156's loader).
- **AC-2.** A page past the last reads no entries and is still a 404 (unit test).
- **AC-3.** On production after deployment, `/pl/nazwiska/inne` answers `200`, and the other letters still do.

## 5. Verification

```bash
pnpm --filter web test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm build
```
