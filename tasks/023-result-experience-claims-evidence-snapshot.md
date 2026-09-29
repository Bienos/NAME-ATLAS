# TASK-023 — the result experience: claim display, inline evidence, snapshot, second search

- **Status:** IMPLEMENTED 2026-09-21, and **VERIFIED 2026-09-29** on `main` @ `5636e95`. All eight
  criteria hold:
  - AC-2 in the form ADR-0012 gave it;
  - AC-1 and AC-8 as the project owner amended them on 2026-09-29.

  As first written, those two did not hold: #11 and two client components added on 2026-09-23 had
  changed the page. The owner chose to amend them rather than change the page. The records are
  `docs/progress/2026-09-29-verify-task-023-025.md` and
  `docs/progress/2026-09-29-task-023-rules-amended.md`.
- **Priority:** P0 (directive §72: P0-2, P0-3, P0-4, P0-5; §12–§17, §20).
- **Milestone:** M2 — excellent free result + truth UX.
- **Depends on:** TASK-017 (the page), TASK-022 (schema 1.4).
- **Canonical basis:** `docs/canonical/16` §26 (never zero), §35 (no scores on the wire), §40
  (`CitationDTO`), §55 (never send-and-hide); `docs/canonical/21` §34 (anchors);
  `ARCHITECTURE.md` §10 invariants 2, 4, 5.

## 1. Goal

The page shows one reusable **claim** unit — statement, assessment word, source kind, scope and date,
and an inline **evidence** panel — and opens with a compact **snapshot** so the first useful fact is
above the fold on a phone. A second search never needs the homepage.

## 2. In scope

1. **`Claim`** (`apps/web/src/lib/claim.tsx`): statement · assessment (the canonical status word, never
   a number) · source kind (localised from `citation.source_type`) · scope/date line · "View
   evidence". One component, used by population, rarity, distribution and meaning.
2. **Inline evidence** as a native `<details>` panel per claim: source title, provider, source type,
   dataset scope, underlying data date, publication date, **retrieved date**, record locator/URL,
   method (`methodology_code`), supported claim, assessment, limitations, contradictions. Native
   `<details>` is keyboard-operable and returns focus to its `<summary>` on close without any script.
3. **Contract 1.5**: `citation.retrieved_at` (nullable ISO timestamp) — the citation row's
   `accessed_at`, which the database has held since TASK-005 and the wire never carried. Additive.
4. **Snapshot** (`apps/web/src/lib/snapshot.tsx`): the surname; the count per partition as the hero
   figures — two, never summed; rarity `1 in X` only when the section is `READY`; strongest
   registered voivodeship only when a distribution entry has `coverage_state = READY`; a tally of
   claims by assessment; a link to the evidence.
5. **Default order and intent.** `COUNT → RARITY → GEOGRAPHY → MEANING`; `?intent=rarity|map|meaning`
   moves that section first. Presentation only: the payload and the canonical URL do not change.
6. **Second search.** The search form stays on every result page; a "Search another surname" control
   after the results focuses it. The page log records `search_origin` (`result_page` / `home` /
   `external` / `direct`) from the referrer's **path**, never a surname, so
   `second_surname_search` is measurable.
7. **Sources section** (`#sources`): every distinct citation on the page, once.
8. **CSS fix**: `.caveat` referenced the admin app's `--soft` token; the web app's is `--ink-soft`.

## 3. Out of scope

Client-side JavaScript of any kind (TASK-024 adds the one share island). A map. A `PROCESSING` or
`PARTIAL` section state — nothing asynchronous feeds this page yet.

## 4. Acceptance criteria

- **AC-1** Every rendered figure sits inside a `Claim` that shows its assessment word, source kind,
  scope and date; no figure appears outside one.
  *Amended by the project owner on 2026-09-29. A figure may also appear outside a claim, but only as
  a copy of a figure that a claim on the same page states with its assessment word, source kind,
  scope and date. That covers the snapshot at the top, and the rarity chapter's „1 na X” and rank
  directly above their own claim (#11).*
- **AC-2** Every claim's evidence panel names the source title, provider, dataset date, retrieved
  date and method, and carries no confidence number or percentage.
  *Replaced by ADR-0012 (2026-09-24). There is no per-claim panel. Each source is listed once under
  `#sources`, linked to the source's own website. The retrieval date and method code stay in the API
  and the admin inspector. No confidence number or percentage appears anywhere.*
- **AC-3** The snapshot never renders a sum of the two partitions; asserted against markup.
- **AC-4** The snapshot omits rarity when the section is not `READY`, and omits the strongest
  voivodeship unless an entry's `coverage_state` is `READY`.
- **AC-5** `?intent=rarity` renders the rarity section before the count; the default order is
  count, rarity, geography, meaning.
- **AC-6** The second-search control exists on a resolved page and targets the search input.
- **AC-7** The contract accepts and requires `retrieved_at` on every citation; existing fixtures
  updated, no assertion weakened.
- **AC-8** The page renders no `onclick`/`onchange` attributes and ships no client bundle.
  *Amended by the project owner on 2026-09-29. The page renders no inline event-handler attribute.
  Its client-side JavaScript is limited to three components: the share button (TASK-024), the
  suggest-as-you-type search (`2312f7e`) and the voivodeship map (`f5d858d`). The page works fully
  without JavaScript: the search form submits, the regional table renders, and the share link is
  visible as text.*

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:integration && pnpm build
```

plus the page rendered against `name_atlas_dev` at 320px-equivalent markup (server output inspected)
for NOWAK (both partitions, distribution READY), MELNYK (low coverage) and a suppressed surname.
