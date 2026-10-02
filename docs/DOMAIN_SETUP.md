# Name Atlas — the two home.pl domains

Primary address: **https://name-atlas.pl**. Alternate: **https://nameatlas.pl**.
The two `www` addresses also redirect to the primary. The application sends a 308 and retains
the path and query, so a shared surname card link survives the redirect.

## Observed setup, 2026-10-02

The owner corrected the registered names to `nameatlas.pl` and `name-atlas.pl` and selected
**`name-atlas.pl` as primary**. The earlier `atlasname.pl` / `atlas-name.pl` spellings were wrong.
All four correct addresses are attached to Vercel project `name-atlas`, with the three alternate
hosts configured to redirect to `name-atlas.pl`. Both apexes resolve to `216.198.79.1`; Vercel's
configuration endpoint reports `misconfigured: false`. HTTPS on `name-atlas.pl` returns 200.
Neither `www` address resolves yet.

Production `SITE_ORIGIN` is set to `https://name-atlas.pl`; a production build is required for
the canonical links and branded preview to use it. Final deployment checks are recorded on the
merged follow-up PR for TASK-067, per `AGENTS.md` §8.

## home.pl DNS

In [Panel Klienta](https://panel.home.pl/), choose **Domeny → domain → Rekordy DNS**
(the exact menu may vary). Current Vercel recommendations:

| Full name | Type | Value | Observed |
|---|---|---|---|
| `name-atlas.pl` | A | `216.198.79.1` | Resolves correctly |
| `nameatlas.pl` | A | `216.198.79.1` | Resolves correctly |
| `www.name-atlas.pl` | CNAME | `ea58c50c28b31975.vercel-dns-017.com` | Pending |
| `www.nameatlas.pl` | CNAME | `ea58c50c28b31975.vercel-dns-017.com` | Pending |

Keep nameservers at home.pl and keep email records (MX, SPF, DKIM, DMARC) as they are. Edit
existing web records rather than adding competing values. No TXT ownership challenge is
requested. This requires no registrar transfer or new hosting purchase.

Official instructions: [home.pl record editing](https://pomoc.home.pl/baza-wiedzy/rekordy-domeny),
[Vercel custom-domain setup](https://vercel.com/docs/domains/set-up-custom-domain).

## Vercel and verification

Use the existing **name-atlas** project under **bienos**:
[Settings → Domains](https://vercel.com/bienos/name-atlas/settings/domains).

- `name-atlas.pl` serves production directly; `nameatlas.pl` and both `www` hosts redirect to it.
- Set production `SITE_ORIGIN=https://name-atlas.pl` in
  [Environment Variables](https://vercel.com/bienos/name-atlas/settings/environment-variables),
  then deploy the current main commit. This does not enable accounts or search indexing.
- Verify `https://name-atlas.pl/` loads with valid HTTPS, and
  `https://nameatlas.pl/pl/nazwisko/nowak?view=cards` redirects to the same path and query there.
- Polish and English landing HTML must contain localized metadata, an absolute `og:image`,
  `og:image:width=1200`, `og:image:height=630`, and `twitter:card=summary_large_image`, with
  canonical and image URLs under `name-atlas.pl`.
- The root image returns a public PNG without an account; surname pages keep their own images.
- Once the two `www` CNAMEs resolve, check their HTTPS redirects as well.
- Send a fresh link in the intended messaging apps. Apps can cache previous previews or let
  recipients disable them; metadata cannot force their UI to display a card.

The branded image uses `next/og` and bundled brand fonts, so it needs no image-generation service
or database. Its atlas is decorative, not a population map.
