# TASK-027 — persisted slugs, collision suffixes, robots and sitemap

- **Status:** IMPLEMENTED AND VERIFIED 2026-09-21. All ten acceptance criteria met; see `PROGRESS.md`.
- **Priority:** P0 for indexing. The last code prerequisite before `SEO_INDEXING_ENABLED` can be set.
- **Depends on:** TASK-024 (ADR-0009, the canonical route), ADR-0010 (this task's decision record).
- **Resolves:** D-019.

## 1. Goal

A surname page has a stable, collision-free canonical URL that survives a display-form correction,
and a sitemap lists **exactly** the pages `docs/canonical/21` §42 says may be indexed — no more, and
never a page whose own `<meta name="robots">` says `noindex`.

## 2. What this does NOT do, and why it matters

**It does not make any page indexable.** Verified on a real instance 2026-09-21: §42 requires at
least two substantive value families, only `CURRENT_STATS` is available, and the second cannot be
produced from the data in this repository —

```
[dist] result  NO_RESULT (INCOMPLETE_UNIVERSE)
[dist]   resource 1148786  CONTENT_HASH_MISMATCH  rows expected 646052  rows persisted 40
```

`GEOGRAPHY` needs the full regional register, `ONOMASTICS` needs a licensed onomastic corpus
(ADR-0008 Path B), `HISTORY` needs M3. So the sitemap this task builds correctly contains **zero
URLs** until the full register is imported. That is the honest outcome, not a failure, and an
acceptance criterion asserts it rather than hiding it.

Rights are **not** a blocker: `evaluateSurface` returns `SEO → ALLOWED` for the PESEL profile, since
D-007 was resolved by the project owner on 2026-09-20.

## 3. Acceptance criteria

- **AC-1** Migration `0018_surname_slugs` creates the table of ADR-0010 §2, with `UNIQUE (locale,
  slug)` and a partial `UNIQUE (locale, surname_id) WHERE is_current`. A test proves both refuse.
- **AC-2** `shortSlugId(surname_id)` is a pure function of the UUID, Crockford base32, six
  characters, and is **stable**: the same id always yields the same suffix, and no suffix contains
  `i`, `l`, `o` or `u`.
- **AC-3** The backfill assigns every surname a current slug per locale. Where two or more entities
  produce one slug, the lowest `surname_id` keeps the bare slug and the others take
  `base-k3m9qp`. Re-running the backfill changes nothing (idempotent), and the assignment does not
  depend on scan order.
- **AC-4** `resolveSlug` is a single indexed lookup on `(locale, slug)`. A current slug resolves; a
  superseded slug returns `MOVED` with the current slug; an unknown slug returns `UNKNOWN`. A slug
  not in canonical form is still `INVALID`.
- **AC-5** A superseded slug is answered with a **permanent redirect** to the current address —
  **308**, not 301. Next's `permanentRedirect` emits 308, which search engines treat as a permanent
  move exactly as they treat 301 and which, unlike 301, no intermediary may rewrite to a GET. The AC
  originally said 301; corrected to what the implementation actually does. A test asserts the status
  and the `Location`.
- **AC-6** `assessIndexability` gains a `privacyPublic` gate (§40's `privacy = pass`) and is given
  the **real** SEO surface decision instead of the hardcoded `false` in `surname-page.tsx`.
- **AC-7** `/robots.txt` disallows the internal search (§36) and names the sitemap. Under
  `SEO_INDEXING_ENABLED` unset it disallows everything, because a crawler should not be reading pages
  we have not decided to publish.
- **AC-8** `/sitemap.xml` is a sitemap **index** and `/sitemap/{n}.xml` are pages of at most 50,000
  URLs, because 598,476 surnames cannot be one valid sitemap.
- **AC-9** The sitemap and the page agree. An integration test asserts, over real imported data, that
  every URL the sitemap lists assesses as `INDEX`, and that no surname assessing as `INDEX` is
  missing from it.
- **AC-10** With the fixtures in this repository the sitemap is empty, and the test says so by
  asserting the reason — `SINGLE_VALUE_FAMILY` — rather than merely asserting zero.

## 4. In scope

- `packages/seo` — the slug generator, the short id, and the sitemap candidate query. A new package
  because the backfill CLI cannot import from `apps/web`; `docs/CODEMAP.md` already reserves the name.
- `packages/db/migrations/0018_surname_slugs.ts`.
- `packages/seo/bin/backfill-slugs.ts`, wired as `pnpm seo:backfill-slugs`.
- `apps/web/src/lib/slug.ts` — resolve from the table; keep `canonicalSlug` re-exported so nothing
  else moves.
- `apps/web/src/app/robots.txt/route.ts`, `sitemap.xml/route.ts`, `sitemap/[page]/route.ts`.
- `apps/web/src/lib/seo.ts` — the privacy gate and the real SEO surface decision.

## 5. Out of scope

- §25 ASCII aliases and §26 slug history beyond the 301 (ADR-0010 §4).
- Setting `SEO_INDEXING_ENABLED`. That is a deployment decision and needs a QA cohort.
- A QA gate. §40 names one; no QA signal exists to read, and a gate that always passes would look
  like a check while being none (ADR-0010 §4).
- Importing the full register. That is a data supply, not code.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:golden
pnpm test:integration
```
