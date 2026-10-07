# ADR-0050 — AI answer engines are crawlers like search engines; AI training crawlers are refused; `/llms.txt` maps the site

- **Status:** Proposed 2026-10-07. It becomes accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-07
- **Deciders:** the project owner, 2026-10-07. They asked what the site does for AI search. They were offered a prompt that lets answer engines cite the site and refuses training crawlers, and they answered "run prompt" without changing that line.
- **Extends:** `docs/canonical/21` §36 and §40 (crawler policy, the indexing flag). That document is not edited.
- **Relates to:** ADR-0001 (rights are a dimension of their own), ADR-0009 §5 (`SEO_INDEXING_ENABLED`), ADR-0031 (search and editorial content).
- **Implemented by:** TASK-175.

## 1. Context

1. `robots.txt` names the link-preview crawlers and then `User-agent: *`. AI crawlers fall under `*`, so whatever a search engine may read, a crawler collecting training data may read too.
2. Two kinds of AI crawler announce themselves separately:
   - those that fetch a page to answer and cite a user's question (`OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`);
   - those that collect pages to train models (`GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `meta-externalagent`, `Bytespider`).
3. Every surname page is published under the rights of the sources it cites (`seo-surface.ts`). No rights profile was reviewed for use as model training data.

## 2. Decision

1. **Answer engines are search engines.** Each one gets the `*` rules in a group of its own, under the same flag. A crawler that matches a named group ignores `*`, so the rules are repeated rather than inherited. While indexing is disabled, they have no group, and the closed `*` group refuses them.
2. **Training crawlers are refused everything, in both postures.** Opening them up would need each cited source's terms reviewed for training. That review is a decision of its own, not a crawler setting.
3. **`/llms.txt`** (https://llmstxt.org) is a short Markdown map: what the site is, in PRODUCT.md's words, and where its pages are. It carries no fact, count or figure, because those belong on the pages with their sources. It is served only when the sitemap would be: indexing enabled and `SITE_ORIGIN` set.
4. **No new structured data.** `docs/canonical/21` §76–§78 stand.

## 3. Consequences

- AI answers can cite surname pages and the blog once indexing is on, and on the same pages a search engine may index.
- `robots.txt` is a request, not enforcement. A crawler that ignores it is not stopped by this ADR.
- The agent names are those the vendors publish. A new crawler is covered only by `*` until it is added to one of the two lists.
