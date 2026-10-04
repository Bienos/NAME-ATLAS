# TASK-095 — The blog's seventh post: what a surname can and cannot tell

- **Status:** IMPLEMENTED 2026-10-04 on `claude/blog-piece-2`; record: `docs/progress/2026-10-04-blog-post-what-a-surname-tells.md`.
- **Requested by:** the project owner, 2026-10-04: "go continue" with the next editorial piece. ADR-0031 §4 takes the topic from `docs/SEO_CONTENT_PLAN.md` §4 in order; piece 1 is live (TASK-086), so this is piece 2, "Co naprawdę można wyczytać z nazwiska — a czego nie?", with brief §5.2. It is not marked as an extension of an existing post (ADR-0031 §2.5).
- **Decision:** none new. Inside ADR-0031 (§2.2: sources, a FAQ, the surname search at the end; §3.2: a missing voivodeship is not zero; §3.5: -ski is not nobility, and a surname does not establish ethnicity or nationality; §3.8: IJP PAN cited and linked, nothing copied into the product) and TASK-071/075's format.
- **Depends on:** TASK-071, 075 and 086 (the blog, the image script, the previous post), on `main` at `d655a45` (#100). Written as TASK-094 and renumbered to 095 on 2026-10-04, when #103 took 094 on `main`; 095 is free on `main` and in open pull requests; 088 and 089 stay skipped, as `docs/progress/2026-10-03-share-studio-spec.md` records.
- **Model guidance:** implementation session.

## 1. Goal

A seventh post, `co-mozna-wyczytac-z-nazwiska`, in Polish and English, following brief §5.2: a trust page and a recurring internal-link target.

**What a surname can tell,** from the surest to the least sure, each section ending on what it does and does not tell:

1. Who bears it today (the PESEL lists; the surname page's count and well-known bearers chapters).
2. How common it is (rank, "1 na X", separate lists for the two forms).
3. Where its bearers live (voivodeship of permanent registered residence; a missing voivodeship is not zero).
4. How it is built (base and suffix, the suffix's function, women's forms).
5. What it may come from (several possible etymologies; meanings shifting over time).
6. When it appears in the sources (dated attestations, and what their absence means; old print on Polona).

**Then:** what a surname cannot tell (kinship, a family's place, nobility, nationality, one certain meaning), why the records are needed, the surname search, a FAQ and the sources.

It differs from TASK-086's post, which is a walkthrough of Name Atlas: this one is about the surname itself, and links to that post for the walkthrough.

## 2. In scope

- `apps/web/src/content/blog/co-mozna-wyczytac-z-nazwiska.pl.md` and `.en.md`, in TASK-071's format with TASK-075's `image` and `imageAlt`.
- The feature image `apps/web/public/images/blog/co-mozna-wyczytac-z-nazwiska.webp`:
  - A new scene in `apps/web/scripts/build-blog-images.ts`. The other images must come out byte-identical.
  - Its row and checksum in `apps/web/public/images/blog/README.md`.
- Every factual claim rests on a source cited in the post and checked on 2026-10-04. Every statement about Name Atlas matches the live surname pages and the interface text in `messages.ts`, as checked on 2026-10-04. The progress record lists each claim and where it was read.
- `docs/SEO_CONTENT_PLAN.md` §4 piece 2's status, `STATUS.md` (the blog and plan lines, and its Production lines as `AGENTS.md` §8.5 asks), a progress record.

## 3. Out of scope

- Any other change to code, tests, routes or the post format.
- Any figure from the register (`AGENTS.md` §10, ADR-0031 §2.2). The post states no count, rank or rarity.
- Text copied from IJP PAN's dictionary beyond short attributed examples (ADR-0031 §3.8).
- Plan pieces 3–30, the data studies, a header link to the blog.

## 4. Acceptance criteria

- **AC-1.** Both files parse and carry no link the renderer would drop (the existing test over the shipped posts); the build's check reports `blog: 14 posts checked, 14 with a feature image` (seven posts, two languages each).
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally:
  - `/pl/blog/co-mozna-wyczytac-z-nazwiska` and `/en/blog/co-mozna-wyczytac-z-nazwiska` answer 200 with their title, canonical address, `og:image` and the `pl`/`en` pair.
  - Each has its FAQ and sources sections, one call-to-action card, and links to the earlier posts that answer 200.
  - Both indexes list seven posts.
  - The image answers 200.
- **AC-4.** The image script reproduces the earlier images byte for byte and the new one identically on a second run.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `pnpm --filter web start` with `SITE_ORIGIN` set, and `curl` both posts, the posts they link to, both indexes and the image.
