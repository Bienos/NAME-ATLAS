# Share-card fonts

The Name Atlas type voices (Visual System v1 §6), used in two places (only the share card needs these files):

- **the pages** don't need these files: `src/app/layout.tsx` loads the same faces
  with `next/font/google`, which downloads them at build time and self-hosts them.
- **the share card**: `src/lib/og-card.tsx` reads them once per process
  (`next/og` cannot use CSS web fonts).

| File | Face | Used for |
| --- | --- | --- |
| `Newsreader-Medium.ttf` | Newsreader 72pt Medium: weight 500 in the display optical size | surname, wordmark |
| `Inter-Regular.ttf` | Inter, weight 400 | figures, caveat |
| `Inter-SemiBold.ttf` | Inter, weight 600 | eyebrow |
| `IBMPlexMono-Medium.ttf` | IBM Plex Mono, weight 500 | dataset line |

The four files are committed, unmodified (no subsetting, no renaming inside the
font), each beside its licence (`OFL-*.txt`, from the same `google/fonts` folders):

| File | Version (name table) | Source | SHA-256 |
| --- | --- | --- | --- |
| `Newsreader-Medium.ttf` | 1.003 | Google Fonts static instance `opsz 72, wght 500`: `https://fonts.gstatic.com/s/newsreader/v26/cY9qfjOCX1hbuyalUrK49dLac06G1ZGsZBt4ByzBDXXD9JVF438wSo_ADA.ttf` | `05a664c8c447af0d670ab203a2c3a6dee89620b544d42853d94f6663172607f6` |
| `Inter-Regular.ttf` | 4.001 | Google Fonts static instance `wght 400`: `https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf` | `1b08e7fc267a5c7e1d614100f604b83e7e8a0be241f0f288faa2b3ac93a683ba` |
| `Inter-SemiBold.ttf` | 4.001 | Google Fonts static instance `wght 600`: `https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf` | `e7a1aaf7eda9f2fad4131725fa556265ec75ca7b2d756260173a040363e8d4f7` |
| `IBMPlexMono-Medium.ttf` | 2.3 | `google/fonts`, `ofl/ibmplexmono/IBMPlexMono-Medium.ttf` (branch `main`, 2026-09-24) | `a9b4c49bb299e05b5f6c481e7fb5e78943d2793249a0c8874ab574a2d1ea6755` |

TTF or OTF only — `next/og` does not read WOFF2, and it does not read variable
fonts reliably. All three families are SIL Open Font License 1.1 and cover
every Polish letter (checked against each file's `cmap`). IBM Plex carries the
Reserved Font Name "Plex", one more reason not to subset or rebuild these.

`next.config.ts` names the four files in `outputFileTracingIncludes`: build
tracing does not follow `og-card.tsx`'s `readFile`, so without it the deployed
card function would ship without them.

If a file is ever missing, the share card renders in the Geist bundled with
`next/og` and logs `og_fonts_missing` once per process. Nothing fails.

The pages' display face is a different cut: `next/font/google` serves the
**16 pt** Newsreader Medium (the Google default for `wght@500`). The surname
fitting in `src/lib/surname-fit.ts` is measured from that cut, not from this file.
