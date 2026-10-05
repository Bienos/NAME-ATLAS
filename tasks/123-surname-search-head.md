# TASK-123 — The surname page's search head: title, H1, answer, hreflang and structured data

- **Status:** IMPLEMENTED 2026-10-05 on `claude/loving-faraday-1pyo0y` (`docs/progress/2026-10-05-surname-search-head.md`).
- **Requested by:** the project owner, 2026-10-05: "Name Atlas SEO + GEO Fix Plan", an implementation brief, with "can you use this to improve my seo".
- **Specification:** `docs/canonical/21` §62–§68 (page template, H1, summary block, adaptive title, title truth rule, meta description), §72–§76 (structured data: `BreadcrumbList`, `WebPage`, no `Person`), §80 (`Organization` on home). Where the brief and §66–§67 differ (the brief's fixed "znaczenie, pochodzenie, liczba osób i mapa" title), the canonical title truth rule wins: a title names only what the page has.
- **Depends on:** TASK-024 (the canonical page), TASK-027 (the indexability gates), TASK-071 (the blog's `Article`).
- **Model guidance:** implementation session.

## 1. Goal

A surname page tells a search engine and an answer engine, in its served HTML, what it is: a title and description built from what the page actually holds, one `<h1>` naming the surname, a one-sentence answer under it, the other language's address, and `WebPage` + `BreadcrumbList` structured data matching a visible breadcrumb. The landing page names the site (`Organization` + `WebSite`), and the blog's `Article` names the same publisher. Indexability is unchanged: still `SEO_INDEXING_ENABLED` and `docs/canonical/21` §42.

## 2. In scope

- `lib/surname-seo.ts` (new, pure): the page heading ("Nazwisko NOWAK", "Surname NOWAK"), the title from `publishableFamilies` (§66–§67), the answer sentence from the validated counts with their date, never summed (§64), and the description (the answer, then only the parts the page has, §68).
- `lib/structured-data.ts` (new, pure): the site's `Organization` and `WebSite` with stable `@id`s, the surname page's `WebPage` + `BreadcrumbList`, and the shared publisher for the blog's `Article`. Absolute URLs only: nothing is emitted without `SITE_ORIGIN`.
- `metadataFor`: the new title and description; `alternates.languages` (`pl`, `en`, `x-default`) when the surname has an address in the other language.
- The surname page: a visible breadcrumb (Name Atlas › Nazwisko NOWAK) and its JSON-LD; the snapshot's surname becomes the page's `<h1>` with its eyebrow inside it, and the answer sentence follows it. The look is kept: the stylesheet resets the heading and keeps the first screen's height.
- The landing page (`/`, no query): `Organization` + `WebSite`.
- The blog's `Article`: its publisher is the shared `Organization`.

## 3. Out of scope

- Setting `SEO_INDEXING_ENABLED`, Search Console, or anything on production (the owner's, `PLAN.md` M8).
- Surname directory and A–Z hubs (`/pl/nazwiska/…`); a middle breadcrumb step waits for them.
- Chapter headings naming the surname, and their level (`<h3>` today); the meaning in the answer sentence.
- The sitemap's query: it does not fold the SEO surface's rights as the page does, so it may list a page that serves `noindex`.
- `Dataset`, `DefinedTerm`, `FAQPage`, `SearchAction`, `Person` and `Product` markup (§75–§81); a named author on the blog.
- Methodology, editorial and corrections pages.

## 4. Acceptance criteria

- **AC-1.** The title names meaning and origin only with a publishable `ONOMASTICS` family, where it occurs only with `GEOGRAPHY`, how many only with `CURRENT_STATS`; "mapa"/"map" never appears without `GEOGRAPHY` (unit tests, both languages).
- **AC-2.** The answer sentence states each list's count with its date, never sums the lists, omits a null value, and is absent with no count (unit tests).
- **AC-3.** A resolved page with an address in the other language declares `pl`, `en` and `x-default`; without one, no `languages` (unit tests).
- **AC-4.** The snapshot renders exactly one `<h1>` whose text is the heading; the answer sentence follows it (unit test).
- **AC-5.** The surname JSON-LD is a `WebPage` and a `BreadcrumbList` whose items are the visible breadcrumb's, with absolute URLs, and nothing without an origin; the landing's is `Organization` + `WebSite`; `<` is escaped (unit tests).
- **AC-6.** Indexability, canonical URLs and `robots` are unchanged (existing tests).

## 5. Verification

```bash
pnpm --filter web test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm --filter web build
```
