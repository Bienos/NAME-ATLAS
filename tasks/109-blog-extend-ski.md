# TASK-109 — Extend `koncowki-nazwisk`: what the -ski ending means

- **Status:** IMPLEMENTED 2026-10-04 on `claude/blog-piece-6`; record: `docs/progress/2026-10-04-blog-extend-ski.md`.
- **Requested by:** the project owner, 2026-10-04: "ok" to plan piece 6 in `docs/SEO_CONTENT_PLAN.md` §4, "Co oznacza końcówka -ski w polskim nazwisku?", marked "extend `koncowki-nazwisk`; the original -ski statistic belongs to data study §7".
- **An extension, not a new post (ADR-0031 §2.5):** `koncowki-nazwisk` already answers the intent in a short section, so that section is expanded in both languages. No new slug, no new image.
- **Also inside:** ADR-0031 §2.2 (sources, a FAQ, the surname search at the end, no register figure), §3.5 (-ski is explained only as not establishing nobility or a coat of arms) and TASK-071/075's format.
- **Date:** the post format has no `updated` key (the blog `README.md` allows only `title`, `description`, `date`, `slug`, `lang`, `image`, `imageAlt`), so the post keeps `date: 2026-10-03`. Title and description are unchanged: both already name -ski first.
- **Depends on:** TASK-105, on `main` at `366550a` (#123).
- **Number:** 109 is the next number free on `main` and in open pull requests on 2026-10-04 (the highest in use is TASK-108, #125).
- **Model guidance:** implementation session.

## 1. Goal

The section "-ski, -cki, -dzki" of `koncowki-nazwisk` answers "Co oznacza końcówka -ski?" in full, in Polish and English:

1. The original meaning: an adjective suffix marking origin from a place or its ownership; -ski equal to "z" / Latin "de".
2. -cki and -dzki as the same suffix after particular sounds.
3. Why -ski became associated with the nobility.
4. Its spread to townspeople and peasants from the sixteenth century, with sourced examples.
5. Why it is neutral today, as qualitative statements from sources only.
6. The myth "-ski = szlachta", corrected.
7. -ska, -cka, -dzka only by a link to `kowalski-czy-kowalska`.

No register figure: no count, rank or share of any surname or ending. The original -ski statistic is left to the data study (plan §6).

## 2. In scope

- `apps/web/src/content/blog/koncowki-nazwisk.pl.md` and `.en.md`: the -ski section rewritten with subsections, structurally parallel in both languages; a link to `skad-wziely-sie-nazwiska-w-polsce` for the history and to `kowalski-czy-kowalska` for the feminine forms; three FAQ entries about -ski; a link added to the existing Kowalska FAQ answer; new sources. Nothing else in the post changes.
- Every factual claim rests on a source cited in the post and read on 2026-10-04. The progress record lists each new claim and where it was read.
- `docs/SEO_CONTENT_PLAN.md` §4 piece 6's status, `STATUS.md` (the blog line, the "Search and editorial content" line and "Last rewritten"), a progress record.

## 3. Out of scope

- A new slug, a new image, any change to code, tests, routes or the post format.
- Any figure from the register or from older PESEL-based studies (`AGENTS.md` §10, ADR-0031 §2.2).
- Heraldry and noble descent beyond saying that -ski does not establish them (ADR-0031 §3.5); plan piece 18 stays queued.
- Plan pieces 7–30.

## 4. Acceptance criteria

- **AC-1.** Both files parse; the build's check reports `blog: 22 posts checked, 22 with a feature image`.
- **AC-2.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-3.** In a production build served locally, `/pl/blog/koncowki-nazwisk` and `/en/blog/koncowki-nazwisk` answer 200 with their title, canonical address and the new section, its FAQ entries and sources, one call-to-action card, and internal links that answer 200.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `SITE_ORIGIN=https://name-atlas.pl pnpm --filter web start -p 3100`, and `curl` both versions of the post and the pages it newly links to.
