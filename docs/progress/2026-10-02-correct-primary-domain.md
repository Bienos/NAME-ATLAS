# TASK-067 — Correct the domain names and primary address

## Changed

The owner corrected the registered names to `nameatlas.pl` and `name-atlas.pl`, then explicitly
selected **`name-atlas.pl` as primary**. This follow-up starts from `origin/main` @ `182aa48`
(#72). It changes `next.config.ts` to redirect `nameatlas.pl`, `www.nameatlas.pl` and
`www.name-atlas.pl` to `https://name-atlas.pl`, preserving path and query. Landing-metadata test
fixtures, the task, setup guide and current status now use the confirmed names and choice.
No card artwork, accounts, data, product copy or other routes changed.

Vercel's project-domain API returned 200 for all four updates: the primary serves production
directly; the three alternates have a 308 to it. Production `SITE_ORIGIN` was changed from the
existing Vercel alias to `https://name-atlas.pl`; readback confirmed it. Both apex A records
resolve to `216.198.79.1`, and both configuration endpoints report `misconfigured: false`.
A live HTTPS request to the primary returned 200; a request to
`https://nameatlas.pl/pl/nazwisko/nowak?view=cards&lang=pl` returned 308 with the identical path
and query under `https://name-atlas.pl`. Neither `www` DNS name resolves yet; home.pl's
authoritative server returned no CNAME for either.

## Verification

Commands below use `corepack pnpm` to select the repository's pinned pnpm 10.33.0 with Node
22.22.3. All final commands exited 0:

| Command | Result |
|---|---|
| `corepack pnpm typecheck` | All workspace packages passed |
| `corepack pnpm lint` | Passed |
| `corepack pnpm check:ids` | Passed |
| `corepack pnpm test` | 1841 tests passed, including 555 web tests |
| `SITE_ORIGIN=https://name-atlas.pl corepack pnpm build` | Passed; root image prerendered |
| `corepack pnpm format:check` | Passed |
| `git diff --check` | Passed |

The first sandboxed build could not fetch the existing Google Fonts. A network-enabled retry
then found stale incremental type-check data after that failure. Moving only the generated
`.next` and `tsconfig.tsbuildinfo` caches to temporary storage and rebuilding passed. No source
workaround was added.

The built server was started with
`SITE_ORIGIN=https://name-atlas.pl corepack pnpm --filter web start --hostname 127.0.0.1 --port 3210`.
The HTTP probes in `/private/tmp/atlas-verify-corrected.py` passed all twelve checks: Polish and
English metadata on the corrected origin; internal search `noindex`; surname-specific OG and
Twitter image inheritance with no database; public root PNG at 1200 × 630; all four bundled TTF
fonts; the three alternate-host 308s retaining path and query; and no redirect for primary,
Vercel alias or localhost.

## Remaining verification

The final production deployment, its primary-domain metadata and rendered image are checked
and recorded on the merged follow-up PR, without a record-only commit (`AGENTS.md` §8).
The `www` names need their home.pl CNAMEs before their HTTPS redirects can be checked publicly.
No actual messaging-app cache/UI was tested.
