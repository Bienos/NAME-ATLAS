# TASK-079 — The blog's fourth post: a short history of genealogy, and facts that surprise

- **Status:** IMPLEMENTED 2026-10-03 on `claude/great-wozniak-5wwxf8`; record: `docs/progress/2026-10-03-blog-post-history-of-genealogy.md`.
- **Requested by:** the project owner, 2026-10-03: "write about some facts about genealogy, about its history; goal to inspire people and tell them some facts and educate". The owner read the Polish draft and asked for the English version and a pull request.
- **Decision:** none. Content in the format of TASK-071 and TASK-075, and one feature image drawn by TASK-075's script.
- **Depends on:** TASK-071 (#78), TASK-074 (#83), whose post this one links to, and TASK-075 (#86), whose image format and script it uses. 078 is held by #81, and 080 and 081 by #79 and #89; 079 was free on `main` and in every open pull request.
- **Model guidance:** implementation session.

## 1. Goal

A fourth post, `historia-genealogii`, in Polish and English. It tells the history of genealogy as a story: Confucius's lineage, the parish registers ordered by the Council of Trent, Napoleonic civil registration in the Duchy of Warsaw, the arithmetic of ancestors and pedigree collapse, the shared ancestry of all living people, and why a DNA test does not replace records. It ends with a call to the reader, a FAQ and the sources. It answers a general question, as ADR-0031 §2.2 asks, and does not repeat `genealogia`, which covers why people research their families and the history of surnames.

## 2. In scope

- `apps/web/src/content/blog/historia-genealogii.pl.md` and `historia-genealogii.en.md`.
- `apps/web/public/images/blog/historia-genealogii.webp`, drawn by a new `historia` function in `apps/web/scripts/build-blog-images.ts`, and its row in that folder's `README.md`.
- Every factual claim rests on a source cited in the post and read on 2026-10-03; the progress record lists each claim and where it was read.
- `STATUS.md` (the blog line, the Deployed line, "Last rewritten") and a progress record.

## 3. Out of scope

- Any change to the blog's code, tests, routes or format.
- Any figure from the register (TASK-071's README: a post is prose).
- Re-rendering the three existing images. The script draws them again, but only the new file is copied in.

## 4. Acceptance criteria

- **AC-1.** `scripts/check-blog-content.ts` passes, with the new post's image and alt present.
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally, `/pl/blog/historia-genealogii` and `/en/blog/historia-genealogii` answer 200 with their title, canonical address and the `pl`/`en` pair, and their image answers 200. Their links to `jak-szukac-przodkow` answer 200, and both indexes list four posts.
- **AC-4.** A run of the script reproduces the three existing images byte for byte.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `pnpm --filter web start` with `SITE_ORIGIN` set, and `curl` both posts, the image, the linked post and both indexes.
