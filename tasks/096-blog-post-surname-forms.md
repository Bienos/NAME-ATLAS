# TASK-096 — A blog post on why Polish surnames have a male and a female form

- **Status:** IMPLEMENTED 2026-10-04 on `claude/great-wozniak-5wwxf8`; record: `docs/progress/2026-10-04-blog-post-surname-forms.md`.
- **Requested by:** the project owner, 2026-10-03: "write the next blog post", then chose "Kowalski vs Kowalska" from four topics. On 2026-10-04 they read the Polish draft and answered "Yes" to writing the English version and opening a pull request.
- **Decision:** none. Content in the format of TASK-071 and TASK-075, and one feature image drawn by TASK-075's script.
- **Depends on:** TASK-072 (#80), whose post this one links to, and TASK-075 (#86), whose image format and script it uses. It is ADR-0031 plan §4 piece 14/15 in substance ("Dlaczego Kowalski i Kowalska…", "Dlaczego polskie nazwiska mają formę męską i żeńską?").
- **Numbering:** `main` ends at TASK-094. The only open pull request, #102, also names itself TASK-094, so it will have to renumber, most likely to 095. This task takes 096 to stay clear of that.
- **Model guidance:** implementation session.

## 1. Goal

A post, `kowalski-czy-kowalska`, in Polish and English, covering:

1. Why -ski, -cki and -dzki surnames change form like adjectives.
2. How noun surnames once took -owa and -ówna, with a link to `koncowki-nazwisk` for the detail.
3. The 1951 debate (Pawłowski, Nitsch) and today's view that the suffixed forms are outdated.
4. The surname after marriage under art. 25 of the Family and Guardianship Code.
5. Why Name Atlas shows the men's and women's PESEL lists side by side and never adds them together.

It ends with a FAQ and its sources.

## 2. In scope

- `apps/web/src/content/blog/kowalski-czy-kowalska.pl.md` and `.en.md`.
- `apps/web/public/images/blog/kowalski-czy-kowalska.webp`, drawn by a new `kowalski` function in `apps/web/scripts/build-blog-images.ts`, and its row in that folder's `README.md`.
- Every factual claim rests on a source cited in the post. The progress record lists each claim and where it was read.
- `STATUS.md` (the blog line, the Deployed line and "Last rewritten") and a progress record.

## 3. Out of scope

- Any change to the blog's code, tests, routes or format.
- Any figure from the register.
- Legal advice beyond what art. 25 says.

## 4. Acceptance criteria

- **AC-1.** `scripts/check-blog-content.ts` passes, with the new post's image and alt text present.
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally:
  - `/pl/blog/kowalski-czy-kowalska` and `/en/blog/kowalski-czy-kowalska` answer 200, with their title, canonical address and the `pl`/`en` pair.
  - Their image answers 200, and their link to `koncowki-nazwisk` answers 200.
  - Both indexes list seven posts (eight after #102's post reached `main`).
- **AC-4.** A run of the script reproduces the six existing images byte for byte.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `pnpm --filter web start` with `SITE_ORIGIN` set, and `curl` both posts, the image, the linked post and both indexes.
