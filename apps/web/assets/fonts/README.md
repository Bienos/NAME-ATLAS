# Share-card fonts

The Name Atlas type voices (ADR-0021, TASK-052), used in two places (only the share card needs these files):

- **the pages** don't need these files: `src/app/layout.tsx` loads the same faces
  with `next/font/google`, which downloads them at build time and self-hosts them.
- **the share card**: `src/lib/og-card.tsx` reads them once per process
  (`next/og` cannot use CSS web fonts).
- **the surname fitting**: `scripts/build-display-metrics.ts` reads
  `Fraunces-Medium.ttf` to write `src/lib/display-metrics.ts`.

| File | Face | Used for |
| --- | --- | --- |
| `Fraunces-Medium.ttf` | Fraunces 72pt Medium: weight 500 at optical size 72 | surname |
| `InstrumentSans-Regular.ttf` | Instrument Sans, weight 400 | figures, caveat |
| `InstrumentSans-SemiBold.ttf` | Instrument Sans, weight 600 | eyebrow, wordmark |
| `IBMPlexMono-Medium.ttf` | IBM Plex Mono, weight 500 | dataset line |

The four files are committed, unmodified (no subsetting, no renaming inside the
font), each beside its licence (`OFL-*.txt`, from the same `google/fonts` folders):

| File | Version (name table) | Source | SHA-256 |
| --- | --- | --- | --- |
| `Fraunces-Medium.ttf` | 1.000 | Google Fonts static instance `opsz 72, wght 500`: `https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nhr1K03gg7S2nfgRYIchRujDg.ttf` (2026-10-01) | `934b0448ec4605c4b10dc43b1f2d6b95aeb4e121d58e48ce6ee4a6ca046004d8` |
| `InstrumentSans-Regular.ttf` | 1.000 | Google Fonts static instance `wght 400`: `https://fonts.gstatic.com/s/instrumentsans/v4/pximypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr-yp2JGEJOH9npSTF-Qf1.ttf` (2026-10-01) | `01689ad055025ff1891607b077513c9389f73360d471dcffa036e326af179b00` |
| `InstrumentSans-SemiBold.ttf` | 1.000 | Google Fonts static instance `wght 600`: `https://fonts.gstatic.com/s/instrumentsans/v4/pximypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr-yp2JGEJOH9npSQb_gf1.ttf` (2026-10-01) | `5e39a358a65a72b6b74b56b384bbe17a61d8899d33cc255d49112e6522e3df0d` |
| `IBMPlexMono-Medium.ttf` | 2.3 | `google/fonts`, `ofl/ibmplexmono/IBMPlexMono-Medium.ttf` (branch `main`, 2026-09-24) | `a9b4c49bb299e05b5f6c481e7fb5e78943d2793249a0c8874ab574a2d1ea6755` |

TTF or OTF only — `next/og` does not read WOFF2, and it does not read variable
fonts reliably. All three families are SIL Open Font License 1.1 and cover
every Polish letter (checked against each file's `cmap` on 2026-10-01). IBM
Plex carries the Reserved Font Name "Plex", one more reason not to subset or
rebuild these.

`next.config.ts` names the four files in `outputFileTracingIncludes`: build
tracing does not follow `og-card.tsx`'s `readFile`, so without it the deployed
card function would ship without them.

If a file is ever missing, the share card renders in the Geist bundled with
`next/og` and logs `og_fonts_missing` once per process. Nothing fails.
