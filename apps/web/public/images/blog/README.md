# The blog's feature images

One image per post, shared by its Polish and English versions (TASK-075). Each post names its image and alt text in its header (`src/content/blog/README.md`).

| File | Post | Size | SHA-256 |
|---|---|---|---|
| `genealogia.webp` | genealogia | 1600 × 840, 24,164 bytes | `9701a894e394704d3004d3cb61ec264fbb8f3315d3da8394d4848afd2270433c` |
| `koncowki-nazwisk.webp` | koncowki-nazwisk | 1600 × 840, 10,414 bytes | `5a0c98925f7c458704e19645d5022b6ecf6107412944c536482f739dbfeaa75d` |
| `jak-szukac-przodkow.webp` | jak-szukac-przodkow | 1600 × 840, 12,630 bytes | `e9e2b681520c4acd7f95b5e48bfcdfe7b9092dd755915e18318216c70b440f19` |
| `historia-genealogii.webp` | historia-genealogii | 1600 × 840, 28,544 bytes | `d087ae9dd8d17c85bf9180544f70ad2eaeaad49944190579b0c3d2da058271b7` |
| `imie-i-nazwisko-ciekawostki.webp` | imie-i-nazwisko-ciekawostki | 1600 × 840, 22,188 bytes | `15b2c13777831c5e35d0daec3ad7f1fd9353adba17bb7ca70b991f73ea84dbf9` |

- **Origin:** drawn as SVG by `apps/web/scripts/build-blog-images.ts`, written in this repository on 2026-10-03 (Claude Code, for the project owner), from the dusk palette's `--dusk-*` values (ADR-0021). Each shape is defined in that script; its random placements come from a fixed seed, so a run reproduces the same images.
- **Tools:** headless Chromium 1194 (`/opt/pw-browsers`) rendered the SVG to PNG; ImageMagick 6.9.12 with libwebp 1.3.2 cropped it and encoded WebP at quality 82, with metadata stripped.
- **Contents:** illustration only. No text, face, photograph, document or map; nothing in them stands for a real person, record or place, or for where a surname comes from.
- **Third-party material:** none. No photograph, stock image, font outline or generative model went into them.
- **Rights:** made for Name Atlas in its own repository, with the same rights as the rest of its code and content. The repository has no licence file.

To change an image, edit the script and run `pnpm exec tsx apps/web/scripts/build-blog-images.ts`, then update this table.
