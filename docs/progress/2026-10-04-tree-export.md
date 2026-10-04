# 2026-10-04 — TASK-098: the family tree as a JSON download

**Task:** `tasks/098-tree-export.md`. **Number:** 098: 095 is taken on `main` by the blog's seventh post (#102), 096 and 097 by the open pull requests #106 and #108; the task was first numbered 095 and renumbered on the rebase. **Requested by:** the project owner, "Merge go" (2026-10-04), after invitations and claims (TASK-094, #103); STATUS named export as a download as the tree's next step. **Specification:** ADR-0029 §2.4.14 and `docs/contracts/tree.md`.

## What changed

- `apps/web/src/lib/tree-export.ts` (new): `handleTreeExport(treeId, request, deps)`: 404 for an id that is not one, 401 without a session, 404 for a tree the session may not open (through `exportTree`, which records `EXPORTED`), else 200 with the contract's object (`schema_version` 1.1, the service's read without `place_codes`, `places` empty), `content-disposition: attachment` with a file name from the language's word and the id's first eight characters (`drzewo-0199a1b2.json`), `private, no-store`, the request id; a failure is the §78 envelope with `INTERNAL_ERROR`. Log lines carry ids, a status, a count and a duration.
- `apps/web/src/app/api/v1/trees/[id]/export/route.ts` (new): the Next route over it; 404 while the tree is off.
- `tree-paths.ts`: `treeExportPath(lang, treeId)`. `request-policy.ts`: `/api/v1/trees/` is held to the tree's bucket. `tree-text.ts`: the link's words and the line under it, both languages. `tree-page.tsx`: the link on the Rodowód for every role, between the pedigree and the owner's delete section.
- `docs/contracts/tree.md`: the export is built, what it carries, and that the plain read is not.
- Tests: `tree-export.test.ts` (new; the four answers, the file name, the shape against `treeResponseSchema`, a member's view, the envelope, no name in a log line), `tree-paths.test.ts`, `request-policy.test.ts`, `tree-page.test.ts` (the link for the owner in both languages and for a viewer), `tests/integration/src/tree-pages.test.ts` (the owner's export validates against the runtime schema and writes one `EXPORTED` row; a member's export is the member's view; a stranger's token is 401).
- `docs/CODEMAP.md`, `STATUS.md`, `tasks/098-tree-export.md`.

No new dependency; no change to the service, the schema or the contract's shape. Nothing in production changes: the route exists only where the tree's pages do.

## Verification

Run on 2026-10-04 in this container (PostgreSQL 16 with PostGIS, local), after the last edit:

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids` — exit 0.
- `pnpm test` — every package, exit 0; the web suite 70 files, 778 tests.
- `pnpm --filter web build` with `FAMILY_TREE_ENABLED=1` and the accounts variables — exit 0; the route listed as `ƒ /api/v1/trees/[id]/export`.
- `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm test:integration` — 37 files, 439 tests, exit 0.

## Not verified

- A click in a browser (the link is a plain `<a download>` to a GET the unit and integration tests exercise; TASK-092's and TASK-094's browser runs covered the page it sits on).
- The route in production: the tree is dark there.
- GEDCOM, the plain read `GET /api/v1/trees/{id}`, coordinates in `places`: not built (the task's §3).
