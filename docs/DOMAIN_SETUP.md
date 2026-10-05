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
- The landing card uses the public JPEG `/share/name-atlas-v3.jpg` (a metadata-free re-encode; `v2` stays for links already shared) without an account or function invocation; surname pages keep their own PNG images.
- Once the two `www` CNAMEs resolve, check their HTTPS redirects as well.
- Send a fresh link in the intended messaging apps. Apps can cache previous previews or let
  recipients disable them; metadata cannot force their UI to display a card.

## Changing the site-link card

The artwork source is `apps/web/src/lib/site-preview.tsx`, rendered with `next/og` and bundled
brand fonts. The shared landing uses its exported 1200 × 630 JPEG at
`apps/web/public/share/name-atlas-v3.jpg`, re-encoded with no EXIF or Photoshop blocks after Meta rejected `v2` as "Corrupted Image". Open Graph and Twitter URLs are set in
`apps/web/src/lib/site-metadata.ts`; `layout.tsx` supplies the default image. The old
`/opengraph-image` PNG endpoint remains for previously fetched image URLs, now as a normal route
handler rather than a metadata-file convention. A surname page's own metadata-file image takes
precedence over the brand cover.

When changing the artwork, render the PNG from the source, export the JPEG, use a new asset
filename, and update `SITE_PREVIEW_IMAGE.url`. Verify the production HTML's `og:image` points
straight to that JPEG, and the asset returns 200 with `image/jpeg` and 1200 × 630 dimensions.
The atlas is decorative, not a population map.

The former closed robots policy also blocked preview crawlers. `robots.txt` now has a dedicated
group for Facebook/Meta sharing, X, LinkedIn, Slack, Discord, WhatsApp and Telegram crawlers,
allowing public pages and images while excluding account paths, API and internal searches.
The wildcard search group remains controlled by `SEO_INDEXING_ENABLED`, which this change does
not enable. Meta's own cached scrape/UI and messages already sent must be verified separately
from HTTP output; a successful simulated user-agent request alone does not verify the card in a
messaging app.

## Staging and releases (ADR-0039)

`staging.name-atlas.pl` shows `main`, as merged; `name-atlas.pl` shows the branch `production`,
which only the **Release** workflow moves. The order below keeps the live site unchanged
throughout. Read 2026-10-04 through Vercel's API: the production branch is `main`, every
environment variable targets Production only, and Deployment Protection is Vercel Authentication
with `deploymentType: all_except_custom_domains`.

1. Merge the change that carries ADR-0039. It deploys to production one last time from `main`.
2. **Create `production`:** GitHub → Actions → **Release** → Run workflow, commit left empty. It
   pushes `main`'s latest commit to a new branch `production` and makes no new production build,
   because Vercel's production branch is still `main`. It refuses until CI on that commit has passed. If it
   names migrations production has not applied, run `Register VM` → `accounts` first (it applies
   pending migrations), then run Release again.
3. **Production branch:** [Settings → Environments → Production](https://vercel.com/bienos/name-atlas/settings/environments)
   (older dashboards: Settings → Git), branch tracking **`production`**. The current production
   deployment stays live.
4. **The staging domain:** [Settings → Domains](https://vercel.com/bienos/name-atlas/settings/domains)
   → Add `staging.name-atlas.pl` → environment **Preview**, Git branch **`main`**. In home.pl, add
   the record Vercel shows for it (a `CNAME` named `staging`), beside the others in the table above.
5. **The staging database:** `ops/vm/README.md` → "Staging: the owner's part" (one GitHub secret, the
   `staging` step, one Preview `DATABASE_URL` for branch `main`).
6. **Push to `main` once, or redeploy its latest preview,** so the preview is built with the new
   `DATABASE_URL`.
7. **Check:** open `https://staging.name-atlas.pl` in a private window. It must ask for a Vercel sign-in.
   If it shows the site, open [Settings → Deployment Protection](https://vercel.com/bienos/name-atlas/settings/deployment-protection)
   and choose **Standard Protection**: the older setting read above leaves custom domains,
   a preview's included, open. Even open, it serves `Disallow: /` and `noindex`, because
   `SEO_INDEXING_ENABLED` is unset for Preview. Signed in, a surname page must show its figures.

**Releasing:** check staging, then GitHub → Actions → **Release** → Run workflow. It refuses a commit CI
has not passed or whose migrations production has not applied, and says which. Vercel builds
`name-atlas.pl` from the push. **Going back:** Vercel → Deployments → the previous production
deployment → Instant Rollback. After a rollback Vercel stops assigning `name-atlas.pl` to new
production builds until a deployment is promoted again (Deployments → ⋯ → Promote), so the next
release must be promoted by hand once.

From step 3 on, a merge into `main` changes staging only. Only `main` and `production` are built
(`git.deploymentEnabled` in `apps/web/vercel.json`); a task branch gets no preview.
