# Share-card fonts

The Name Atlas type voices (Visual System v1 §6), used in two places (only the share card needs these files):

- **the pages** don't need these files: `src/app/layout.tsx` loads the same faces
  with `next/font/google`, which downloads them at build time and self-hosts them.
- **the share card**: `src/lib/og-card.tsx` reads them once per process
  (`next/og` cannot use CSS web fonts).

| File | Face | Used for |
| --- | --- | --- |
| `Newsreader-Medium.ttf` | Newsreader, weight 500 (display optical size if offered) | surname, wordmark |
| `Inter-Regular.ttf` | Inter, weight 400 | figures, caveat |
| `Inter-SemiBold.ttf` | Inter, weight 600 | eyebrow |
| `IBMPlexMono-Medium.ttf` | IBM Plex Mono, weight 500 | dataset line |

Get the **static** TTFs from Google Fonts ("Get font" → download → the `static/`
folder of the zip) and rename them to the names above:

- https://fonts.google.com/specimen/Newsreader
- https://fonts.google.com/specimen/Inter
- https://fonts.google.com/specimen/IBM+Plex+Mono

TTF or OTF only — `next/og` does not read WOFF2, and it does not read variable
fonts reliably. All three families are SIL Open Font License 1.1 and cover
every Polish letter.

Until all four files are present the share card renders in the Geist bundled
with `next/og` and logs `og_fonts_missing` once per process. Nothing fails.
