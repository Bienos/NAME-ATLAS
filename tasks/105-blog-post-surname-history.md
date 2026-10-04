# TASK-105 — The blog's eleventh post: where Polish surnames came from, from the Middle Ages to PESEL

- **Status:** IMPLEMENTED 2026-10-04 on `claude/blog-piece-5`; record: `docs/progress/2026-10-04-blog-post-surname-history.md`.
- **Requested by:** the project owner, 2026-10-04: "ok" to the next editorial piece. ADR-0031 §4 takes the topic from `docs/SEO_CONTENT_PLAN.md` §4 in order; pieces 1–4 are live (TASK-086, TASK-095, TASK-101, TASK-102), so this is piece 5, "Skąd wzięły się nazwiska w Polsce? Od średniowiecza do PESEL", marked "extend: `genealogia` has a short history section; decide at task time whether the pillar replaces it or links from it".
- **Decision (taken in this session, agreed by the owner on 2026-10-04):** a **new pillar post that `genealogia` links to**. `genealogia`'s section "Skąd pochodzi nazwisko: krótka historia polskich nazwisk" / "Where surnames come from: a short history of Polish surnames" stays as it is, and one sentence with a link to the new post is added at its end in both languages. This is the overlap check of ADR-0031 §2.5: `genealogia`'s section is three paragraphs and a list inside a post about why people research their families; the pillar answers the history question in full, and `genealogia` keeps its short answer and points to the long one.
- **Also inside:** ADR-0031 §2.2 (sources, a FAQ, the surname search at the end, a register figure only with its list, scope and date), §3.5 (-ski is explained only as not establishing nobility) and TASK-071/075's format.
- **Depends on:** TASK-071, 075 and 102 (the blog, the image script, the latest post), on `main` at `71a0a70` (#115).
- **Number:** the session was asked to use 104, but on 2026-10-04 open pull requests #119 (`tasks/104-offer-five-tiers.md`) and #120 (`tasks/104-surname-pdf.md`) already take 104 and #117 takes 103. `AGENTS.md` §11 gives the next number free on `main` and in open pull requests: 105.
- **Model guidance:** implementation session.

## 1. Goal

An eleventh post, `skad-wziely-sie-nazwiska-w-polsce`, in Polish and English, telling the history of Polish surnames:

1. Single names (the Bull of Gniezno, 1136) and Slavic names moving into surnames after the Council of Trent.
2. Bynames from the thirteenth century: from a place, a father, a trait, a trade.
3. Fixed surnames first among the nobility (Kaleta: mainly the fourteenth century; Wolnicz-Pawłowska: settling from the second half of the fifteenth), mostly from estates.
4. The fashion for -ski from the sixteenth century, *Liber chamorum*, -ski from ordinary words (IJP PAN), and why -ski does not prove nobility.
5. Townspeople and peasants later, some only in the nineteenth century; variable spellings; -ic becoming -icz.
6. The partitions' laws (Kaleta) and civil registration in the Duchy of Warsaw from 1 May 1808 (Grodziski).
7. The 1956 and 2008 Acts on changing a surname; marriage only by a link to `kowalski-czy-kowalska`.
8. PESEL: its building (Forsal), the register today (gov.pl) and the lists on dane.gov.pl.
9. What this means for one family; what Name Atlas shows; the surname search, a FAQ and the sources.

No register figure: no count, rank or share of any surname.

## 2. In scope

- `apps/web/src/content/blog/skad-wziely-sie-nazwiska-w-polsce.pl.md` and `.en.md`, in TASK-071's format with TASK-075's `image` and `imageAlt`, linking to the earlier posts where they already cover a point.
- One sentence with a link to the new post at the end of `genealogia`'s history section, in `genealogia.pl.md` and `genealogia.en.md`. Nothing else in `genealogia` changes.
- The feature image `apps/web/public/images/blog/skad-wziely-sie-nazwiska-w-polsce.webp`, with no map, text or face:
  - A new scene in `apps/web/scripts/build-blog-images.ts` (seed 104). The other images must come out byte-identical.
  - Its row and checksum in `apps/web/public/images/blog/README.md`.
- Every factual claim rests on a source cited in the post and checked on 2026-10-04. Every statement about Name Atlas matches the live surname pages and `messages.ts`, as checked on 2026-10-04. The progress record lists each claim and where it was read.
- `docs/SEO_CONTENT_PLAN.md` §4 piece 5's status, `STATUS.md` (the blog line, the "Search and editorial content" line and "Last rewritten"), a progress record.

## 3. Out of scope

- Any other change to code, tests, routes or the post format; any other change to `genealogia`.
- Any figure from the register (`AGENTS.md` §10, ADR-0031 §2.2).
- Any claim not found in a source read on 2026-10-04: among them the interwar law on names, Prussian and Austrian registration details and dates, and the PESEL number's legal basis before 2001.
- Heraldry and noble descent beyond saying that -ski does not establish it (ADR-0031 §3.5).
- Plan pieces 6–30.

## 4. Acceptance criteria

- **AC-1.** Both files parse and carry no link the renderer would drop; the build's check reports `blog: 22 posts checked, 22 with a feature image`.
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally:
  - `/pl/blog/skad-wziely-sie-nazwiska-w-polsce` and `/en/blog/skad-wziely-sie-nazwiska-w-polsce` answer 200 with their title, canonical address, `og:image` and the `pl`/`en` pair.
  - Each has its FAQ and sources sections, one call-to-action card, and internal links that answer 200.
  - `/pl/blog/genealogia` and `/en/blog/genealogia` link to the new post.
  - Both indexes list eleven posts.
  - The image answers 200.
- **AC-4.** The image script reproduces the earlier images byte for byte and the new one identically on a second run.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `SITE_ORIGIN=https://name-atlas.pl pnpm --filter web start -p 3100`, and `curl` both posts, `genealogia` in both languages, the pages they link to, both indexes and the image.
