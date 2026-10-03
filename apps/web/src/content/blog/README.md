# The blog's posts

Each post is one file per language in this folder: `<slug>.pl.md` and/or `<slug>.en.md` (TASK-071). A post that exists in both languages uses the same slug in both; that is what links the two versions. A post is published when its file is on `main`.

```markdown
---
title: Skąd się wzięło nazwisko Nowak
description: One or two sentences for the blog's list and for search results.
date: 2026-10-03
slug: skad-sie-wzielo-nazwisko-nowak
lang: pl
---

The first paragraph. Blank lines separate paragraphs.

## A heading

### A smaller heading

- a list item
- another, with **bold**, *emphasis*, `code` and [a link](https://example.org)
```

Rules (the build fails, naming the file, when one is broken):

- The header has exactly the five keys `title`, `description`, `date`, `slug` and `lang`, each once and none empty.
- `date` is a real day written `YYYY-MM-DD`. `slug` uses lowercase letters, digits and single hyphens. `lang` is `pl` or `en`. Both must match the file's name.
- Headings are `##` or `###`, because the title is the page's main heading. There must be some body text.
- Links work for `/paths` on this site, `https://`, `http://` and `mailto:`. Any other address is shown as plain text. HTML in a post is shown as text and never runs.
- A post is prose. It does not show surname counts, rarity, meanings or maps; those come from the register on the surname pages.

This file (`README.md`) is not a post.
