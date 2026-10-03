# TASK-067 — Public JPEG and preview-crawler access

## Trigger and change

The owner reported that the designed card still did not appear in messages. On the deployed
`35f0d13`, the title/image tags were in the initial head for five tested user agents, and Apple's
native `LPMetadataProvider` loaded a title, image and icon for the primary and alternate domains.
That did not verify the owner's messaging UI. The live `robots.txt` had only `User-agent: *`
with `Disallow: /`: a robots-aware messaging crawler was instructed not to fetch the page or
image. The owner's screenshot did not identify the app, and its test links were not present in
the Messages app accessible on this Mac. No messages were sent.

This change starts from `origin/main` @ `35f0d13` in an isolated worktree, preserving unrelated
work in the original checkout. It:

- Adds the existing cover as a direct public 1200 × 630 JPEG at
  `apps/web/public/share/name-atlas-v2.jpg` (135888 bytes). Exported from the published code-rendered
  PNG with `sips -s format jpeg -s formatOptions 90`; artwork and copy are unchanged.
- Sets landing OG/Twitter metadata directly to that asset, with explicit MIME and dimensions;
  the layout supplies the default OG cover, leaving Twitter free to inherit surname images.
- Moves the old root PNG metadata file to `app/opengraph-image/route.ts`, retaining previously
  fetched `/opengraph-image?...` URLs without allowing the convention to override the new JPEG.
- Adds a dedicated robots group for eight sharing agents. Public pages and assets are allowed;
  account paths, API and internal search are excluded, with the English landing permitted.
  The existing wildcard search group and `SEO_INDEXING_ENABLED` remain unchanged.
- Adds endpoint regression checks for closed/open search policy and missing sitemap origin,
  and extends metadata tests to require the direct JPEG.

The robots issue is an observed site-side blocker; it is not proof that it was the only cause of
this user's blank card. A successful fetch is not an end-to-end message-card test.

## Verification

With Node 22.22.3 and pinned pnpm 10.33.0, final runs passed:

| Command | Result |
|---|---|
| `corepack pnpm install --frozen-lockfile` | exit 0 |
| `corepack pnpm typecheck` | exit 0 |
| `corepack pnpm lint` | exit 0 |
| `corepack pnpm check:ids` | exit 0 |
| `corepack pnpm test` | exit 0; 1844 tests, including 558 web tests |
| `SITE_ORIGIN=https://name-atlas.pl corepack pnpm build` | exit 0 |
| `corepack pnpm format:check` | exit 0 |
| `git diff --check` | exit 0 |

The initial new endpoint test imported a mock from the wrong existing module; its fixture was
corrected to mock `siteOrigin` from `surname-page.js`. The final test/typecheck/build passed.

Built-server probes (`/private/tmp/atlas-verify-static.py`, server on port 3211) passed: PL/EN
landing and invalid-search metadata in the initial head; direct JPEG status/MIME/dimensions;
legacy PNG status/MIME/dimensions; surname OG/Twitter images retained; all eight preview agents
allowed to fetch the landing and JPEG; Googlebot, Bingbot and an unspecified bot still blocked.
The JPEG was visually inspected.

## Remaining

Final production deployment, public image and robots checks are recorded on the merged PR.
The actual owner's messaging-app UI and any platform-side scrape cache remain separate checks;
no message was sent to anyone during this work. The two www DNS records remain a home.pl step.
