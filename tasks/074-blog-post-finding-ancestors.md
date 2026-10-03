# TASK-074 — The blog's third post: how to find Polish ancestors online

- **Status:** IMPLEMENTED 2026-10-03 on `claude/magical-brahmagupta-il0fm1`; record: `docs/progress/2026-10-03-blog-post-finding-ancestors.md`.
- **Requested by:** the project owner, 2026-10-03: "write the next blog post", with no topic named. The session chose a step-by-step guide to searching for ancestors, which the first two posts lead into, and said so.
- **Decision:** none. Content only, in the format TASK-071 defined.
- **Depends on:** TASK-071 (#78) and TASK-072 (#80), whose post this one links to. It was written as TASK-073 and renumbered to 074 on 2026-10-03: open pull requests #81 (opened before this task's #83), #84 and #67 also name a TASK-073, and #79 a TASK-072. 074 was free on `main` and in every open pull request.
- **Model guidance:** implementation session.

## 1. Goal

A third post, `jak-szukac-przodkow`, in Polish and English: six steps from family papers at home to the parish, Geneteka's indexes, scans on szukajwarchiwach.gov.pl, the civil registry office for newer records and an enquiry to an archive, then what Name Atlas does and does not do, a FAQ and the sources.

## 2. In scope

- `apps/web/src/content/blog/jak-szukac-przodkow.pl.md` and `jak-szukac-przodkow.en.md`, in TASK-071's format.
- Every factual claim rests on a source cited in the post and checked on 2026-10-03; the progress record lists each claim and where it was read.
- `STATUS.md` (the blog line, and its Production lines as `AGENTS.md` §8.5 asks) and a progress record.

## 3. Out of scope

- Any change to code, tests, routes or the post format.
- Any figure from the register. A post is prose (`AGENTS.md` §10).
- Legal advice beyond what the cited act says; fees, which the post leaves to the office or archive.

## 4. Acceptance criteria

- **AC-1.** Both files parse and carry no link the renderer would drop (the existing test over the shipped posts).
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally, `/pl/blog/jak-szukac-przodkow` and `/en/blog/jak-szukac-przodkow` answer 200 with their title, description, canonical address and the `pl`/`en` pair; their links to the first two posts answer 200; both indexes list all three posts.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `pnpm --filter web start` with `SITE_ORIGIN` set, and `curl` the post, the posts it links to and both indexes.
