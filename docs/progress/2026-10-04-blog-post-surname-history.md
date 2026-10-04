# 2026-10-04 — The blog's eleventh post: where Polish surnames came from (TASK-105)

Task: `tasks/105-blog-post-surname-history.md`. Branch `claude/blog-piece-5`, on `origin/main` @ `71a0a70` (#115); `git merge-base --is-ancestor origin/main HEAD` passed before the first edit. The owner said "ok" to the next editorial piece. ADR-0031 §4 takes the topic from `docs/SEO_CONTENT_PLAN.md` §4 in order: pieces 1–4 are live, so this is piece 5, marked "extend" against `genealogia`'s history section. The session decided, and the owner agreed, on a new pillar that `genealogia` links to (recorded in the task file).

**Number.** The session was asked for TASK-104. Open pull requests on 2026-10-04 (`gh api repos/Bienos/NAME-ATLAS/pulls?state=open`): #120 (`tasks/104-surname-pdf.md`), #119 (`tasks/104-offer-five-tiers.md`, ADR-0037), #117 (`tasks/103-end-to-end-tests.md`), #116 (no task number) and #108 (TASK-099, ADR-0036). 104 is taken twice, so this task is 105 (`AGENTS.md` §11). #119 and #120 also share 104 with each other; that is theirs to resolve.

## Changed

- **Posts:** `apps/web/src/content/blog/skad-wziely-sie-nazwiska-w-polsce.pl.md` and `.en.md`, dated 2026-10-04.
  - **Title:** "Skąd wzięły się nazwiska w Polsce? Od średniowiecza do PESEL" / "Where did Polish surnames come from? From the Middle Ages to PESEL".
  - **Sections:** one name at first; bynames; the nobility and names from estates; the fashion for -ski; townspeople and peasants; the partitions and civil registration; surnames in law; PESEL; what this means for your surname; what Name Atlas shows; "Sprawdź swoje nazwisko w Name Atlas"; five FAQs; nine sources.
  - **Internal links:** `imie-i-nazwisko-ciekawostki`, `koncowki-nazwisk`, `historia-genealogii`, `jak-szukac-przodkow`, `kowalski-czy-kowalska`, `co-mozna-wyczytac-z-nazwiska`, `genealogia` and the home page (`/`, `/?lang=en`). Marriage surnames are only linked to `kowalski-czy-kowalska`, not repeated.
  - **No register figure:** no count, rank or share of any surname. The numbers are dates, act numbers, "at most two parts" (1956 Act, art. 6) and the "over 2,500" cases in *Liber chamorum* (Wolnicz-Pawłowska).
- **`genealogia`:** one sentence with a link to the new post at the end of its history section, in `genealogia.pl.md` and `genealogia.en.md`. Nothing else in it changed.
- **Image:** `apps/web/public/images/blog/skad-wziely-sie-nazwiska-w-polsce.webp`, 1600 × 840, 13,306 bytes, SHA-256 `edb07c89440f9648c2cea092df109b6b10cdc9bfa4ff3c9298c109836109252b`.
  - **Picture:** the ground under a dusk sky cut into six curved layers, each with a row of lights, brightest in the top layer and faintest in the deepest. No map, text or face.
  - **Script:** a new scene, `skadNazwiska` (seed 104), in `apps/web/scripts/build-blog-images.ts`, drawn through `scene`'s `front` argument. Nothing else in the script changed.
  - **Provenance:** a row in `apps/web/public/images/blog/README.md`.
- **Records and docs:**
  - `docs/SEO_CONTENT_PLAN.md` §4 piece 5 is marked live with its slug (TASK-105), noting that `genealogia` keeps its short section and links to it.
  - In `STATUS.md`: "Last rewritten"; the blog line (eleven posts; `mapa-nazwiska-a-mapa-rodziny` marked live since #114; `genealogia` links to the pillar; this post added); the "Search and editorial content" line (piece 5 is TASK-105; next: piece 6, "Co oznacza końcówka -ski w polskim nazwisku?", marked in the plan as an extension of `koncowki-nazwisk`, with the original -ski statistic left to data study §7). No other line was changed.
  - `docs/CODEMAP.md` is unchanged, because no new folder was added.

## Claims and where they were read (2026-10-04)

- **Ewa Wolnicz-Pawłowska, "O nazwiskach polskich…", *Prace Językoznawcze* 1, 1999, pp. 128–137** (PDF from `bazhum.muzhp.pl`, fetched with `curl`, read with `pdftotext`):
  - p. 129: fixed surnames arose first among the nobility, then townspeople, then peasants; "Niektóre nazwiska chłopskie powstały nawet dopiero w XIX w., podobnie jak nazwiska np. żydowskie"; in the 19th century townspeople and peasants could carry different forms of one surname, "Szulowski, Sulowski, Siulowski"; few people, small villages and towns, one name long sufficient.
  - pp. 129–130: the Bull of Gniezno of 1136, one name per person; compound names (Chwalibor, Mirosław), their short forms (Miłosz, Radosz) and names equal to common words (Broda, Kwiatek, Kobyłka); context of the document identified the person.
  - pp. 130–131: after the Council of Trent (1545–1563) children were given saints' names and Slavic names moved from first names into surnames; from the 13th century descriptions massed beside names ("Clemens filius Marcii, Niegoslaw Janowic, Sulisław Gamba", "przezywają Gębą"); the more important the person, the more descriptions; descriptions became one word ("Nawój Morawica albo Nawój Morawicki", "Jan Sulisławic"); the four groups with Baranowski "z Baranowa", Janiak, Piotrowczyk, Kopyto, Trąba, Kowal, Tkacz.
  - p. 132: stabilisation from the second half of the 15th century, the name covering the whole family; nobility from estates (Zamojscy, Koniecpolscy, Tarnowscy), townspeople and peasants patronymic and nickname names; in the 16th century the -ski model: Skowron (1576) later Skowroński, Czajka to Czajkowski, many such cases among the petty nobility; peasants' sons taking -ski names (Starowolski quoted); "Samowolne zmiany nazwiska nie mogły spotkać się z sankcją prawną"; Nekanda-Trepka's *Liber chamorum*, "Księga chamów, tj. nieszlachty", published after the Second World War.
  - p. 133: "ponad 2500 takich przykładów"; many modern -ski surnames have no place-name motivation.
  - p. 135: under Ukrainian and Belarusian influence -ic, -owic became -icz, -owicz; old form in Staszic; Mickiewicz (Mićko < Mikołaj) and Sienkiewicz (Sieńko < Symeon) of Belarusian origin.
- **Zofia Kaleta (1997), through Ladislav Zgusta's review, *Names* 46(4), 1998, pp. 282–284** (PDF from `ans-names.pitt.edu`, read with `pdftotext`): surnames began to serve as family names "mainly in the fourteenth century, primarily among the emerging aristocrats, and later among the burghers"; "the legal necessity to have a hereditary family name arose in the different Polish territories at the end of the eighteenth century by legislation in the Hapsburg monarchy, in Prussia, and in Russia". Kaleta's book itself was not read. Zgusta's own view that the Council of Trent legalised hereditary names is not used.
- **IJP PAN, "O słowniku"** (`nazwiska.ijppan.pl/info/oslowniku`, fetched with `curl`): "Wśród nazwisk na -ski znaczący procent stanowią – wbrew pozorom – nazwiska odapelatywne, utworzone (już od XVI w.) na wzór nazwisk odmiejscowych, już wtedy uchodzących za modelowe (tzn. „lepsze”)".
- **Stanisław Grodziski, *Czasopismo Prawno-Historyczne* 57(2), 2005** (PDF from `pressto.amu.edu.pl`, article 41021, read with `pdftotext`): the decree of 27 January 1808 introducing the Napoleonic Code "od dnia 1 maja roku bieżącego 1808"; "wobec braku urzędników stanu cywilnego obowiązkami w tym zakresie obciążono proboszczów". Marek Krzymkowski (*Z Dziejów Prawa* 13, 2020) also states the formal introduction from 1 May 1808; he is not cited in the post.
- **Act of 15 November 1956** (`eli.gov.pl/api/acts/DU/1956/254/text/U/D19560254Lj.pdf`, the Sejm's text prepared from the consolidated Dz.U. 2005 nr 233 poz. 1992 and Dz.U. 2007 nr 21 poz. 125): art. 2 ust. 2 (ośmieszające albo nielicujące z godnością człowieka; o brzmieniu niepolskim; posiadające formę imienia); art. 6 ust. 1 (at most two parts). The 1956 original wording was not read, so the post says "in the wording in force until 2008".
- **Act of 17 October 2008** (`api.sejm.gov.pl/eli/acts/DU/2008/1414/text.pdf`): art. 4 ust. 1 (important reasons, including the four listed; no non-Polish sound); art. 12 ust. 1 (the head of the civil registry office decides); art. 17 (repeals the 1956 Act).
- **Sylwia Czubkowska, Forsal.pl, 3 February 2012** (fetched with `curl`): June 1970 decision of the government's presidium to prepare the concept of PESEL; "PESEL, którego start już mocą ustawy z 1974 roku ustalono na rok 1979"; the pilot's new identity cards with numbers for Wola residents at the end of the 1970s; numbers for all citizens by 1984.
- **Ministry of Digital Affairs, "Rejestr PESEL"** (`gov.pl/web/cyfryzacja/rejestr-pesel1`, fetched with `curl`): "najważniejszym w Państwie rejestrem zawierającym dane osobowo-adresowe"; the data held include "nazwisko i imię (imiona); nazwisko rodowe; imiona i nazwiska rodowe rodziców".
- **The PESEL dataset** (`api.dane.gov.pl/1.4/datasets/1681`, fetched with `curl`): title "Nazwiska występujące w rejestrze PESEL"; living persons' surnames "według pola nazwisko aktualne"; "Nazwiska z pojedynczą liczbą wystąpień oraz dane dot. osób zmarłych nie zostały uwzględnione w zestawieniu."
- **Every statement about Name Atlas** was checked against production (`/pl/nazwisko/nowak` and `/en/surname/nowak`, each 200, each showing its four chapter headings) and `apps/web/src/lib/messages.ts`: `chapterCountTitle` and `chapterCountLede` (two lists, shown separately, never summed), `chapterMeaningTitle` and `chapterMeaningLede` (a meaning only with a scholarly work), `chapterArchiveTitle` and `chapterArchiveLede` (Polona results for the word, and from which years).
- **Earlier posts restated, not re-sourced:** that parishes recorded baptisms, marriages and deaths before civil registration (`historia-genealogii`, linked in that FAQ answer).
- **Not from a cited source:** the framing sentences; the English glosses of Polish words (beard, little flower, little mare, mouth, hoof, trumpet, smith, weaver); "from then on a surname was a matter of law, not only of custom", "a byname did not have to pass to the children and could change" (the latter also in `genealogia`, from Kaleta), "an ancestor's surname may be spelled several ways, and in the oldest records may be missing", and the section "what this means for your surname", which are the post's inferences from the sources above.

## Verified

From the repository root, on `71a0a70` with this change:

- **`pnpm install --frozen-lockfile`:** not run; `node_modules` was already present.
- **`pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build`:** exit 0.
  - `format:check`: "All matched files use Prettier code style!"
  - `check:ids`: "every task, ADR, migration and decision number is used once".
  - `apps/web` ran 77 files with 820 tests passing.
  - The build printed `blog: 22 posts checked, 22 with a feature image`.
- **The image script** (`pnpm exec tsx scripts/build-blog-images.ts <scratch dir>` in `apps/web`), run three times into scratch folders: the ten earlier images had on every run the SHA-256 values of the committed files, and the new image had the same SHA-256 on all three runs.
- **Production server** (`SITE_ORIGIN=https://name-atlas.pl pnpm --filter web start -p 3100`, stopped afterwards):
  - `/pl/blog/skad-wziely-sie-nazwiska-w-polsce` and `/en/blog/skad-wziely-sie-nazwiska-w-polsce` answered 200, each with its title, canonical address on `https://name-atlas.pl`, `og:image` `https://name-atlas.pl/images/blog/skad-wziely-sie-nazwiska-w-polsce.webp` and `hreflang` `pl` and `en`.
  - Each has one `blog-faq` section, one `blog-sources` section, one `blog-cta` card with one form, no literal asterisk in the text, and a link to the other language.
  - `/pl/blog/genealogia` and `/en/blog/genealogia` answered 200 and each carries the new sentence's link to the post in its language.
  - `/pl/blog` and `/en/blog` each linked eleven distinct posts, the new one among them.
  - The image answered 200 `image/webp`, 13,306 bytes.
  - `/`, `/?lang=en`, and `/pl` and `/en` of `imie-i-nazwisko-ciekawostki`, `koncowki-nazwisk`, `historia-genealogii`, `jak-szukac-przodkow`, `kowalski-czy-kowalska`, `co-mozna-wyczytac-z-nazwiska` and `genealogia` answered 200.
- **External links** (curl, 2026-10-04), each 200: the Wolnicz-Pawłowska PDF, the Zgusta review page, `nazwiska.ijppan.pl` and its "O słowniku", the Grodziski article page, `eli.gov.pl/eli/DU/1956/254/ogl`, `eli.gov.pl/eli/DU/2008/1414/ogl`, the Forsal article, the gov.pl PESEL page, the dane.gov.pl dataset.
- **The image** was looked at once (converted to PNG): layered ground with rows of lights, no map and no text.

## Not verified

- **Encyclopedia PWN** (`encyklopedia.pwn.pl`) returned an unreadable page to both `curl` and WebFetch; nothing from it is used.
- **An official source for PESEL's start:** no gov.pl page giving the year was found. The dates are Forsal's, attributed to it in the post; the 1974 act it mentions was not read.
- **The interwar law on surnames, and the specific Prussian, Austrian and Russian acts:** not found in a readable source this session, so the post states only Kaleta's general finding.
- **Kaleta's book itself:** read only through Zgusta's review, as in `genealogia`.
- **The rendered posts in a browser or on a phone;** no screenshot was taken.
- **This change on Vercel:** to be checked on its merged pull request.
