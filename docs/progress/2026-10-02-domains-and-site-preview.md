# TASK-067 — Domains and the site-link preview

Scope: `tasks/067-domains-and-site-preview.md`; requested by the owner in this session.
Base: `origin/main` @ `822fbdaa7ae6b8113f33208c7b1f99b0d004cae7`, refreshed before editing and
again before committing. Open pull requests occupied TASK-066, so this change uses 067.

## Changed

- `/opengraph-image` renders a public 1200 × 630 PNG with the existing dusk tokens and bundled
  Fraunces, Instrument Sans and IBM Plex Mono fonts: the landing headline, a stack of surname
  cards and Poland's decorative outline. No generated fact, count, origin or family claim.
- `site-metadata.ts` gives the landing Polish / English titles, descriptions, canonical and language
  links, Open Graph and large Twitter-card metadata. The root layout sets `metadataBase` from
  existing `SITE_ORIGIN`; file metadata supplies the image, including on the English query route.
  Internal searches still say `noindex`. Surname routes still inherit their own image files.
- `next.config.ts` traces the root image's fonts and redirects only `atlas-name.pl`,
  `www.atlas-name.pl` and `www.atlasname.pl` to `atlasname.pl`, retaining path and query.
  The primary, localhost and Vercel aliases are not redirected.
- `docs/DOMAIN_SETUP.md` records exact DNS recommendations and the origin cutover sequence.
  No dependency added or upgraded; no database, rights, account gate or indexing-policy change.

## Vercel / DNS observed

The existing CLI login was refreshed by the official Vercel CLI 62.2.0, without a new grant.
Project: `prj_io95UvFcjCJfFtsyVcPZhrlkGZL1`, team `team_Qlgabc646xuDRKqUYR8d5ykj`, root `apps/web`.
All four domains were attached through `POST /v10/projects/name-atlas/domains`, each HTTP 200.
The three alternate hosts were added with `redirect: atlasname.pl`, `redirectStatusCode: 308`.
Each domain's ownership gate answered `verified: true`; this is not proof of valid DNS.

`GET /v6/domains/{domain}/config` on all four: HTTP 200, `misconfigured: true`, no A/CNAME values;
rank-1 IPv4 candidates `216.198.79.1`, `64.29.17.1`, rank-1 CNAME
`ea58c50c28b31975.vercel-dns-017.com.`. The guide uses the first rank-1 A address. CLI domain
inspection also permits the legacy `76.76.21.21` address. `dig atlasname.pl A` and
`dig atlas-name.pl A` returned NXDOMAIN with the `.pl` SOA. The owner says both are active at
home.pl; the registrar's settings were not accessible and were not changed.

Production was read as `dpl_Fr5U8BPdM8aDnG5rYwtdYMm9pUkT`, READY, `main` @ `822fbda`,
alias `name-atlas-two.vercel.app`. Production `SITE_ORIGIN` is that alias, left as it is until
the primary has valid DNS and HTTPS. No secret value is in this record.

## Verification run locally

Node 22.22.3; repository-pinned pnpm 10.33.0. Dependencies: `pnpm install --frozen-lockfile`, exit 0.

| Exact command | Actual result |
|---|---|
| `pnpm typecheck` | exit 0 across the workspace |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0, all matched files formatted |
| `pnpm check:ids` | exit 0, every numbered ID used once |
| `pnpm test` | exit 0, 1,841 tests; web 555, including three new metadata tests |
| `SITE_ORIGIN=https://atlasname.pl pnpm build` | exit 0; root image prerendered; existing Next middleware deprecation and Edge API warnings reported |
| `git diff --check` | exit 0 |

Started the built web app with
`SITE_ORIGIN=https://atlasname.pl pnpm --filter web start --hostname 127.0.0.1 --port 3210`,
without `DATABASE_URL`. `python3 /private/tmp/atlas-verify-preview.py` (temporary probe, not a
repository dependency) exited 0 and printed twelve PASS lines:

- server HTML for `/`, `/?lang=en` and an invalid search, under a WhatsApp crawler user agent:
  localized metadata, absolute root image, dimensions 1200 × 630, matching Twitter image and
  `summary_large_image`; invalid search says `noindex`;
- `/pl/nazwisko/nowak` in its database-unavailable refusal still points to its own surname image,
  for both OG and Twitter;
- the root image is a PNG, 1200 × 630, 173,406 bytes, publicly returned without the database;
- its build trace includes all four brand TTFs (and Next's Geist fallback);
- the three alternate Host headers answer 308 with the original surname path and two query
  parameters; primary, localhost and existing Vercel alias answer 200 without redirect.

The PNG was visually inspected; the headline, Poland, card and footer fit. A review copy is in
the calling workspace's `output/atlasname-link-preview.png`, outside the Git checkout.

## Not verified / pending

- Public DNS and TLS on the custom domains; registrar zone / nameserver publication.
- `SITE_ORIGIN=https://atlasname.pl` on production after that DNS cutover.
- This code on production, a real message application's rendered preview, and cache refresh
  in messaging apps. Their own settings can suppress previews.
- Integration and golden database suites locally: no data or query changed; CI remains the
  verification surface for those suites. Local surname inheritance was checked in the refusal
  state, not against a loaded surname projection.
