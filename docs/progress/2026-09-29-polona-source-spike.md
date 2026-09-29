# 2026-09-29 — TASK-031, the Polona source spike

**Scope:** `tasks/031-polona-source-spike.md`. Branch `claude/task-031-polona-spike`, from `main` @ `83d38c2`.

## Changed

- **`docs/sources/polona.md` (new): the source record.** It answers every §8 item from observation:
  - endpoints;
  - no authentication;
  - no observed rate limit;
  - terms that do not address automated access (`UNKNOWN`);
  - no `robots.txt`;
  - the query set's matches, inflection and hand classification;
  - the rights vocabulary and its ADR-0007 mapping;
  - OCR shape and deduplication ids;
  - one paper trace to the canonical records.

  One item is `UNRESOLVED`: the IIIF Presentation manifest never answered.
- **`fixtures/polona/` (new): real responses captured 2026-09-29.** 10 search responses, 125 object records and 1 public-domain ALTO page, with `source-manifest.json` recording each file's request, time and SHA-256.
  - Four full-text hits of limited-licence objects were removed whole. Their locators and OCR-text digests are in the manifest.
  - `.prettierignore` excludes the raw capture directories.
- **`packages/sources/src/polona/` (new): a pure, fail-closed parser.** It is exported from `@name-atlas/sources`, with no `packages/db` import and no network. It covers:
  - both searches;
  - the three object-record shapes;
  - ALTO v2;
  - the rights vocabulary and its mapping.

  Its tests are `fixtures.test.ts`, `drift.test.ts` (eleven drift reasons) and `rights.test.ts`, which holds the doc's mapping table equal to the code.
- **`packages/truth/src/polona-rights.test.ts` (new, test only).** It is task §8 item 12: real Polona rights through `rights.ts`. It lives in `truth` because `truth` depends on `sources`.
- **D-021** in `docs/DECISIONS_NEEDED.md`: automated access, metadata under `UNKNOWN`, attribution, and the source default.
- The `INVENTORY.md` §6 row, CODEMAP rows, the task's status line and `STATUS.md`.

## Verified

Every command run from the repository root, on the branch's working tree.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm check:ids` | "every task, ADR, migration and decision number is used once" |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | "All matched files use Prettier code style!" |
| `pnpm test` | exit 0, **1,047 passed**, against 714 on untouched `main` earlier the same day. `packages/sources` 440; `packages/truth` 157. The new tests are `polona/fixtures.test.ts` 283, `polona/drift.test.ts` 36, `polona/rights.test.ts` 6 and `polona-rights.test.ts` 8. |
| `pnpm build` | exit 0; no line containing "warn" in the output |
| `cd fixtures/polona && sha256sum -c <(jq -r '.files[] \| "\(.sha256)  \(.path)"' source-manifest.json)` | exit 0, **136 OK** |
| `git diff --stat origin/main -- packages/db/migrations apps packages/truth/src packages/queue` | one file: `packages/truth/src/polona-rights.test.ts`, 209 insertions. This is the recorded deviation (`docs/sources/polona.md` §18); no other file. |

**Able to fail.**

- Each drift test starts from a real fixture that parses, changes one thing, and asserts the expected reason code and path.
- One cell of the mapping table in `docs/sources/polona.md` was changed by hand (`brak licencji` transcription `PROHIBITED` → `UNKNOWN`). `rights.test.ts` then failed ("1 failed | 5 passed"), and it passed again after the file was restored.
- The parser's first run refused a real fixture: `documentTypes` holding `[null]` on two WILK hits. The parser was widened to exactly that observed shape.

## Not verified

- **The IIIF Presentation manifest.** Every request timed out, or answered `403` for a context id. No page image other than the title page can be located.
- **Anything a browser would show.** Chromium failed TLS through the environment's proxy, and verification was not disabled. The canonical object URLs are read from the app's code, not loaded.
- **`pageNumber`'s base.** Zero-based on one observation.
- **Rate limits.** None observed, and none probed for deliberately.
- **Rights values seen only in facets** (`licencja otwarta`, 47 statements). Their meaning was never read on an object. They are unmapped, and the parser refuses them.
- **The hand classification** of 90 hits was made by one reader, not double-checked.
- **`pnpm test:integration` and `pnpm test:golden`** were not run. They are not in the task's verification list, and no code they exercise changed.
