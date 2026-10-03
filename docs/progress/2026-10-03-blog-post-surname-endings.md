# 2026-10-03 — The blog's second post: surname endings (TASK-072)

Task: `tasks/072-blog-post-surname-endings.md`. Branch `claude/magical-brahmagupta-il0fm1`, restarted from `origin/main` @ `41d00d9` after #78 was merged. The owner asked for "the next blog post" without a topic; the session chose surname endings.

## Changed

- **The post.** `apps/web/src/content/blog/koncowki-nazwisk.pl.md` and `koncowki-nazwisk.en.md`, one slug for both. It covers -ski/-cki/-dzki, -icz/-owicz/-ewicz, -ak/-ek/-ik/-czyk, -uk and the women's forms -owa/-ina and -ówna/-anka, then what an ending cannot tell, what Name Atlas shows, a FAQ and the sources. It links to the first post twice. It shows no figure from the register. Culture.pl's share of -ski names among the most common surnames was left out for that reason.
- **Claims, and where each was read on 2026-10-03:**
  - -ski as place or ownership; Tarnowski from Tarnów, Brzeziński from Brzezie; the nobility; townspeople and peasants adopting it around the turn of the sixteenth century; the suffix becoming neutral and the most productive. Kowal giving Kowalczyk, Kowalik, Kowalski, Kowalewski. Staszczyk as patronymic. -owa/-ina for wives and -ówna/-anka for unmarried daughters, with Culture.pl's examples, dying out in the twentieth century. Adjectival -ski/-cki/-dzki with -ska/-cka/-dzka. Source: Culture.pl (Adam Mickiewicz Institute), "A Foreigner's Guide to Polish Surnames", `article:published` 2016-01-08, read from the page's HTML.
  - -icz/-owicz/-ewicz as patronymics from a father's name, byname, nickname or occupation; first attested in the twelfth century; East Slavic variants of a Proto-Slavic suffix; typical of Ruthenian naming and the borderlands; boyars, townspeople and peasants in the Grand Duchy of Lithuania; spreading in Polish names from the seventeenth century among townspeople. The "burgher -owicz" stereotype questioned, with -ski prevailing in towns in the sixteenth to eighteenth centuries and the stereotype dated to the seventeenth and eighteenth. The examples Jakubowicz, Janowicz, Józefowicz and Kasperowicz. -ik, -czyk, -ek, -ka and -ko as rarer, multi-purpose patronymic suffixes also used for diminutives. Source: Michał Mordań, "Nazwiska Podlasian z sufiksami -icz, -owicz, -ewicz…", Białystok 2019, pp. 443–464, read from the PDF in the University of Białystok repository (handle 11320/9009).
  - -uk as characteristic of the Polish and East Slavic borderland and patronymic; Sajewicz's monograph on Hajnówka county compared with the rest of Poland; bases mostly first names, often shortened and Orthodox. Source: Leonarda Dacewicz's review in *Studia Wschodniosłowiańskie* 2014, read from the PDF in the same repository, and the monograph's title.
  - Adamiak as patronymic and Lubelczyk from Lublin: Zgusta's review of Kaleta (1997), as checked for the first post.
  - Not from a cited source: the readers' impressions in the opening ("Kowalski sounds noble…"), the advice to search several forms, and the inference that the same surname could arise in unrelated families.
- **Display fix.** At 1280 px the post's title broke as "-ak, -" / "czyk i -uk", because a browser may break after any hyphen. `keepSuffixes` (`blog-page.tsx`) wraps a suffix written on its own (a hyphen with no letter or digit before it, then letters) in `<span class="nobreak">`. It applies in a post's title, headings and text and in the index's titles, and `globals.css` adds `.blog .nobreak { white-space: nowrap; }`. Two tests in `blog.test.ts`.
- `STATUS.md`: the blog line, the Deployed line (#78 live) and "Last rewritten".

## Verified

From the repository root:

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`, `pnpm build`: each exit 0. `apps/web` ran 53 files with 581 tests passing.
- `.next/server/app/en/blog/[slug]/page.js.nft.json` lists all four post files and `README.md`.
- Local production server (`SITE_ORIGIN=https://name-atlas.pl`):
  - `/pl/blog/koncowki-nazwisk`, `/en/blog/koncowki-nazwisk`, `/pl/blog/genealogia`, `/pl/blog` and `/en/blog` answered 200.
  - The Polish post has its title, description, canonical `https://name-atlas.pl/pl/blog/koncowki-nazwisk`, alternates `pl` and `en`, and eight `h2` sections.
  - Both indexes list `genealogia` then `koncowki-nazwisk`.
  - The `h1` carries five `nobreak` spans.
- Headless Chromium screenshots at 1280 px, before and after the fix: before, "-czyk" split across lines; after, it moved whole. At 500 px, the narrowest this Chromium allows, the title wraps as "…-ak, / -czyk i -uk".
- Production for #78: `dpl_CkV9U7oNGEwHztfujC2PhdNmHb8D` READY for `41d00d9`. On `https://name-atlas.pl`, the four blog pages answered 200 and `/pl/blog/nope` 404, written up on #78.

## Not verified

- This change on Vercel: checked on its merged pull request.
- The source links' availability over time. All except `bibliotekacyfrowa.pl` (timed out from the session, as on 2026-10-03 for the first post) answered 200.
