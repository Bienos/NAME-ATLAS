# TASK-071 — The blog: an index and a page per post, from Markdown files in the repository

- **Status:** IMPLEMENTED 2026-10-03 on `claude/magical-brahmagupta-il0fm1`; record: `docs/progress/2026-10-03-blog.md`.
- **Requested by:** the project owner, 2026-10-03: "write me prompt to set up blog page", then, asked to choose between files in the repository, a headless CMS and WordPress: "1" (files in the repository).
- **Decision:** none new. A blog of static posts stores and collects nothing, so ADR-0017's "the site stores nothing" and the privacy notice stay true (§2.7). WordPress and a headless CMS were considered and set aside for now; a CMS can replace the files later without changing the routes (§4).
- **Depends on:** `main` at `3e2e9b3`. Numbers: 066, 068, 069 and 070 are held by open pull requests (#67, #70, #76); this task takes 071.
- **Model guidance:** implementation session.

## 1. Goal

`/pl/blog` and `/en/blog` list the posts written in that language, newest first, and `/pl/blog/{slug}` and `/en/blog/{slug}` show one post, all in the site's own shell. A post is a Markdown file in `apps/web/src/content/blog/`. The footer's "Blog" link leads to the blog in the reader's language. The first post ships with it (§3, added at the owner's request on 2026-10-03); with no post, an index says there are none yet.

## 2. Facts (checked on `main` @ `3e2e9b3`, 2026-10-03)

1. The footer's Blog, Instagram, TikTok and YouTube links all lead to the home page (`site-links.ts`, `followLinks`), by the owner's wish until each has an address (TASK-057). There is no blog route.
2. Static pages keep their text in a `*-text.ts` file and their view in a `*-page.tsx`, rendered by `SiteShell` (`how-page.tsx`). Routes are `app/pl/<path>` and `app/en/<path>`.
3. `SEO_INDEXING_ENABLED` is off in production. `robots.txt` answers `Disallow: /` while it is off, and the surname page carries `robots` metadata from `seo.ts`. `sitemap.xml` is an index of surname pages that is empty while the flag is off.
4. `layout.tsx` sets `metadataBase` from `SITE_ORIGIN` and an `openGraph` with the brand cover (`SITE_PREVIEW_IMAGE`); a page that sets `openGraph` replaces it, so a page that wants the cover names it again (`site-metadata.ts`).
5. `og-card.tsx` reads files at run time from `process.cwd()` and `next.config.ts` lists them in `outputFileTracingIncludes`, because the build's trace does not follow them. A blog that reads its posts at run time needs the same line.
6. `.prettierignore` ignores `*.md`. No dependency renders Markdown; `package.json` has none.
7. The privacy notice says the site stores nothing and sets no cookies for readers; Vercel Web Analytics is described there (TASK-058).

## 3. In scope

- **The post format.** One file per post and language, `apps/web/src/content/blog/<slug>.<lang>.md`, `lang` being `pl` or `en`. A header of `key: value` lines between two `---` lines, with exactly these keys: `title`, `description`, `date` (ISO `YYYY-MM-DD`, a real date), `slug` (lowercase letters, digits and single hyphens) and `lang`. `slug` and `lang` must agree with the file's name. A missing, extra, repeated or malformed key, or a name that disagrees, **fails the build** with the file's name in the message: a bad post is never published and never half-shown. A post in both languages shares its slug; that is what pairs them.
- **A small renderer, no dependency.** `apps/web/src/lib/blog.ts` turns the body into blocks: `##` and `###` headings (the title is the page's one `h1`, so `#` is refused), paragraphs, `-` lists, and inside text `**bold**`, `*emphasis*`, `` `code` `` and `[text](address)`. Everything is rendered as React elements, so text that looks like HTML is shown as text and nothing is injected. A link keeps its address only if it begins with `/` (not `//`), `https://`, `http://` or `mailto:`; any other address leaves the text without a link.
- **The loader.** `blogPosts(directory?)` reads the files, validates them, and returns the posts newest first (equal dates by slug). A missing directory is no posts, not an error.
- **The pages.** `blog-page.tsx` holds `BlogIndexView`, `BlogPostView` and the metadata functions; the four route files are thin. The index lists title, date (`formatDate`) and description, with an empty state in both languages. A post page shows title, date, body and a link back to the index. An unknown slug, or a slug that exists only in the other language, is a 404 through `notFound()`. The language switch goes to the paired post when there is one and to the other language's index when not.
- **Search engines.** Each page carries a canonical address, `hreflang` alternates only for languages that exist, and `robots` metadata that says `index` only while `SEO_INDEXING_ENABLED` is `true`, read at request time as the surname page does (so the blog routes are `force-dynamic`). A post page also carries `Article` structured data (headline, description, `datePublished`, `inLanguage`, the publisher "Name Atlas", the address when `SITE_ORIGIN` is set), written with `<` escaped. **No author is named**: nothing in the repository says who writes the posts, and the format has no author key.
- **The sitemap.** `/sitemap-blog.xml` lists the posts with their `hreflang` pairs and `lastmod` from `date`; `/sitemap.xml` names it only when indexing is enabled, `SITE_ORIGIN` is set and at least one post exists. With the flag off, or with no post, the index is byte for byte what it is today.
- **The footer.** The "Blog" entry of `followLinks` leads to `blogPath(lang)`. Instagram, TikTok and YouTube stay as they are.
- **The deployment.** `next.config.ts` lists the content directory in `outputFileTracingIncludes` for the blog routes and the blog sitemap.
- **Interface text** in `messages.ts` in both languages (`messages.test.ts` holds the keys equal), and a few rules in `globals.css` for the list.
- **The first post** (added 2026-10-03 at the owner's request: "write the first blog post about genealogy why people look for names and past use common keywords and some sources to prove your points and add faq at the end all meta data etc"): `genealogia.pl.md` and `genealogia.en.md`, one slug for both. Why people research their families, a short history of Polish surnames, where to search, what Name Atlas shows, a FAQ and a list of sources. Every factual claim rests on a source cited in the post and checked on 2026-10-03; the post shows no figure from the register.
- **Tests, `docs/CODEMAP.md`, `STATUS.md`, `apps/web/src/content/blog/README.md`** (the format, for whoever writes a post), and a progress record.

## 4. Out of scope

- Any post beyond the first (§3). Tests use fixtures that are not shipped.
- A header link to the blog (footer only), comments, search, tags, categories, pagination, images inside posts, an RSS or Atom feed, scheduled or draft posts (a post is published when its file is on `main`), an author, an editor or a CMS (WordPress and a headless CMS were considered; either can feed the same pages later, in its own task and ADR).
- Addresses for Instagram, TikTok and YouTube.
- Any change to accounts, the offer, the surname page, `robots.txt`, the privacy notice or the terms. The blog adds no cookie, form, script or request for the reader beyond the pages themselves and the analytics the site already has.
- Showing any surname figure, rarity, meaning or distribution in a post. A post is the owner's prose; nothing on these pages is derived from the register (AGENTS.md §10).

## 5. Acceptance criteria

- **AC-1.** A well-formed file parses to its title, description, date, slug, language and blocks; a missing, extra or repeated key, a bad date or slug, a language that is not `pl`/`en`, a name that disagrees with the header, and a `#` heading each throw a message naming the file (unit).
- **AC-2.** Text such as `<script>alert(1)</script>` or `<b>x</b>` in a post is rendered escaped, never as an element; a link to `javascript:`, `data:` or `//host` renders as text without an `href`; `/path`, `https://`, `http://` and `mailto:` keep theirs (unit, on rendered markup).
- **AC-3.** Posts are ordered newest first, equal dates by slug; a post's language pair is found by slug and is `null` when only one language exists; a missing directory is an empty list (unit).
- **AC-4.** Each index renders its posts' titles, dates and descriptions with links to `blogPostPath`, shows only its own language's posts, and shows the empty-state sentence in each language when there are none (unit).
- **AC-5.** A post page renders title, date, body and the back link, marks nothing as the current header place, and its language switch goes to the paired post or to the other index (unit).
- **AC-6.** Metadata: canonical is the page's own path; `languages` lists only languages that exist; `robots.index` is true only when the flag is `true`; a post's `openGraph` has type `article`, its `publishedTime` and the brand cover (unit).
- **AC-7.** The structured data parses as JSON, has the post's headline, `datePublished` and `inLanguage`, has no author, and a title containing `</script>` cannot close the script element (unit).
- **AC-8.** The footer's Blog link is `/pl/blog` in Polish and `/en/blog` in English; the other three follow links are unchanged (unit).
- **AC-9.** The blog sitemap carries each post's address and its `hreflang` pair, with escaped XML; the index names it only when asked to, and without it the document is the same as before (unit).
- **AC-10.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.
- **AC-12.** The shipped posts parse, and none carries a link the renderer would drop (unit).
- **AC-11.** In a production build served locally, with one fixture post present: `/pl/blog`, `/en/blog` and the post answer 200 with the right `lang`, canonical and `robots` for the flag off and on; an unknown slug and a wrong-language slug answer 404; `/sitemap-blog.xml` answers as above; the build's trace for the blog routes lists the content file (§6).

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then a local run of the production build (`pnpm --filter web start`) with a fixture post pair placed in `apps/web/src/content/blog/` for the probe and **removed afterwards**: `curl` the routes above with `SEO_INDEXING_ENABLED` unset and `true` and `SITE_ORIGIN` set, and read the blog routes' `.nft.json` files under `.next/server/app` for the content file. What is not run (a Vercel deployment, a search engine's view of the pages) goes into the progress record.
