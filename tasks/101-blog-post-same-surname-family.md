# TASK-101 — The blog's ninth post: are people with the same surname related?

- **Status:** IMPLEMENTED 2026-10-04 on `claude/blog-piece-3`; record: `docs/progress/2026-10-04-blog-post-same-surname-family.md`.
- **Requested by:** the project owner, 2026-10-04: "yes" to writing the next editorial piece. ADR-0031 §4 takes the topic from `docs/SEO_CONTENT_PLAN.md` §4 in order; pieces 1 and 2 are live (TASK-086, TASK-095), so this is piece 3, "Czy osoby z tym samym nazwiskiem są rodziną?", with brief §5.3. It is not marked as an extension of an existing post (ADR-0031 §2.5): `genealogia` and `co-mozna-wyczytac-z-nazwiska` answer the question in one FAQ line each, and this post is the full answer they can link to.
- **Decision:** none new. Inside ADR-0031 (§2.2: sources, a FAQ, the surname search at the end; §2.6: "people with surname X are probably relatives" is banned; §3.2: a missing voivodeship is not zero; §3.8: IJP PAN cited and linked, nothing copied into the product) and TASK-071/075's format.
- **Depends on:** TASK-071, 075, 095 and 096 (the blog, the image script, the two latest posts), on `main` at `8ed3533` (#104). 101 is free on `main` and in the open pull requests (#108 takes 099; #110 takes no task number); 100 is on `main`.
- **Model guidance:** implementation session.

## 1. Goal

A ninth post, `czy-to-samo-nazwisko-to-rodzina`, in Polish and English, following brief §5.3 and the product's line between surname-level and family-level knowledge:

1. Why the same surname arose many times (independent origins, several possible motivations).
2. Common and rare surnames (what rarity changes, from a cited study, with its population and limits).
3. Place as a hint, not proof (registered residence today; a missing voivodeship is not zero; a shared parish).
4. What can confirm kinship: records, a tree built from them, DNA (Y-DNA and autosomal, each with what it cannot show).
5. What Name Atlas shows, then the surname search, a FAQ and the sources.

The family tree in Name Atlas is not live in production and is not mentioned.

## 2. In scope

- `apps/web/src/content/blog/czy-to-samo-nazwisko-to-rodzina.pl.md` and `.en.md`, in TASK-071's format with TASK-075's `image` and `imageAlt`.
- The feature image `apps/web/public/images/blog/czy-to-samo-nazwisko-to-rodzina.webp`:
  - A new scene in `apps/web/scripts/build-blog-images.ts`. The other images must come out byte-identical.
  - Its row and checksum in `apps/web/public/images/blog/README.md`.
- Every factual claim rests on a source cited in the post and checked on 2026-10-04. Every statement about Name Atlas matches the live surname and comparison pages and `messages.ts`, as checked on 2026-10-04. The progress record lists each claim and where it was read.
- `docs/SEO_CONTENT_PLAN.md` §4 piece 3's status, `STATUS.md` (the blog line, the "Search and editorial content" line and "Last rewritten"), a progress record.

## 3. Out of scope

- Any other change to code, tests, routes or the post format.
- Any figure from the register (`AGENTS.md` §10, ADR-0031 §2.2). The post states no count, rank or rarity.
- Text copied from IJP PAN's dictionary beyond short attributed examples (ADR-0031 §3.8).
- A recommendation of any DNA testing company; the tree; the paid tiers.
- Plan pieces 4–30.

## 4. Acceptance criteria

- **AC-1.** Both files parse and carry no link the renderer would drop; the build's check reports `blog: 18 posts checked, 18 with a feature image`.
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally:
  - `/pl/blog/czy-to-samo-nazwisko-to-rodzina` and `/en/blog/czy-to-samo-nazwisko-to-rodzina` answer 200 with their title, canonical address, `og:image` and the `pl`/`en` pair.
  - Each has its FAQ and sources sections, one call-to-action card, and internal links that answer 200.
  - Both indexes list nine posts.
  - The image answers 200.
- **AC-4.** The image script reproduces the earlier images byte for byte and the new one identically on a second run.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `SITE_ORIGIN=https://name-atlas.pl pnpm --filter web start -p 3100`, and `curl` both posts, the pages they link to, both indexes and the image.
