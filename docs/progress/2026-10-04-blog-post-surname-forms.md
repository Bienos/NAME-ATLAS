# 2026-10-04 — A blog post on male and female surname forms (TASK-096)

Task: `tasks/096-blog-post-surname-forms.md`. Branch `claude/great-wozniak-5wwxf8`, restarted from `origin/main` @ `f4fcb8f`. The owner chose the topic "Kowalski vs Kowalska" on 2026-10-03 and read the Polish draft. On 2026-10-04 they said "Yes" to the English version and a pull request.

## Changed

- **The post.** `apps/web/src/content/blog/kowalski-czy-kowalska.pl.md` and `.en.md`, one slug for both, dated 2026-10-04. It has five sections, a FAQ and the sources. It links to `koncowki-nazwisk` and the site's search, and shows no figure from the register.
- **The image.** `apps/web/public/images/blog/kowalski-czy-kowalska.webp` (1600 × 840, 15,814 bytes, SHA-256 `903edf9e66440bba3a8c81c827b3016e041e5e4f79e31724595ae6b1c23b9e67`).
  - It is drawn by a new `kowalski` function in `apps/web/scripts/build-blog-images.ts` (seed 76): one thread rises and splits into two mirrored branches, each ending in a lit point.
  - It has a row in `apps/web/public/images/blog/README.md`.
  - The script was run into a scratch folder and only the new file was copied in.
- **Claims, and where each was read:**
  - **The 1951 debate (read 2026-10-03).**
    - E. Pawłowski (1951) held that the only correct noun-surname forms for women were those with -owa, -ówna, -ina and -anka.
    - K. Nitsch (1951) held that where a first name or another word showing womanhood accompanies the surname, no suffix may be compulsory and it depends on the person's will.
    - Women's surnames with suffixes are judged outdated today, "a victory of the masculine forms".
    - Source: Tadeusz Lewaszkiewicz, *Славистички студии* 23(1), the paragraph on women's surnames (text extracted with `pdftotext` and read). The article's year is not stated in the extracted text.
  - **Art. 25 of the Family and Guardianship Code (read 2026-10-03).** The declaration before the head of the civil registry office. A shared surname that is one spouse's existing surname. Each spouse may keep their own or add the other's. A combined surname has at most two parts. Without a declaration each keeps their own.
    - Source: consolidated text Dz.U. 2026 poz. 236, read from the PDF on `api.sejm.gov.pl`.
  - **Separate men's and women's lists.** The PESEL surnames are published as separate men's and women's lists, and `NOWAK` appears in both.
    - Sources: `docs/sources/pesel.md` and `docs/sources/acquisition/2026-09-29-pesel-unit/README.md` (`NOWAK,100617` and `NOWAK,102503` in the 2021 resources). The post gives no count.
  - **What Name Atlas does.** It shows each list with its own figure, rank and date and never sums them, and it shows the other form as a form, not kinship. Source: `STATUS.md` (the snapshot, rarity and deck lines).
  - **Not from a cited source.**
    - The grammar of adjective surnames (-ski, -cki and -dzki change form with gender), and the examples Zawadzki/Zawadzka and Kozłowski/Kozłowska.
    - "A woman who takes an adjective surname usually bears it in the feminine form."
    - The example Kowalska-Nowak.
    - The framing sentences.
    - The -owa (wife) and -ówna (daughter) meanings are restated from `koncowki-nazwisk`, which carries their sources, and the post links to it.
- `STATUS.md`:
  - the blog line: `imie-i-nazwisko-ciekawostki` now live since #94, and this post added. After #102 (TASK-095, the seventh post) reached `main`, the merge rebuilt the line from `main`'s version, so it reads eight posts;
  - the Deployed line, read through Vercel's deployment API on 2026-10-04: `dpl_J91izGxxncCBFKqtw1rWajtFyQrQ`, `main` @ `f4fcb8f` (#103), READY;
  - "Last rewritten".

- **Merge with `main` @ `1adde16` (#102, #105, #109).** `STATUS.md`, `apps/web/scripts/build-blog-images.ts` and `apps/web/public/images/blog/README.md` conflicted. Both sides were kept in the script and the README: #102's `coMozna` (seed 94) and this change's `kowalski` (seed 76). `STATUS.md` keeps this change's "Last rewritten" and Deployed lines, and `main`'s blog line with this post added.

## Verified

From the repository root, after `pnpm install --frozen-lockfile`:

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test` and `pnpm build`: each exit 0. `apps/web` alone ran 69 test files with 772 tests passing.
- `scripts/check-blog-content.ts`: "14 posts checked, 14 with a feature image".
- The image script, run into a scratch folder, reproduced the six existing images byte for byte (`cmp`).
- Local production server (`SITE_ORIGIN=https://name-atlas.pl`, port 3099):
  - Both posts, the image and `koncowki-nazwisk` in both languages answered 200.
  - The Polish post has its title, canonical address, `pl`/`en` alternates and its image as `og:image`.
  - Both indexes link to seven posts.
- A headless Chromium screenshot at 1280 px shows the Polish post in the site's shell with its image under the title.

## Not verified

- This change on Vercel: checked on its merged pull request.
- The Lewaszkiewicz article's year and page numbers.
- Three academic sources found in search (on `czasopisma.filologia.uwb.edu.pl` and `journals.polon.uw.edu.pl`) could not be read. Two refused TLS verification from the session, and one answered 503. The post cites none of them.
