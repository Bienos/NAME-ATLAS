# TASK-113 — The history post gains the facts it was missing

- **Status:** IMPLEMENTED 2026-10-05 on `claude/blog-surname-history`; record: `docs/progress/2026-10-05-blog-history-extended.md`.
- **Requested by:** the project owner, 2026-10-05: "do 1", choosing to fold the sourced facts of an unmerged second history post (written in this session for plan piece 5 while TASK-105 was merged by another session) into the live post, instead of dropping them.
- **Decision:** none new. ADR-0031 §2.5: an intent an existing post covers is extended, not given a new URL. ADR-0031 §2.2: sources, a FAQ, no register figure.
- **Depends on:** TASK-105 (`skad-wziely-sie-nazwiska-w-polsce`, #123) on `main` at `71810db`. 113 is free on `main` and in the open pull requests (main took 112 for the free tree limits, #131; #130 takes 111).
- **Model guidance:** implementation session.

## 1. Goal

`skad-wziely-sie-nazwiska-w-polsce`, in Polish and English, adds what it did not yet say, each with its source:

1. The Council of Trent's order of November 1563 to keep baptism and marriage registers, confirmed by Polish diocesan synods and extended to the Commonwealth by the synod of Piotrków (no year: the sources disagree).
2. The surname laws for Jews: Austria 1787 (within two years), South and New East Prussia on 17 April 1797, the Kingdom of Poland in March 1821 (six months).
3. Women's -owa, -ina, -ówna and -anka in 19th-century registers, which could mean a wife or a daughter, and their decline in today's dialects; one FAQ entry on them.
4. The decree of 10 November 1945 before the 1956 act.
5. The central PESEL database from 1 July 1985.

## 2. In scope

- The two post files; eight sources added to each.
- `STATUS.md` (the post's line, the editorial queue line, which still named piece 5 as next, and "Last rewritten"), a progress record.

## 3. Out of scope

- The post's existing text, title, description, date, slug and image.
- Any register figure. Plan pieces 7–30.

## 4. Acceptance criteria

- **AC-1.** The build's check reports `blog: 22 posts checked, 22 with a feature image`.
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally, both versions answer 200, show six FAQ entries and the new sources, and every internal link answers 200.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `next start` on the build and `curl` both versions and their internal links.
