# 2026-10-03 — The blog's redesign (TASK-075)

Task: `tasks/075-blog-redesign.md`. Branch `claude/magical-brahmagupta-il0fm1`, restarted from `origin/main` @ `7363889` after #83 was merged, then rebased onto `63ed2a0` after #84 (TASK-073, well-known bearers) reached `main`; the rebase conflicted only in `STATUS.md`'s "Last rewritten" and Deployed lines, kept as this change's, and the checks below were rerun on the rebased branch. #67 (the family tree) then reached `main`, so the branch was rebased again onto `4dce85f`; again only "Last rewritten" conflicted, kept as this change's, and the Deployed line now names #67's production deployment. Item 6 of the request arrived as a placeholder; the owner then said "item 6 is call-to-action cards".

## Changed

- **Header keys** (`blog.ts`): optional `image`, a file directly under `/images/blog/` (`.webp`, `.png`, `.jpg`), and `imageAlt`, required with it and refused without it. A bad path, a missing alt or a stray alt throws, naming the file. The key pattern now allows the capital in `imageAlt`.
- **The build's check:** `apps/web/scripts/check-blog-content.ts` parses every post with each image required to exist in `public/`, through `blogPosts(dir, { publicDir })`. `apps/web`'s `build` is now `tsx scripts/check-blog-content.ts && next build --webpack`. Before this, the blog's `force-dynamic` routes meant `next build` never parsed a post. The README's "the build fails" was untrue; only `pnpm test` caught a broken post. Pages still read posts without the file check, because `public/` is not in a Vercel function's files.
- **The images:** `apps/web/public/images/blog/{genealogia,koncowki-nazwisk,jak-szukac-przodkow}.webp`, 1600 × 840.
  - **Each image:** genealogia is a branching amber tree with lit tips; koncowki-nazwisk is rows of rounded bars, each row's last bar lit; jak-szukac-przodkow is a shelf of book spines with a magnifying glass over one.
  - **Origin:** drawn as SVG by `apps/web/scripts/build-blog-images.ts` (written in this session) from the `--dusk-*` values, with seeded randomness. Rendered with headless Chromium 1194, cropped and encoded with ImageMagick 6.9.12 and libwebp 1.3.2 at quality 82, metadata stripped.
  - **Rights:** no text, face, photograph, document, map or third-party material. Origin, tools, sizes, SHA-256 and rights are in `apps/web/public/images/blog/README.md`.
  - **Rendering:** the first render showed a black band along the bottom, because this Chromium's viewport is shorter than its window. The script renders into a taller window and crops. Two runs gave identical sizes.
- **Views** (`blog-page.tsx`):
  - **Index:** cards in a grid (image or a drawn fallback, title, date, description). The title's link is stretched over the card, so the whole card opens the post.
  - **Post:** the image under the title in a 40:21 frame through `next/image` (`fill`, preloaded), and the body grouped into a section per `##` heading. The sections headed as `messages.ts`'s `blogFaqHeading` and `blogSourcesHeading` get `blog-faq` and `blog-sources`.
  - **After every post:** a call-to-action card ("Sprawdź swoje nazwisko" / "Look up your surname", the site's `SearchForm`), then "Więcej wpisów" / "More posts" with the other posts in the same language. The index ends with the same card.
- **Sharing:** a post's `og:image` and JSON-LD `image` (absolute with `SITE_ORIGIN`) are its own image, or `SITE_PREVIEW_IMAGE` without one.
- **Fixes found in the screenshots:**
  - Emphasis inside a link's text rendered with its asterisks. This was visible on production in the first two posts' sources (`*Names* 46(4)`, `*Nazwiska Polaków…*`). A link now carries parsed inlines.
  - Card descriptions did not keep "-czyk" on one line; they now go through `keepSuffixes`.
  - The generic `.reading section` rule drew a rule line between the hero and the first paragraph; the blog's first section drops it.
- **Posts:** the six files gained `image` and `imageAlt` (an alt per language); no other text changed.
- **Also changed:** `messages.ts` gained five keys per language. The blog block of `globals.css` was rewritten with existing tokens only (`--dusk-*`, `--space-*`, `--radius-md`). Tests, `src/content/blog/README.md`, `docs/CODEMAP.md` and `STATUS.md` were updated.
- **Not built:** a header link to the blog (the owner's call), categories, a table of contents. No new colour, font or layout principle (ADR-0021); no new dependency.

## Verified

From the repository root:

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`: each exit 0. `apps/web` ran 53 files with 591 tests passing; after the rebase onto #84, `pnpm install --frozen-lockfile` and all six commands again, each exit 0, with 601 tests passing (#84 brought its own). After the rebase onto #67, the same: `pnpm install --frozen-lockfile`, then all six commands, each exit 0, with 62 files and 662 tests passing in `apps/web`, and the build's `blog: 6 posts checked, 6 with a feature image`.
- `pnpm build`: exit 0. Its log shows `apps/web build$ tsx scripts/check-blog-content.ts && next build --webpack` and `blog: 6 posts checked, 6 with a feature image`. The first full-suite run failed `format:check` on the two `[slug]/page.tsx` files; after `prettier --write` it passed.
- `pnpm exec tsx scripts/check-blog-content.ts` with a temporary post:
  - With an image that does not exist: `blog post probe-missing.pl.md: the image /images/blog/probe-missing.webp is not in public/`, exit 1.
  - With an image and no alt: `blog post probe-missing.pl.md: the image needs an imageAlt`, exit 1.
  - With the probe removed: exit 0.
- Local production server (`SITE_ORIGIN=https://name-atlas.pl`):
  - `/pl/blog`, `/en/blog`, `/pl/blog/genealogia`, `/en/blog/koncowki-nazwisk` and `/pl/blog/jak-szukac-przodkow` answered 200.
  - `/images/blog/genealogia.webp` answered 200 `image/webp`. `/_next/image?url=%2Fimages%2Fblog%2Fgenealogia.webp&w=828&q=75` answered 200 `image/jpeg`; curl sends no `Accept: image/webp`.
  - `/pl/blog/genealogia` carries `og:image` `https://name-atlas.pl/images/blog/genealogia.webp` with its alt, and JSON-LD `"image":"https://name-atlas.pl/images/blog/genealogia.webp"`.
  - The post has a preload link for the hero, five plain sections plus one `blog-faq` and one `blog-sources`, one `blog-cta`, one `id="surname"` and one `blog-more`.
  - The page links `<a href="https://ans-names.pitt.edu/ans/article/view/1533"><em>Names</em> 46(4)</a>`.
- Headless Chromium screenshots of `/pl/blog` and `/pl/blog/genealogia` at 1280 px and 500 px, before and after the fixes above:
  - The cards sit in three columns at 1280 px and one at 500 px.
  - The hero image is under the title, with the FAQ panel, the sources under a rule, the call to action and two "more posts" cards.
- Production for #83: `dpl_6frPfCNi8xjAEJNnft9211JSX4np` READY for `7363889`; the third post is live, written up on #83.

## Not verified

- This change on Vercel: checked on its merged pull request, including that Vercel runs `apps/web`'s `build` script (and with it the check), as production's existing builds imply (a bare `next build` refuses this config, per `next.config.ts`).
- Rendering below 500 px, which this Chromium cannot open; a real phone.
- How a sharing crawler shows the new `og:image`.
- `public/images/blog/README.md` is served publicly at `/images/blog/README.md` (200, `text/markdown`); it holds nothing private.
