# 2026-10-03 — The blog's fifth post: six facts about where names come from (TASK-082)

Task: `tasks/082-blog-post-name-facts.md`. Branch `claude/great-wozniak-5wwxf8`, restarted from `origin/main` @ `08516bd` after #90 was merged. The owner asked for a post on the most interesting facts about the origins of surnames and first names. They read the Polish draft, then asked for the English version and a pull request.

## Changed

- **The post.** `apps/web/src/content/blog/imie-i-nazwisko-ciekawostki.pl.md` and `.en.md`, one slug for both. It has six numbered facts, a closing section, a FAQ and the sources. It links to `koncowki-nazwisk`, `jak-szukac-przodkow` and the site's search. It shows no figure from the register.
- **The image.** `apps/web/public/images/blog/imie-i-nazwisko-ciekawostki.webp` (1600 × 840, 22,188 bytes, SHA-256 `15b2c13777831c5e35d0daec3ad7f1fd9353adba17bb7ca70b991f73ea84dbf9`).
  - It is drawn by a new `ciekawostki` function in `apps/web/scripts/build-blog-images.ts` (seed 75): nine threads drift in from the left and twist into one lit strand.
  - It has a row in `apps/web/public/images/blog/README.md`.
  - The script was run into a scratch folder and only the new file was copied in.
- **Claims, and where each was read on 2026-10-03:**
  - **Slavic names.** Pre-Christian Slavic naming had two-part compound names, which were wishes carrying a good omen or the parents' blessing for the child's future.
    - Around the turn of the 15th and 16th centuries, names tied to Christianity almost entirely displaced native names. The causes were the cult of saints and, above all, Church rules requiring names from the liturgical calendar at baptism, which in the Western Church followed from the Council of Trent.
    - The few native names that survived were mostly saints'. In Poland these were, for example, Stanisław, Wojciech, Kazimierz and Wacław.
    - Bogusław, Jarosław and Mieczysław are among the two-part names Mordań lists.
    - Source: Michał Mordań, *Białorutenistyka Białostocka* 16 (2024), pp. 140–141 and the name list (text extracted with `pdftotext` and read).
  - **Naming a child (art. 59).** No more than two names. No diminutive form, and nothing mocking or indecent. Foreign names are allowed whatever the parents' citizenship or nationality. A name may not show the child's sex if in common use it belongs to one. Otherwise the head of the civil registry office refuses the choice and picks a name ex officio by a decision.
    - Source: Prawo o aktach stanu cywilnego, Dz.U. 2014 poz. 1741, art. 59, as published, read from the PDF on `eli.gov.pl`.
  - **Changing a name (arts. 4, 8 and 12).** A change is allowed only for important reasons. The first one listed is a name or surname that is mocking or not in keeping with human dignity. Another is a change to the name or surname actually used. The change follows a written request (art. 8), and the head of the civil registry office issues the decision (art. 12).
    - Source: ustawa o zmianie imienia i nazwiska, Dz.U. 2008 nr 220 poz. 1414, as published, read from the PDF on `eli.gov.pl`.
  - **Nowak.** The title "Nic nowego - Nowak znowu pierwszy", dated 10 February 2021, from the Ministry of Digital Affairs, the publisher of the PESEL surname lists.
    - Source: `docs/sources/acquisition/2026-09-29-pesel-unit/README.md`, which records the page's title and date verbatim. The post gives no count.
  - **Ellis Island.** Passenger lists were created abroad, near the emigrant's home, when the ticket was bought. The inspector had the list already made and was not to change a name unless the immigrant asked or the information proved wrong. Names changed later and gradually, where English speakers made the records.
    - Source: USCIS, "Immigrant Name Changes".
  - **Not from a cited source.** The framing sentences; "most people keep their ancestors' surname"; the advice to check different spellings; and "many Polish surnames grew out of nicknames and ordinary words". The last is also stated, with the eight types, in `genealogia`, after Kaleta.
- `STATUS.md`:
  - the blog line: five posts, with `historia-genealogii` now live since #90;
  - the Deployed line, read through Vercel's deployment API on 2026-10-03: `dpl_HZ3DwC4fEW3EeWg2GoRWwKpeVnnP`, `main` @ `08516bd` (#92), READY;
  - "Last rewritten".

## Verified

From the repository root, with dependencies installed:

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test` and `pnpm build`: each exit 0. `apps/web` alone ran 63 test files with 673 tests passing.
- `scripts/check-blog-content.ts`: "10 posts checked, 10 with a feature image".
- The image script, run into a scratch folder, reproduced the four existing images byte for byte (`cmp`).
- Local production server (`SITE_ORIGIN=https://name-atlas.pl`, port 3099):
  - Both posts, the image, and `koncowki-nazwisk` and `jak-szukac-przodkow` in both languages answered 200.
  - The Polish post has its title, canonical address, `pl`/`en` alternates and its image as `og:image`.
  - Both indexes link to five posts.
- A headless Chromium screenshot at 1280 px shows the English post in the site's shell with its image under the title.

## Not verified

- This change on Vercel: checked on its merged pull request.
- Amendments to articles 59 (2014 act), and 4, 8 and 12 (2008 act), made after their publication: the post cites the acts as published.
- The gov.pl notice was not re-fetched in this session. Its title and date are from the repository's acquisition record of 2026-09-29.
