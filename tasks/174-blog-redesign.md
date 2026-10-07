# TASK-174 — The blog in Brand System v1

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-blog-redesign.md`).
- **Requested by:** the project owner, 2026-10-07: "zrób redesign blog section, niech to będzie bardziej kreatywne i profesjonalne, abstrakcyjne, ale ma matchować dalej".
- **Decision:** ADR-0046 (Brand System v1). No new ADR, no migration, no D- number.
- **Numbers:** TASK-174 (172 is the highest on `main` @ `6e2fb72`; 172 is also named by open #206 and 173 by open #208). `pnpm check:ids` exit 0.
- **Model guidance:** implementation session.

## In scope

`/pl/blog`, `/en/blog` and a post under each (`BlogIndexView`, `BlogPostView`), moved into the `.atlas-v1` scope like the other migrated pages:

1. Index: a masthead (mono kicker with the Atlas Point, the title at display size, the lede) beside a panel of contour art; the newest post as a wide feature card ("Najnowszy wpis"), the others as numbered cards with the date and minutes to read; the call to action as a panel with contour art and the site's search.
2. Post: a kicker linking to the blog, the title, the post's description as the lede, the date with minutes to read; the feature image, or drawn contours seeded by the slug when there is none; the sections beside a numbered contents list (two numbered sections or more), each numbered heading with an anchor; the FAQ and sources set apart as before; the call to action, more posts, the way back.
3. A card without an image shows drawn contours instead of the flat gradient.

## Out of scope

The posts' text, the post format and its checks, the metadata and structured data, the site header and footer, the images, new routes.

## Acceptance

- **AC-1:** both pages render in Polish and English in `.atlas-v1`; the art is decoration only (`aria-hidden`) and states no figure.
- **AC-2:** the existing blog tests still hold (feature images, FAQ and sources, more posts, metadata, JSON-LD).
- **AC-3:** no horizontal overflow at 390 px.

## Verification

`pnpm format:check`, `check:ids`, `lint`, `typecheck`, `test`, `pnpm --filter ./apps/web build`; Chromium at 390 and 1280 px.
