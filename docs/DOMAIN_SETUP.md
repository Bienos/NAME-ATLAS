# Name Atlas — the two home.pl domains

Primary address: **https://atlasname.pl**. Alternate: **https://atlas-name.pl**.
The two `www` addresses also redirect to the primary. The application sends a 308 and retains
the path and query, so a shared surname card link survives the redirect.

## Observed setup, 2026-10-02

All four addresses have been attached to Vercel project `name-atlas`. Vercel has the three
alternate hosts' 308 redirects configured. The domains' ownership gate is verified, but
**DNS is still misconfigured**. Public DNS returns NXDOMAIN for both bare domains, and the
Vercel configuration endpoint returns no A or CNAME records. The owner confirms both exact
spellings are active at home.pl.

The current API recommendation is an apex A record of **216.198.79.1** (one of the two rank-1
addresses), and a `www` CNAME of **ea58c50c28b31975.vercel-dns-017.com**. Apply:

| Full name | Type | Value |
|---|---|---|
| `atlasname.pl` | A | `216.198.79.1` |
| `atlas-name.pl` | A | `216.198.79.1` |
| `www.atlasname.pl` | CNAME | `ea58c50c28b31975.vercel-dns-017.com` |
| `www.atlas-name.pl` | CNAME | `ea58c50c28b31975.vercel-dns-017.com` |

No TXT challenge is requested. If home.pl shows the domains as active but their nameservers
are not published, enable their DNS zone / home.pl nameserver delegation first. The lack of
public DNS is observed; its cause inside home.pl has not been verified.

Production `SITE_ORIGIN` is currently `https://name-atlas-two.vercel.app`. Keep it there until
`atlasname.pl` has working DNS and HTTPS, then perform step 4 below.

## Vercel

Use the existing **name-atlas** project under **bienos**:
[Settings → Domains](https://vercel.com/bienos/name-atlas/settings/domains).

1. Add `atlasname.pl`, `atlas-name.pl`, `www.atlasname.pl` and `www.atlas-name.pl` to this project
   (already done on 2026-10-02).
2. Attach them to production. The app supplies the redirects; a Vercel domain redirect to
   `atlasname.pl` is also suitable if it retains the whole path and query.
3. Copy the **exact DNS values shown by Vercel for this project**. Do not assume an old example
   IP address or CNAME destination is still the recommendation.
4. Once the primary resolves to the app and HTTPS is valid, set **production**
   `SITE_ORIGIN=https://atlasname.pl` in
   [Environment Variables](https://vercel.com/bienos/name-atlas/settings/environment-variables).
   Redeploy the current production commit. This gives canonicals, share links and image URLs the
   public origin; it does not enable accounts or search indexing by itself.

## home.pl

In [Panel Klienta](https://panel.home.pl/), choose **Domeny → domain → Rekordy DNS**
(the exact menu may vary). Do this for each registered domain:

| Name | Type | Value |
|---|---|---|
| Bare domain (`atlasname.pl` or `atlas-name.pl`) | A | The project's apex value shown by Vercel |
| `www` under that domain | CNAME | The project's subdomain value shown by Vercel |
| Verification label, only if Vercel requests it | TXT | The exact verification value shown by Vercel |

Edit the existing web records rather than adding competing records at the same name. Check any
existing AAAA record for the bare domain: it must not still route IPv6 visitors to an old web host.
Keep nameservers at home.pl and keep email records (MX, SPF, DKIM, DMARC) as they are. This setup
requires only web routing, not a registrar transfer or new hosting purchase.

Official instructions: [home.pl record editing](https://pomoc.home.pl/baza-wiedzy/rekordy-domeny),
[Vercel custom-domain setup](https://vercel.com/docs/domains/set-up-custom-domain).

## Verify

- Vercel shows the four domains as valid, with a valid HTTPS certificate.
- `https://atlasname.pl/` loads the Name Atlas landing page.
- `https://atlas-name.pl/pl/nazwisko/nowak?view=cards` redirects to the identical path and query
  under `https://atlasname.pl`.
- Bare and English landing HTML contains the localized title, description, `og:url`, an absolute
  `og:image`, `og:image:width=1200`, `og:image:height=630`, and `twitter:card=summary_large_image`.
- The published `og:image` returns a public PNG without an account; a surname page still uses its
  own image, not the brand cover.
- Send a fresh link in the intended messaging apps. Some apps cache old previews or let the
  recipient disable previews; correct metadata cannot force their UI to display a card.

The branded image is rendered from code with `next/og` and the bundled brand fonts, so it needs no
image-generation service or database. The atlas on the cover is decorative, not a population map.
