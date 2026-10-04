# TASK-097 — The share video: the studio makes a short vertical MP4 of the surname's cards, without music

- **Status:** IMPLEMENTED 2026-10-04 on `claude/tender-curie-ybiyaj`; record: `docs/progress/2026-10-04-share-video.md`.
- **Requested by:** the project owner, 2026-10-03: in the studio, readers should be able to "create … a short video to share on Instagram". On 2026-10-03 they chose "no music in v1". On 2026-10-04: "Do what you can".
- **Decision:** ADR-0034 §2.6 (the video comes later, drawn from the same validated facts as the card, without music in its first version). No new ADR: this task adds no surface, claim or data path that ADR-0034 does not already cover.
- **Depends on:** TASK-093 (the studio, `share-actions.ts`, the gate), on `main` @ `f4fcb8f`.
- **Model guidance:** implementation session. A browser run is required (§6).

## 1. Goal

In the share studio, a reader who may download the card (accounts off, or a session) can press **"Pobierz wideo"** / **"Download video"**. The browser then makes a short vertical MP4 from the surname's own share-card images and saves or shares it. Nothing is rendered on the server and nothing is stored. A browser that cannot encode the video does not show the button.

## 2. Facts (checked on `main` @ `f4fcb8f`, 2026-10-04)

1. The studio (`share-studio.tsx`) knows the surname's cards that have an image, summary first (`studioCards`). Each image is 1080 × 1920 at `shareCardPath(path, card, lang)`, gated by TASK-064 (401 without a session when accounts are on).
2. `share-actions.ts` fetches a card's image, shares it with the share sheet or saves it, and reports `sign-in` on a 401. `studio-client.tsx` shows a button only where the browser can do what it says (`useSyncExternalStore` over the browser's abilities).
3. Instagram Stories and Reels take 9:16 video in H.264 MP4. `MediaRecorder` records in real time from a canvas, its MP4 support differs by browser and version, and its frame timing is uneven, so it is not used. WebCodecs' `VideoEncoder` encodes H.264 frame by frame in Chromium and Edge, in Safari 17+, and in Firefox 130+ where the platform provides an H.264 encoder (browser support as published, not verified here). Its output is raw encoded frames, which need an MP4 container (a muxer).
4. The repository has no video or muxer dependency.

## 3. In scope

- **The clip:**
  - The studio's cards in their order, at most seven, each held at least 1.5 s (longer when there are few cards, so the clip lasts at least 8 s), with a 0.4 s push between them: the next card rises from below and pushes the current one up. A cross-fade was tried and dropped, because mid-fade it shows two cards' text over each other.
  - It ends with the summary pushed in again and held 1.5 s, with the site's address the card already prints.
  - Total length about 8–15 s. 1080 × 1920 at 30 fps, H.264 (High or Main profile; `avc1.640028` or `avc1.4d0028`), a few Mb/s. No audio track.
  - Drawn on a canvas from the card images the studio already serves, so the video shows exactly the cards' validated facts and nothing new.
- **One dependency:** an MP4 muxer for WebCodecs output, `mediabunny` 1.61 (MPL-2.0, checked with `npm view`; no native code, only type-definition dependencies). Justification: no browser API writes MP4 from encoded frames. It is loaded only when the button is pressed (`import()`), so no other page grows.
- **`share-video.ts`** (client):
  - `canMakeVideo()`: `VideoEncoder` exists, and `VideoEncoder.isConfigSupported` accepts the chosen H.264 config at 1080 × 1920. It is checked once, like the studio's other abilities.
  - `makeCardVideo(images, onProgress)`: fetches the images (a 401 is `sign-in`, like the card), encodes the frames off the main thread where the browser allows (`OffscreenCanvas`), muxes, and returns a `Blob` of type `video/mp4`. It can be cancelled.
- **The studio:**
  - A "Pobierz wideo" button beside the card's buttons, shown only where `canMakeVideo()` holds and the reader may download.
  - While encoding: "Tworzę wideo… n%" and a cancel button.
  - Then: the share sheet with the file where `navigator.canShare({ files })` accepts a `video/mp4`, otherwise a download of `{fileStem}-wideo.mp4`. A failure says "Nie udało się utworzyć wideo."
  - Without a session (accounts on), the button is not shown: the sign-in prompt already stands in for all of the card's actions.
- **Messages** in Polish and English.
- **Tests:** the frame schedule (which card is drawn at which time, the transitions, the total length) as a pure function; `canMakeVideo` false without `VideoEncoder` or with an unsupported config; the studio shows or hides the button by ability and verdict; the parity of messages.
- **Docs:** this file, `docs/CODEMAP.md`, `STATUS.md`, a progress record.

## 4. Out of scope

- Music or any audio track (ADR-0034 §2.6). The reader adds a track in Instagram.
- Rendering on the server; storing videos; posting to Instagram or any API.
- A video for a reader without a session when accounts are on.
- Text, figures or animation not already on the cards (counters, maps drawn in, voice-over).
- A GIF or WebM fallback.

## 5. Acceptance criteria

- **AC-1.** The schedule function gives each offered card its time in order, the transitions and the closing hold, and a total between 8 and 15 s for one to seven cards (unit).
- **AC-2.** `canMakeVideo()` is false without `VideoEncoder`, false when `isConfigSupported` rejects the config, and true when it accepts (unit with stubs).
- **AC-3.** The studio shows "Pobierz wideo" only with `off`/`open` and `canMakeVideo()`, never with `sign-in` or `unavailable` (unit).
- **AC-4.** In headless Chromium against a local server, the button makes an MP4 that `ffprobe` reads as H.264, 1080 × 1920, about 30 fps, with no audio stream and the expected duration. A frame taken from the middle of each card's time matches that card (§6).
- **AC-5.** The muxer is loaded only when the button is pressed. The studio's first-load JavaScript does not grow by more than a few kB (the build's route size table).
- **AC-6.** All new strings exist in both languages (the parity test).
- **AC-7.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then a local run as in TASK-093 §6: headless Chromium (whose bundled build includes H.264 encoding; check `isConfigSupported` first and say so if it does not), accounts off. Press "Pobierz wideo" for a surname with several cards in the fixture register, save the file, and read it with `ffprobe` (`/opt/pw-browsers/ffmpeg-*` or the system's). Safari, Firefox and the phone share sheet cannot be exercised here: say so in the progress record rather than claiming them.
