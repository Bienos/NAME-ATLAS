# TASK-024 — the canonical surname route, sharing and the Open Graph image

- **Status:** IMPLEMENTED_UNVERIFIED 2026-09-21.
- **Priority:** P0 (directive §72: P0-6; §21–§23, §50) and P1-4.
- **Milestone:** M2.5 — share; M3.5 — SEO-ready profile pilot (route only, noindex).
- **Depends on:** TASK-023; ADR-0009.
- **Canonical basis:** `docs/canonical/21` §19–§23, §34, §35, §40–§43; `docs/canonical/16` §120
  (share: only public/free-eligible claims participate).

## 1. Goal

A resolved surname has a stable, shareable address that renders the same validated projection, a
share control that never posts on the reader's behalf, and a deterministic social image built only
from public data.

## 2. In scope

1. **Routes** `apps/web/src/app/pl/nazwisko/[slug]/page.tsx` and `apps/web/src/app/en/surname/[slug]/page.tsx`
   sharing one server implementation. `/` with a query that resolves `EXACT` redirects there.
2. **`apps/web/src/lib/slug.ts`** — ADR-0009's slug function and slug → entity resolution, with
   collision detection.
3. **`apps/web/src/lib/seo.ts`** — `assessIndexability` per `docs/canonical/21` §40–§43, gated by
   `SEO_INDEXING_ENABLED`. Every page carries `robots` metadata; today that is always
   `noindex, follow`.
4. **`generateMetadata`**: title, description and canonical URL from the public projection; the
   description states only facts the payload carries.
5. **Share island** (`apps/web/src/lib/share-button.tsx`, the app's first and only `'use client'`
   file): Web Share where supported, clipboard fallback, a visible status line for success, denial
   and cancellation; the URL is a server-supplied prop, never client state. Without JavaScript the
   canonical link is visible as text.
6. **Open Graph image** `opengraph-image.tsx` per route, via `next/og`: the surname, the count per
   partition, `1 in X` only when rarity is `READY`, and the product name. Public projection only,
   deterministic, no LLM, no research triggered by a crawler. Geist (bundled) covers every Polish
   letter — verified by reading the font's cmap.
7. **Events route** `POST /api/v1/events`: accepts an allow-listed event name and nothing else, and
   writes it through the structured logger. `share_started`, `share_completed`, `copy_link_success`,
   `share_cancelled`, `copy_link_denied`.

## 3. Out of scope

A sitemap, alias redirects, slug history, a persisted slug table and collision suffixes (ADR-0009).
Turning indexing on. Any analytics vendor.

## 4. Acceptance criteria

- **AC-1** `canonicalSlug("ŁUCZAK") === "łuczak"`, `canonicalSlug("Kowalska Nowak") === "kowalska-nowak"`,
  `canonicalSlug("O'Neil") === "o'neil"`; never ASCII-folded.
- **AC-2** `/pl/nazwisko/kowalczyk` renders the same sections as `/?surname=KOWALCZYK`; the query
  form redirects to it.
- **AC-3** A slug matching two entities renders the collision state and no figures.
- **AC-4** Every canonical page's metadata carries `robots: noindex, follow` while
  `SEO_INDEXING_ENABLED` is unset; `assessIndexability` returns `INDEX` for a fixture with two value
  families and two citations only when the flag is set.
- **AC-5** The OG image route returns `image/png` for a resolved slug and renders no figure the
  payload does not carry (a rights-blocked or suppressed surname yields an image with no number).
- **AC-6** The share island: Web Share path, clipboard path, `AbortError` treated as cancel, denied
  clipboard shows the link as text. Unit-tested against a stubbed `navigator`.
- **AC-7** The events route rejects an unknown event name and any body field other than `event`.

## 5. Verification

The standard six, plus `curl` of the canonical page, the redirect, the OG image (content type and
byte length) and the events route against the built app.
