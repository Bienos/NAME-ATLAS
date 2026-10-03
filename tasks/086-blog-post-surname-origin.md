# TASK-086 — The blog's sixth post: how to check where a surname comes from

- **Status:** IMPLEMENTED 2026-10-03 on `claude/magical-brahmagupta-il0fm1`; record: `docs/progress/2026-10-03-blog-post-surname-origin.md`.
- **Requested by:** the project owner, 2026-10-03: "write the next blog post", with no topic named. ADR-0031 §4 says the next blog tasks take their topic from `docs/SEO_CONTENT_PLAN.md` §4 in order; piece 1, "Jak sprawdzić pochodzenie nazwiska? 7 źródeł, którym naprawdę można zaufać", is the first queued, with brief §5.1. It is not marked as an extension of an existing post (ADR-0031 §2.5).
- **Decision:** none new. Inside ADR-0031 (§2.2: sources, a FAQ, the surname search at the end; §3.2: a missing voivodeship is not zero; §3.5: -ski is not nobility; §3.8: IJP PAN cited and linked, nothing copied into the product) and TASK-071/075's format.
- **Depends on:** TASK-071, 072, 074 and 075 (the blog, its posts and the image script), on `main` at `1d620d2` (#94). Parallel sessions put two more posts on `main` first: TASK-079's `historia-genealogii` (#90) and TASK-082's `imie-i-nazwisko-ciekawostki` (#94), so this post is the sixth. It was written as TASK-082 too and renumbered to 086 on 2026-10-03, when #94 took 082 on `main`. 086 is free on `main`, in every open pull request and on every remote branch (084 is `share-studio`, 085 is #95).
- **Model guidance:** implementation session.

## 1. Goal

A sixth post, `jak-sprawdzic-pochodzenie-nazwiska`, in Polish and English, following brief §5.1. It first separates a surname's origin (language) from a family's origin (records).

**The walkthrough.** It then shows, step by step, how to check a surname on Name Atlas and how to read each chapter of its page, under the page's own headings:

1. The search, the cards and the sources.
2. The two counts.
3. The rarity, the neighbours and the other grammatical form.
4. The voivodeship map.
5. The change since 2019.
6. The meaning.
7. Old print.

Each step says what the chapter cannot tell.

**After the walkthrough.** The sources beyond Name Atlas follow, each with what it says and what it does not: IJP PAN's *Internetowy słownik nazwisk w Polsce*, Rymut's *Nazwiska Polaków*, the dictionaries of old personal names, the PESEL lists, Polona, and parish and civil records. The post ends with what a surname alone cannot tell, a FAQ and the sources.

**The owner's correction.** The first draft (`f9cd8d1`) led with the seven outside sources and gave Name Atlas one paragraph. The owner asked "why its not educating how to do it in [Name Atlas]", so Name Atlas now leads.

## 2. In scope

- `apps/web/src/content/blog/jak-sprawdzic-pochodzenie-nazwiska.pl.md` and `.en.md`, in TASK-071's format with TASK-075's `image` and `imageAlt`.
- The feature image `apps/web/public/images/blog/jak-sprawdzic-pochodzenie-nazwiska.webp`:
  - A new scene in `apps/web/scripts/build-blog-images.ts`, drawn over the ground through a new optional `front` argument of `scene`. The other images must come out byte-identical.
  - Its row and checksum in `apps/web/public/images/blog/README.md`.
- Every factual claim rests on a source cited in the post and checked on 2026-10-03. Every statement about Name Atlas matches the live surname pages and the interface text in `messages.ts`, as checked on 2026-10-03. The progress record lists each claim and where it was read.
- `docs/SEO_CONTENT_PLAN.md` §4 piece 1's status, `STATUS.md` (the blog and plan lines, and its Production lines as `AGENTS.md` §8.5 asks), a progress record.

## 3. Out of scope

- Any other change to code, tests, routes or the post format.
- Any figure from the register (`AGENTS.md` §10, ADR-0031 §2.2). The post states no count, rank or rarity.
- Text copied from IJP PAN's dictionaries beyond short attributed examples (ADR-0031 §3.8).
- Plan pieces 2–30, the data studies, a header link to the blog.

## 4. Acceptance criteria

- **AC-1.** Both files parse and carry no link the renderer would drop (the existing test over the shipped posts); the build's check reports `blog: 12 posts checked, 12 with a feature image` (six posts, two languages each).
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally:
  - `/pl/blog/jak-sprawdzic-pochodzenie-nazwiska` and `/en/blog/jak-sprawdzic-pochodzenie-nazwiska` answer 200 with their title, canonical address, `og:image` and the `pl`/`en` pair.
  - Each has its FAQ and sources sections, one call-to-action card, and links to the earlier posts that answer 200.
  - Both indexes list six posts.
  - The image answers 200.
- **AC-4.** The image script reproduces the earlier images byte for byte and the new one identically on a second run.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `pnpm --filter web start` with `SITE_ORIGIN` set, and `curl` both posts, the posts they link to, both indexes and the image.
