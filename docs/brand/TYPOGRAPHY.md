# Typography

## Families

| Role | Family | Weights | Use |
|---|---|---|---|
| Display | Fraunces | variable on web; Medium static for OG | surnames, major editorial discoveries |
| Interface | Instrument Sans | 400/500/600 | body, controls, navigation |
| Data | IBM Plex Mono | 400/500 | datasets, dates, coordinates, source refs |

All three support Polish diacritics and are already loaded by the app.

## Semantic scale

- `display-hero`: clamp(72px, 9vw, 136px), lh .9
- `display-xl`: clamp(56px, 7vw, 104px), lh .92
- `display-lg`: clamp(44px, 5.4vw, 80px), lh .96
- `heading-xl`: 40–56px
- `heading-lg`: 32–44px
- `heading-md`: 24–32px
- `heading-sm`: 20–24px
- `body-lg`: 18–20px, lh 1.5
- `body-md`: 16–18px, lh 1.55
- `body-sm`: 14–16px, lh 1.5
- `label-md`: 13–14px / 600
- `data-md`: 13–14px mono
- `metadata`: 12–13px mono, only when contrast remains AA
- `eyebrow`: 11–12px mono/sans, uppercase, tracked

## Surname rules

Test strings: **Wiśniewski, Łukasiewicz, Żółkiewski, Sękowski**.

- Keep optical sizing enabled on Fraunces.
- Hero surname is allowed to dominate 20–30% of the viewport.
- Reduce size before wrapping.
- Hyphenated names may wrap at the hyphen where necessary.
- Never transform to ASCII.
- Never use all-caps automatically for the surname; uppercase is an art-direction option only where tested.
- Existing `surname-fit.ts` remains the reference for measured fit in production result surfaces.

## OG/static rendering

Satori/next-og must use static TTF/OTF files, not WOFF2/variable fonts. Current approved static assets remain in `apps/web/assets/fonts/`.
