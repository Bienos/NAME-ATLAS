# 2026-10-03 — The blog's sixth post: how to check where a surname comes from (TASK-086)

Task: `tasks/086-blog-post-surname-origin.md`. Branch `claude/magical-brahmagupta-il0fm1`, restarted from `origin/main` @ `d2c51f4` after #86 was merged. Before the first commit it was moved onto `ce9b4ac` (#88). After the first commit (`f9cd8d1`) the owner asked "why its not educating how to do it in [Name Atlas]". The post was rewritten to lead with a walkthrough of Name Atlas, and the branch was rebased onto `6e61716` (#89). That rebase conflicted only in `STATUS.md`: main's lines were kept and this change's three edits reapplied. Before the pull request, the two commits were squashed into one and rebased onto `08516bd` (#92). #90 (TASK-079, `historia-genealogii`, from a parallel session) had reached `main` as the blog's fourth post, so this one is the fifth. The rebase conflicted in three files. In `build-blog-images.ts` and the images README, both scenes and both rows were kept. In `STATUS.md`, main's lines were kept and this change's edits were reapplied. #91 (TASK-083) then reached `main`, and a last rebase onto `53ae446` conflicted only in `STATUS.md`, resolved the same way. While `verify` ran, #94 reached `main` as TASK-082, "the blog's fifth post" (`imie-i-nazwisko-ciekawostki`), from another parallel session. This task, written as TASK-082, was renumbered to TASK-086 (084 and 085 were taken on remote branches and in #95) and is the sixth post. A rebase onto `1d620d2` conflicted in the same three files and was resolved the same way, keeping every scene and row. The owner asked for "the next blog post" with no topic. ADR-0031 §4 takes the topic from `docs/SEO_CONTENT_PLAN.md` §4 in order: piece 1, brief §5.1, marked queued and not an extension.

## Changed

- **Posts:** `apps/web/src/content/blog/jak-sprawdzic-pochodzenie-nazwiska.pl.md` and `.en.md`.
  - **Title:** "Jak sprawdzić pochodzenie nazwiska? Poradnik krok po kroku z Name Atlas" / "How to check where a Polish surname comes from: a step-by-step guide with Name Atlas". A no-break space keeps "z" with "Name Atlas".
  - **Opening:** IJP PAN's letters about surnames and what its replies contained, then which of those answers Name Atlas gives.
  - **Two questions:** a surname's origin (language) versus a family's origin (records).
  - **Steps 1–7 on Name Atlas,** under the surname page's own chapter headings. Each step says what the chapter shows and how to read it (what it does not tell).
    1. The search, the cards, "Cała strona" and "Skąd to wiemy?".
    2. The two counts, never summed.
    3. The place on the list, "1 na X", the neighbours and the other grammatical form.
    4. The voivodeship map of permanent registered residence.
    5. The change since 2019.
    6. The meaning, only with a scholarly source and a certainty word; Buryan 1933 today; some surnames only.
    7. Old print from Polona.
  - **After the steps:** the comparison page, then "Sprawdź swoje nazwisko w Name Atlas".
  - **"Co dalej: źródła poza Name Atlas":**
    - IJP PAN's *Internetowy słownik nazwisk w Polsce*.
    - Rymut's *Nazwiska Polaków*.
    - SSNO and *Antroponimia Polski*.
    - The PESEL lists.
    - Polona.
    - Geneteka and Szukajwarchiwach.
  - **Closing sections:** what a surname alone cannot tell, five FAQs (the first: how to check it on Name Atlas), and ten sources.
  - **No register figure:** no count, rank, rarity or meaning is quoted. The one number about a source is the dictionary's own size.
- **Image:** `apps/web/public/images/blog/jak-sprawdzic-pochodzenie-nazwiska.webp`, 1600 × 840, 19,178 bytes, SHA-256 `600a3576…44c6ff`.
  - **Picture:** layers of ground under a dusk horizon, with a dotted line sounding down through them, lit at seven layers.
  - **Script:** drawn by a new scene, `jakSprawdzic`, in `apps/web/scripts/build-blog-images.ts`. `scene` gained an optional `front` argument, drawn over the ground.
  - **Provenance:** a row in `public/images/blog/README.md`.
- **Records and docs:**
  - `docs/SEO_CONTENT_PLAN.md` §4 piece 1 is marked live.
  - In `STATUS.md`: "Last rewritten", the Deployed line (now `53ae446`, #91; #94 has no production deployment), the blog line (six posts) and the plan line (next: piece 2).
  - `docs/CODEMAP.md` is unchanged, because no new folder was added.

## Claims and where they were read (2026-10-03)

- **Urszula Bijak, "Onomastyka stosowana",** *Polonica* 43 (2023), pp. 219–228: the article's PDF was read, and the page's citation metadata gave the volume, pages and date 2023/12/29. Claims from it:
  - People have written to IJP PAN with surname questions since the workshop began. Taszycki founded it in 1953.
  - The replies' linguistic analysis covered the oldest records, etymology, phonetic and morphological changes, and current frequency and geography.
  - Correspondents often expected genealogical research.
  - The *Internetowy słownik* was released in 2021. It holds 30,000 high-frequency surnames, not all of them.
  - Readers most often write about a missing surname, and they do not read the introduction.
- **`nazwiska.ijp.pan.pl` and its "O słowniku" page,** read in full. The page is headed version 2.0 (2025–2030). Claims from it:
  - About 30,000 entries, free and open, with frequency from the 2014 PESEL register.
  - Each entry gives counts and rank; all 16 voivodeships, the top 16 counties and the top 16 municipalities; historical records with date and source; possible etymologies; variants and women's forms.
  - Identically sounding surnames arose at different times with different motivation.
  - Kusz: from a short form of Jakub, or from *kusz*, "kubek, kufel".
  - Word meanings shift over time (Krupnik).
  - A significant share of -ski surnames were formed from appellatives from the 16th century onwards, on the model of place-name surnames seen as "better".
  - The variant examples: Gemba, Kobiella, Jagla, and Keler, Kieler, Kielar, Kilar from the German Keller.
  - SNW gives outdated 1990 PESEL data, and Rymut's *Nazwiska Polaków* covers necessarily few surnames.
  - SSNO: records from the 12th to the 15th century, vols. I–VI Wrocław 1965–1983, VII supplement 1984–1987.
  - AntrP: vols. I–VI, 2007–2016.
- **SNW's volumes and years** (1–10, 1992–1994, IJP PAN, Kraków): Biblioteka Narodowa's records, already in `docs/sources/rymut-1990.md`.
- **AntrP's publisher** (IJP PAN, Kraków): the title page of the volume IV PDF on rcin.org.pl, which answered 200.
- **The PESEL dataset** (`api.dane.gov.pl/1.4/datasets/1681`, fetched):
  - Its title and description: living people, the "nazwisko aktualne" field, single-occurrence surnames and the dead excluded, CC0 1.0.
  - Its newest resources: men's and women's lists, and lists "wg województwa zameldowania na pobyt stały", all dated 2026-01-20.
  - That a single bearer in a voivodeship does not show: the per-cell floor of 2 in `docs/sources/pesel-regional.md` item 18 (verified from the bytes) and ADR-0031 §3.2.
- **Polona's full-text search** over the scans' recognised text: `docs/sources/polona.md` (TASK-054).
- **Geneteka and Szukajwarchiwach:** as described in TASK-074's post, linked from this one.
- **Every statement about Name Atlas** was checked on 2026-10-03 against the production pages `/pl/nazwisko/nowak`, `/pl/nazwisko/zaremba` and `/pl/nazwisko/kowalski`, and against `apps/web/src/lib/messages.ts`. What was read:
  - The chapter headings, as quoted in both languages.
  - The counts lede: two lists, never summed.
  - "Nazwiska występujące raz nie są publikowane; brak w zbiorze nie oznacza zera."
  - The rarity lede ("1 na X"), the neighbours note, and the other-form note ("Nie mówi nic o pokrewieństwie").
  - The map lede (zameldowanie na pobyt stały).
  - The change lede (each edition, "co się zmieniło — nie dlaczego").
  - The meaning lede ("Nie zgadujemy").
  - On `nowak`: a Buryan 1933 meaning with "Możliwe". On `zaremba`: the no-meaning sentence.
  - The archive chapter: grouped by date and place of publication, public-domain example pages linking to Polona, the word-not-people caveat, and the not-searched sentence.
  - "Skąd to wiemy?" with "Źródła na tej stronie".
  - The deck buttons "Zobacz karty" and "Cała strona".
  - The pitch "za darmo · bez konta".
  - `/?surname=Zaremba` answering 307 to `/pl/nazwisko/zaremba?view=cards`.
  - `/pl/porownaj` and `/en/compare` answering 200.
  - Buryan as today's only meaning source, with only some surnames: `STATUS.md` (25 in production; #89's 1,304 not yet loaded).
  - The bearers chapter is not mentioned: production says "Tego nazwiska jeszcze nie sprawdziliśmy w Wikidanych" for both surnames.

## Verified

**Final, on `1d620d2` (#94) as TASK-086,** from the repository root:

- **`pnpm install --frozen-lockfile`:** exit 0.
- **The six checks:** `pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build` exited 0.
  - `apps/web` ran 63 files with 673 tests passing.
  - The build printed `blog: 12 posts checked, 12 with a feature image`.
  - `check:ids` reported every number used once.
- **The image script:** all six images came out byte-identical to the committed files.
- **Production server on port 3100:**
  - Both posts answered 200.
  - Each has one `blog-faq`, one `blog-sources`, 11 plain sections, one `blog-cta`, one `id="surname"` and five "more posts" cards.
  - Both indexes showed six cards.

**On `08516bd` (#92), after the squash and rebase,** from the repository root:

- **`pnpm install --frozen-lockfile`:** exit 0.
- **The six checks:** `pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build` exited 0.
  - `apps/web` ran 63 files with 673 tests passing.
  - The build printed `blog: 10 posts checked, 10 with a feature image`.
  - `check:ids` reported every number used once.
- **`pnpm exec tsx scripts/build-blog-images.ts`:** all five images came out byte-identical to the committed files (`sha256sum` before and after: no difference).
- **Production server on port 3100** (`SITE_ORIGIN=https://name-atlas.pl`):
  - Both posts answered 200.
  - Each has 11 plain sections, one `blog-faq` and one `blog-sources`.
  - Each has one `blog-cta`, one `id="surname"`, its own `og:image`, and four "more posts" cards.
  - Both indexes showed five cards.
  - `/?lang=en`, `/pl/porownaj`, `/en/compare`, `/pl/blog/historia-genealogii` and the image answered 200.

**The rewrite** (Name Atlas first), on `6e61716` with this change, from the repository root:

- **`pnpm install --frozen-lockfile`:** exit 0.
- **The six checks:** `pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build` exited 0.
  - `apps/web` ran 62 files with 662 tests passing.
  - The build printed `blog: 8 posts checked, 8 with a feature image`.
  - `check:ids` reported every number used once.
- **Production server on port 3100** (`SITE_ORIGIN=https://name-atlas.pl`):
  - Both new posts answered 200 with the new titles.
  - Sections: 11 plain, one `blog-faq` and one `blog-sources`.
  - One `blog-cta`, one `id="surname"`, the hero, no literal asterisk.
  - Every internal link answered 200: `/`, `/pl/porownaj`, `/en/compare`, and `/pl` and `/en` of `jak-szukac-przodkow` and `koncowki-nazwisk`.
- **Screenshots** (headless Chromium): the Polish post at 1280 px and the English one at 500 px. The steps read in order, under the hero.
- **The English links:** the English post's two home links first pointed at `/`, the Polish home page. They were changed to `/?lang=en`, as the other English posts use.
- **Polish title:** a no-break space now keeps "z" with "Name Atlas".
- **After those two edits:** `pnpm format:check` exited 0, `scripts/check-blog-content.ts` reported 8 posts with 8 images, and `vitest run src/lib/blog.test.ts` passed 31 tests.

**The first draft** (`f9cd8d1`), on `ce9b4ac`:

- **`pnpm install --frozen-lockfile`:** exit 0.
- **The six checks:** `pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build` exited 0.
  - `apps/web` ran 62 files with 662 tests passing.
  - The build printed `blog: 8 posts checked, 8 with a feature image`.
  - `check:ids` reported every number used once.
- **After the titles' no-break space:**
  - `pnpm format:check`: exit 0.
  - `scripts/check-blog-content.ts`: 8 posts, 8 with an image.
  - `vitest run src/lib/blog.test.ts`: 31 tests passed.
- **`pnpm exec tsx scripts/build-blog-images.ts`:**
  - The three earlier images came out with the SHA-256 values in the README.
  - The new image came out identical on a second run.
- **Production server on port 3100** (`SITE_ORIGIN=https://name-atlas.pl`):
  - **Status 200** for both blog indexes, both new posts, and `/pl` and `/en` of `jak-szukac-przodkow` and `koncowki-nazwisk`.
  - **The image:** answered 200 `image/webp` directly and 200 `image/jpeg` through `/_next/image` (curl sends no `Accept: image/webp`).
  - **Each new post's head:** title, canonical address, `hreflang` `pl` and `en`, and `og:image` `https://name-atlas.pl/images/blog/jak-sprawdzic-pochodzenie-nazwiska.webp`.
  - **Each new post's body:**
    - Sections: 11 plain, one `blog-faq` and one `blog-sources`.
    - One `blog-cta` and one `id="surname"`.
    - `blog-more` and the hero.
    - Links to the three earlier posts and to the other language.
    - No literal asterisk.
  - **Indexes:** each shows four cards.
- **Headless Chromium screenshots** of the post at 1280 and 500 px and of `/pl/blog` at 1280 px:
  - The hero sits under the title.
  - The index shows four cards in a three-column grid.
  - At 500 px the post reads in one column.
  - Before the no-break space, the title broke after "7"; afterwards "7 źródeł" starts a line.
- **External links** (curl, 2026-10-03), each 200: `nazwiska.ijp.pan.pl`, its `/info/oslowniku`, the *Polonica* article page, `dane.gov.pl/pl/dataset/1681,…`, `polona.pl`, `geneteka.genealodzy.pl` and `www.szukajwarchiwach.gov.pl`.

## Not verified

- **`bibliotekacyfrowa.pl/en/dlibra/publication/28106`** (Rymut's *Nazwiska Polaków*) timed out from the session, through curl and WebFetch alike. It did the same for the first two posts. A web search lists that address as "Nazwiska Polaków", with volumes 28107 (A–K) and 28108 (L–Ż).
- **SSNO's and AntrP's contents,** beyond the dictionary page's description and the AntrP volume IV title page. They are cited without a link.
- **This change on Vercel:** to be checked on its merged pull request.
- **Rendering on a real phone,** and how a sharing crawler shows the image.
