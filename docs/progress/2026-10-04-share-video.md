# 2026-10-04 — TASK-097: the share video, a short MP4 of the surname's cards made in the browser, without music

Branch `claude/tender-curie-ybiyaj`, on `origin/main` @ `b796ed5` (#105). Asked for by the owner on 2026-10-03 ("a short video to share on Instagram"; "no music in v1"), and on 2026-10-04: "Do what's needed next". The task file is written and implemented in this one change.

## Changed

- `tasks/097-share-video.md`: the task. TASK-095 and TASK-096 are used on other branches (`claude/blog-piece-2`, `claude/couple-report-decision`, `claude/great-wozniak-5wwxf8`), so this takes 097.
- `apps/web/src/lib/share-video.ts`, new:
  - `videoSchedule(n)`: the timeline. One to seven cards, each held at least 1.5 s, then a 0.4 s push to the next; after the last card the summary is pushed in again and held 1.5 s. One card is held longer so a clip lasts at least 8 s. Seven cards give 14.8 s.
  - `canMakeVideo()`: WebCodecs accepts `avc1.640028` (H.264 High, level 4.0) at 1080 × 1920, 30 fps, 6 Mb/s.
  - `makeCardVideo(urls, onProgress, isCancelled)`: fetches the card images (a 401 is `sign-in`), draws each frame on an `OffscreenCanvas`, encodes H.264 through `mediabunny`'s `CanvasSource`, and muxes an MP4 with its index at the front (`fastStart: "in-memory"`). It has no audio track and returns a `video/mp4` `Blob`.
  - A cross-fade was tried first and replaced by the push: at mid-fade it drew two cards' text over each other (seen in a frame taken at 1.7 s).
- `share-actions.ts`: `shareOrSaveFile` sends a ready-made file to the share sheet where it takes the file, and downloads it everywhere else. The image share takes the file's type.
- `studio-client.tsx`: `StudioVideo`. It shows "Pobierz wideo" only after `canMakeVideo()` says yes, then "Tworzę wideo… n%" with a cancel button, then shares or saves the file. On failure it says so, or shows the sign-in link on a 401.
- `share-studio.tsx`: the studio passes every card it offers (summary first) and `{surname}-wideo.mp4` (`-video.mp4` in English), only in the full branch (`off` or `open`).
- `messages.ts`: four strings in each language.
- `globals.css`: the video button shares the studio buttons' style.
- **Dependency:** `mediabunny` 1.61.1 in `apps/web` (MPL-2.0, read with `npm view`; its only dependencies are two type packages). No browser API writes MP4 from encoded frames, so a muxer is needed. It is loaded with `import()` when the button is pressed: the build puts it in its own 664,025-byte chunk, and the studio page's own script is 4,949 bytes.
- **Tests:**
  - `share-video.test.ts`, new: the timeline for one to seven cards, the order, the push and its easing, the closing hold, the single-card hold, and `canMakeVideo` without WebCodecs, with a refused config, with an accepted config and when the check throws.
  - `share-studio-video.test.ts`, new: the studio offers the video with `off` and `open`, with the cards and the file name, and not with `sign-in` or `unavailable`.
- `STATUS.md`: a "Built" line; the "Next" line for the video removed; the "More cards" note about a recap video updated. `docs/CODEMAP.md`: the studio row names `share-video.ts`.

## Verified

- `pnpm typecheck`, `lint`, `format:check`, `check:ids`: exit 0.
- `pnpm test`: exit 0, with `apps/web` at 781 tests in 71 files. The first run failed one test: `design-tokens.test.ts` found a hand-written colour in `share-video.ts`. It now uses `TOKENS["dusk-surface"]`, and the run passed.
- `pnpm build`: exit 0.
- **In the studio, against the final build** (`next start`, accounts off, local PostgreSQL 16 with the fixture register, so NOWAK has one card):
  - **Chrome for Testing 154.0.8037.92:** `isConfigSupported` answered `supported: true`, and the button appeared. Pressing it downloaded `nowak-wideo.mp4` in 1.6 s.
  - **`ffprobe` of that file:** one stream, `h264`, profile High, 1080 × 1920, 30/1 fps, 240 frames, duration 8.000000 s, no audio stream.
- **Playwright's bundled Chromium 141:** it answered `supported: false` for the same configuration (the build has no H.264 encoder). The button did not appear, as intended.
- **Seven cards:**
  - **Setup:** the module bundled alone with esbuild on a local test page, fed NOWAK's seven live card images from name-atlas.pl (summary, rarity, neighbours, where, change, meaning, print; each a 1080 × 1920 PNG). Run in Chrome for Testing.
  - **Result:** made in 3.7 s. `ffprobe`: `h264` High, 1080 × 1920, 30 fps, 444 frames, 14.800000 s, no audio.
  - **Frame check:** a frame from the middle of each card's hold, compared by PSNR with all seven card images, matched its own card every time (38.8–41.0 dB, against at most 16.5 dB for any other). The frame at 14.5 s matched the summary (39.7 dB). A frame at 1.7 s shows the push: one card leaving at the top, the next entering below, no overlap.

## Not verified

- **Other browsers:** Safari, Firefox, Edge and phones were not run. Browser support for H.264 encoding is as published, not checked here. Where it is missing the button does not appear, as Chromium 141 showed.
- **The share sheet with a video:** it cannot be exercised headless. Only the download path was run.
- **Instagram:** uploading the file was not tried. The file is the format Instagram documents (H.264 MP4, 9:16, index at the front).
- **Not run in the studio:** cancelling mid-way, and the sign-in path on a 401 (accounts off here). Both are in code; only the 401 mapping shares `share-actions`' tested pattern.
- **`test:integration`, `test:golden`:** not run. No package, query or migration changed.
- **Production:** not deployed.
