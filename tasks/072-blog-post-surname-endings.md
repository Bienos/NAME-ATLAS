# TASK-072 — The blog's second post: what Polish surname endings mean

- **Status:** IMPLEMENTED 2026-10-03 on `claude/magical-brahmagupta-il0fm1`; record: `docs/progress/2026-10-03-blog-post-surname-endings.md`.
- **Requested by:** the project owner, 2026-10-03: "write the next blog post", with no topic named. The session chose surname endings, which the first post (`genealogia`) leads into, and said so.
- **Decision:** none. Content in the format TASK-071 defined, and one display fix the post exposed (§2).
- **Depends on:** TASK-071, on `main` at `41d00d9` (#78). Numbers 066, 068, 069 and 070 are held by open pull requests (#67, #70, #76); this task takes 072.
- **Model guidance:** implementation session.

## 1. Goal

A second post, `koncowki-nazwisk`, in Polish and English: what the endings -ski/-cki/-dzki, -icz/-owicz/-ewicz, -ak/-ek/-ik/-czyk and -uk say about how a surname was formed, what the women's forms -owa/-ina and -ówna/-anka meant, what an ending cannot tell, what Name Atlas shows, a FAQ and the sources.

## 2. In scope

- `apps/web/src/content/blog/koncowki-nazwisk.pl.md` and `koncowki-nazwisk.en.md`, in TASK-071's format.
- **A display fix the post exposed.** A browser may break a line after any hyphen, so the post's title rendered as "-ak, -" / "czyk i -uk" (screenshot at 1280 px, 2026-10-03). `keepSuffixes` in `blog-page.tsx` wraps a suffix written on its own (a hyphen with no letter or digit before it, then letters) in `<span class="nobreak">` in a post's title, headings and text and in the index's titles; `globals.css` gives it `white-space: nowrap`. A hyphen inside a word (a double-barrelled surname, a year range) is untouched. Tests in `blog.test.ts`.
- Every factual claim rests on a source cited in the post and checked on 2026-10-03; the progress record lists each claim and where it was read.
- `STATUS.md` (the blog line, and its Production lines as `AGENTS.md` §8.5 asks of the next change that touches it) and a progress record.

## 3. Out of scope

- Any other change to code, routes or the post format.
- Any figure from the register (counts, rarity, distribution, shares of surnames with an ending). A post is prose (`AGENTS.md` §10).
- Claims about a particular reader's family, region or social class from their surname.

## 4. Acceptance criteria

- **AC-1.** Both files parse and carry no link the renderer would drop (the existing test over the shipped posts).
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally, `/pl/blog/koncowki-nazwisk` and `/en/blog/koncowki-nazwisk` answer 200 with their title, description, canonical address and the `pl`/`en` pair, and both indexes list both posts (the same date, so by slug: `genealogia` first, as `sortPosts` orders a tie).
- **AC-4.** `keepSuffixes` wraps "-ski", "-czyk" and "-ówna" written on their own and leaves "Kowalska-Nowak" and "1545-1563" as they are; a post's title, headings, bold text, link text and the index's titles carry the wrapped suffix (unit). At 1280 px the title no longer breaks inside "-czyk" (screenshot).

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `pnpm --filter web start` with `SITE_ORIGIN` set, and `curl` the two posts and both indexes.
