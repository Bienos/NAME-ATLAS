# 2026-10-04 — `koncowki-nazwisk`: what the -ski ending means (TASK-109)

Task: `tasks/109-blog-extend-ski.md`. Branch `claude/blog-piece-6`, on `origin/main` @ `366550a` (#123); `git merge-base --is-ancestor origin/main HEAD` passed before the first edit. The owner said "ok" to plan piece 6, marked "extend `koncowki-nazwisk`". Under ADR-0031 §2.5 the existing post's -ski section was extended; no new URL or image.

**Number.** Open pull requests on 2026-10-04 (`gh api repos/Bienos/NAME-ATLAS/pulls?state=open`) use task numbers up to 108 (#125); `tasks/` on `main` ends at 105. 109 is free.

## Changed

- **`apps/web/src/content/blog/koncowki-nazwisk.pl.md` and `.en.md`:**
  - The section "-ski, -cki, -dzki: od nazwy miejsca" / "from a place" is now "-ski, -cki, -dzki: co oznacza końcówka -ski" / "what the -ski ending means": two opening paragraphs and six subsections (-cki and -dzki; the link to the nobility; the spread to townspeople and peasants; why it is neutral today; "Czy -ski oznacza szlachtę?" / "Does -ski mean nobility?"; -ska, -cka, -dzka).
  - The old sentence linking to `genealogia` for the history of -ski is replaced by a link to `skad-wziely-sie-nazwiska-w-polsce`. The feminine forms are only linked to `kowalski-czy-kowalska`, not repeated.
  - Three FAQ entries added (what -ski means; -ski vs -cki and -dzki; whether -ski means noble descent); the existing Kowalska FAQ answer gains a link to `kowalski-czy-kowalska`.
  - Three sources added: Wolnicz-Pawłowska (1999), IJP PAN's dictionary and its "O słowniku", Kowalik (*Onomastica* 2017).
  - The rest of the post is unchanged. `date` stays 2026-10-03: the blog format (`apps/web/src/content/blog/README.md`) allows no `updated` key, and none was added. Title and description are unchanged.
  - **No register figure.** The numbers are years and centuries, and page numbers. Wolnicz-Pawłowska's percentages for the 100 most common surnames (from a 1990 PESEL list, after Skowronek) and Culture.pl's share of -ski among the top 1,000 were read and deliberately not used; the -ski statistic belongs to the data study.
- **Records:** this file, `tasks/109-blog-extend-ski.md`, `docs/SEO_CONTENT_PLAN.md` §4 piece 6 (done as an extension, TASK-109), and in `STATUS.md` the blog line (`koncowki-nazwisk`'s -ski section extended; `skad-wziely-sie-nazwiska-w-polsce` marked live since #123), the "Search and editorial content" line (next: piece 7, "Nazwiska odmiejscowe: kiedy nazwisko naprawdę pochodzi od miejsca?", queued) and "Last rewritten". `docs/CODEMAP.md` is unchanged: no structure changed.

## New claims and where they were read (2026-10-04)

- **IJP PAN, "O słowniku"** (`nazwiska.ijppan.pl/info/oslowniku`, fetched with `curl`, tags stripped):
  - "suf. -ski wskazywał pierwotnie na pochodzenie z danej miejscowości lub jej posiadanie" (the original meaning).
  - "Wśród nazwisk na -ski znaczący procent stanowią – wbrew pozorom – nazwiska odapelatywne, utworzone (już od XVI w.) na wzór nazwisk odmiejscowych, już wtedy uchodzących za modelowe (tzn. „lepsze”)".
  - "Możliwe też jest podwójne pochodzenie takich nazwisk … (np. Lenartowski, które może pochodzić od n. m. Lenartowice lub od nazwiska Lenart)".
- **Culture.pl, "A Foreigner's Guide to Polish Surnames"** (fetched with `curl`): -ski "originally used to denote topographic location or possessive relation"; the oldest such names "started to spread in Poland around the 13th century"; Tarnowski from Tarnów, Brzeziński from Brzezie; originally names of the nobility, who were landowners; "Around the turn of 16th century, the -ski names started to be adopted by the bourgeoisie along with the peasants"; the suffix "loses its original toponymic or possessive sense, and becomes the most productive Polish name suffix (and pretty much neutral in meaning)"; Ryba to Rybiński, Kaczmarek to Kaczmarski. Its claims about -ski indicating Polish origin abroad are not used (ADR-0031 §3.5).
- **Zofia Kaleta (1997), through Ladislav Zgusta's review, *Names* 46(4), 1998, pp. 282–284** (PDF `ans-names.pitt.edu/ans/article/download/1533/1532`, read with `pdftotext`):
  - p. 282–283: surnames from place names "either by the adjectival masc. ending -ski (fem. -ska) or by a prepositional phrase with Pol. z … 'from'"; the context "nobilis Nicolaus Zubrski, heres de Zubrza" shows "the functional identity of the -ski name and the (Lat.) de …, (Pol.) z … attributive phrase".
  - p. 283–284: "only the surname formation with -ski was really desirable and worthy of a nobleman, even though there were, all told, basically eight ways of forming a surname"; "the value of the -ski names was enhanced when Lithuanian and other (particularly Ruthenian) nobility … came to accept as their own the stereotype of the -ski names' special value"; "the esteem for the -ski names was strong even between the two World Wars, but … after WW II, these names came to be valued just the same as any other ones". Zgusta's own guess at the cause is not used. Kaleta's book itself was not read.
- **Ewa Wolnicz-Pawłowska, *Prace Językoznawcze* 1, 1999, pp. 128–137** (PDF from `bazhum.muzhp.pl`, read with `pdftotext`):
  - p. 132: nobility mainly from owned estates (Zamojscy, Koniecpolscy, Tarnowscy), townspeople and peasants patronymic and nickname names; Skowron (1576) later Skowroński; Czajka changed his name to Czajkowski; "Przykładów takich, zwłaszcza wśród drobnej szlachty, było bardzo wiele"; masters gave servants -ski names, quoting Sz. Starowolski, *Reformacja obyczajów polskich* (footnote 9): a nobleman dresses a peasant as his servant "i nazwie go Kijakowskim, Wojtkowskim …"; quoting Nekanda-Trepka's *Liber chamorum* (footnote 10): "… Piotrowskich, Dąbrowskich, Ostrowskich, Jakubowskich etc., najwięcej od imion sobie przezwiska chłopscy synowie biorą"; "Samowolne zmiany nazwiska nie mogły spotkać się z sankcją prawną".
  - p. 133: "liczne nazwiska współczesne na -ski, dla których nie sposób znaleźć motywacji odmiejscowej".
  - Starowolski's first name, Szymon, is expanded from the footnote's "Sz." and was not checked in a separate source.
- **Krystyna Kowalik, "Na marginesie słowotwórstwa przymiotników od nazw miejscowości w języku polskim", *Onomastica* 61(2), 2017, pp. 105–116** (PDF from `onomastica.ijp.pan.pl`, article 173, read with `pdftotext`; pages from the article page's `citation_firstpage`/`citation_lastpage`):
  - pp. 106–107: -cki after stems ending in -c, -ć, -k, -t, -dzki after -d, -dz, -dź (after Łaziński's dictionary); "wygłos -cki, -dzki … można uznać … za kontekstowe realizacje sufiksu -ski".
  - pp. 110–111: Łańcut — łańcucki, Biecz — biecki, Świątniki — świątnicki; Tarnogród — tarnogrodzki, Sieradz — sieradzki.
- **Not from a cited source (the post's inferences or plain language facts):** that -ski forms adjectives as in "polski", "miejski"; that a surname in -cki or -dzki "means nothing different" from one in -ski (Kowalik writes about adjectives from place names, the post applies it to surnames of that form); "the same surname could arise in different families"; "only records show which social class your ancestors belonged to"; the FAQ answers, which summarise the section; "Kowalska, Nowicka, Zawadzka" as examples of the feminine form.
- **Earlier posts restated, not re-sourced:** the feminine forms (`kowalski-czy-kowalska`); the history of surnames (`skad-wziely-sie-nazwiska-w-polsce`).

## Verified

From the repository root, on `366550a` with this change:

- **`pnpm install --frozen-lockfile`:** not run; `node_modules` was already present.
- **`pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build`:** exit 0.
  - `format:check`: "All matched files use Prettier code style!"
  - `check:ids`: "check-unique-ids: every task, ADR, migration and decision number is used once".
  - `apps/web` ran 77 test files with 820 tests passing.
  - The build printed `blog: 22 posts checked, 22 with a feature image`.
- **Production server** (`SITE_ORIGIN=https://name-atlas.pl pnpm --filter web start -p 3100`, stopped afterwards):
  - `/pl/blog/koncowki-nazwisk` and `/en/blog/koncowki-nazwisk` answered 200, with titles "Końcówki nazwisk: co znaczą -ski, -wicz, -ak, -czyk i -uk — Name Atlas" and "Polish surname endings: what -ski, -wicz, -ak and -uk mean — Name Atlas", canonical addresses `https://name-atlas.pl/pl/blog/koncowki-nazwisk` and `…/en/blog/koncowki-nazwisk`, and `hrefLang` `pl` and `en`.
  - Each renders the new `h2` and its six `h3` subsections, the three new FAQ headings, one `blog-faq` section, one `blog-sources` section with the Kowalik link, one `blog-cta` card with one form, and no literal asterisk in the text.
  - `/pl` and `/en` of `skad-wziely-sie-nazwiska-w-polsce`, `kowalski-czy-kowalska` and `genealogia`, `/` and `/?lang=en` answered 200.
- **External links** (curl, 2026-10-04), each 200: the Wolnicz-Pawłowska PDF, `nazwiska.ijppan.pl` and its "O słowniku", the Kowalik article page, the Culture.pl article, the Zgusta review page.

## Not verified

- **Józef Bubak's and Kazimierz Rymut's works** were not read in an accessible text this session; nothing from them is newly cited.
- **A scholarly source on -cki/-dzki in surnames specifically:** Kowalik writes about adjectives from place names; the post's application to surnames is its own inference.
- **Overlap with plan piece 18** ("Czy nazwisko zakończone na -ski oznacza szlacheckie pochodzenie?"): the extension now answers that question briefly; whether piece 18 still needs a page of its own is left to its task.
- **The rendered post in a browser or on a phone;** no screenshot was taken.
- **This change on Vercel:** to be checked on its merged pull request.
