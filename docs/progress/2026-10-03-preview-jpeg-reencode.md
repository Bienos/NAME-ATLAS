# Landing preview JPEG without metadata blocks

## Trigger

The owner reported that a pasted `https://name-atlas.pl` shows a card in WhatsApp but only the
bare link in an Instagram direct message (a GitHub link in the same chat showed a card). Meta's
Sharing Debugger, screenshot from the owner on 2026-10-03, reported for the landing:

> Corrupted Image — Provided og:image URL, https://name-atlas.pl/share/name-atlas-v2.jpg could not
> be processed as an image.

and its constructed properties carried no `og:image`. Response code 200; title and description
were read.

## What was observed

- Vercel runtime logs (production, `dpl_CkV9U7oNGEwHztfujC2PhdNmHb8D`) show the debugger's scrape
  reading `/robots.txt`, `/` and `/share/name-atlas-v2.jpg`, all 200. No firewall config exists
  for the project (API 404); no 429 in the last 24 h.
- The served `v2` file is byte-identical to the repo file (135888 bytes, `image/jpeg`, also with
  a `Range` request: 206, full length). ImageMagick and ffmpeg decode it without error.
- Its markers: JFIF, an EXIF APP1 (big-endian), a Photoshop APP13 block, and a restart interval
  (DRI), from the `sips` export. The cause of Meta's rejection is **not established**; these
  non-essential blocks are the only unusual part of the file.

## Change

- `apps/web/public/share/name-atlas-v3.jpg`: the same artwork re-encoded with ImageMagick
  (`convert name-atlas-v2.jpg -strip -colorspace sRGB -sampling-factor 4:2:0 -interlace none
  -quality 88`): 1200 × 630, baseline, JFIF only, no EXIF/APP13/DRI, 85906 bytes. Inspected
  visually. A new path also avoids any result Meta keeps for the old image URL.
- Landing metadata and its test point at `v3`. `v2` stays published for links already shared.
- `docs/DOMAIN_SETUP.md`, `docs/CODEMAP.md`, `STATUS.md` updated.

## Verification

Node 22.22.0, pinned pnpm:

| Command | Result |
|---|---|
| `corepack pnpm install --frozen-lockfile` | exit 0 |
| `corepack pnpm --filter ./apps/web exec vitest run src/lib/site-metadata.test.ts` | 3 passed |
| `corepack pnpm typecheck` | exit 0 |
| `corepack pnpm lint` | exit 0 |
| `corepack pnpm format:check` | exit 0 |
| `corepack pnpm check:ids` | exit 0 |

## Not verified

The full test suite and build were not run. Whether Meta's debugger accepts `v3`, and whether
Instagram then shows the card, can only be checked after deployment ("Scrape Again" for
`https://name-atlas.pl`).
