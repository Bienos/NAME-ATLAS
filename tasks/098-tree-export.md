# TASK-098 — The family tree: export as a download

- **Status:** IMPLEMENTED 2026-10-04; AC-1 to AC-5 verified (`docs/progress/2026-10-04-tree-export.md`).
- **Requested by:** the project owner, 2026-10-04: "Merge go", after invitations and claims (TASK-094, #103); STATUS names export as a download as the tree's next step.
- **Number:** 098: 095 is taken on `main` by the blog's seventh post (#102), 096 and 097 by the open pull requests #106 and #108; the task was first numbered 095 and renumbered on the rebase.
- **Builds on:** TASK-066 (`exportTree`: the same read as `getTree`, recorded as `EXPORTED`), `docs/contracts/tree.md` (`GET /api/v1/trees/{id}/export`, the `tree` object 1.1), ADR-0029 §2.4.14 (export is a reader's right and a feature; an export is an audit event), TASK-076 (the pages, the session cookie), TASK-029 (the request policy's buckets).
- **Record:** `docs/progress/2026-10-04-tree-export.md`.

## 1. Outcome

Anyone who can open a tree can download it: a link on the Rodowód, "Pobierz drzewo (JSON)", answers the tree as one JSON file in the contract's shape, as the reader sees it (a member without `sees_living` gets the deceased and the count, as on the page), and the service records `EXPORTED`. GEDCOM is not built (ADR-0029 §2.4.14: "when asked for").

## 2. In scope

1. **The route** `GET /api/v1/trees/{id}/export` (`apps/web/src/app/api/v1/trees/[id]/export/route.ts` over `apps/web/src/lib/tree-export.ts`): 404 with the tree off or an id that is not one; 401 without a session; 404 for a tree the reader may not open (not told apart from none); 200 with the `tree` object (`schema_version` 1.1, `places` empty: the register holds no coordinates, TASK-092), `content-disposition: attachment` with a plain file name, `private, no-store`, the request id. A failure is the §78 error envelope with `INTERNAL_ERROR`. Nothing a reader wrote is logged.
2. **The link** on the Rodowód for every role (`tree-paths.ts`: `treeExportPath`; `tree-text.ts`: the words; `tree-page.tsx`).
3. **The request policy:** the route is held to the tree's bucket.
4. The contract's note that the route exists and what `places` carries.
5. Tests: the handler (each answer, the file name, the envelope, no name in a log line), the path, the policy, the rendering, the integration case over a real database (the owner's export validates against the runtime schema and writes one `EXPORTED` row; a member's export is the member's view).

## 3. Out of scope

- GEDCOM 7, `GET /api/v1/trees/{id}` as a plain read (the pages read through the service), an import, coordinates for `places`, any change to the service or the schema.

## 4. Acceptance criteria

- **AC-1** The route answers 404 when the tree is off or the id is not one, 401 without a session, 404 for a tree the session may not open, and 200 with `content-disposition: attachment; filename="…json"` and `cache-control: private, no-store` otherwise.
- **AC-2** The body validates against `treeResponseSchema` and equals the service's read with `schema_version` and `places: []`.
- **AC-3** The owner's export writes exactly one `EXPORTED` audit row; a member without `sees_living` receives the deceased and `hidden_living_count`, nothing of the living.
- **AC-4** The Rodowód carries the link for the owner, an editor and a viewer, in both languages; the policy holds the route to the tree's bucket.
- **AC-5** No log line carries a name, a title or the body.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids
pnpm test
FAMILY_TREE_ENABLED=1 <the accounts variables> pnpm --filter web build
TEST_DATABASE_URL=… pnpm test:integration
```
