# ADR-0009 — the canonical surname route is `/pl/nazwisko/{slug}`, Unicode-preserving, noindex until eligible

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** project owner (directed the consumer loop be built: share, second search, SEO-ready route) + the TASK-024 session
- **Resolves:** TASK-006 §15 U-2 (`canonical_slug` / `canonical_path` deferred), which this ADR closes by adopting the canonical slug policy rather than inventing a transliteration
- **Canonical basis:** `docs/canonical/21` §19 (canonical URL), §20 (locale prefix from launch), §21–§23 (slug policy: preserve Unicode letters and diacritics, never ASCII-fold), §34 (stable locale-neutral anchors), §35 (query parameters are never canonical), §40–§43 (SEO hard gates and the P0 indexability policy: `CURRENT_STATS` alone is `PUBLISHED_NOINDEX`)
- **Deviates from canonical:** §24's collision suffix (`base-slug-{stable_short_slug_id}`) and §26's slug history are **not built**; see Consequences

## Context

The result page lived at `/?surname=X`. That is a search, not a page: it cannot be shared as a stable link, has no canonical URL for a crawler, and cannot carry an Open Graph image. TASK-006 §15 U-2 deferred slugs because a transliteration table for `Ł Ś Ż Ź Ć Ń Ó Ą Ę` would be a real decision that must never be confused with the identity-bearing diacritics of `ARCHITECTURE.md` §10 invariant 8.

`docs/canonical/21` §21 already made that decision: **do not transliterate.** The slug preserves the letters. That removes the reason for the deferral.

## Decision

1. **Route.** `/pl/nazwisko/{slug}` is the canonical page for a resolved surname; `/en/surname/{slug}` is its English rendering. The locale prefix is present from the start (§20). `/` remains the search: a query that resolves `EXACT` redirects to the canonical page; an unresolved or ambiguous query stays on `/` with suggestions, which are not pages.
2. **Slug.** §22's steps, exactly: canonical display → NFC → Unicode lowercase → trim → whitespace to `-` → URL-unsafe punctuation to `-` → collapse repeated `-` → trim `-`. Letters and diacritics are preserved: `ŁUCZAK` → `łuczak`, transported percent-encoded. The apostrophe is kept, because `O'Neil` → `o'neil` is a legal path segment and stripping it would collapse `O'X` into `OX`, which the resolver refuses to do (`docs/canonical/13` §5.4).
3. **Slug → entity.** The slug is not fed to the resolver as raw input. It is resolved by trying the exact key it implies and, where it contains `-`, the space-separated reading too; a candidate is accepted only if its own computed slug equals the requested slug. Two candidates whose slugs both match is a collision, and the page says so and resolves nothing — never the more common one.
4. **Anchors.** Sections carry §34's locale-neutral ids — `#today`, `#where`, `#meaning`, `#sources` — with localised visible labels.
5. **Indexability.** Every canonical page carries `robots: noindex, follow` unless `assessIndexability` returns `INDEX`, and that requires the §42 rule (≥ 2 substantive value families, ≥ 2 citations, hard gates passed) **and** the environment flag `SEO_INDEXING_ENABLED=true`. The flag is off in every environment today. With only PESEL ingested a page has at most `CURRENT_STATS` + `GEOGRAPHY`, and the rule is applied as written; the flag is the alpha gate §52 of the directive asks for.
6. **Query parameters** such as `?intent=` and `?lang=` never change the canonical URL (§35).

## Consequences

- Sharing has a stable URL and a place to hang an Open Graph image (TASK-024).
- **Collisions are detected, not resolved.** §24's stable short-id suffix needs a persisted slug table with a `(locale, slug)` constraint and a backfill over 598,476 surnames; nothing consumes that yet. A collision today renders an honest "this address is ambiguous" page. Recorded as D-019 in `docs/DECISIONS_NEEDED.md`, non-blocking.
- **No sitemap, no alias redirects (§25), no slug history (§26).** Each is a later task; none is needed to share a page.
- `PublicSurnameIdentity` still omits `canonical_slug`/`canonical_path` on the wire (TASK-006 §15 U-2's recommendation). The slug is computed from `display_name` by the same pure function on the server; adding the fields to the contract is additive when a client needs them.
