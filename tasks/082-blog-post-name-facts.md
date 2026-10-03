# TASK-082 — The blog's fifth post: six facts about where first names and surnames come from

- **Status:** IMPLEMENTED 2026-10-03 on `claude/great-wozniak-5wwxf8`; record: `docs/progress/2026-10-03-blog-post-name-facts.md`.
- **Requested by:** the project owner, 2026-10-03: "write the next blog post about the most interesting facts about finding out about your surname and name origin". The owner read the Polish draft and asked for the English version and a pull request.
- **Decision:** none. Content in the format of TASK-071 and TASK-075, and one feature image drawn by TASK-075's script.
- **Depends on:** TASK-072 (#80) and TASK-074 (#83), whose posts this one links to, and TASK-075 (#86), whose image format and script it uses. 078, 080 and 083 are held by #81, #79 and #91; 082 was free on `main` and in every open pull request.
- **Model guidance:** implementation session.

## 1. Goal

A fifth post, `imie-i-nazwisko-ciekawostki`, in Polish and English, with six facts:

1. Old Slavic two-part names were wishes.
2. Christian calendar names replaced them around 1500, and the few that survived were saints' names.
3. What Polish law allows as a child's name.
4. That a mocking surname can be changed.
5. That the publisher of the PESEL lists names Nowak the most common surname.
6. That names were not changed at Ellis Island.

A FAQ and the sources follow. It does not repeat `genealogia` (the history of Polish surnames) or `koncowki-nazwisk` (endings), and links to the latter and to `jak-szukac-przodkow`.

## 2. In scope

- `apps/web/src/content/blog/imie-i-nazwisko-ciekawostki.pl.md` and `.en.md`.
- `apps/web/public/images/blog/imie-i-nazwisko-ciekawostki.webp`, drawn by a new `ciekawostki` function in `apps/web/scripts/build-blog-images.ts`, and its row in that folder's `README.md`.
- Every factual claim rests on a source cited in the post and read on 2026-10-03. The progress record lists each claim and where it was read.
- `STATUS.md` (the blog line, the Deployed line, "Last rewritten") and a progress record.

## 3. Out of scope

- Any change to the blog's code, tests, routes or format.
- Any figure from the register. Fact 5 names a rank from the publisher's own notice and gives no count.
- Legal advice beyond what the two acts' cited articles say.

## 4. Acceptance criteria

- **AC-1.** `scripts/check-blog-content.ts` passes, with the new post's image and alt text present.
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally, `/pl/blog/imie-i-nazwisko-ciekawostki` and `/en/blog/imie-i-nazwisko-ciekawostki` answer 200, with:
  - their title, canonical address and the `pl`/`en` pair;
  - their image answering 200;
  - their links to `koncowki-nazwisk` and `jak-szukac-przodkow` answering 200.

  Both indexes list five posts.
- **AC-4.** A run of the script reproduces the four existing images byte for byte.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then run `pnpm --filter web start` with `SITE_ORIGIN` set, and `curl` both posts, the image, the linked posts and both indexes.
