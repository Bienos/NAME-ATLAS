# TASK-067 — Connect the owner's two domains and give the site link a branded preview

- **Requested by:** the owner, 2026-10-02: connect `nameatlas.pl` and `name-atlas.pl`, registered at home.pl, and design an appealing card for sharing the links.
- **Status:** IMPLEMENTED and published in #72. On 2026-10-02 the owner corrected the registered names and selected `name-atlas.pl` as primary; this follow-up corrects host routing and completes the production-origin cutover. Both apex DNS records point to Vercel; the `www` records remain pending. Records: `docs/progress/2026-10-02-domains-and-site-preview.md` and `docs/progress/2026-10-02-correct-primary-domain.md`.
- **Scope authority:** this conversation; implementation starts from `origin/main` @ `822fbda`. TASK-066 is occupied in open PRs #67 and #70; 067 was free when checked.
- **Decision:** `name-atlas.pl` is the primary address; `nameatlas.pl` and the two `www` addresses redirect to it, preserving the path and query. Existing product name "Name Atlas" and ADR-0021's dusk direction remain the brand.

## In scope

- A site-level 1200 × 630 preview (direct public JPEG for sharing, legacy PNG endpoint retained), in the existing fonts and palette, available without a database or account. Editorial cover copy and a decorative atlas; no invented surname facts.
- Polish and English landing title, description, canonical and Open Graph / Twitter metadata. The English landing remains `/?lang=en`.
- Host-specific permanent redirects for the three alternate addresses. Leave Vercel preview addresses usable.
- Connect domains to the existing Vercel project and set production `SITE_ORIGIN=https://name-atlas.pl` when access and DNS permit; otherwise document exactly what is pending.
- Explicit access for messaging preview crawlers in `robots.txt`, while preserving the general search-indexing policy.
- A home.pl / Vercel setup guide and observed verification record.

## Out of scope

- Redesigning the site or existing surname-specific cards, account gates, database, indexing policy or paid products.
- Transferring domain registration, buying services, changing email DNS or unrelated hosting settings.

## Acceptance and verification

1. Bare site links carry a branded JPEG (1200 × 630) and complete large-card metadata in server HTML; the image renders without `DATABASE_URL` and uses bundled fonts.
2. Polish / English metadata is localized; internal searches remain `noindex`; surname pages keep their own preview images.
3. Alternate hosts return a permanent redirect to `name-atlas.pl`, with path and query retained, without redirecting localhost or Vercel previews.
4. Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`, `pnpm build`. Inspect the rendered card and probe metadata and redirects from the built server. Verify the root image's output trace contains the font files.
5. State separately what is built and what is verified live. External authentication / DNS is not implied by a passing build.
