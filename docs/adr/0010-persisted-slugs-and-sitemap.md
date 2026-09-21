# ADR-0010 — persisted slugs, collision suffixes, and what a sitemap may list

- **Status:** Accepted 2026-09-21.
- **Resolves:** D-019 (`docs/DECISIONS_NEEDED.md`), decided by the project owner 2026-09-21.
- **Supersedes in part:** ADR-0009 §6, which recorded §24's collision handling and §26's slug
  history as deliberately not built.
- **Relates to:** `docs/canonical/21` §21–§26 (slug), §34–§36 (anchors, params, internal search),
  §40–§43 (SEO gates and the P0 indexability policy).

## 1. Context

ADR-0009 computes a surname's slug from `canonical_display` with a pure function and resolves it by
trying several readings and confirming each candidate. That works for a single page and does not
survive a sitemap:

- A slug that two entities both produce is detected and refused. Both stay permanently unreachable
  by URL, and therefore unindexable — acceptable while nothing indexed them, not acceptable now.
- Resolution costs three lookups and a confirmation loop per request. A sitemap needs the inverse
  direction — *every* current slug — which that design cannot answer at all.
- Nothing can record that a slug once pointed somewhere else, so a display-form correction would
  silently break a URL a crawler had already indexed.

## 2. Decision

**The canonical slug is persisted, in its own table, keyed by `(locale, slug)`.**

```
surname_slugs
  surname_slug_id  uuid primary key
  locale           text     -- 'pl' | 'en'
  slug             text
  surname_id       uuid -> surnames
  is_current       boolean
  created_at       timestamptz
  UNIQUE (locale, slug)
  UNIQUE (locale, surname_id) WHERE is_current
```

Three consequences are structural rather than conventional:

- `UNIQUE (locale, slug)` makes a collision impossible to store. Two entities cannot share an
  address, so no request can be ambiguous.
- `UNIQUE (locale, surname_id) WHERE is_current` makes "exactly one current address per surname per
  locale" an invariant the database enforces, not something a backfill has to remember.
- A superseded slug **stays**, with `is_current = false`, and its request is answered with a
  permanent redirect to the current one. A link that was indexed keeps working.

`locale` is part of the key even though today's slug is computed from `canonical_display` and is the
same in both locales. §25's ASCII aliases are locale-specific when they arrive, and a table keyed on
the slug alone would need a migration to accept them.

**A colliding slug is disambiguated by a stable short id derived from `surname_id`.**

`nowak-kowalska` and `nowak-kowalska-k3m9qp`, where the suffix is six characters of a Crockford
base32 encoding of the surname's UUID. Crockford's alphabet omits `I`, `L`, `O` and `U`, so a suffix
cannot be misread or mistyped into another one.

The property that matters is not brevity: it is that the suffix is a **function of the entity**. A
sequence number — `-2`, `-3` — depends on which entity the backfill saw first, so a re-import, a
merge or a differently-ordered scan can reassign it, and a reassigned suffix points a URL that is
already in a search index at a different family's page. That is the one failure mode a surname URL
must not have, and it is why §24 asks for a `stable_short_slug_id` rather than an ordinal.

Which of two colliding entities keeps the bare slug is decided by `surname_id` order, so it too is
stable across re-imports rather than a property of scan order.

## 3. What a sitemap may list

A sitemap is a claim that a page is worth indexing, so it lists a page only when
`docs/canonical/21` §42's policy says `INDEX`. That is not a per-request computation over 598,476
payloads; it is expressed as SQL over the claim tables, asserting the same conditions the
per-page assessment does:

- an active canonical surname with `privacy_class = PUBLIC`;
- the public **and** SEO surfaces allowed for its evidence;
- **at least two** substantive value families (§41), which today means `CURRENT_STATS` **and**
  `GEOGRAPHY` — a population claim and a distribution claim with `coverage_state = READY`;
- at least two distinct citations;
- `SEO_INDEXING_ENABLED`.

Both the listing query and the per-page assessment must agree, so a page in the sitemap always
carries `index` and a page carrying `noindex` is never listed. An integration test asserts that
agreement over real data rather than trusting two implementations of one policy.

## 4. What this deliberately does not do

- **§25 ASCII aliases.** The table accepts them; none is generated. An ASCII alias is a second
  address for the same entity and needs a decision about which is canonical.
- **§26 slug history beyond the redirect.** The row and the 301 exist. No history UI, no audit trail
  of who changed a display form, because nothing changes display forms yet.
- **Turning indexing on.** `SEO_INDEXING_ENABLED` stays unset. Every gate above can pass and the
  answer is still `noindex` until the flag is set deliberately, per ADR-0009 §5.
- **A QA gate.** §40 lists `critical QA = pass`. There is no QA signal to read, and inventing one
  that always passes would be worse than naming the gap: it would look like a check.

## 5. Consequences

`resolveSlug` becomes one indexed exact lookup instead of three lookups and a confirmation loop, and
the alphanumeric-fallback query that migration `0017` was created for is no longer on the request
path. Migration `0017`'s index is kept: the backfill uses the same expression to find the entities a
slug could belong to.

The cost is a backfill: every surname needs a row before its page is reachable, so an import that
creates surnames must create their slugs too. The backfill is idempotent and re-runnable, and
`packages/sources`' importers call it for the surnames they create.
