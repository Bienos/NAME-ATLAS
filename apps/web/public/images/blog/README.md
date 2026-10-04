# The blog's feature images

One image per post, shared by its Polish and English versions (TASK-075). Each post names its image and alt text in its header (`src/content/blog/README.md`).

| File | Post | Size | SHA-256 |
|---|---|---|---|
| `genealogia.webp` | genealogia | 1600 × 840, 24,164 bytes | `9701a894e394704d3004d3cb61ec264fbb8f3315d3da8394d4848afd2270433c` |
| `koncowki-nazwisk.webp` | koncowki-nazwisk | 1600 × 840, 10,414 bytes | `5a0c98925f7c458704e19645d5022b6ecf6107412944c536482f739dbfeaa75d` |
| `jak-szukac-przodkow.webp` | jak-szukac-przodkow | 1600 × 840, 12,630 bytes | `e9e2b681520c4acd7f95b5e48bfcdfe7b9092dd755915e18318216c70b440f19` |
| `historia-genealogii.webp` | historia-genealogii | 1600 × 840, 28,544 bytes | `d087ae9dd8d17c85bf9180544f70ad2eaeaad49944190579b0c3d2da058271b7` |
| `imie-i-nazwisko-ciekawostki.webp` | imie-i-nazwisko-ciekawostki | 1600 × 840, 22,188 bytes | `15b2c13777831c5e35d0daec3ad7f1fd9353adba17bb7ca70b991f73ea84dbf9` |
| `jak-sprawdzic-pochodzenie-nazwiska.webp` | jak-sprawdzic-pochodzenie-nazwiska | 1600 × 840, 19,178 bytes | `600a35764bdcda527a53bb54fd4186c1e7500dca13867d522b3e29a60544c6ff` |
| `kowalski-czy-kowalska.webp` | kowalski-czy-kowalska | 1600 × 840, 15,814 bytes | `903edf9e66440bba3a8c81c827b3016e041e5e4f79e31724595ae6b1c23b9e67` |
| `co-mozna-wyczytac-z-nazwiska.webp` | co-mozna-wyczytac-z-nazwiska | 1600 × 840, 10,816 bytes | `b098da897d60cf80d7c805f92be78f3eeaddfec24a8cbc9d607e280e8b0746bf` |
| `czy-to-samo-nazwisko-to-rodzina.webp` | czy-to-samo-nazwisko-to-rodzina | 1600 × 840, 18,668 bytes | `68d746df1cbb483376077b53f2bd73684ae163c54aab62fdf3e378868b8f892a` |
| `mapa-nazwiska-a-mapa-rodziny.webp` | mapa-nazwiska-a-mapa-rodziny | 1600 × 840, 8,424 bytes | `ebba7bf425017bc51a4fcaa7dc9b6304f64a605d4a02f71b01f06a573c3faab4` |

- **Origin:** drawn as SVG by `apps/web/scripts/build-blog-images.ts`, written in this repository on 2026-10-03 (Claude Code, for the project owner; later scenes added by each post's own task, the same day or after), from the dusk palette's `--dusk-*` values (ADR-0021). Each shape is defined in that script; its random placements come from a fixed seed, so a run reproduces the same images.
- **Tools:** headless Chromium 1194 (`/opt/pw-browsers`) rendered the SVG to PNG; ImageMagick 6.9.12 with libwebp 1.3.2 cropped it and encoded WebP at quality 82, with metadata stripped.
- **Contents:** illustration only. No text, face, photograph, document or map; nothing in them stands for a real person, record or place, or for where a surname comes from.
- **Third-party material:** none. No photograph, stock image, font outline or generative model went into them.
- **Rights:** made for Name Atlas in its own repository, with the same rights as the rest of its code and content. The repository has no licence file.

To change an image, edit the script and run `pnpm exec tsx apps/web/scripts/build-blog-images.ts`, then update this table.
