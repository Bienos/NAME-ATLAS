# TASK-075 — The blog's redesign: feature images, a richer index and post layout, call-to-action cards

- **Status:** IMPLEMENTED 2026-10-03 on `claude/magical-brahmagupta-il0fm1`; record: `docs/progress/2026-10-03-blog-redesign.md`.
- **Requested by:** the project owner, 2026-10-03: "Redesign the blog: feature images for posts, a richer index and post layout", with six numbered items. Item 6 arrived as "[FILL IN …]"; asked, the owner answered "item 6 is call-to-action cards".
- **Decision:** none new. Inside ADR-0021 (dusk palette, faces, `SiteShell`; §5's precedent for an illustration in `public/images/` through `next/image`) and ADR-0007 (each image's origin and rights stated, §5 below). No new colour, font or layout principle.
- **Depends on:** TASK-071, 072 and 074 (the blog and its three posts), on `main` at `7363889` (#83); rebased onto `63ed2a0` (#84), then onto `4dce85f` (#67). Open pull requests hold 066, 068, 069, 070, 072 (#79) and 073 (#81, #84, #67); 075 is free on `main` and in every open pull request.
- **Model guidance:** implementation session.

## 1. Goal

Each post has a text-free feature image in the dusk palette, shown under its title, in its index card, as its `og:image` and in its structured data. The index shows cards. A post reads at a comfortable width, with its FAQ and sources set apart, a call to look up a surname and links to the other posts. A broken post, a missing image or a missing alt fails `pnpm build`.

## 2. Facts (checked on `main` @ `7363889`, 2026-10-03)

1. The blog's routes are `force-dynamic`, so `next build` never parses a post. The README's "the build fails" was untrue; only `blog.test.ts`'s test over the shipped posts caught a broken post, in `pnpm test`.
2. On Vercel `public/` is served by the platform and is not in a function's files, so a page cannot check that an image exists at request time.
3. `security-headers.ts` sends `img-src 'self'`; `next/image` serves from `/_next/image` on this site.
4. `SearchForm` gives its input `id="surname"` and expects one form per page; the blog's pages show no header search.
5. `sharp` cannot be imported from the workspace (it is Next's own dependency). This container has headless Chromium and ImageMagick with libwebp.

## 3. In scope

- **Header keys.** Two optional keys: `image` (a file directly under `/images/blog/`, `.webp`, `.png` or `.jpg`) and `imageAlt`, required whenever `image` is set and refused without it. A bad path, a missing alt or a stray alt throws, naming the file.
- **The build's check.** `apps/web/scripts/check-blog-content.ts` parses every post with each image required to exist in `public/`; `apps/web` `build` runs it before `next build`, so CI and Vercel stop on a broken post. Pages read posts without the file check (§2.2).
- **The images.** One per post, `apps/web/public/images/blog/<slug>.webp`, 1600 × 840, shared by both languages, each language with its own alt. Drawn as SVG by `apps/web/scripts/build-blog-images.ts` from the `--dusk-*` values, rendered with headless Chromium and encoded with ImageMagick. No text, face, document, photograph or map. Their origin, tool, date, checksums and rights are recorded in `apps/web/public/images/blog/README.md`.
- **Index.** Cards: the image (or a styled fallback when a post has none), title, date and description, the whole card one link. Newest first; a tie of dates keeps the slug order. A grid that falls to one column at phone width. One call-to-action card after the list.
- **Post page.** The image under the title and date, at the reading width, with no layout shift (a fixed aspect ratio and `next/image` `fill`). The body is grouped into a section per `##` heading; the sections headed "Najczęstsze pytania" / "Frequently asked questions" and "Źródła" / "Sources" get their own styling. After the body: a call-to-action card, then "Więcej wpisów" / "More posts" with the other posts in the same language as cards. Every text stays HTML; `keepSuffixes` and the no-HTML-injection rule hold.
- **Sharing.** A post's image is its `og:image` and the Article JSON-LD's `image` (absolute when `SITE_ORIGIN` is set); a post without one falls back to the site cover, `SITE_PREVIEW_IMAGE`.
- **Call-to-action cards (item 6).** "Sprawdź swoje nazwisko" / "Look up your surname", a line of the site's own claims (how many people bear it, how rare it is, where it is most common; free, no account) and the site's `SearchForm`. One per page.
- **The six posts' headers** get `image` and `imageAlt`; no other change to their text.
- **Two defects found in this task's screenshots, fixed here.** Emphasis inside a link's text (`[*Names* 46(4)](…)`, in the first two posts' sources) was shown with its asterisks, because link text was not parsed; a link now carries its text's bold, emphasis and code (never a nested link). Card descriptions now keep a suffix such as "-czyk" on one line, as titles and text already did.
- Interface text in `messages.ts` (both languages), the blog block of `globals.css` (existing tokens only), tests, `src/content/blog/README.md`, `docs/CODEMAP.md`, `STATUS.md`, a progress record.

## 4. Out of scope

- A "Blog" link in the header: the owner's call, not asked for.
- New colours, fonts or layout principles (ADR-0021), categories, tags, a table of contents, search, comments, a feed.
- Rewriting any post's text; any figure from the register.
- Images from an outside service, a photograph, or anything whose rights cannot be stated.
- Changes to the surname pages, accounts or the offer.

## 5. Acceptance criteria

- **AC-1.** A post with `image` and `imageAlt` parses to `image: { src, alt }`; one with neither has `image: null`; `image` without `imageAlt`, `imageAlt` without `image`, and a path outside `/images/blog/` (another folder, `..`, an absolute URL, a nested path, another extension) each throw naming the file (unit).
- **AC-2.** With `publicDir`, a post whose image file is missing throws; without it, it parses (unit). `scripts/check-blog-content.ts` exits 0 on the shipped posts, and non-zero on a broken one (run).
- **AC-3.** The post page renders the image with its alt inside a fixed-ratio figure; the index card renders it with its alt; a post without an image renders the fallback and no `<img>` (unit).
- **AC-4.** `og:image` is the post's image when it has one and `SITE_PREVIEW_IMAGE` when not; the JSON-LD's `image` is the absolute URL of the post's image, or of the site cover, when `SITE_ORIGIN` is set (unit).
- **AC-5.** The FAQ and sources sections carry their own classes in both languages; "more posts" lists the other posts in the same language and not the current one; each page carries exactly one call-to-action card and one `id="surname"` (unit).
- **AC-6.** `keepSuffixes` and the escaping of HTML in a post still hold (the existing tests pass); `[*Names* 46(4)](https://…)` renders as `<a …><em>Names</em> 46(4)</a>`, and an unsafe link with emphasis keeps its text without an `href` (unit).
- **AC-7.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-8.** In a production build served locally: `/pl/blog`, `/en/blog` and the posts answer 200; each post's `og:image` names its image; the images answer 200 directly and through `/_next/image`. Headless Chromium screenshots of `/pl/blog` and one post at 1280 px and 500 px show the layout (§6).

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `pnpm --filter web start` with `SITE_ORIGIN` set; `curl` the pages and images; screenshots at 1280 px and 500 px (this Chromium's narrowest window).
