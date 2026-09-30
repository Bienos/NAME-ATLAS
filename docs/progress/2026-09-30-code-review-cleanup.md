# 2026-09-30 — Code review: efficiency and clean-up, behaviour preserved

Scope authority: the project owner's request in this session, "how to make this code more efficient and cleaned up, do review and apply changes". There is no task file. No migration, contract or canonical document changed.

**Base:** `origin/main` at `fefd78b`. The session's branch, `claude/funny-allen-vrp074`, started 166 commits behind `main` because GitHub's default branch is still the stale `claude/exciting-noether-05np1s`. It carried six commits of the retired first TASK-004 implementation, and was reset to `main` before any change (`git reset --hard origin/main`; the old tip is `d6f1b6c`). Six commits followed.

## Changed

Four read-only reviews (`packages/sources`, `packages/truth`, `apps/web`, and everything else) produced the findings. Each applied change was re-read against the code before it was made. Six commits:

- **`8faef08` `packages/sources`.**
  - Both PESEL importers computed `canonicalKey` two to four times per row. The collectors now return each row's key, and `identityRows` takes the key its caller holds.
  - The onomastic importer stores the JSON it already parsed instead of decoding and parsing the file again. Its content hash calls `sha256Hex`.
  - `regional-parser.ts` imports `splitPeselLines` and `COUNT_PATTERN` from `parser.ts` instead of a copy. The `lines.length === 0` test in the splitter could never be true and is gone.
  - Removed: the write-only `ResolvedIdentity.created`; the async IIFE and the always-equal `nameCreated` in `voivodeships.ts`; a per-attribute array in the ALTO validator; a whole-file copy in `fetch-pesel.ts`; an orphaned JSDoc and a misplaced doc comment; the `export` on `INSERT_CHUNK` and `TERYT_MANIFEST_PATH`, which nothing imports.
- **`f9048d6` `packages/sources`, a behaviour change.** `importPeselRegionalResource` documents "a typed outcome in every case", and the national importer returns `{ kind: "FAILED", reason: "DATABASE_ERROR" }` when its write transaction fails. The regional one let the error reject the promise. It now matches the national importer.
- **`867db3f` `apps/worker`.** One `UniverseSizeCache` per derive job is passed to all four chains, as `derive-batch` already does.
- **`d1785b2` `packages/seo`, `packages/resolver`, `packages/queue`.**
  - `lookupSlug` and the backfill use `currentSlugFor`, `currentSlugsFor` and `suffixedSlug` instead of copies of them.
  - `measure-fuzzy-recall.ts` imports `SHORTLIST_CAP`.
  - `bullmq` is removed from `packages/queue/package.json`, because nothing in that package imports it. `apps/worker` declares its own. `pnpm-lock.yaml` loses only that importer entry (3 lines).
- **`af261ff` `packages/truth`.**
  - `querySurnameResult` runs its four independent read queries with `Promise.all`.
  - `deriveCurrentDistribution` loads a surname's national candidates at most once per call, where it loaded them once per regional universe.
  - `derive.ts` calls `resolveForDerivation` and `loadSourceContext` from `universe.ts` instead of carrying copies. `ResolvedForDerivation`'s refusal arm is now the population chain's refusal type, so the population chain returns it unchanged. The unread `ApplicableSnapshot.dataset_version` is dropped.
  - Also: `NO_RIGHTS_KNOWN` replaces an identical inline object; an unreachable branch in `rank.ts` is gone; an orphaned JSDoc moved onto `universeSize`.
- **`4968168` `apps/web`.**
  - `answerSlug` was run by both `generateMetadata` and the page. The read is now `cache()`d per request. Consequence, **a log change**: the metadata call no longer writes a `page_rendered` line, so the duplicate with `search_origin: "direct"` is gone. `answerSlugForMetadata` is new.
  - Independent awaits run together in `seoGatesFor`, in the page's gates plus other-language path, and in `loadComparison`.
  - `pageEvidence` is computed once per render, not twice.
  - `siteOrigin` and `SITE_ORIGIN_ENV` moved to `lib/seo.ts`, so `robots.txt` and the sitemap routes stop importing the page module. `surname-page.tsx` re-exports `siteOrigin` for its test.
  - Removed as unreferenced: the two `assessmentWord` re-exports, `export type { Lang }` in `compare-page.tsx`, seven keys in `messages.ts` (both languages), and two strings in `share-button.tsx`.

No file was created or moved except this record, so `docs/CODEMAP.md` is unchanged. `STATUS.md` needed no rewrite: no line in it became untrue.

## Verified

Environment: Node 22.22.2, pnpm 10.33.0. The integration and golden suites ran against a throwaway local PostgreSQL 16.13 (Ubuntu package) with PostGIS 3.4, through `TEST_DATABASE_URL`. Baseline and final runs used the same environment.

| Command | Baseline on `fefd78b` | After the six commits |
|---|---|---|
| `pnpm lint` | exit 0 | exit 0 |
| `pnpm typecheck` | exit 0 | exit 0 |
| `pnpm format:check` | exit 0 | exit 0 |
| `pnpm check:ids` | exit 0 | exit 0 |
| `pnpm build` | exit 0 | exit 0 |
| `pnpm test` | exit 0; db 8, domain 7, contracts 48, logging 24, testing 3, resolver 102, queue 9, seo 18, sources 509, truth 157, worker 2, admin 14, web 230 | exit 0; the same counts |
| `pnpm test:integration` | 26 files, 310 tests passed | 26 files, 310 tests passed |
| `pnpm test:golden` | 4 files, 364 tests passed | 4 files, 364 tests passed |

One `test:golden` run without `TEST_DATABASE_URL` failed `resolution.test.ts`. The same command with the variable set passed, and the failure is the missing database, not the change.

## Not verified

- The suites did not run on the image D-005 pins (`postgis/postgis:16-3.4@sha256:44126d87…`). The Docker daemon was not running here.
- CI was not run.
- No running server was exercised. That the metadata call now writes no `page_rendered` line is read from the code and is not checked in a log.
- No speed-up was measured by this change. The reviewer's figures (about 760 ms per `canonicalKey` pass over 408,000 synthetic surnames; 379 ms per universe count, from the `UniverseSizeCache` comment) are not this session's measurements. The four-query and two-query changes in `packages/truth` and `apps/web` are bounded by the web pool's 2 connections (`apps/web/src/lib/db.ts`), so their gain is smaller than the query count suggests.
- Two `Promise.all` changes (`querySurnameResult`, `seoGatesFor`) can report a different error when two reads fail at once. No test covers that.

## Reported by the reviews, not applied

Each is a reviewer finding. Not all were re-checked by the implementer.

- **Larger extractions:** the copied read pass, prelude and `source_records` insert shared by both PESEL importers (about 120 lines); the `rights_profiles` insert written three times and `sources` twice (`importer.ts`, `onomastics.ts`, `catalogue/seed.ts`); the claim-chain persistence code copied across `derive.ts`, `rank.ts`, `rarity.ts`, `distribution.ts` and `meaning.ts` (about 350 lines); the provenance columns repeated in `read.ts`; the three comparison skeletons in `apps/web/src/lib/compare.ts`.
- **Smaller:** `sitemapCount` repeating `sitemapEntries`'s policy SQL; running the backfill's two locales concurrently; `apps/admin`'s pool built per request; `pool.ts`'s `PoolOptions | IdleErrorHandler` union; the "about 1 in X" phrase in three places; lookup tables rebuilt per call in `messages.ts`; `apps/worker/src/index.ts`, the TASK-001 placeholder that only its own test imports; `testcontainers` in `packages/testing`, probably redundant.
- **Possible defects, not changed:**
  - `apps/web/src/app/en/surname/[slug]/opengraph-image.tsx` calls `answerSlug(slug, null)`, so it looks the English slug up in the `pl` locale.
  - `packages/queue/src/outbox.ts` claims rows with `FOR UPDATE SKIP LOCKED` in a transaction that commits before anything is published, so two dispatchers can take the same rows.
  - `deriveSurnameMeaning` has no `AMBIGUOUS` branch, so a `MULTIPLE_EXACT` resolution comes back as `UNRESOLVED`.
  - `compare-page.tsx` logs `route: "/pl/porownaj"` for `/en/compare` too.
  - `bin/import-onomastics.ts` calls `process.exit(1)` inside a `try`, which skips its `finally`.
