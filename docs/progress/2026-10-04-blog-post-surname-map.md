# 2026-10-04 — The blog's tenth post: a surname's map is not a map of your family (TASK-102)

Task: `tasks/102-blog-post-surname-map.md`. Branch `claude/blog-piece-4`, on `origin/main` @ `16998c8` (#111); `git merge-base --is-ancestor origin/main HEAD` passed before the first edit. The owner said "ok" to the next editorial piece. ADR-0031 §4 takes the topic from `docs/SEO_CONTENT_PLAN.md` §4 in order: pieces 1–3 are live, so this is piece 4, brief §5.4, marked queued and not an extension. Open pull requests on 2026-10-04 (`gh api repos/Bienos/NAME-ATLAS/pulls?state=open`): #108 (TASK-099, ADR-0036), #112 (TASK-100) and #113 (no task number); 102 is free.

## Changed

- **Posts:** `apps/web/src/content/blog/mapa-nazwiska-a-mapa-rodziny.pl.md` and `.en.md`, dated 2026-10-04.
  - **Title:** "Mapa nazwiska nie jest mapą Twojej rodziny. Jak ją poprawnie czytać?" / "A surname's map is not a map of your family. How to read it properly".
  - **Sections:** what the map shows; registered residence is not origin; today, not the past; people move; empty voivodeships; why missing is not zero; how to use the map as a hint; what Name Atlas shows; "Sprawdź swoje nazwisko w Name Atlas"; five FAQs; seven sources.
  - **Internal links:** `kowalski-czy-kowalska`, `jak-szukac-przodkow`, `czy-to-samo-nazwisko-to-rodzina`, `jak-sprawdzic-pochodzenie-nazwiska`, `co-mozna-wyczytac-z-nazwiska`, the comparison page (`/pl/porownaj`, `/en/compare`) and the home page (`/`, `/?lang=en`).
  - **No register figure:** no count, rank or share of any surname. The only numbers are dates, the 16 and 49 voivodeships of the two acts, and the per-voivodeship minimum of 2.
  - **Not stated:** that any surname is absent from any voivodeship (ADR-0031 §3.2); the share of bearers in no voivodeship row as a number; the family tree; the paid tiers.
- **Image:** `apps/web/public/images/blog/mapa-nazwiska-a-mapa-rodziny.webp`, 1600 × 840, 8,424 bytes, SHA-256 `ebba7bf425017bc51a4fcaa7dc9b6304f64a605d4a02f71b01f06a573c3faab4`.
  - **Picture:** scattered lights on a dark plain at dusk; from one of them a winding dotted path runs back to the horizon and fades. No map, text or face.
  - **Script:** a new scene, `mapaNazwiska` (seed 102), in `apps/web/scripts/build-blog-images.ts`, drawn through `scene`'s `front` argument. Nothing else in the script changed.
  - **Provenance:** a row in `apps/web/public/images/blog/README.md`.
- **Records and docs:**
  - `docs/SEO_CONTENT_PLAN.md` §4 piece 4 is marked live with its slug (TASK-102).
  - In `STATUS.md`: "Last rewritten"; the blog line (ten posts; `czy-to-samo-nazwisko-to-rodzina` marked live since #111; this post added); the "Search and editorial content" line (piece 4 is TASK-102; next: piece 5, with the plan's note that it extends `genealogia`). No other line was changed.
  - `docs/CODEMAP.md` is unchanged, because no new folder was added.

## Claims and where they were read (2026-10-04)

- **The PESEL dataset** (`api.dane.gov.pl/1.4/datasets/1681` and `/resources/1148786`, fetched with `curl`):
  - Title "Nazwiska występujące w rejestrze PESEL"; institution 333, Ministerstwo Cyfryzacji.
  - Notes: a list of living persons' surnames "według pola nazwisko aktualne"; "Nazwiska z pojedynczą liczbą wystąpień oraz dane dot. osób zmarłych nie zostały uwzględnione w zestawieniu."
  - Resources 1148786 and 1148790, "Nazwiska męskie/żeńskie wg województwa zameldowania na pobyt stały - stan na 2026-01-20"; resource 1148786's description adds "(bez zgonów) w podziale na województwa, stan na 20.01.2026".
- **The per-voivodeship minimum of 2 and the voivodeship list not covering every bearer:** `docs/sources/pesel-regional.md` ("Suppression is applied per cell — item 18 answered"; "Reconciliation") for the 2026-01-20 resources, and `PESEL_MIN_VALID_COUNT = 2` enforced by `packages/sources/src/regional-parser.ts`. That the publisher does not say why some bearers are in no voivodeship row is from the same record ("The publisher does not state what it is"). The three readings of an empty voivodeship are ADR-0031 §3.2 and item 19.
- **Ustawa o ewidencji ludności,** consolidated text Dz.U. 2025 poz. 274 (`api.sejm.gov.pl/eli/acts/DU/2025/274/text.pdf`, extracted with `pdftotext`): art. 25 ust. 1, "Pobytem stałym jest zamieszkanie w określonej miejscowości pod oznaczonym adresem z zamiarem stałego przebywania"; art. 27 ust. 2, "Równocześnie można mieć jedno miejsce pobytu stałego i jedno miejsce pobytu czasowego". The same wording of both was read in the 2010 original (`DU/2010/1427`), and of art. 27 ust. 2 in the 2024 consolidated text (`DU/2024/736`). The post links `eli.gov.pl/eli/DU/2025/274/ogl`.
- **Ustawa z 24 lipca 1998 r.** (`api.sejm.gov.pl/eli/acts/DU/1998/603/text.html`): art. 1 ust. 1, the three-tier division from 1 January 1999; art. 2 ust. 1, the sixteen voivodeships created on that day.
- **Ustawa z 28 maja 1975 r.** (`api.sejm.gov.pl/eli/acts/DU/1975/91/text.html`): art. 2 ust. 1 lists 49 voivodeships (items 1–49); art. 53, in force from 1 June 1975.
- **GUS, "Migracje wewnętrzne"** (`stat.gov.pl/metainformacje/slownik-pojec/…/212,pojecie.html`, fetched with `curl`): changes of residence within the country; inter-voivodeship migration as moves from one voivodeship to another; permanent-residence migration as tied to registering a permanent residence.
- **Potsdam Protocol, 1 August 1945** (Avalon Project, `avalon.law.yale.edu/20th_century/decade17.asp`, fetched with `curl`): "Western Frontier of Poland" (former German territories east of the Oder–Western Neisse line under the administration of the Polish State, pending the peace settlement) and section XII (transfer to Germany of German populations remaining in Poland).
- **IPN, Grzegorz Chajko, "Ekspatriacja…", Przystanek Historia, 20 February 2021** (fetched with `curl`): the resettlements aimed to populate the new state with Poles who had left the country or ended up outside it "z powodu przesunięcia granic"; the "ewakuacja" of Poles from the Eastern Borderlands; the German population displaced from the "Ziemie Odzyskane".
- **Every statement about Name Atlas** was checked on 2026-10-04 against production (`/pl/nazwisko/nowak`, `/en/surname/nowak`, `/pl/nazwisko/grzegorzewicz`, `/pl/nazwisko/skrzetuski`, each 200) and `apps/web/src/lib/messages.ts`:
  - The chapter headings "Gdzie jest najczęściej zameldowane?" / "Where is it most often registered?", "Ile osób nosi to nazwisko?" / "How many people have this surname?" and "Jak zmieniała się ta liczba w kolejnych edycjach listy?" / "How did this count change between editions of the list?".
  - Two maps, one per list, each with the date 20 January 2026; `coveredNote` under each map; `mapNotListed` ("brak w zbiorze — nie oznacza zera" / "not listed in the dataset — not zero"), shown per voivodeship on `grzegorzewicz` and `skrzetuski`; `limitationRegistered` in the page's notes on both `nowak` pages.
  - The count beside the `nowak` map is smaller than the count in the count chapter (observed, not quoted in the post).
  - The change chapter shows national counts per edition from 30 June 2019, with no voivodeship.
  - The comparison intro (`compareIntro`): voivodeships of two surnames from the same dataset and the same date.
- **Not from a cited source:** the framing sentences; "a family registered today in Lower Silesia or West Pomerania may have its roots further east" and "a surname common in a large city may only mean many people moved there", which are the post's inferences, stated as "may"; the five steps for using the map as a hint; the FAQ on comparing with a map from a hundred years ago.

## Verified

From the repository root, on `16998c8` with this change:

- **`pnpm install --frozen-lockfile`:** exit 0.
- **`pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build`:** exit 0.
  - `check:ids`: "every task, ADR, migration and decision number is used once".
  - `apps/web` ran 72 files with 786 tests passing.
  - The build printed `blog: 20 posts checked, 20 with a feature image`.
- **The image script** (`pnpm exec tsx scripts/build-blog-images.ts <scratch dir>` in `apps/web`), run three times into scratch folders (one before and two after `prettier --write`, which left the script unchanged): the nine earlier images had on every run the SHA-256 values of the committed files, and the new image had the same SHA-256 on all three runs.
- **Production server** (`SITE_ORIGIN=https://name-atlas.pl pnpm --filter web start -p 3100`, stopped afterwards):
  - `/pl/blog/mapa-nazwiska-a-mapa-rodziny` and `/en/blog/mapa-nazwiska-a-mapa-rodziny` answered 200, each with its title, canonical address on `https://name-atlas.pl`, `og:image` `https://name-atlas.pl/images/blog/mapa-nazwiska-a-mapa-rodziny.webp` and `hreflang` `pl` and `en`.
  - Each has one `blog-faq` section, one `blog-sources` section, one `blog-cta` card with one form, no literal asterisk in the text, and a link to the other language.
  - `/pl/blog` and `/en/blog` each showed ten post cards, the new one among them.
  - The image answered 200 `image/webp`, 8,424 bytes.
  - `/`, `/?lang=en`, `/pl/porownaj`, `/en/compare`, and `/pl` and `/en` of `kowalski-czy-kowalska`, `jak-szukac-przodkow`, `czy-to-samo-nazwisko-to-rodzina`, `jak-sprawdzic-pochodzenie-nazwiska` and `co-mozna-wyczytac-z-nazwiska` answered 200.
- **External links** (curl, 2026-10-04), each 200: `dane.gov.pl/pl/dataset/1681,…`, `eli.gov.pl/eli/DU/2025/274/ogl`, `eli.gov.pl/eli/DU/1998/603/ogl`, `eli.gov.pl/eli/DU/1975/91/ogl`, the GUS glossary page, the Avalon Potsdam page, the IPN article.
- **The image** was looked at once (converted to PNG): lights on a plain and a dotted path, no map and no text.

## Not verified

- **ISAP** (`isap.sejm.gov.pl`) answered 403 to the session, so the acts are linked through `eli.gov.pl`.
- **How many people were resettled after 1945:** the IPN article gives figures; the post quotes none.
- **The rendered posts in a browser or on a phone;** no screenshot was taken.
- **This change on Vercel:** to be checked on its merged pull request.
