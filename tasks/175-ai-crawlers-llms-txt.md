# TASK-175 — AI crawlers in `robots.txt`, and `/llms.txt`

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-ai-crawlers-llms-txt.md`).
- **Requested by:** the project owner, 2026-10-07, in a Claude Code session. They asked "czy ta strone ma schema dla AI zeby to wyszukiwal i inne triki SEO" ("does this site have schema for AI to find it, and other SEO tricks"), then "zrob prompt co doda co potrzeba" ("make a prompt that adds what is needed"), then "run prompt". The prompt proposed letting AI answer engines cite the site and refusing the crawlers that collect training data. The owner ran it without changing that.
- **Decision:** ADR-0050.
- **Numbers:** TASK-175. Written as TASK-172 and renumbered the same day, when #204 took 172 on `main`; 173 is on `main` and open #209 holds 174. ADR-0050: 0049 is on `main`. `pnpm check:ids` was run before commit.

## In scope

- `robots.txt`:
  - When indexing is enabled, the AI answer engines (`OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`) get a group of their own with the same rules as `User-agent: *`.
  - When indexing is disabled, they have no group, so the closed `*` group governs them.
  - In both postures, the training crawlers (`GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `meta-externalagent`, `Bytespider`) get `Disallow: /`.
- `/llms.txt`:
  - A Markdown map of the site with absolute links: the product in PRODUCT.md's words, the surname directory, the surname page patterns, How it works, the two blog indexes with every post, and the sitemap.
  - It is a 404 unless indexing is enabled and `SITE_ORIGIN` is set.
  - It is excluded from the rate limiter, as `robots.txt` is. The blog files are traced for it.

## Out of scope

- New schema.org types. `docs/canonical/21` §76–§78 forbid `Person`, `Dataset` and `FAQPage`.
- `llms-full.txt`, any change to page content, sitemaps or meta tags.
- Turning on `SEO_INDEXING_ENABLED`.

## Acceptance

- **AC-1:** every training crawler has `Disallow: /`, with indexing enabled and with it disabled.
- **AC-2:** with indexing enabled, every answer engine has a group carrying the `*` rules (`/api/` and `/?` disallowed, the surname routes allowed). With indexing disabled, none has a group.
- **AC-3:** `/llms.txt` is a 404 with indexing disabled or no origin. Otherwise it is a 200 `text/plain` whose links are all absolute and which lists each blog post under its language.

## Verification

`pnpm format:check`, `check:ids`, `lint`, `typecheck`, `test`.
