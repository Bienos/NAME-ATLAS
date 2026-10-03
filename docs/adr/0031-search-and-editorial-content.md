# ADR-0031 — search and editorial content: one surname page, evidence-led articles, original data studies

- **Status:** Accepted, 2026-10-03, with the review amendments in §3. The project owner supplied *Name Atlas — SEO + GEO Research & Content Strategy* (research date 3 October 2026) and asked for it to be reviewed and applied. The amendments are this review's; the owner can reject any of them on the pull request.
- **Date:** 2026-10-03
- **Deciders:** the project owner (the strategy), with this review's amendments.
- **Relates to:** `PRODUCT.md` §8 non-goals 5 and 14, `PLAN.md` M8, ADR-0009 §5 and ADR-0010 (the indexing gate and the sitemap), `docs/canonical/21` §40–§43 (indexability), TASK-071 (the blog), ADR-0019 and ADR-0020 (comparing editions), `docs/sources/pesel-regional.md` items 18–19 and the residual (regional suppression).
- **Plan:** the queue of pieces, the query map and the roadmap are in `docs/SEO_CONTENT_PLAN.md`. This ADR holds the rules; the plan holds the order.

## 1. Context

- Several Polish sites already publish current PESEL counts, rankings, maps, rarity and suffix lists. Another PESEL lookup is a commodity. The strategy's thesis: articles create curiosity, the surname page answers the personal query, original data studies create authority, sources create trust, and the paid tiers serve deeper family intent.
- The repository already has one canonical surname page with adaptive sections (ADR-0009), a sitemap that lists a page only when the indexability policy says `INDEX` (ADR-0010), and a bilingual blog of three posts (TASK-071, 072, 074).
- **Nothing on the site is indexable today.** `SEO_INDEXING_ENABLED` is unset in production, so every surname page and every blog post serves `noindex`, and `/sitemap.xml` names no blog sitemap (`apps/web/src/lib/seo.ts`, STATUS.md). No piece of this strategy earns search traffic until the owner turns the flag on.
- The strategy's demand labels are directional. Its Semrush connection had no API units, and it says so; no volume, difficulty or CPC figure was invented.

## 2. Decision

1. **One canonical surname URL answers every surname-specific query.** Meaning, origin, count, rank, rarity, map, history, variants, the other grammatical form, old print and well-known bearers are sections of `/pl/nazwisko/{slug}` and `/en/surname/{slug}`, written so a search engine or an AI system can lift the supported answer with its source and date. No `/nazwisko/{slug}/{intent}` page, no `/nazwisko/{slug}/{województwo}` page, no blog post about one surname's meaning.
2. **Editorial pieces answer general questions,** each with its sources and a FAQ, and end on a surname search ("Sprawdź swoje nazwisko w Name Atlas"). A piece shows a register figure only with its list, scope and date.
3. **Original data studies are the authority asset.** Each states its denominator, method, snapshot date, suppression rule and limitations, and is reproducible from data in the repository. The flagship is the **Polish Surname Index 2026** (plan §8), repeated each year after the PESEL release.
4. **No separate "GEO" layer.** No AI-specific copy of any page. Being cited by AI systems comes from clear, sourced answers on the pages that already exist.
5. **Fewer, better pieces.** A new piece must answer an intent no existing page answers. If an existing post already covers the intent, the existing post is extended instead of a new URL being added (plan §4 marks the overlaps).
6. **The banned list** (strategy §12, kept): a meaning post for one surname; mass-generated surname essays; surname × voivodeship or surname × intent pages; "your surname proves you are Polish"; "your family came from X because the surname is common there"; "your family crest"; "people with surname X are probably relatives"; near-identical suffix posts without their own evidence; generic genealogy-tips filler.
7. **Every piece is one task.** A post, a study or a page section is specified in its own `tasks/NNN-*.md` and verified like any other change. This ADR authorises the direction, not any build.

## 3. Review amendments to the strategy

The strategy was checked against the repository on 2026-10-03. Where it contradicted a recorded fact or a binding rule, the rule wins:

1. **Indexing first (strategy §15, month 1).** "Index first qualified surname cohort" in month 1 is not this ADR's to schedule. Turning `SEO_INDEXING_ENABLED` on, and the first cohort, are `PLAN.md` M8 and the owner's decision. Until then the plan's articles are published `noindex`, as the three existing ones are.
2. **Regional studies are bound by what an absent cell can mean.** Suppression is per (surname, voivodeship) cell, minimum 2, verified from the bytes (`docs/sources/pesel-regional.md` item 18). An absent cell is zero, one excluded bearer, or a bearer with no voivodeship value; it is never a confirmed zero (item 19). Over half the national surnames have no regional row, and about 21% of occurrences are in no voivodeship row for a reason the publisher does not state. So:
   - "Surnames found in only one województwo" is not published in that form. The other cells may hold excluded or unassigned bearers.
   - "Present in all 16" is stated as "a published row in all 16 województwa".
   - Concentration and per-region studies are computed over the published regional rows only. Each names that population, the per-cell floor of 2 and the unassigned share, and keeps the dimension as voivodeship of permanent registered residence, never origin.
3. **"How many people" means published occurrences.** The 2026-01-20 national files sum to 42,757,839 occurrences against a GUS population of about 37.3 million (`docs/sources/candidate-sources.md`, U-4). A study reports "occurrences in the published list" and its scope; it never presents a total as a count of people in Poland, and it never sums the men's and women's lists into one figure (strategy piece 14 agrees).
4. **Change-over-time studies carry the series' gaps.** Comparisons are 2019–2026 per list (ADR-0020). There is no 2022 women's edition, and `PRAWDA` has no 2020–2022 point (STATUS.md). A study says what changed, never why.
5. **Heraldry and ethnicity pieces are myth-correcting only.** `PRODUCT.md` non-goal 5 forbids coat-of-arms or noble-descent claims from a surname; "Czy -ski oznacza szlachtę" and "Herb a nazwisko" may only explain why a surname does not establish either. "Czy nazwisko zdradza pochodzenie etniczne/narodowość" may only explain why it does not; no page infers identity from a surname.
6. **English is not a month-11 start.** The blog already publishes every post in Polish and English (TASK-071). Month 11's diaspora pieces are new topics, not the first English content.
7. **Existing posts are counted.** `genealogia`, `koncowki-nazwisk` and `jak-szukac-przodkow` already cover parts of pieces 5, 6, 15–17, 25 and 26. Plan §4 marks them as extensions, not new URLs (§2.5).
8. **Meaning sources.** IJP PAN's commercial bulk reuse is unconfirmed (`PRODUCT.md` §10). Articles may cite and link it; nothing is copied from it into the product.
9. **Competitor domains are recorded as given and were not checked.** The strategy names both `szukajnazwiska.pl` and `szukaj-nazwiska.pl` for "Szukaj Nazwiska". Whether these are one site or two was not verified; the competitor map is context, not a fact the site publishes.

## 4. Consequences

- The next blog tasks take their topic from plan §4 in order, after checking §2.5's overlap rule.
- The first data study needs a task of its own that fixes its method and denominators before anything is written about it.
- The surname page's headings may later be reworded toward the queries in plan §3. That is its own task, and it changes no figure.
- Search Console and real query data, once indexing is on, replace the strategy's directional demand labels.
