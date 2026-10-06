# TASK-135 — The blog's twelfth post: surnames from place names, and when a surname really comes from a place

- **Status:** IMPLEMENTED 2026-10-06; record: `docs/progress/2026-10-06-blog-post-toponymic-surnames.md`.
- **Requested by:** the project owner, 2026-10-06: "Do the blog post", choosing it from the two next steps offered. ADR-0031 §4 takes the topic from `docs/SEO_CONTENT_PLAN.md` §4 in order; pieces 1–5 are live (TASK-086, 095, 101, 102, 105) and piece 6 was done as an extension of `koncowki-nazwisk` (TASK-110), so this is piece 7, "Nazwiska odmiejscowe: kiedy nazwisko naprawdę pochodzi od miejsca?", marked "queued".
- **Overlap check (ADR-0031 §2.5):** `koncowki-nazwisk`'s -ski section explains what the suffix meant, why it was linked with nobility and how it spread; `skad-wziely-sie-nazwiska-w-polsce` tells the history. This post answers a different question: for one surname, how to tell whether it comes from a place, from which one, and what that does and does not say about a family. It links to both rather than repeating them.
- **Also inside:** ADR-0031 §2.2 (sources, a FAQ, the surname search at the end, no register figure), §3.5 (-ski explained only as not establishing nobility) and TASK-071/075's format.
- **Depends on:** TASK-071, 075 and 105, on `main` at `5103371` (#160).
- **Number:** 135. Taken as 134 first; while this task was in progress, #163 merged its own TASK-134 into `main` (after #159 took 133), so this task moved to the next free number.
- **Model guidance:** implementation session.

## 1. Goal

A twelfth post, `nazwiska-odmiejscowe`, in Polish and English:

1. What a surname from a place name is: from "Jan z Tarnowa" to Tarnowski; the labels "odmiejscowe" and "odetniczne" in the IJP PAN dictionary.
2. The forms: -ski/-cki/-dzki from a place; -ak and similar from a place (Krakowiak); names from peoples and regions (Litwin, Ślęzak, Mazur, Węgrzyn, Niemiec).
3. When a -ski surname is not from a place: names modelled on the pattern from ordinary words and first names (Lewandowski, Jakubowski), and the *Liber chamorum*.
4. Which place: one name, many places (Dąbrowski, Wiśniewski, Kowalewski, Krakowski).
5. What a place name says about a family, and what it does not (owner or newcomer; no proof the family lived there; no proof of nobility).
6. How to check: the dictionary entry, the oldest records of one's own family, the parish books; what Name Atlas shows (the meaning chapter only with a scholarly source; the localities chapter is a shared name in TERYT, not an origin).
7. A FAQ, the sources, and the surname search.

No register figure: no count, rank or share of any surname.

## 2. In scope

- `apps/web/src/content/blog/nazwiska-odmiejscowe.pl.md` and `.en.md`, in TASK-071's format with TASK-075's `image` and `imageAlt`, linking to earlier posts where they already cover a point.
- The feature image `apps/web/public/images/blog/nazwiska-odmiejscowe.webp`, with no map, text or face: a new scene in `apps/web/scripts/build-blog-images.ts` (seed 134), the other images byte-identical; its row and checksum in `apps/web/public/images/blog/README.md`.
- Every factual claim rests on a source cited in the post and read on 2026-10-06. Every statement about Name Atlas matches `messages.ts` on `main` at `5103371`. The progress record lists each claim and where it was read.
- `docs/SEO_CONTENT_PLAN.md` §4 piece 7's status, `STATUS.md` (the blog line, the "Search and editorial content" line, "Last rewritten"), a progress record.

## 3. Out of scope

- Any change to code, tests, routes, the post format or another post.
- Any figure from the register (`AGENTS.md` §10, ADR-0031 §2.2).
- Any claim not found in a source read on 2026-10-06.
- Heraldry and noble descent beyond saying that -ski does not establish it (ADR-0031 §3.5).
- Plan pieces 8–30.

## 4. Acceptance criteria

- **AC-1.** Both files parse and carry no link the renderer would drop; the build's check reports `blog: 24 posts checked, 24 with a feature image`.
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally, `/pl/blog/nazwiska-odmiejscowe` and `/en/blog/nazwiska-odmiejscowe` answer 200 with their title, canonical address, `og:image` and the `pl`/`en` pair; each has its FAQ and sources sections and one call-to-action card; its internal links answer 200; both indexes list twelve posts; the image answers 200.
- **AC-4.** The image script reproduces the earlier images byte for byte, and the new one identically on a second run.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `SITE_ORIGIN=https://name-atlas.pl pnpm --filter web start -p 3100`, and `curl` both posts, the pages they link to, both indexes and the image.
