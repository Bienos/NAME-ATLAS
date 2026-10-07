# 2026-10-07: redesigned site-link card `name-atlas-v4.jpg`

Requested directly by the owner in a session (no task file).

## What changed

- `apps/web/public/share/name-atlas-v4.jpg` (new): the 1200 × 630 card for a shared bare site link. Logo mark, the landing headline "Każde nazwisko gdzieś się zaczęło.", the line "Sprawdź swoje. Liczby, miejsca i historia tam, gdzie potwierdzają ją źródła.", a "Sprawdź za darmo" button, `name-atlas.pl`, the labels Liczby / Miejsca / Źródła and a dotted map of Poland. The map is decorative and shows no register data. Fraunces, Instrument Sans and IBM Plex Mono; dusk palette.
- `apps/web/share-source/name-atlas-v4.html` and `README.md` (new): the static source of the card and how to re-export it.
- `apps/web/src/lib/site-metadata.ts`: `SITE_PREVIEW_IMAGE` points at `v4`; alt text updated. `site-metadata.test.ts` follows.
- `v2` and `v3` stay in `public/share/` for links already shared.
- `docs/DOMAIN_SETUP.md`, `docs/CODEMAP.md`, `STATUS.md`.

## Verification (run in this session)

- `pnpm --filter ./apps/web test`: 109 files, 1233 tests passed.
- `pnpm typecheck` (apps/web): exit 0. `pnpm lint`: exit 0.
- `pnpm format:check`: "All matched files use Prettier code style!" (after Prettier formatted the new HTML).
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `file name-atlas-v4.jpg`: JFIF baseline, 1200x630; no `Exif` or Photoshop block in the header.
- Re-exporting `share-source/name-atlas-v4.html` in headless Chromium at 1200 × 630 produced a byte-identical JPEG (`cmp`).

## Not verified

- staging or name-atlas.pl after deployment; Meta's Sharing Debugger and real previews in Messenger, WhatsApp or X.
