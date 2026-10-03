# Landing polish from the supplied dusk reference

The owner supplied `15-landing-zmierzch.png` and asked that the landing follow its polished design. This refines TASK-052's hero and preserves the search, language switching and existing data contracts.

## Changes

- Added `apps/web/public/images/landing-dusk.png`: a text-free cinematic background made with the **built-in imagegen tool** from the supplied reference. The selected output is `exec-d85a0ddc-4774-457c-8245-057ceb22eb89.png`; the reference was not edited. The image is decorative, not a distribution or count.
- `dusk-world.tsx` preloads the image through `next/image`. Responsive image sizes account for the phone's cropped scene. The image fades into the existing canvas when a search starts; reduced motion retains the immediate submission.
- `globals.css` aligns the masthead, cream Fraunces headline, lede, glass search pill and trust line with the reference. The desktop scene is framed 6.5% lower to keep the Poland outline below the search. Phones use a separate lower scene, a single-row search and a 16px input.
- Navigation classes let the landing show the reference's three primary desktop links. The offer stays accessible from its other existing entry points.
- Updated ADR-0021 and the code map. The mockup's surname total is not copied into the register line: ADR-0021 decision 7 still applies.

## Verification, 2026-10-02

The production release was isolated in a clean worktree based on `origin/main` at `35f0d1361d3ec2d82ba1259316e874c88fb9038f`. The other pending work in the original checkout was not included. Dependencies were installed from the unchanged lockfile with `pnpm install --frozen-lockfile` (exit 0); the initial offline attempt failed because a package was not available in that store.

The exact verification chain `pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build` completed with exit 0 in this clean release worktree.

| Command | Observed result |
| --- | --- |
| `pnpm typecheck` | Exit 0, all workspace projects |
| `pnpm lint` | Exit 0 |
| `pnpm format:check` | Exit 0, all matched files use Prettier code style |
| `pnpm check:ids` | Exit 0, every number used once |
| `pnpm test` | Exit 0, 1,841 unit tests passed, including 555 web tests |
| `pnpm build` | Exit 0, web, admin and worker built |
| `git diff --check` | Exit 0 |
| `node /private/tmp/name-atlas-landing-reference-check.mjs http://127.0.0.1:3027` | Exit 0 against the clean production build: `/` and `/?lang=en` returned 200 with GET search forms, autocomplete markup and the responsive image preload; the optimized 1200px WebP returned 200 and was 37,834 bytes |

The production build emitted existing Next.js warnings about the middleware convention, an internal Node API in the Edge Runtime, and the absent local `SITE_ORIGIN` for metadata. No build error occurred. The earlier original-checkout formatting failure was absent in the clean release.

**Not verified:** browser screenshots, interactive desktop/mobile layout and keyboard interaction. The Browser tool refused inspection because its admin-enforced access-policy check was unavailable, including a fresh retry during release preparation. No alternative browser mechanism was used. Database-backed surname results were not tested locally. Production deployment and live probes are recorded on the merged pull request, per `AGENTS.md` section 8.5. The development preview is `http://127.0.0.1:3026/`; the clean production build was probed on port 3027.

## Release base update

The first release head, `821763edc897f913333b5ca7b2b9235836601a8a`, passed GitHub CI (run `37038941565`) and Vercel preview. Before merging, #75 advanced `main` to `d619043f4b4cd13227e7b790db8c14aa48044741`. The release was rebased onto that commit. The only conflict was `STATUS.md`: its latest-change line and deployment record were resolved for the landing update while preserving #75's JPEG and sharing-crawler work. The landing application changes and the image are unchanged. Verification of the final release is recorded on its pull request.

## Image provenance and selected prompt

- Reference: `/Users/popcorn/Downloads/15-landing-zmierzch.png`, 1344 × 752. SHA-256: `704467aebd9614d8f5f73b340d2af01153863125de652c9268991f9a776988fb`.
- Saved project asset: `apps/web/public/images/landing-dusk.png`, 1677 × 938. SHA-256: `e0be24494d88c413f9c815cb6f3417e9e1eff28410723ce3245d14090c68397c`.
- Built-in tool, with the reference path supplied and `transparent_background: false`. No new dependency or CLI/API generation was used. A subsequent framing variant was generated but not selected; framing is handled in the stylesheet.

The complete prompt for the selected asset:

```text
Use case: precise-object-edit. Asset type: text-free cinematic background plate for a functional website hero. Input image: the supplied Name Atlas landing mockup is the edit target. Remove ALL website interface elements and ALL letters and numbers from this image: the Name Atlas logo, every navigation item, PL EN language switch, the tiny PESEL date and count line, the large Polish headline, both description lines, the entire rounded translucent search field including its search icon, placeholder and cream Odkryj button, and the small bottom footer sentence. Naturally restore the underlying sky in each erased area, matching the uninterrupted gradient and subtle stars. Keep the original scene unchanged: wide 16:9 landscape framing, deep near-black plum star-speckled upper sky blending down through burgundy to burnt orange, brilliant golden sunset along the curved Earth horizon at about 73 percent image height, warm sun flare on the far right, richly detailed dark ground visible in the bottom quarter, and the exact recognizable Poland outline in the bottom center glowing with thousands of small amber lights. Preserve the exact perspective, camera angle, land texture, map shape and map placement, color palette, contrast and sunset lighting from the input. Top two thirds remain spacious clean dark sky for live HTML text. No text, symbols, logos, controls, panels or typography anywhere. This is the original background extracted by removing the UI, not a new landing-page screenshot.
```
