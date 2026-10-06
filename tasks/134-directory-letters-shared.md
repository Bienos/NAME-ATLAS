# TASK-134 — The directory's letter list, read once per instance

- **Status:** IMPLEMENTED 2026-10-06 on `claude/loving-faraday-1pyo0y` (`docs/progress/2026-10-06-directory-letters-shared.md`).
- **Requested by:** the project owner, 2026-10-06: "yes cache the letter list", after TASK-132's post-merge check. On production eight directory pages requested at once answered seven `200`s after 35–79 s and one `500`, a query that waited past the 30 s limit for one of the instance's two connections.
- **Depends on:** TASK-129, TASK-130, TASK-132.
- **Model guidance:** implementation session.

## 1. Goal

A directory page's render no longer reads which letters list a surname, except the first on an instance in 6 hours. Renders that start together wait for that one read. What the pages show does not change.

## 2. In scope

- `apps/web/src/lib/directory-page.tsx`: `loadDirectoryLetters` keeps the read's promise for `LETTERS_TTL_MS` (6 hours, the pages' own `revalidate`). It is shared by every render on the instance, and a failed read is not kept.
- Its unit tests.

## 3. Out of scope

- Next's data cache or any store shared between instances; warming pages after a deployment.
- The count and entries queries, the pool (TASK-132), the number of connections.

## 4. Acceptance criteria

- **AC-1.** Two renders, started together or one after the other, read the letters once. A read 6 hours old is read again, and a failed read is read again on the next render (unit tests that fail against #160's loader, except the last, which it also passes).
- **AC-2.** Every directory page still draws the letters (local `next start`).
- **AC-3.** The 40-page burst that TASK-132 measured locally answers sooner (local `next start`).
- **AC-4.** On production after deployment, eight directory pages requested at once all answer `200`.

## 5. Verification

```bash
pnpm test
TEST_DATABASE_URL=… pnpm test:integration
pnpm test:golden
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm build
```
