# 2026-10-04 — The blog's ninth post: are people with the same surname related? (TASK-101)

Task: `tasks/101-blog-post-same-surname-family.md`. Branch `claude/blog-piece-3`, on `origin/main` @ `8ed3533` (#104); `git merge-base --is-ancestor origin/main HEAD` passed before the first edit. The owner said "yes" to writing the next editorial piece. ADR-0031 §4 takes the topic from `docs/SEO_CONTENT_PLAN.md` §4 in order: pieces 1 and 2 are live, so this is piece 3, brief §5.3, marked queued and not an extension. Open pull requests on 2026-10-04 (`gh api repos/Bienos/NAME-ATLAS/pulls?state=open`): #108 (TASK-099, ADR-0036) and #110 (ADR-0034, no task number); 101 is free.

## Changed

- **Posts:** `apps/web/src/content/blog/czy-to-samo-nazwisko-to-rodzina.pl.md` and `.en.md`, dated 2026-10-04.
  - **Title:** "Czy osoby z tym samym nazwiskiem są rodziną?" / "Are people with the same surname related?".
  - **Sections:** why the same surname arose many times; common and rare surnames; place as a hint, not proof; what can confirm kinship (documents, a family tree built from records, DNA); what Name Atlas shows; "Sprawdź swoje nazwisko w Name Atlas"; five FAQs; six sources.
  - **Internal links:** `genealogia`, `koncowki-nazwisk`, `jak-sprawdzic-pochodzenie-nazwiska`, `jak-szukac-przodkow`, `historia-genealogii`, `co-mozna-wyczytac-z-nazwiska`, the comparison page (`/pl/porownaj`, `/en/compare`) and the home page (`/`, `/?lang=en`).
  - **No register figure:** no count, rank, rarity or meaning is quoted. The percentages are King and Jobling's, for British surnames, and the post says they are not carried over to Poland.
  - **Not mentioned:** the family tree (dark in production), the paid tiers, any DNA testing company.
- **Image:** `apps/web/public/images/blog/czy-to-samo-nazwisko-to-rodzina.webp`, 1600 × 840, 18,668 bytes, SHA-256 `68d746df1cbb483376077b53f2bd73684ae163c54aab62fdf3e378868b8f892a`.
  - **Picture:** two lone trees on a plain at dusk, alike in shape; their roots spread under the ground apart and never touch.
  - **Script:** a new scene, `tenSam` (seed 101), in `apps/web/scripts/build-blog-images.ts`, drawn through `scene`'s `front` argument. Nothing else in the script changed.
  - **Provenance:** a row in `apps/web/public/images/blog/README.md`.
- **Records and docs:**
  - `docs/SEO_CONTENT_PLAN.md` §4 piece 3 is marked live with its slug (TASK-101).
  - In `STATUS.md`: "Last rewritten"; the blog line (nine posts; `co-mozna-wyczytac-z-nazwiska` marked live since #102 and `kowalski-czy-kowalska` since #106; this post added); the "Search and editorial content" line (piece 3 is TASK-101; next: piece 4). No other line was changed.
  - `docs/CODEMAP.md` is unchanged, because no new folder was added.

## Claims and where they were read (2026-10-04)

- **IJP PAN, *Internetowy słownik nazwisk w Polsce*, "O słowniku"** (`nazwiska.ijppan.pl/info/oslowniku`, fetched with `curl`):
  - "Często identycznie brzmiące nazwiska powstawały w różnym czasie i miały różną motywację", with the Krupnik example (craftsman making groats, later groat soup, latest a drink of honey and roots).
  - The most common contemporary surnames are from common words, then place names, then given names (as read by TASK-095 from the same page).
  - Lenartowski from Lenartowice or from Lenart (as read by TASK-095 from the same page).
  - The step from "one surname, several motivations" to "several unrelated founding families" is the post's own reasoning, stated as "may".
- **Turi E. King, Mark A. Jobling, "Founders, drift, and infidelity…", *Mol Biol Evol* 26(5):1093–1102, 2009** (abstract from PubMed's E-utilities, PMID 19204044; full text from Europe PMC, PMC2668828):
  - Authors at the Department of Genetics, University of Leicester.
  - 1,678 Y-chromosome haplotypes within 40 British surnames ("almost 1,700" in the post).
  - "Most heritable surnames, like Y chromosomes, are passed from father to son."
  - Coancestry "generally increases as surnames become rarer"; the proportion in descent clusters averages 62% and ranges from 0% to 87%.
  - Surnames from common occupations or first names "seem more likely to have had multiple founders" than those from the names of small villages (citing McKinley 1990). The post keeps "seem" ("jak się wydaje").
  - Irish surname data showed a relative lack of frequency dependence, put down to distinct Irish and British demographic histories.
- **Susan C. Meates, "DNA: A Powerful Tool for a One-Name Study"**, Guild of One-Name Studies (PDF linked from `one-name.org/dna-and-a-ons/`, which gives "Written for the Guild Web Site 2010, Updated January 20, 2017"; text extracted with `pdftotext`):
  - Y-DNA follows the direct male line (a man, his father, his father's father); the Y chromosome passes from father to son, typically unchanged; in most cultures the surname follows it.
  - Two related men are an exact or close match. "You must be male or find a male to take this test"; women have two X chromosomes.
  - The link between Y chromosome and surname is broken by name change, adoption, infidelity, and an illegitimate birth where the child takes the mother's surname.
  - Combining DNA results with records tells which family trees with the surname are related.
  - An autosomal test "looks across all branches of your family tree, about 5 generations back, sometimes more".
  - The description of the Guild as "a society of researchers who study single surnames" is the post's paraphrase of "one-name study"; its country was not checked and is not stated.
- **Peter Ralph, Graham Coop, "European genealogy FAQ"** (`gcbias.org/european-genealogy-faq/`, fetched with `curl`): second cousins share about 1/32 of their genome; people sharing an ancestor more than eight generations back usually have inherited no genetic material in common from that ancestor; Y and mtDNA tell about one line each.
- **The PESEL dataset and the voivodeship lists:** as read by TASK-095 (`api.dane.gov.pl/1.4/datasets/1681`); single occurrences left out; `docs/sources/pesel-regional.md` item 18 and ADR-0031 §3.2 for "a missing voivodeship is not zero".
- **Geneteka shows both parents' given names and the mother's surname:** restated from `jak-szukac-przodkow`, which carries its source, and linked to it.
- **Moving and changing voivodeship borders:** stated as in TASK-086's and TASK-095's posts; no separate source.
- **Every statement about Name Atlas** was checked on 2026-10-04 against production (`/pl/nazwisko/nowak`, `/en/surname/nowak`, `/pl/porownaj`, `/en/compare`, each 200) and `apps/web/src/lib/messages.ts`:
  - The chapter headings "Jak rzadkie jest to nazwisko?" / "How rare is this surname?" and "Gdzie jest najczęściej zameldowane?" / "Where is it most often registered?".
  - "To samo nazwisko nie oznacza pokrewieństwa." / "Sharing a surname does not mean being related." (`bearersCaveat`), on both `nowak` pages.
  - The registered-residence caveat (`limitationRegistered`), on both `nowak` pages.
  - The comparison disclaimer (`compareDisclaimer`), on `/pl/porownaj` and `/en/compare`.
- **Not from a cited source:** the framing sentences, the hypothetical example of two trees ending in Lesser Poland and Podlasie, the FAQ's list of men a woman can ask (father, brother, paternal uncle), and the closing inferences (no shared autosomal DNA does not rule out distant kinship; a Y-DNA match does not say who the ancestor was), which follow from the sources above.

## Verified

From the repository root, on `8ed3533` with this change:

- **`pnpm install --frozen-lockfile`:** exit 0.
- **`pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build`:** exit 0.
  - `check:ids`: "every task, ADR, migration and decision number is used once".
  - `apps/web` ran 72 files with 787 tests passing.
  - The build printed `blog: 18 posts checked, 18 with a feature image`.
- **The image script** (`pnpm exec tsx scripts/build-blog-images.ts <scratch dir>` in `apps/web`), run three times into scratch folders: the eight earlier images had on every run the SHA-256 values of the committed files, and the new image had the same SHA-256 on all three runs (one before and two after `prettier --write` on the script).
- **Production server** (`SITE_ORIGIN=https://name-atlas.pl pnpm --filter web start -p 3100`, stopped afterwards):
  - `/pl/blog/czy-to-samo-nazwisko-to-rodzina` and `/en/blog/czy-to-samo-nazwisko-to-rodzina` answered 200, each with its title, canonical address on `https://name-atlas.pl`, `og:image` `https://name-atlas.pl/images/blog/czy-to-samo-nazwisko-to-rodzina.webp` and `hreflang` `pl` and `en`.
  - Each has one `blog-faq` section, one `blog-sources` section, one `blog-cta` card with one form, no literal asterisk in the text, and a link to the other language.
  - `/pl/blog` and `/en/blog` each linked nine posts, the new one among them.
  - The image answered 200 `image/webp`, 18,668 bytes.
  - `/`, `/?lang=en`, `/pl/porownaj`, `/en/compare`, and `/pl` and `/en` of `genealogia`, `koncowki-nazwisk`, `jak-szukac-przodkow`, `historia-genealogii`, `jak-sprawdzic-pochodzenie-nazwiska` and `co-mozna-wyczytac-z-nazwiska` answered 200.
- **External links** (curl, 2026-10-04), each 200: `nazwiska.ijppan.pl/info/oslowniku`, `pmc.ncbi.nlm.nih.gov/articles/PMC2668828/`, `one-name.org/dna-and-a-ons/`, the Meates PDF, `gcbias.org/european-genealogy-faq/`, `dane.gov.pl/pl/dataset/1681,…`, `geneteka.genealodzy.pl`.
- **The image** was looked at once (converted to PNG): two trees, roots apart, no text.

## Not verified

- **ISOGG's wiki** (`isogg.org`) answered 403 to the session, so it is not cited. `doi.org/10.1093/molbev/msp022` also answered 403; the post links the PMC copy instead.
- **McKinley 1990,** which King and Jobling cite, was not read.
- **The rendered posts in a browser or on a phone;** no screenshot was taken.
- **This change on Vercel:** to be checked on its merged pull request.
