# ADR-0048 — Search titles and descriptions use "|", not "—", as the separator

- **Status:** Proposed 2026-10-07. It becomes accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-07
- **Deciders:** the project owner, who asked on 2026-10-07: "in all seo stuff can you reaplce long dash with |".
- **Supersedes:** `docs/canonical/21` §66, in the separator only. Its four patterns join the name and the topic with "—"; that one character becomes "|". The rest of §66 and all of §67's truth rule stand.

## Decision

1. Wherever the search head (`<title>`, the `description` meta, Open Graph and Twitter title, description and image alt) joins two parts with " — ", it joins them with " | ".
   - The surname page: `Nazwisko {X} | {topic} | Name Atlas` / `{X} surname | {topic} | Name Atlas`. With no topic it was already `Nazwisko {X} | Name Atlas`.
   - Every other page's title: `{heading} | Name Atlas` (how it works, offer, terms, privacy, contact, blog index and posts, family tree landing and pages, account pages, couple first names).
   - The landing page: `Name Atlas | Każde nazwisko gdzieś się zaczęło.` / `Name Atlas | Every surname began somewhere.`, its description (`… w kartach | za darmo, bez konta.` / `… in cards | free, no account needed.`) and its preview image's alt text.
2. Not in scope, because a search engine does not read them as the page's head: headings on the page, the share sheet's title, the PDF's document title, the Stripe product name, the admin app, and the dash used as an empty value in the share image.
3. Titles that use " · " (the baby-names pages, the full-name comparison) are not a long dash and are unchanged.
