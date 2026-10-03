# 2026-10-03 — The blog's third post: how to find Polish ancestors (TASK-074)

Task: `tasks/074-blog-post-finding-ancestors.md`. Branch `claude/magical-brahmagupta-il0fm1`, restarted from `origin/main` @ `619d365` after #80 was merged. The owner asked for "the next blog post" without a topic; the session chose a step-by-step guide to searching for ancestors.

## Changed

- **The post.** `apps/web/src/content/blog/jak-szukac-przodkow.pl.md` and `jak-szukac-przodkow.en.md`, one slug for both. It sets out six steps (papers at home, parish and district, Geneteka, scans on szukajwarchiwach.gov.pl, the civil registry office, an enquiry to an archive), then what Name Atlas does, a FAQ and the sources. It links to both earlier posts and shows no figure from the register.
- **Claims, and where each was read on 2026-10-03:**
  - The home documents to gather, putting them in order as a family tree, and checking with older relatives. Place names can repeat, so establish parish, commune and district. Names and boundaries changed many times. Archives keep records by where and by whom they were made. Most documents are handwritten, and staff can sometimes help. Records are kept by registry offices, parishes, and state and church archives. Source: Archiwum Państwowe w Szczecinie, "Jak rozpocząć poszukiwania genealogiczne?", a PDF stating it is based on the State Archives' page on `archiwa.gov.pl`.
  - "Almost everyone… says: I know nothing". Szukajwarchiwach as a place to find much yourself. Sending an enquiry to a specific archive. Consultants in the state archives. Source: interview with Magdalena Masłowska (Archiwum Państwowe w Warszawie), dzieje.pl, 7 April 2020. She gave the number of archives as 33; the post does not repeat it.
  - Geneteka's result columns (Rok, Akt, Imię, Nazwisko, Imię ojca, Imię matki, Nazwisko matki, Parafia, Miejscowość, Uwagi): read from the table headers of a Geneteka search page fetched in the session.
  - Szukajwarchiwach run by the National Digital Archive, with free scans: as checked for the first post.
  - From 1 January 1868, Catholic civil registration books in the Kingdom of Poland kept in Russian and Polish, and other faiths' in Russian only; some entries in Latin. Source: Piotr Szewczyński, *Archiwa, Biblioteki i Muzea Kościelne* 94 (2010), quoting the Organizing Committee's decree of 10/22 November 1867 (note 8) and noting extracts in Latin.
  - 100 years for birth records and 80 for marriage and death records at the civil registry office, counted from the end of the year, then transfer to the state archive within two years (art. 28). Who receives a copy, including ascendants, descendants and siblings (art. 45). Source: the Act of 28 November 2014, Prawo o aktach stanu cywilnego, as published (Dz.U. 2014 poz. 1741), read from `eli.gov.pl`. Later amendments to these two articles were not checked.
  - Not from a cited source: the practical advice (search name variants, start with dates and numbers in a foreign-language record, compare parents' names), "a grandfather's birth record from the 1930s will usually still be at the registry office" (arithmetic from art. 28), and that copies and commissioned searches may cost money (the post names no fee).
- `STATUS.md`: the blog line, the Deployed line and "Last rewritten". After #82 (the landing preview JPEG) reached `main`, this branch merged `origin/main` @ `561506d`; the merge conflicted only on "Last rewritten", kept as this change's. The Deployed line names #82's production deployment, `dpl_Dz5qhTMoDLQFuFmdP5rTYHUeyjRb` (READY).

## Verified

From the repository root:

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`, `pnpm build`: each exit 0. `apps/web` ran 53 files with 581 tests passing.
- The trace of `/pl/blog/[slug]` lists all six post files and `README.md`.
- Local production server (`SITE_ORIGIN=https://name-atlas.pl`):
  - `/pl/blog/jak-szukac-przodkow` and `/en/blog/jak-szukac-przodkow` answered 200.
  - The Polish post has its title, description, canonical address, `pl`/`en` alternates, nine `h2` and five `h3`.
  - Its links to `/pl/blog/genealogia`, `/pl/blog/koncowki-nazwisk` and their English counterparts answered 200.
  - Both indexes list three posts.
- A headless Chromium screenshot at 1280 px shows the post in the site's shell.
- Production for #80: `dpl_6oLJdjs52N2vzPtAjyRV8bwC2Cfv` READY for `619d365`. The second post is live on `https://name-atlas.pl`, written up on #80.
- Source links in the post answered 200 from the session: the Szczecin PDF, dzieje.pl, `eli.gov.pl`, the Szewczyński PDF on `cejsh.icm.edu.pl`, Geneteka and szukajwarchiwach.

## Not verified

- This change on Vercel: checked on its merged pull request.
- Whether articles 28 and 45 have been amended since 2014: the post cites the act as published.
