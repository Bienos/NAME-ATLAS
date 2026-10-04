# 2026-10-04 — The blog's seventh post: what a surname can and cannot tell (TASK-094)

Task: `tasks/094-blog-post-what-a-surname-tells.md`. Branch `claude/blog-piece-2`, on `origin/main` @ `d655a45` (#100); `git merge-base --is-ancestor origin/main HEAD` passed before the first edit. The owner said "go continue" with the next editorial piece. ADR-0031 §4 takes the topic from `docs/SEO_CONTENT_PLAN.md` §4 in order: piece 1 is live (TASK-086), so this is piece 2, brief §5.2, marked queued and not an extension. No pull request was open on 2026-10-04 (`gh api repos/Bienos/NAME-ATLAS/pulls?state=open` returned none), and `pnpm check:ids` passed with 094.

## Changed

- **Posts:** `apps/web/src/content/blog/co-mozna-wyczytac-z-nazwiska.pl.md` and `.en.md`, dated 2026-10-04.
  - **Title:** "Co naprawdę można wyczytać z nazwiska, a czego nie?" / "What can a Polish surname really tell you, and what can't it?".
  - **Opening:** what people want to know about a surname, in the words of IJP PAN's description of its dictionary; the post then goes from the surest knowledge to the least sure.
  - **Six sections on what a surname tells,** each ending on what it does and does not tell: who bears it today; how common it is; where its bearers live; how it is built; what it may come from; when it appears in the sources. Each names the surname page's chapter that shows it, under its own heading.
  - **Closing sections:** what a surname cannot tell (kinship, a family's place, nobility, nationality, one certain meaning); why the records are needed, with links to `jak-szukac-przodkow` and to TASK-086's walkthrough; "Sprawdź swoje nazwisko w Name Atlas"; five FAQs; seven sources.
  - **Internal links:** `koncowki-nazwisk`, `genealogia`, `jak-szukac-przodkow`, `jak-sprawdzic-pochodzenie-nazwiska`, and the home page (`/` in Polish, `/?lang=en` in English).
  - **No register figure:** no count, rank, rarity or meaning is quoted. The only dates are the PESEL lists' and the sources'.
  - **IJP PAN's dictionary** is linked at `nazwiska.ijppan.pl`: on 2026-10-04 `nazwiska.ijp.pan.pl`, which the earlier posts link, answered 301 to it. The earlier posts were not changed.
- **Image:** `apps/web/public/images/blog/co-mozna-wyczytac-z-nazwiska.webp`, 1600 × 840, 10,816 bytes, SHA-256 `b098da89…0746bf`.
  - **Picture:** a small lantern on the ground at dusk; its pool of light shows the stones near it, and those further off fade into the dark.
  - **Script:** a new scene, `coMozna` (seed 94), in `apps/web/scripts/build-blog-images.ts`, drawn through `scene`'s `front` argument. Nothing else in the script changed.
  - **Provenance:** a row in `public/images/blog/README.md`; its origin line now says later scenes were added by each post's own task "the same day or after".
- **Records and docs:**
  - `docs/SEO_CONTENT_PLAN.md` §4 piece 2 is marked live.
  - In `STATUS.md`: "Last rewritten"; the Deployed line (now `d655a45`, #100, read through the deployment API on 2026-10-04); the blog line (seven posts; the fifth and sixth marked live since #94 and #93); the plan line (next: piece 3).
  - `docs/CODEMAP.md` is unchanged, because no new folder was added.

## Claims and where they were read (2026-10-04)

- **IJP PAN, *Internetowy słownik nazwisk w Polsce*, "O słowniku"** (`nazwiska.ijppan.pl/info/oslowniku`, headed "wersja 2.0 (2025-2030)"), read in full. Claims from it:
  - People want to know what their surname "means", when it arose, who the earlier bearers of the same surname were and where they lived (section I).
  - Women's forms in -ska, -cka, -dzka have their own entries because of their own place on the ranking list.
  - Kowalowa: a form from the husband's surname (odmężowska); Kowalówna: from the father's (odojcowska).
  - Grabowszczanka, 1663: an -anka form from a -ski surname, "być może" to tell the wife (Grabowska) from the daughter. The post keeps the "perhaps".
  - Historical records give the quotation, the document's date, the source's abbreviation, volume and page; the oldest (12th–15th century) from SSNO (vols. I–VI, Wrocław 1965–1983; VII supplement 1984–1987); 16th–18th century from AntrP (vols. I–VI, 2007–2016) among others; later ones from regional monographs; wives' and daughters' names are included.
  - The note "brak poświadczeń w dostępnych nam źródłach historycznych" when nothing was found.
  - The most common contemporary surnames: from appellatives, then from place names (mainly -ski), then from given names.
  - Several motivations are given because the appellative could have several meanings; identically sounding surnames arose at different times with different motivations; Krupnik ('rzemieślnik wytwarzający krupy', later 'zupa z krup', latest 'napój alkoholowy z miodu i korzeni').
  - A significant share of -ski surnames are from appellatives, formed from the 16th century on the model of place-name surnames seen as "better"; Lenartowski from Lenartowice or from Lenart.
  - Structure: the suffix is set off from the base (Anton-owicz, Bartk-owiak, Klimcz-ak); -ak patronymic; -ek patronymic or diminutive; -ski originally origin from or ownership of a place, or structural; Jachimczak from Jachimek or from Jachim.
  - Foreign surnames assimilated in several ways: Keler, Kieler, Kielar, Kelar, Kellar, Kilar from the German Keller. The post's sentence that a word's origin does not say who its bearers felt they were is the post's own reading of that, within ADR-0031 §3.5.
- **AntrP's publisher** (IJP PAN, Kraków): as recorded by TASK-086 from the volume IV title page; the dictionary page gives Kraków for every volume.
- **The PESEL dataset** (`api.dane.gov.pl/1.4/datasets/1681`, fetched): title "Nazwiska występujące w rejestrze PESEL"; living people, the "nazwisko aktualne" field, single-occurrence surnames and the dead excluded; the newest resources are the men's and women's lists and the lists "wg województwa zameldowania na pobyt stały", all dated 2026-01-20.
- **That a single bearer in a voivodeship does not show:** `docs/sources/pesel-regional.md` item 18 and ADR-0031 §3.2, as in TASK-086.
- **Moving and changing voivodeship borders:** stated as in TASK-086's post; not given a separate source.
- **Every statement about Name Atlas** was checked on 2026-10-04 against the production pages `/pl/nazwisko/nowak`, `/pl/nazwisko/kowalski` and `/pl/nazwisko/zaremba` (each 200) and `apps/web/src/lib/messages.ts`:
  - The chapter headings, in both languages, as quoted. On all three pages, "Kto znany nosi to nazwisko?" shows Wikidata's people, with "To samo nazwisko nie oznacza pokrewieństwa."
  - The counts lede (two lists, never summed), the rarity lede ("1 na X", the rank from the most common), the neighbours.
  - The map lede and "Zameldowanie na pobyt stały to adres w rejestrze — nie faktyczny adres i nie informacja o korzeniach rodziny."
  - The meaning lede ("Nie zgadujemy"), the certainty words "Prawdopodobne" and "Możliwe" (`assessmentWord`), "Możliwe" shown on `nowak`.
  - The archive lede (how many results for the word, from which years) and the word-not-people caveat.
  - The localities chapter (TASK-090) is not on the production pages and is not mentioned.
- **Geneteka, Szukajwarchiwach, Polona:** described as in TASK-074's and TASK-086's posts.

## Verified

From the repository root, on `d655a45` with this change:

- **`pnpm install --frozen-lockfile`:** exit 0.
- **`pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build`:** exit 0.
  - `check:ids`: "every task, ADR, migration and decision number is used once".
  - `apps/web` ran 68 files with 750 tests passing.
  - The build printed `blog: 14 posts checked, 14 with a feature image`. It also printed Next's Edge Runtime warning about `process.cwd` in Next's own `dynamic-rendering.js`, which this change does not touch.
- **The image script** (`pnpm exec tsx scripts/build-blog-images.ts` in `apps/web`), run three times: after each run the six earlier images had the SHA-256 values they had before the first run, and the new image had the same SHA-256 on all three runs.
- **Production server** (`SITE_ORIGIN=https://name-atlas.pl pnpm --filter web start -p 3100`):
  - `/pl/blog/co-mozna-wyczytac-z-nazwiska` and `/en/blog/co-mozna-wyczytac-z-nazwiska` answered 200, each with its title, canonical address on `https://name-atlas.pl`, `og:image` `https://name-atlas.pl/images/blog/co-mozna-wyczytac-z-nazwiska.webp` and `hreflang` `pl` and `en`.
  - Each has 9 plain sections, one `blog-faq`, one `blog-sources`, one `blog-cta`, one `id="surname"`, `blog-more`, no literal asterisk in the text, and a link to the other language.
  - `/pl/blog` and `/en/blog` each listed seven posts.
  - The image answered 200 `image/webp`, 10,816 bytes.
  - `/`, `/?lang=en`, and `/pl` and `/en` of `koncowki-nazwisk`, `genealogia`, `jak-szukac-przodkow` and `jak-sprawdzic-pochodzenie-nazwiska` answered 200.
- **External links** (curl, 2026-10-04), each 200: `nazwiska.ijppan.pl`, its `/info/oslowniku`, `dane.gov.pl/pl/dataset/1681,…`, `polona.pl`, `geneteka.genealodzy.pl`, `www.szukajwarchiwach.gov.pl`.
- **The image** was looked at once (converted to PNG): the lantern, its pool of light and the dark stones beyond, no text.

## Not verified

- **SSNO's and AntrP's contents,** beyond the dictionary page's description. They are cited without a link, as in TASK-086.
- **The rendered posts in a browser or on a phone;** no screenshot was taken.
- **This change on Vercel:** to be checked on its merged pull request.
