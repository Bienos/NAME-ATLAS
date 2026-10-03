# 2026-10-03 — The blog's fourth post: a short history of genealogy (TASK-079)

Task: `tasks/079-blog-post-history-of-genealogy.md`. Branch `claude/great-wozniak-5wwxf8`, restarted from `origin/main` @ `d2c51f4` after #85 was merged. The owner asked for a post on the history of genealogy, with facts that inspire and educate. They read the Polish draft, then asked for the English version and a pull request. An earlier draft on this branch's session ("Jak sprawdzić pochodzenie nazwiska?", the first piece of `docs/SEO_CONTENT_PLAN.md` §4) was rejected by the owner and never committed.

## Changed

- **The post.** `apps/web/src/content/blog/historia-genealogii.pl.md` and `historia-genealogii.en.md`, one slug for both. Seven sections tell the story, then a FAQ and the sources. The post links to `jak-szukac-przodkow`, Geneteka, Szukajwarchiwach and the site's search. It shows no figure from the register.
- **The image.** `apps/web/public/images/blog/historia-genealogii.webp` (1600 × 840, 28,544 bytes, SHA-256 `d087ae9dd8d17c85bf9180544f70ad2eaeaad49944190579b0c3d2da058271b7`). It is drawn by a new `historia` function in `apps/web/scripts/build-blog-images.ts` (seed 74): rows of points narrowing upward, each joined to two in the row above. It has a row in `apps/web/public/images/blog/README.md`. The script was run into a scratch folder and only the new file was copied in.
- **Claims, and where each was read on 2026-10-03:**
  - Confucius's lineage is the one traced back furthest; his ancestor Kung Chia is documented in the 8th century BC; 86 generations recorded. Source: Guinness World Records, "Longest family tree".
  - In 1563 the Council of Trent introduced the duty to record baptisms and marriages; 51 years later the *Roman Ritual* added deaths; Polish post-Tridentine synods introduced the duties; by the early 17th century most Polish parishes kept registers; for more than three centuries the parish office did the work of today's civil registry. Source: Marian Butkiewicz, *Roczniki Humanistyczne* 35(3), 1987, p. 1 of the PDF (text extracted with `pdftotext` and read).
  - The 1807 constitution of the Duchy of Warsaw (art. 69) introduced the Napoleonic Code as civil law; clergy were burdened with civil registrars' duties, because the Duchy lacked officials. Source: Ewa M. Ziółek, *Roczniki Humanistyczne* 67(2), 2019, opening paragraph and the review's discussion of registrars (text extracted and read).
  - The most recent common ancestor of all living humans may have lived a few thousand years ago, about 3,000 years in the more realistic models; Chang's "hundredth cousins or so". Source: ScienceDaily's report of 30 September 2004 on Rohde, Olson and Chang, *Nature* 431. The paper itself was not read.
  - Any two Europeans share more ancestors over the past thousand years than the population then; people whose common ancestor lived more than eight generations ago usually share no genetic material from that ancestor. Source: Peter Ralph and Graham Coop, "European genealogy FAQ".
  - Not from a cited source: the doubling arithmetic (1,024; over a million; over a billion), "there were not that many people alive then" (arithmetic against commonly known population sizes), the framing sentences, and the practical advice in the FAQ.
- `STATUS.md`: the blog line (four posts), the Deployed line and "Last rewritten". The Deployed line was read through Vercel's deployment API on 2026-10-03: `dpl_6yvgTx3mWSM7sP8h2ETuj4jwDooH`, `main` @ `d2c51f4` (#85), READY.

## Verified

From the repository root, with dependencies installed by `pnpm install --frozen-lockfile`:

- `pnpm typecheck`, `pnpm lint`, `pnpm check:ids`, `pnpm test`, `pnpm build`: each exit 0. `apps/web` alone ran 62 test files with 662 tests passing.
- `pnpm format:check`: exit 1 at first, flagging only `apps/web/scripts/build-blog-images.ts`. Exit 0 after `prettier --write` on that file.
- The image script, re-run after formatting into a scratch folder, reproduced all four images byte for byte (`cmp`), the three existing ones included.
- Local production server (`SITE_ORIGIN=https://name-atlas.pl`, port 3099):
  - `/pl/blog/historia-genealogii`, `/en/blog/historia-genealogii`, `/images/blog/historia-genealogii.webp`, `/pl/blog/jak-szukac-przodkow`, `/en/blog/jak-szukac-przodkow`, `/pl/blog` and `/en/blog` answered 200.
  - The Polish post has its title, canonical address, `pl`/`en` alternates, its image as `og:image`, and eleven `h2`.
  - Both indexes link to four posts.
- A headless Chromium screenshot at 1280 px shows the post in the site's shell with its image under the title.
- The cited pages answered from the session: Guinness, ScienceDaily, the Ralph and Coop FAQ, and both *Roczniki Humanistyczne* PDFs.

## Not verified

- This change on Vercel: checked on its merged pull request.
- The *Nature* paper itself; its figures are cited from ScienceDaily's report.
- The Butkiewicz article's page numbers for the quoted passage.
