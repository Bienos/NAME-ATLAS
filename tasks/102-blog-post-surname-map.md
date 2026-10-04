# TASK-102 — The blog's tenth post: a surname's map is not a map of your family

- **Status:** IMPLEMENTED 2026-10-04 on `claude/blog-piece-4`; record: `docs/progress/2026-10-04-blog-post-surname-map.md`.
- **Requested by:** the project owner, 2026-10-04: "ok" to the next editorial piece. ADR-0031 §4 takes the topic from `docs/SEO_CONTENT_PLAN.md` §4 in order; pieces 1–3 are live (TASK-086, TASK-095, TASK-101), so this is piece 4, "Mapa nazwiska nie jest mapą Twojej rodziny. Jak ją poprawnie czytać?", with brief §5.4. It is not marked as an extension of an existing post (ADR-0031 §2.5): `co-mozna-wyczytac-z-nazwiska` and `czy-to-samo-nazwisko-to-rodzina` mention registered residence in a paragraph each, and this post is the full answer they can link to.
- **Decision:** none new. Inside ADR-0031 (§2.2: sources, a FAQ, the surname search at the end, a register figure only with its list, scope and date; §2.6: "your family came from X because the surname is common there" is banned; §3.2: never state that a surname is absent from a voivodeship, a missing value is not zero) and TASK-071/075's format.
- **Depends on:** TASK-071, 075, 095 and 101 (the blog, the image script, the latest posts), on `main` at `16998c8` (#111). 102 is free on `main` and in the open pull requests (#108 takes 099; #112 takes 100; #113 takes no task number).
- **Model guidance:** implementation session.

## 1. Goal

A tenth post, `mapa-nazwiska-a-mapa-rodziny`, in Polish and English, following brief §5.4:

1. What the PESEL map shows: voivodeship of permanent registered residence, living people, the current surname, separate men's and women's lists, shares of those with a voivodeship, as of 2026-01-20.
2. Registered residence versus origin.
3. Present versus past (the 2019–2026 chapter is national counts only; the 16 voivodeships since 1999; borders after 1945).
4. Migration.
5. Empty voivodeships (the publisher's single-occurrence exclusion) and why a missing value is not zero.
6. How to use the map as a hint; what Name Atlas shows; the surname search, a FAQ and the sources.

No register figure: no count, rank or share of any surname. The mechanism is described without numbers.

## 2. In scope

- `apps/web/src/content/blog/mapa-nazwiska-a-mapa-rodziny.pl.md` and `.en.md`, in TASK-071's format with TASK-075's `image` and `imageAlt`.
- The feature image `apps/web/public/images/blog/mapa-nazwiska-a-mapa-rodziny.webp`, with no map, text or face:
  - A new scene in `apps/web/scripts/build-blog-images.ts`. The other images must come out byte-identical.
  - Its row and checksum in `apps/web/public/images/blog/README.md`.
- Every factual claim rests on a source cited in the post and checked on 2026-10-04. Every statement about Name Atlas matches the live surname and comparison pages and `messages.ts`, as checked on 2026-10-04. The progress record lists each claim and where it was read.
- `docs/SEO_CONTENT_PLAN.md` §4 piece 4's status, `STATUS.md` (the blog line, the "Search and editorial content" line and "Last rewritten"), a progress record.

## 3. Out of scope

- Any other change to code, tests, routes or the post format.
- Any figure from the register (`AGENTS.md` §10, ADR-0031 §2.2), and any statement that a surname is absent from a voivodeship (ADR-0031 §3.2).
- The residual of bearers in no voivodeship row as a number; the post says only that the voivodeship list does not cover everyone and that the publisher does not say why.
- The tree; the paid tiers.
- Plan pieces 5–30.

## 4. Acceptance criteria

- **AC-1.** Both files parse and carry no link the renderer would drop; the build's check reports `blog: 20 posts checked, 20 with a feature image`.
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally:
  - `/pl/blog/mapa-nazwiska-a-mapa-rodziny` and `/en/blog/mapa-nazwiska-a-mapa-rodziny` answer 200 with their title, canonical address, `og:image` and the `pl`/`en` pair.
  - Each has its FAQ and sources sections, one call-to-action card, and internal links that answer 200.
  - Both indexes list ten posts.
  - The image answers 200.
- **AC-4.** The image script reproduces the earlier images byte for byte and the new one identically on a second run.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `SITE_ORIGIN=https://name-atlas.pl pnpm --filter web start -p 3100`, and `curl` both posts, the pages they link to, both indexes and the image.
