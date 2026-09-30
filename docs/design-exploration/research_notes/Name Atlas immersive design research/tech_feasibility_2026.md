# Technical feasibility (as of 2026-09-30) of immersive, motion-rich, generative, mobile-first web layers for Name Atlas (Next.js App Router + TypeScript)

Research date: 2026-09-30. Conventions used throughout:

- **Cited Findings = FACT.** Every bullet carries an inline source. "Researcher measurement" means I measured the number myself on 2026-09-30 from the linked public file (method stated inline).
- **Inferences = INTERPRETATION.** These are my reasoning, not sourced facts.
- Tags: **[VERSION-DEPENDENT]** (this will drift), **[UNCERTAIN]**, **[SECONDARY SOURCE]** (not the vendor or standards body), **[UNVERIFIED]** (seen only in a search-result summary; I could not fetch the page).
- Compatibility snapshots: MDN browser-compat-data **v8.1.3 (2026-09-24)** ([data.json](https://unpkg.com/@mdn/browser-compat-data/data.json)); caniuse data **updated 2026-09-28** ([caniuse repo](https://github.com/Fyrd/caniuse)); webstatus.dev API queried 2026-09-30 ([webstatus.dev](https://webstatus.dev)); npm registry queried 2026-09-30 ([npmjs.com](https://www.npmjs.com)).
- Process note: the session's web-search quota ran out partway through. After that I verified facts by fetching primary URLs directly (vendor docs, W3C, web.dev, READMEs, browser source code).

---

## Key question 1a — WebGPU and GPU rendering libraries (Three.js WebGPURenderer + TSL, React Three Fiber v9+, OGL, PixiJS v8, regl)

### Takeaway
WebGPU is on by default in Chrome and Edge on desktop, in Chrome Android 121+ (Android 12+, most ARM, Qualcomm and Intel GPUs) and in Safari 26 on iOS, iPadOS and macOS. It is not available in Firefox on Android or Linux, or on iOS 18 and earlier, so webstatus.dev still rates it "Limited availability". For Name Atlas it can only be an optional enhancement on top of a WebGL2 baseline (WebGL2 reaches about 96% of users). Three.js's `WebGPURenderer` falls back to WebGL2 automatically. However, it is still described as experimental, and its WebGPU build is heavier than the WebGL build. For an abstract particle or flow-field layer, a WebGL2 approach of roughly 10–30 KB (OGL or hand-written) fits a mobile budget far better.

### Cited Findings
**WebGPU platform status**
- "WebGPU … is officially supported across Chrome, Edge, Firefox, and Safari" (published Nov 25, 2025). Chrome/Edge 113 on Windows (Direct3D 12), macOS and ChromeOS. "Support for Android was added in Chrome version 121 for devices running at least Android 12, and with Qualcomm/ARM GPUs". Firefox: Windows from 141 and "macOS Tahoe 26 on ARM64 machines, as of Firefox 145"; "Support for Linux, Android, and Intel-based Macs is in progress". Safari: "macOS Tahoe 26, iOS 26, iPadOS 26, and visionOS 26" — [web.dev](https://web.dev/blog/webgpu-supported-major-browsers)
- Current per-platform matrix:
  - Chrome Android: ARM/Qualcomm/Intel GPUs on Android 12+ since 121; Imagination GPUs on Android 16+ since 139; Samsung Xclipse "probably 154"; "Others: TBD".
  - Chrome Linux: Intel Gen12+ since 144; NVIDIA (driver 535.183.01+, Wayland) since 147; other GPUs behind a flag. Windows ARM64: behind a flag.
  - Firefox: Windows since 141. Apple-silicon Macs since 145 (macOS 26+) and 147 (all macOS versions). Intel Macs and Linux: Nightly only ("Mozilla expects to ship on Linux in 2026"). Android: behind a flag ("Mozilla expects to do work on Android in 2026").
  - Safari: enabled by default in macOS, iOS, iPadOS and visionOS 26.
  - Source: [gpuweb Implementation Status wiki](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)
- MDN compat data (api.GPU):
  - Chrome desktop: full support from 144; 113–143 are marked partial because Linux was missing.
  - Chrome Android: 121. Safari and Safari iOS: 26. Samsung Internet: 25.
  - Firefox: 141, partial, with the notes "Does not support macOS on Intel CPUs" and "Does not support Linux". Firefox Android: not supported.
  - Source: [MDN BCD v8.1.3](https://unpkg.com/@mdn/browser-compat-data/data.json)
- webstatus.dev rates WebGPU "limited". Implementations listed: Chrome 144 (dated 2026-01-13), Edge 144, Chrome Android 121, Safari and Safari iOS 26 (dated 2025-09-15). There is no Firefox entry — [webstatus.dev](https://webstatus.dev/features/webgpu)
- caniuse global usage for WebGPU: 85.72% full plus 3.05% partial — [caniuse](https://caniuse.com/webgpu)
- For comparison, WebGL 2.0 shipped in Chrome 56, Firefox 51 and Safari/iOS 15, and reaches 96.44% on caniuse — [caniuse](https://caniuse.com/webgl2), [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json)

**Three.js WebGPURenderer + TSL** [VERSION-DEPENDENT]
- The latest three.js is r186: `three@0.186.1`, published 2026-09-24 (0.186.0 was 2026-09-08) — [npm](https://www.npmjs.com/package/three)
- The r186 source says: "By default, the renderer tries to use a WebGPU backend if the browser supports WebGPU. If not, `WebGPURenderer` falls backs to a WebGL 2 backend". A `forceWebGL` option forces the WebGL2 backend — [three.js r186 WebGPURenderer.js](https://cdn.jsdelivr.net/npm/three@0.186.1/src/renderers/webgpu/WebGPURenderer.js)
- TSL (Three Shading Language) keeps materials "renderer agnostic" and "is also capable of encoding code into different outputs such as WGSL/GLSL - WebGPU/WebGL" — [three.js wiki: Three.js Shading Language](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)
- The R3F docs say the three.js WebGPU renderer is "still a work in progress and not fully backward-compatible with all of Three's features" and needs async initialisation — [R3F v9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)
- [SECONDARY SOURCE] A migration guide updated 2026-09-24 reports the following — [Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide):
  - It quotes the three.js manual calling `WebGPURenderer` "still in an experimental state", where users may find "missing features or better performance with `WebGLRenderer`". I could not fetch the manual page directly.
  - `ShaderMaterial`, `RawShaderMaterial` and `onBeforeCompile` do not work under `WebGPURenderer`; shaders need porting to TSL.
  - `EffectComposer` and pmndrs postprocessing do not run; some drei components (e.g. `Text`) are incompatible.
  - "WebGPU isn't universally faster".
  - Importing `WebGLRenderer` alongside `three/webgpu` grew their bundle from 220 KB to 307 KB gzipped.
- Researcher measurement: three@0.186.1 build files, minified with esbuild 0.25.10, gzip -9, no tree-shaking. `three.core` is 101.7 KB, `three.module` (the WebGLRenderer path) is 88.0 KB and `three.webgpu` is 194.7 KB. That puts the WebGL path at about 190 KB gz and the WebGPU path at about 296 KB gz — [three build directory](https://cdn.jsdelivr.net/npm/three@0.186.1/build/)

**React Three Fiber (R3F)** [VERSION-DEPENDENT]
- `@react-three/fiber` latest is 9.8.1 (2026-09-24). 9.0.0 was released 2025-02-19. The `alpha` tag is 10.0.0-alpha.5 (2026-09-08) — [npm](https://www.npmjs.com/package/@react-three/fiber)
- v9 "is a compatibility release for React 19". The Canvas `gl` prop can return a promise, so `WebGPURenderer` (imported from `three/webgpu` together with `three/tsl`) can be awaited — [R3F v9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)
- [UNVERIFIED] Search-result summaries of the release notes say v10 alphas add first-class WebGPU/TSL support (e.g. `@react-three/fiber/webgpu` typings, `useRenderPipeline`) — [newreleases.io](https://newreleases.io/project/npm/@react-three/fiber/release/10.0.0-alpha.5)
- Helper package status:
  - `@react-three/drei` 10.7.9 (2026-09-25) — [npm](https://www.npmjs.com/package/@react-three/drei)
  - `@react-three/offscreen` latest 0.0.8 (2023-05-11) — [npm](https://www.npmjs.com/package/@react-three/offscreen)
  - `@react-three/a11y` latest 3.0.0 (2022-05-15) — [npm](https://www.npmjs.com/package/@react-three/a11y)

**OGL, PixiJS, regl**
- OGL describes itself as a "Minimal WebGL library" with zero dependencies, "tightly coupled with WebGL". Minzipped sizes: Core 8 KB, Math 6 KB, Extras 15 KB, total 29 KB, smaller after tree-shaking — [OGL README](https://github.com/oframe/ogl). Latest 1.0.11 (2025-01-27), Unlicense — [npm](https://www.npmjs.com/package/ogl)
- PixiJS v8 (launched March 2024) builds WebGPU in "as a core paradigm" next to WebGL. It warns that "WebGPU does not automatically guarantee improved performance over WebGL in all scenarios, as PixiJS often encounters more limitations on the CPU side than the GPU". Renderer init is async and loads only the backend in use — [PixiJS blog](https://pixijs.com/blog/pixi-v8-launches)
- PixiJS latest is 8.21.0 (2026-09-17), MIT — [npm](https://www.npmjs.com/package/pixi.js). Researcher measurement: the full `dist/pixi.min.mjs` is 227.8 KB gz without tree-shaking — [jsDelivr file](https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs)
- regl ("Fast functional WebGL"): latest 2.1.1 (2024-11-12); the release before that was 2.1.0 (2021-02-24) — [npm](https://www.npmjs.com/package/regl), [README](https://github.com/regl-project/regl). Researcher measurement: `dist/regl.min.js` is 27.9 KB gz — [jsDelivr file](https://cdn.jsdelivr.net/npm/regl@2.1.1/dist/regl.min.js)

### Inferences
- WebGPU cannot be required. It is missing on iOS 18 and earlier, Firefox Android and Linux, and many Android GPUs, and those are exactly the "mobile, from social" users Name Atlas targets. Every GPU effect needs a WebGL2 path, and every GPU layer needs a non-GPU poster fallback.
- WebGPU's big wins (compute shaders, millions of particles, fewer draw calls) exceed what Name Atlas needs. A layer of 5k–50k particles is within reach of WebGL2 instancing or point sprites. So WebGPU buys little here and costs bundle weight plus a backend-divergence risk.
- Ranking for the generative layer:
  1. A bespoke WebGL2 module or OGL (smallest, full shader control).
  2. PixiJS if the effects are 2D-sprite/text-centric (tree-shake aggressively).
  3. Three.js WebGL path (~190 KB gz) only if genuine 3D is needed.
  4. `three/webgpu` + TSL (~296 KB gz) only on a dedicated "explore" route, never on every public surname page.
- R3F adds React reconciliation and three.js weight. It fits a heavy interactive explorer route, not a lightweight ambient layer on SEO pages. Its offscreen and a11y helpers look unmaintained, so they should not be depended on.
- Avoid regl for new work: it has had no feature releases since 2021 and is WebGL1-era in design. The design-era part is my own reading, not verified.

### Gaps
- I found no 2025–2026 benchmark comparing WebGPU with WebGL2 for particle workloads on mid-range Android phones or iPhones.
- I found no data on iOS 26 adoption share, which caps WebGPU reach on iPhones.
- I could not fetch the three.js manual's own wording on "experimental" status; it comes via a secondary source.
- The R3F v10 stable date is unknown.

---

## Key question 1b — Animation and motion libraries (GSAP 3.13+, Lenis, Motion, Theatre.js, Rive, Lottie/dotLottie)

### Takeaway
GSAP, including SplitText, MorphSVG and ScrollTrigger, is now free for commercial use. It is licensed under Webflow's proprietary "Standard 'No Charge' License", not an open-source licence: it prohibits use in competing visual animation builders and can be amended or terminated by Webflow. Motion (MIT) is the lowest-friction React choice and has built-in reduced-motion handling and ScrollTimeline acceleration. By default Lenis smooths only wheel input, not touch, so it adds little on phones. Theatre.js has no public releases since May 2024. Rive and dotLottie are actively maintained but pull in WebAssembly runtimes of roughly 350–885 KB gzipped.

### Cited Findings
**GSAP** [VERSION-DEPENDENT]
- The 3.13 release post (dated April 29, 2025) says: "Thanks to Webflow GSAP is now 100% FREE including ALL of the bonus plugins like SplitText, MorphSVG … even for commercial use". All plugins were added to the public npm package, and users were asked to move off the private repository by June 1, 2025 — [GSAP 3.13 release](https://gsap.com/blog/3-13/)
- The licence is titled "Standard 'No Charge' GSAP License" — [GSAP Standard License](https://gsap.com/standard-license/):
  - Webflow grants "a non-exclusive, worldwide license to use, reproduce, display, and implement GSAP Products solely for Permitted Uses". Permitted Uses cover use "on any website, web application, or digital interface".
  - "Prohibited Uses" means use "in tools that allow users to build visual animations without code that … competes with Webflow's visual animation building capabilities".
  - "All intellectual property rights … remain the exclusive property of Webflow". Webflow "may terminate this GSAP License … in its discretion if you fail to comply", and "reserves the right to update or modify this GSAP License at any time".
  - FAQ: "Commercial usage is covered under the standard license."
- Current version is gsap 3.15.0 (2026-04-13); 3.14.0 was 2025-12-08 and 3.13.0 was 2025-04-30. The npm licence field reads "Standard 'no charge' license" — [npm](https://www.npmjs.com/package/gsap)
- SplitText v3.13 was rewritten to be "50% smaller" with "14 new features". It now "Adds aria-label to the split element(s) and aria-hidden to the freshly-created line/word/character elements" and claims "Improved emoji and foreign character support" — [GSAP 3.13 release](https://gsap.com/blog/3-13/)
- Researcher measurement (gsap 3.15.0 `dist/*.min.js`, gzip -9): core 27.6 KB, ScrollTrigger 17.5 KB, SplitText 3.6 KB, MorphSVGPlugin 9.3 KB — [jsDelivr gsap dist](https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/)

**Lenis** [VERSION-DEPENDENT]
- "Runs on native scroll — wraps the browser's own scroll, so position: sticky, anchor links, and accessibility keep working" — [Lenis README](https://github.com/darkroomengineering/lenis)
- Default options — [Lenis README](https://github.com/darkroomengineering/lenis):
  - `smoothWheel` defaults to `true`.
  - `syncTouch` defaults to `false` ("Mimic touch device scroll … can be unstable on iOS<16").
  - `respectReducedMotion` defaults to `true` ("smoothing is disabled and programmatic scrolls are instant").
- Documented limitations — [Lenis README](https://github.com/darkroomengineering/lenis):
  - "no support for CSS scroll-snap".
  - "capped to 60fps on Safari … and 30fps on low power mode".
  - "smooth scroll will stop working over iframe".
- Latest is 1.3.26 (2026-08-05), MIT; a 2.0.0-dev tag exists — [npm](https://www.npmjs.com/package/lenis). Researcher measurement: `dist/lenis.min.js` is 5.3 KB gz — [jsDelivr file](https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js)

**Motion (motion.dev)** [VERSION-DEPENDENT]
- `motion` 13.4.6 (2026-09-29), MIT. 13.0.0 was 2026-08-05 and 12.0.0 was 2025-01-20. `framer-motion` publishes the same version numbers — [npm motion](https://www.npmjs.com/package/motion), [npm framer-motion](https://www.npmjs.com/package/framer-motion)
- With `<MotionConfig reducedMotion="user">`, "all motion components will automatically disable transform and layout animations, while preserving the animation of other values like opacity and backgroundColor". A `useReducedMotion` hook is also provided — [Motion accessibility docs](https://motion.dev/docs/react-accessibility)
- `scroll()` "binds animations to scroll progress, hardware-accelerated where supported … with the ScrollTimeline API where possible" — [Motion scroll docs](https://motion.dev/docs/scroll)
- Researcher measurement: the vanilla `dist/motion.js` full bundle is 47.7 KB gz. I did not measure the React entry point — [jsDelivr file](https://cdn.jsdelivr.net/npm/motion@13.4.6/dist/motion.js)

**Theatre.js**
- The latest npm release of `@theatre/core` is 0.7.2 (2024-05-19) — [npm](https://www.npmjs.com/package/@theatre/core)
- The README says: "Theatre.js 1.0 is around the corner. We have *temporarily* moved development to a private repo". The core is Apache-2.0 and the studio is AGPL-3.0 — [GitHub theatre-js/theatre](https://github.com/theatre-js/theatre)

**Rive** [VERSION-DEPENDENT]
- The runtimes are MIT-licensed and actively published: `@rive-app/canvas` 2.43.1 (2026-09-23) and `@rive-app/react-canvas` 4.35.0 (2026-09-24) — [npm canvas](https://www.npmjs.com/package/@rive-app/canvas), [npm react-canvas](https://www.npmjs.com/package/@rive-app/react-canvas)
- Researcher measurement (v2.43.1, gzip -9):

  | Package | `rive.wasm` | `rive.js` |
  |---|---|---|
  | `@rive-app/canvas` | 785.0 KB | 99.7 KB |
  | `@rive-app/canvas-lite` | 350.5 KB | 92.2 KB |
  | `@rive-app/webgl2` | 884.4 KB | 100.5 KB |

  Source: [jsDelivr @rive-app/canvas](https://cdn.jsdelivr.net/npm/@rive-app/canvas@2.43.1/)

**Lottie / dotLottie** [VERSION-DEPENDENT]
- dotLottie is an "open-source file format that bundles one or more Lottie animations along with their assets into a single, compressed .lottie file" — [dotlottie-web README](https://github.com/LottieFiles/dotlottie-web/tree/main/packages/web)
- "The player's WASM engine (~500 KB compressed) is fetched from a CDN when the first player is constructed". It can be preloaded or self-hosted. `DotLottieWorker` starts its worker from a `blob:` URL, so a Content Security Policy must allow `worker-src blob:` or you self-host the worker — [dotlottie-web README](https://github.com/LottieFiles/dotlottie-web/tree/main/packages/web)
- `@lottiefiles/dotlottie-web` 0.80.0 (2026-08-28), MIT — [npm](https://www.npmjs.com/package/@lottiefiles/dotlottie-web). Researcher measurement: `dotlottie-player.wasm` 484.8 KB gz and `index.js` 32.1 KB gz — [jsDelivr](https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.80.0/dist/)
- `lottie-web` latest is 5.13.0 (2025-05-21) — [npm](https://www.npmjs.com/package/lottie-web). Researcher measurement: `lottie.min.js` 74.3 KB gz; the SVG-only `lottie_light.min.js` 45.4 KB gz — [jsDelivr](https://cdn.jsdelivr.net/npm/lottie-web@5.13.0/build/player/)

### Inferences
- GSAP's licence permits Name Atlas's use (a website), but GSAP is **not open source**. Record it as proprietary and vendor-controlled (Webflow can amend the terms or terminate on non-compliance). Keep usage replaceable. Do not describe it as MIT anywhere in docs or ADRs.
- In an App Router codebase, Motion is the default choice for UI transitions and scroll-linked effects: MIT licence, React-native API, `reducedMotion="user"` semantics that match best practice, and ScrollTimeline offload. GSAP is worth adding only if timeline-heavy kinetic typography (SplitText, MorphSVG) is central to the concept.
- SplitText's accessibility approach (`aria-label` on the parent) is unreliable on `<p>` or `<span>` because ARIA prohibits naming those roles (see Q3). Prefer headings, or a visually hidden intact copy.
- Lenis adds little on touch devices, since touch is left native by default, and it caps rendering on Safari. For a mobile-first product, skip it. If used on desktop, keep `respectReducedMotion` on and `syncTouch` off.
- Rive and dotLottie suit designer-authored interactive illustrations, but at 350–885 KB gz of WASM they must never sit in the critical path or on every surname page. Load them only on demand, after an interaction, on a dedicated view.
- Theatre.js is not safe to depend on: public releases stopped in May 2024 and its future is uncertain.

### Gaps
- The legal boundary of GSAP's "Competitive Products" clause needs interpretation by counsel. These notes are not legal advice.
- I did not verify whether Rive's text engine handles Polish diacritics and Polish-specific glyph shapes.
- I did not measure the React-specific Motion bundle, which differs from the vanilla `motion.js` figure.
- I could not read the SplitText docs page (a bot-verification wall), so the details of its current `aria` option are unverified beyond the 3.13 release notes.

---

## Key question 1c — Native platform features: View Transitions (plus Next.js App Router support), CSS scroll-driven animations, @property, container queries, variable-font axes, SVG filters

### Takeaway
Same-document View Transitions reached Baseline in October 2025. The Next.js 16 App Router supports React's `<ViewTransition>` with no configuration. Cross-document View Transitions and CSS scroll-driven animations (`animation-timeline: scroll()/view()`) work in Chromium and Safari 26 but not in stable Firefox. Both are Interop 2026 focus areas, so treat them strictly as progressive enhancement. `@property`, size container queries and variable-font axes are safe to use. Animated `feTurbulence`/`feDisplacementMap` filters are a known performance trap on iOS/WebKit.

### Cited Findings
**View Transitions** [VERSION-DEPENDENT]
- Same-document view transitions are "newly available" Baseline since 2025-10-14, when Firefox 144 shipped them; Chrome has had them since 111 and Safari since 18 — [webstatus.dev](https://webstatus.dev/features/view-transitions). caniuse puts reach at 91.75% — [caniuse](https://caniuse.com/view-transitions)
- Cross-document view transitions (`@view-transition`) are "limited": Chrome 126 and Safari 18.2, with Firefox not supported (implementation bug 1860854) — [webstatus.dev](https://webstatus.dev/features/cross-document-view-transitions), [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json). caniuse reach: 85.97% full plus 1.81% partial — [caniuse](https://caniuse.com/cross-document-view-transitions)
- The `:active-view-transition` selector is supported in Chrome 125, Firefox 144 and Safari 18 — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json)
- Interop 2026 (announced Feb 12, 2026) view-transition focus: "Improving same-document view transitions", `blocking="render"`, `<link rel="expect">`, `:active-view-transition-type()`, and "Cross-document view transitions" — [web.dev Interop 2026](https://web.dev/blog/interop-2026)
- Next.js docs (version 16.3.7) — [Next.js View transitions guide](https://nextjs.org/docs/app/guides/view-transitions):
  - "View transitions work in the App Router with no configuration. The App Router uses React canary releases, which contain all stable React 19 changes as well as newer features like `ViewTransition`."
  - "React's integration uses newer View Transitions API features (transition types and `view-transition-class`), available in Chromium 125+ and recent Safari and Firefox versions. Some animations may behave differently in Safari. Without browser support, your application works normally; the transitions do not animate."
  - Animations are triggered by Transitions, `<Suspense>` and `useDeferredValue`, and "route navigations are transitions". A shared-element morph only plays "when the destination content renders in the same commit as the navigation", which is the case for prefetched pages.
  - The guide includes a "Respecting reduced motion" CSS recipe that zeroes view-transition animation durations under `prefers-reduced-motion: reduce`.
- Researcher inspection: the `react@19.3.0` production build (published 2026-09-09) exports `ViewTransition` and `Activity` without an `unstable_` prefix — [react.production.js](https://cdn.jsdelivr.net/npm/react@19.3.0/cjs/react.production.js), [npm react](https://www.npmjs.com/package/react)
- Next.js 16.0.0 was released 2025-10-22; the current version is 16.3.7 (2026-09-29) — [npm next](https://www.npmjs.com/package/next)

**CSS scroll-driven animations** [VERSION-DEPENDENT]
- `animation-timeline`, `scroll()`, `view()`, `scroll-timeline` and `animation-range` are supported in Chrome/Edge 115 and Safari 26 on macOS and iOS. Firefox has them only in "preview" (Nightly), and Firefox Android does not have them — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json). webstatus.dev rates them "limited" — [webstatus.dev](https://webstatus.dev/features/scroll-driven-animations)
- WebKit: "Scroll-driven animations let you more easily create animations that respond to scroll position, now entirely in CSS … no JavaScript needed"; "We shipped support for scroll-driven animations in Safari 26.0" — [WebKit: Announcing Interop 2026](https://webkit.org/blog/17818/announcing-interop-2026/)
- Scroll-driven animations are an Interop 2026 focus area — [web.dev Interop 2026](https://web.dev/blog/interop-2026)

**@property, container queries, variable fonts, typography helpers**
- Registered custom properties (`@property`) are "newly available" Baseline since 2024-07-09: Firefox 128, Chrome 85, Safari 16.4 — [webstatus.dev](https://webstatus.dev/features/registered-custom-properties)
- Size container queries are "widely available" Baseline (newly available 2023-02-14, widely available 2025-08-14) — [webstatus.dev](https://webstatus.dev/features/container-queries)
- Container style queries (custom properties only) are "newly available" since 2026-05-19, when Firefox 151 shipped them. MDN notes that in Safari "The document element cannot be a container" — [webstatus.dev](https://webstatus.dev/features/container-style-queries), [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json)
- `font-variation-settings` is "widely available" Baseline (since 2021-03-05) — [webstatus.dev](https://webstatus.dev/features/font-variation-settings). caniuse reach for variable fonts: 96.54% — [caniuse](https://caniuse.com/variable-fonts)
- `text-wrap: balance`: Chrome 114, Firefox 121, Safari 17.5. `content-visibility`: Chrome 85, Firefox 125, Safari 18 — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json)

**SVG filters (`feTurbulence`, `feDisplacementMap`)**
- WebKit bug 263848, "SVG animation is slow, as GPU is not used for filters", reported 2023-10-29, is still in status NEW — [WebKit Bugzilla 263848](https://bugs.webkit.org/show_bug.cgi?id=263848)
- A GSAP forum thread (2022) reports — [GSAP forum](https://greensock.com/forums/topic/33075-gsap-and-feturbulence-mobile-performance/):
  - "SVG filters are pretty horrific for performance".
  - An animated `feTurbulence` effect "works excellent on desktop, but when I test on iOS the animation is really sluggish".
  - Filters can be animated "in very short bursts, or on a small area".
  - The suggested alternative is "pixi or webGL/three".

### Inferences
- Use React `<ViewTransition>` for route-to-route continuity (for example, morphing a surname title from search results into the surname page). It degrades to an instant swap where unsupported and is Baseline for same-document use. App Router navigations are client-side, so cross-document VTs matter only on full page loads such as first arrival from Google. Treat them as a Chromium/Safari-only nicety.
- Write scroll reveals as CSS `animation-timeline: view()` inside `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`. Default styles must leave content fully visible, so Firefox users (no support in stable) and bots lose nothing. Prefer this over JS scroll listeners or ScrollTrigger for simple reveals.
- `@property` makes animatable typed custom properties safe to use, for example for driving gradient angles or axis values smoothly. [UNCERTAIN] Animating `font-variation-settings` every frame probably forces text re-shaping and re-rasterisation, so limit axis animation to short heading moments rather than body text. I found no measurements.
- Static SVG filters, such as a rendered-once grain texture, are acceptable. Animated displacement or turbulence over large areas should be done in a WebGL fragment shader or not at all on mobile.

### Gaps
- No Firefox ship dates for scroll-driven animations or cross-document VTs appeared in the sources I found.
- I found no measurements of the cost of animating variable-font axes on mobile.
- Next.js does not detail what "Some animations may behave differently in Safari" means.

---

## Key question 1d — Canvas 2D vs WebGL for about 5,000–50,000 particles on mid-range phones; OffscreenCanvas and workers; Web Audio; vibration and haptics

### Takeaway
I found no current, reproducible benchmark for 5k–50k particles on 2025–2026 mid-range phones. The available evidence (older mobile data, desktop sprite benchmarks, R3F guidance) consistently says GPU instancing handles tens of thousands of objects where Canvas 2D stalls in the hundreds to low thousands, so an in-house device benchmark is required. OffscreenCanvas is "widely available" Baseline, including WebGL in workers since Safari 17. Web Audio requires a user gesture. iOS has no Vibration API; the only web-exposed iOS haptic is the iOS 18 `<input type=checkbox switch>` toggle.

### Cited Findings
- Historical mobile data from August 2014, Chrome on a Nexus 5 (old hardware and browser): "canvas2d: 360 objects @ 30 FPS" versus "webgl: ~17,500 objects @ 30 FPS", described as "nearly 50x" — [Ashley Gullen, W3C WHATWG archive](https://lists.w3.org/Archives/Public/public-whatwg-archive/2014Aug/0038.html)
- A desktop sprite benchmark (10,000 sprites; Ryzen 5 4500U laptop, Edge 109) measured Babylon.js at 56 FPS, Pixi.js at 47 FPS and Phaser at 43 FPS. Among rendering libraries, "The most performant was discovered to be Pixi.js, followed by Three.js and Two.js". This is not a phone benchmark — [js-game-rendering-benchmark](https://github.com/Shirajuki/js-game-rendering-benchmark)
- R3F guidance says each mesh is a draw call, "no more than 1000 as the very maximum, and optimally a few hundred or less". Its documented instancing example uses `count = 100000` — [R3F: Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- PixiJS reports that it often hits CPU-side limits before GPU limits, so WebGPU is not automatically faster — [PixiJS v8 launch](https://pixijs.com/blog/pixi-v8-launches)
- OffscreenCanvas is "widely available" Baseline (newly available 2023-03-27, widely available 2025-09-27) — [webstatus.dev](https://webstatus.dev/features/offscreen-canvas). `transferControlToOffscreen` has been in Safari since 16.4. WebGL and WebGL2 contexts on OffscreenCanvas arrived in Safari 17 — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json)
- three.js `WebGLRenderer.compileAsync` "makes use of the `KHR_parallel_shader_compile` WebGL extension" — [three.js r186 WebGLRenderer.js](https://cdn.jsdelivr.net/npm/three@0.186.1/src/renderers/WebGLRenderer.js). That extension "enables a non-blocking poll operation, so that compile/link status availability … can be queried without potentially incurring stalls", with "Limited availability" — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/KHR_parallel_shader_compile)
- Web Audio is "widely available" Baseline (widely available 2023-10-26; Safari 14.1 / iOS 14.5) — [webstatus.dev](https://webstatus.dev/features/web-audio). The autoplay policy is "Create or resume context from inside a user gesture", and a context created outside a gesture starts `suspended` — [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- The Audio Session API (`navigator.audioSession`) exists only in Safari 16.4+ (Firefox "preview", no Chrome) — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json). MDN marks it "Limited availability" and "Experimental", with types including "playback", "transient", "transient-solo", "ambient" and "play-and-record" — [MDN AudioSession](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession)
- Vibration API — [webstatus.dev](https://webstatus.dev/features/vibration), [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API), [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json):
  - webstatus.dev rates it "limited", with implementations in Chrome and Edge only.
  - MDN compat data: no Safari or iOS support; removed from Firefox desktop in 129; on Firefox Android "Vibration is disabled".
  - Chrome: "Beginning in Chrome 60, this method requires a user gesture".
- "WebKit for Safari on iOS 18 adds haptic feedback for `<input type=checkbox switch>`" — [WebKit: Features in Safari 18.0](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/). The `switch` attribute itself is supported only in Safari 17.4+ — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json), [WebKit: An HTML switch control](https://webkit.org/blog/15054/an-html-switch-control/)

### Inferences
- Rough particle tiers, **to be validated on real devices**: 500–2,000 particles for a Canvas 2D fallback; 5,000–20,000 for WebGL2 on a mid tier; up to about 50,000 for WebGL2 on a high tier. All should use a single instanced draw or `gl.POINTS`, with the simulation in a shader or in a worker. 50k-plus is where WebGPU compute starts to matter, which Name Atlas does not need.
- Moving the simulation and rendering into a worker via OffscreenCanvas keeps the main thread free for input, which protects INP. This is feasible on current Chrome, Firefox and Safari 17+. The R3F offscreen helper is stale, so this favours a framework-light renderer.
- Audio should be strictly opt-in, off by default, started from a tap, and never needed to understand content.
- Haptics: `navigator.vibrate` after a user gesture on Android only, as a garnish. Do not use the iOS 18 switch-toggle trick as a general haptics channel: it abuses a form control's semantics, and its behaviour could change.

### Gaps
- No 2025–2026 particle benchmark on reference mid-range phones (e.g. Galaxy A-series, Pixel "a" series, iPhone 12/13) was found. The team must measure its own.
- I found no documentation of how the iOS ring/silent switch interacts with Web Audio (MDN's AudioSession page does not specify).

---

## Key question 2 — Performance: Core Web Vitals budgets and patterns when adding WebGL/canvas layers

### Takeaway
The Core Web Vitals "good" thresholds are LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1, all at the 75th percentile and segmented by mobile and desktop. `<canvas>` is not an LCP candidate, so the server-rendered surname heading or text (or a poster `<img>`) will be the LCP element. The immersive layer must never delay, hide or cover it. The real risks are:

- JavaScript weight and main-thread work (hydration, context creation, shader compilation), which hurt INP;
- late-sizing canvases and font swaps, which hurt CLS;
- unbounded render loops, which drain battery (iOS Low Power Mode throttles `requestAnimationFrame` to 30 fps).

### Cited Findings
- "LCP should occur within 2.5 seconds", "pages should have a INP of 200 milliseconds or less", "pages should maintain a CLS of 0.1. or less". A good threshold is "the 75th percentile of page loads, segmented across mobile and desktop devices" — [web.dev Web Vitals](https://web.dev/articles/vitals)
- Elements considered for LCP: `<img>`, `<image>` inside `<svg>`, `<video>` (poster or first frame), elements with a `url()` background image, and "Block-level elements containing text nodes". `<canvas>` is not in the list. Excluded: "Elements with an opacity of 0" and "Elements that cover the full viewport, that are likely considered as background". Also, "Neither are text nodes using web fonts during the font block period" considered rendered — [web.dev LCP](https://web.dev/articles/lcp)
- Google Search runs JavaScript "with an evergreen version of Chromium". Pages can wait in the render queue "for a few seconds, but it can take longer". "server-side or pre-rendering is still a great idea because it makes your website faster for users and crawlers, and not all bots can run JavaScript" — [Google Search Central: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Next.js lazy loading — [Next.js Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading):
  - `next/dynamic` "is a composite of `React.lazy()` and Suspense".
  - "`ssr: false` option will only work for Client Components".
  - "When a Server Component dynamically imports a Client Component, automatic code splitting is currently **not** supported."
- GPU tiering with detect-gpu — [detect-gpu README](https://github.com/pmndrs/detect-gpu):
  - The package has moved to `@pmndrs/detect-gpu`. It classifies GPUs by benchmark fps: `tier: 0` if no WebGL context, blocklisted or under 15 fps; tier 1 at ≥15 fps; tier 2 at ≥30 fps; tier 3 at ≥60 fps.
  - Benchmark data loads from the UNPKG CDN by default, with a self-hosting option.
  - "Our benchmark data source (gfxbench.com) stopped updating in December 2025."
  - `@pmndrs/detect-gpu` latest is 6.0.24 (2026-09-27); the old `detect-gpu` package last published 5.0.70 (2025-02-23) — [npm @pmndrs/detect-gpu](https://www.npmjs.com/package/@pmndrs/detect-gpu), [npm detect-gpu](https://www.npmjs.com/package/detect-gpu). Researcher measurement: `dist/index.mjs` is 3.6 KB gz, plus the benchmark JSON fetch — [jsDelivr](https://cdn.jsdelivr.net/npm/@pmndrs/detect-gpu@6.0.24/dist/index.mjs)
- R3F performance tooling — [R3F: Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance):
  - On-demand rendering (`frameloop="demand"`) "will only render when necessary".
  - drei's `PerformanceMonitor` "will collect the average fps (frames per second) over time". It exposes `onIncline`/`onDecline`, a 0–1 `factor`, and `flipflops` with an `onFallback` for a lowest baseline. The documented example adapts `dpr` between 1 and 2.
- iOS frame rate caps — [WebKit Bugzilla 215745](https://bugs.webkit.org/show_bug.cgi?id=215745), [Lenis README](https://github.com/darkroomengineering/lenis):
  - WebKit bug 215745, "Throttling requestAnimation Frame to 30 FPS in low power mode on iOS 14", is RESOLVED INVALID, meaning the throttling is intended behaviour.
  - Lenis documents "capped to 60fps on Safari … and 30fps on low power mode".
- Device-signal APIs are fragmented — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json):
  - Battery Status (`navigator.getBattery`): Chromium only (removed from Firefox in 52).
  - Compute Pressure (`PressureObserver`): Chrome/Edge 125 on desktop only.
  - `navigator.connection` (Save-Data, effectiveType): Chromium only.
  - `prefers-reduced-data`: behind a flag only.
- `requestIdleCallback` is not in Safari (Technology Preview behind a flag only); caniuse reach is 81.18% — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json), [caniuse](https://caniuse.com/requestidlecallback). `scheduler.yield()` is in Chrome 129 and Firefox 142, not Safari — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json)
- WebKit caps canvas area at `8192 * 8192` device pixels on iOS and `16384 * 16384` elsewhere, and logs "Canvas area exceeds the maximum limit" — [WebKit CanvasBase.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CanvasBase.cpp)
- For bundle-weight references (researcher measurements), see Key questions 1a and 1b: three.js WebGL path ≈190 KB gz, WebGPU path ≈296 KB gz; PixiJS full 228 KB gz; OGL 29 KB (README figure); GSAP core plus ScrollTrigger ≈45 KB gz; Motion vanilla 48 KB gz; Rive WASM 350–885 KB gz; dotLottie WASM 485 KB gz.

### Inferences
- **Recommended loading sequence** (interpretation):
  1. Server-render all facts and the surname heading as HTML.
  2. Show a **poster** of the same generative artwork as inline SVG or `<img>` with fixed dimensions (seeded identically, see Q4).
  3. Mount a small Client Component "island" after `load`. Use `requestIdleCallback` where it exists and a `setTimeout` fallback for Safari.
  4. The island checks capabilities: `prefers-reduced-motion`, WebGL2 context creation, optional GPU tier, and `navigator.connection.saveData` where exposed.
  5. It dynamically imports the renderer (`next/dynamic` with `ssr: false` inside a Client Component) and cross-fades from poster to canvas only after the first frame is ready.
- **INP protection**: create the WebGL context and compile shaders after first paint and away from input handlers. Use `KHR_parallel_shader_compile` or `compileAsync`. Move the simulation into a worker with OffscreenCanvas where possible. Never do per-frame React state updates.
- **CLS protection**: give the canvas and poster container a fixed `aspect-ratio`/size in CSS from the first HTML byte. The canvas layer should be `position: absolute`, behind content. Never inject it above text.
- **Adaptive quality**: cap DPR (1–1.5 on low and mid tiers, ≤2 on high). Scale particle count by tier. Run an fps monitor that degrades after sustained slow frames and settles after a few flip-flops, like drei's `PerformanceMonitor` pattern. Design for a worst case of 30 fps (iOS Low Power Mode). Pause when off-screen (IntersectionObserver), when the tab is hidden (`visibilitychange`) and after an idle period. Render on demand when nothing moves.
- Because detect-gpu's data source froze in December 2025 and it fetches from a third-party CDN by default, use it only as a coarse hint. Self-host the benchmarks, and let the runtime fps monitor decide.
- **Proposed budgets**, to be validated with real-user monitoring on target devices:
  - p75 mobile: LCP ≤ 2.0 s (headroom under 2.5), INP ≤ 150 ms, CLS ≤ 0.05.
  - The immersive chunk is excluded from first-load JS: aim for ≤ 60 KB gz for an OGL or bespoke layer and ≤ 200 KB gz if three.js is used.
  - No main-thread long task during the first interaction window.
  - Frame time ≤ 16.7 ms target (60 Hz) with auto-degrade.

### Gaps
- I found no public case study quantifying the Core Web Vitals impact of WebGL hero layers on mobile.
- I did not verify detect-gpu's accuracy on iOS, where Apple GPUs report generic renderer strings.
- No web API exposes thermal state on iOS, and I found no data on sustained-load thermal throttling in mobile browsers.

---

## Key question 3 — Accessibility for immersive, motion-heavy experiences

### Takeaway
Auto-starting ambient motion (e.g. a particle field) that lasts more than 5 s beside content needs a pause, stop or hide control under WCAG 2.2.2 (Level A). Flashing must stay under 3 per second (2.3.1, Level A). Interaction-triggered motion should be disableable (2.3.3, AAA; the vestibular-disorder criterion). `prefers-reduced-motion` has near-universal support, but `prefers-reduced-transparency` is Chromium-only. Canvas is opaque to assistive technology, so every fact must live in the semantic DOM, with the canvas treated as decoration. Kinetic typography must not break screen-reader reading of Polish words: ARIA forbids `aria-label` on `<p>`, `<span>` and `<div>`.

### Cited Findings
**WCAG**
- WCAG 2.2.2 Pause, Stop, Hide (Level A): "For any moving, blinking or scrolling information that (1) starts automatically, (2) lasts more than five seconds, and (3) is presented in parallel with other content, there is a mechanism for the user to pause, stop, or hide it unless the movement … is part of an activity where it is essential" — [W3C Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- WCAG 2.3.1 Three Flashes or Below Threshold (Level A): "Web pages do not contain anything that flashes more than three times in any one second period" (or stay below the flash thresholds) — [W3C Understanding 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
- WCAG 2.3.3 Animation from Interactions (Level AAA) — [W3C Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html):
  - "Motion animation triggered by interaction can be disabled, unless the animation is essential."
  - The intent section notes that scroll-coupled movement "can trigger vestibular disorders", with reactions that "include nausea, migraine headaches, and potentially needing bed rest to recover".
  - It lists "Parallax scrolling with option to turn off unnecessary motion globally" as an example.
- WCAG technique C39: "allow users to prevent animations … via the use of the prefers-reduced-motion CSS Media Query" — [W3C Technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)
- WCAG 1.4.3 Contrast (Minimum): text contrast "at least 4.5:1", and large-scale text "at least 3:1". Large-scale means "18 point text or 14 point bold text" — [W3C Understanding 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

**User-preference media queries** [VERSION-DEPENDENT]
- `prefers-reduced-motion`: Chrome 74, Firefox 63, Safari 10.1, iOS 10.3 — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json). caniuse reach: 96.45% — [caniuse](https://caniuse.com/prefers-reduced-motion)
- `prefers-reduced-transparency`: Chrome/Edge 118 per MDN compat data (webstatus.dev lists 119 — the two sources disagree by one version). Firefox has it behind a flag; Safari and iOS do not support it. It is "limited" on webstatus.dev and marked "Limited availability" and "Experimental" on MDN — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json), [webstatus.dev](https://webstatus.dev/features/prefers-reduced-transparency), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency)
- `prefers-contrast`: Chrome 96, Firefox 101, Safari 14.1, iOS 14.5 — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json)

**Canvas and WebGL accessibility, split text, ARIA naming**
- "The `<canvas>` element on its own is just a bitmap and does not provide information about any drawn objects. Canvas content is not exposed to accessibility tools as semantic HTML is. In general, you should avoid using canvas in an accessible website or app." — [MDN `<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas)
- For graphs and charts, "a two-part text alternative is required": a short description plus "a textual representation" as a long description, with structural association options — [W3C WAI Complex Images tutorial](https://www.w3.org/WAI/tutorials/images/complex/)
- ARIA 1.2 lists the `generic` role (e.g. `div`, `span`) and the `paragraph` role with "Name From: prohibited". The `heading` role takes its name from "contents, author" — [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/)
- GSAP SplitText (3.13+) "Adds aria-label to the split element(s) and aria-hidden to the freshly-created line/word/character elements" — [GSAP 3.13 release](https://gsap.com/blog/3-13/)
- Motion's `reducedMotion="user"` disables transform and layout animations but keeps opacity and colour animations — [Motion accessibility docs](https://motion.dev/docs/react-accessibility)
- Lenis honours `prefers-reduced-motion` by default (`respectReducedMotion: true`) — [Lenis README](https://github.com/darkroomengineering/lenis)
- The Next.js view-transitions guide says directional slides are "the most common trigger for motion sensitivity", while "Morphs, reveals, and crossfades carry less risk". It suggests preserving crossfades while removing positional movement and links "No Motion Isn't Always prefers-reduced-motion" — [Next.js View transitions guide](https://nextjs.org/docs/app/guides/view-transitions)

**Polish diacritics at small sizes**
- "The Polish kreska runs steeper and is shifted more to the right rather than centered above the base glyph" compared with the acute accent — [Adam Twardoch, Polish Diacritics: kreska](https://www.twardoch.com/download/polishhowto/kreska.html)
- The ogonek "is [not] an accent … It's much more a character element". "In most cases in should reach the descent line", and it "should never exceed the right boundary of the basic glyph" — [Adam Twardoch, Polish Diacritics: ogonek](https://www.twardoch.com/download/polishhowto/ogonek.html)

**An example of an immersive site handling motion**
- Researcher observation (not a full audit): I fetched https://www.apple.com/iphone/ on 2026-09-30 with an iPhone user agent. Three of its six linked stylesheets contain `prefers-reduced-motion` rules (34 occurrences in total), and the HTML contains play/pause control markup for its animated media — [apple.com/iphone](https://www.apple.com/iphone/)

### Inferences
- **Honest-content rule**: every number, confidence status and citation lives in server-rendered semantic HTML (headings, lists, `<table>`, `<figure>`/`<figcaption>`, links to sources). The generative canvas is decorative (`aria-hidden="true"`, no focusable content inside). Where a visual encodes validated data (e.g. a distribution), provide an adjacent data table or text description as the "long description" (WAI's two-part pattern).
- **Motion controls**:
  - Ship a visible, persistent "Pause motion" / "Reduce motion" toggle, which satisfies 2.2.2 for ambient loops. Store the choice in a first-party cookie so the server can render the static variant.
  - Default to the static poster when `prefers-reduced-motion: reduce` is set.
  - Under reduced motion, keep opacity crossfades and remove translation, scale, parallax, scroll-jacking and auto-play.
  - Never flash: no full-screen luminance flips or strobe-like particle bursts.
- **Kinetic typography with Polish words**:
  - Keep the real word in the DOM as a heading. If you split into characters, put `aria-label` only on the heading (permitted) and `aria-hidden="true"` on the split spans. Alternatively, render a visually hidden intact copy and hide the animated copy.
  - Do not rely on SplitText's `aria-label` on `<p>` or `<span>`, where naming is prohibited and support is unreliable.
  - Test with VoiceOver on iOS and TalkBack on Android to confirm words such as "Łódź" and "Żółć" read as whole words.
- **Clipping risk** [UNCERTAIN, inference]: line masks (`overflow: hidden/clip` wrappers used for "reveal" effects) and tight `line-height` can clip the kreska/kropka above capitals (Ś, Ź, Ż, Ć, Ń, Ó) and the ogonek below the baseline (Ą, Ę). Budget vertical padding in masks and test all 18 Polish letters.
- **Dark themes**: meet 4.5:1 for small text over the darkest and lightest areas the generative background can produce. It is safer to put text on a solid or scrimmed surface than directly over moving particles. Do not encode confidence status by colour alone; pair it with text labels.
- Because Safari lacks `prefers-reduced-transparency`, frosted-glass effects need an in-app contrast or transparency toggle rather than relying on the media query.

### Gaps
- The web-search quota ran out, so I could not survey award-winning immersive sites for accessibility quality. Only the Apple observation is verified, and it is shallow (CSS and markup presence, not a user test).
- I could not read the current SplitText docs on its `aria` option (bot wall).
- I did not test screen-reader behaviour for split Polish words or for aria-live announcements.
- I found no source quantifying safe motion amplitude or speed thresholds for vestibular users beyond WCAG's qualitative guidance.

---

## Key question 4 — Shareable image generation in Next.js and deterministic generative graphics from a surname seed

### Takeaway
`next/og`'s `ImageResponse` (Satori plus Resvg) is the default path. It renders Polish text correctly as long as you pass a TTF, OTF or WOFF font that contains the latin-ext glyphs. Its constraints favour pre-computing the generative art as SVG paths or data rather than CSS tricks:

- flexbox only (no grid);
- no `calc`, `z-index` or 3D transforms;
- a 500 KB bundle limit;
- no WOFF2;
- unreliable variable fonts.

Takumi (Rust; grid and bidi support; a `next/og`-compatible `ImageResponse`) is a credible 2026 alternative. Resvg, `@napi-rs/canvas` and headless Chromium are heavier options. For determinism: hash the NFC-normalised surname (xmur3, cyrb53), seed mulberry32 or sfc32 (integer-exact via `Math.imul`), and keep engine-dependent `Math.sin`/`Math.cos` out of the geometry pipeline, or compute the geometry once on the server and ship it to the client.

### Cited Findings
**next/og / ImageResponse** [VERSION-DEPENDENT]
- From the Next.js docs (version 16.3.7) — [Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response):
  - "`ImageResponse` uses @vercel/og, Satori, and Resvg to convert HTML and CSS into PNG."
  - "Only flexbox and a subset of CSS properties are supported. Advanced layouts (e.g. `display: grid`) will not work."
  - "Maximum bundle size of `500KB`. The bundle size includes your JSX, CSS, fonts, images, and any other assets."
  - "Only `ttf`, `otf`, and `woff` font formats are supported. To maximize the font parsing speed, `ttf` or `otf` are preferred over `woff`."
  - Custom fonts go in a `fonts` array, read once at module scope. Emoji sets can be selected with the `emoji` option.
- "By default, generated images are statically optimized (generated at build time and cached) unless they use Request-time APIs or uncached data." The `opengraph-image` file size "must not exceed 8MB" and `twitter-image` 5MB. Alt text can be supplied with `opengraph-image.alt.txt` — [Next.js opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- Vercel OG runs on the Node.js runtime (Node.js 22+ is listed as a prerequisite). `@vercel/og` "automatically adds the correct headers to cache computed images on the CDN". Features include the "Ability to download the subset characters of the font from Google Fonts" — [Vercel OG Image Generation](https://vercel.com/docs/og-image-generation)
- Current versions: `@vercel/og` 1.0.3 (2026-09-22) and `satori` 0.33.5 (2026-09-22), both MPL-2.0 — [npm @vercel/og](https://www.npmjs.com/package/@vercel/og), [npm satori](https://www.npmjs.com/package/satori)

**Satori specifics** — [Satori README](https://github.com/vercel/satori)
- Satori "uses the same Flexbox layout engine as React Native, and it's **not** a complete CSS implementation"; it "does not guarantee that the SVG will 100% match the browser-rendered HTML".
- `display` supports `flex`, `block`, `contents`, `none` and `-webkit-box`. The README notes: "Three-dimensional transforms are not supported", "There is no `z-index` support in SVG", "`calc` isn't supported".
- Supported features include:
  - `backgroundImage` with linear, radial and repeating gradients and `url`;
  - `backgroundClip: text`;
  - `maskImage`;
  - chained `filter`/`backdropFilter` functions;
  - `textShadow`, `lineClamp`;
  - `fontFeatureSettings` "via HarfBuzz text shaping";
  - CSS custom properties.
- Fonts: "Satori currently supports three font formats: TTF, OTF and WOFF. Note that WOFF2 is not supported"; "You must specify the font if any text is rendered". Text locales are set with the `lang` attribute. `loadAdditionalAsset` loads missing fonts or emoji on demand. "Unicode bidirectional layout is not yet supported".
- Satori runs "in browser, Node.js (>= 16), and Web Workers", bundling its WASM as base64. A standalone build exists for restricted environments.
- Variable fonts: issue #162, "Requiring a variable font causes a type error", is open; issue #712, "Variable fonts not working", was closed as a duplicate — [Satori issues search](https://github.com/vercel/satori/issues?q=variable+font), [#162](https://github.com/vercel/satori/issues/162), [#712](https://github.com/vercel/satori/issues/712)

**Alternatives** [VERSION-DEPENDENT]
- Takumi — [Takumi README](https://github.com/kane50613/takumi), [npm @takumi-rs/core](https://www.npmjs.com/package/@takumi-rs/core):
  - It "is a Rust rendering engine for markup and CSS … without launching a browser".
  - It supports "Flexbox, CSS Grid, block, inline, and float", "Tailwind v4" utilities, and "Arabic shaping, bidirectional layout, CJK, and emoji".
  - It ships native bindings for Node.js and Bun, and an `ImageResponse` from `takumi-js/response` described as "`next/og`-compatible".
  - npm: `@takumi-rs/core` 2.14.0 (2026-09-15); 1.0.0 was 2026-04-10. Licence: MIT OR Apache-2.0.
- `@resvg/resvg-js` latest stable is 2.6.2 (2024-03-26; `next` tag 2.7.0-alpha.2), MPL-2.0 — [npm](https://www.npmjs.com/package/@resvg/resvg-js)
- `@napi-rs/canvas` 1.0.9 (2026-09-09, MIT) and `canvas` (node-canvas) 3.2.3 (2026-03-31, MIT) — [npm @napi-rs/canvas](https://www.npmjs.com/package/@napi-rs/canvas), [npm canvas](https://www.npmjs.com/package/canvas)
- Headless Chromium: `puppeteer-core` 25.12.0 (2026-09-23) and `@sparticuz/chromium` 153.0.0 (2026-09-11) — [npm puppeteer-core](https://www.npmjs.com/package/puppeteer-core), [npm @sparticuz/chromium](https://www.npmjs.com/package/@sparticuz/chromium)

**Deterministic PRNG and hashing**
- "the best JS PRNGS seem to be: `sfc32`, and `mulberry32` for speed and statistical quality". The comparison table says:
  - sfc32: "best 2^128 state JS PRNG. passes practrand".
  - mulberry32: "very fast and passes gjrand. best 2^32 state JS PRNG".
  - splitmix32 is "based on murmurhash3".
  - Source: [bryc, PRNGs.md](https://github.com/bryc/code/blob/master/jshash/PRNGs.md)
- The same document recommends using "a seperate hash function to intiailize the entire state. Hash functions are very good at generating seeds for PRNGs from short strings". It gives `xmur3(str)`, built on `str.charCodeAt(i)` and `Math.imul`, to seed `sfc32(seed(), seed(), seed(), seed())` or `mulberry32(seed())` — [bryc, PRNGs.md Addendum A](https://github.com/bryc/code/blob/master/jshash/PRNGs.md)
- cyrb53 is "A fast and simple 53-bit string hash function with decent collision resistance", licensed "Public domain (or MIT if needed)". It also iterates `charCodeAt` with `Math.imul` — [bryc, cyrb53.js](https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js)
- MDN on `Math`: "Many Math functions have a precision that's implementation-dependent. This means that different browsers can give a different result. Even the same JavaScript engine on a different OS or architecture can give different results!" — [MDN Math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math)

### Inferences
- **Seed pipeline (single shared TypeScript module, server and client)**:
  1. Start from the canonical surname string supplied by the validated data object; do not re-derive it client-side.
  2. Apply `.normalize('NFC')` plus the product's agreed case-folding.
  3. Hash with xmur3 or cyrb53 to get integer seeds, then feed mulberry32 or sfc32.
  4. Build vector geometry with integer and `+ - * /` arithmetic only. Quantise coordinates (e.g. round to 0.01).
  5. Emit an SVG path string and/or typed arrays.
- Why normalise: I checked locally with Python `unicodedata` that "Łódź" is 4 code units in NFC and 6 in NFD. Because these hashes operate on UTF-16 code units, un-normalised input yields a different seed for the same surname.
- `Math.imul`, `>>>` and `^` are exact 32-bit integer operations, so mulberry32/sfc32 sequences match across V8, JavaScriptCore and SpiderMonkey. `Math.sin`/`Math.cos`/`Math.exp` may not (MDN), so avoid them in anything that must match pixel-for-pixel, or apply them after quantising the inputs and accept tiny drift in client-only animation.
- **One artwork, three consumers**:
  1. an inline SVG poster in the SSR HTML (also the no-JS and reduced-motion view);
  2. the client WebGL layer, animating from the same geometry;
  3. the OG image, embedding the same SVG as an `<img src="data:image/svg+xml,…">` or pre-rendered paths inside Satori's flex layout.
  This guarantees the shared image matches what people see.
- The OG image should show the surname plus text drawn from the validated data object (e.g. a count with its confidence label and a source line), never numbers computed at render time. This follows the AGENTS.md rule that presentation never derives facts.
- Use a static-instance TTF subset (latin plus latin-ext) for Satori, not the variable WOFF2 the site uses, to stay within the 500 KB bundle and avoid the open variable-font issues. Keep Satori's text layout simple (flex column).
- Caching: statically generate OG images for high-traffic surnames (build time or ISR) and render the long tail on demand with CDN caching. Deterministic seeds make cache keys trivial (surname plus data version).
- Choose Takumi only if CSS Grid or bidi text is needed in share images. Choose headless Chromium only if browser-exact CSS is essential; it is the heaviest option on serverless cold starts. That is a general expectation I have not measured here.

### Gaps
- I did not test Satori or Takumi rendering of Polish diacritics with candidate fonts. This needs a visual test for all 18 Polish letters, including capitals.
- The performance comparison between Satori and Takumi is unverified, and Takumi's compatibility claims come from its own README.
- I found no official statement from Satori maintainers on variable-font support, only the issue tracker.

---

## Key question 5 — Fonts: loading Polish-complete variable fonts with next/font; FOUT/CLS handling

### Takeaway
Polish needs both Google Fonts subsets: `latin` covers ó/Ó (U+00F3/U+00D3), and `latin-ext` covers ą ć ę ł ń ś ź ż and their capitals (U+0104–U+017C). `next/font` self-hosts fonts at build time, preloads the subsets you list, defaults to `display: 'swap'` and generates a metric-adjusted fallback to reduce CLS. The caveat is that Safari and iOS still lack `ascent-override`, `descent-override` and `line-gap-override` (only `size-adjust` is supported, since Safari 17). Fallback matching is therefore only partial on iPhones, which are a large share of mobile users, so choose fonts and `display` strategy accordingly.

### Cited Findings
- The Google Fonts CSS for Inter (fetched 2026-09-30) splits `/* latin */` as `U+0000-00FF, …` and `/* latin-ext */` as `U+0100-02BA, …` — [Google Fonts CSS2 (Inter)](https://fonts.googleapis.com/css2?family=Inter:wght@100..900)
- Researcher check against the latin-ext range in that CSS: ą U+0105, ć U+0107, ę U+0119, ł U+0142, ń U+0144, ś U+015B, ź U+017A, ż U+017C and their capitals fall in latin-ext; ó U+00F3 and Ó U+00D3 fall in latin — [Google Fonts CSS2 (Inter)](https://fonts.googleapis.com/css2?family=Inter:wght@100..900)
- `next/font` — [Next.js Font API](https://nextjs.org/docs/app/api-reference/components/font), [Next.js Fonts guide](https://nextjs.org/docs/app/getting-started/fonts):
  - It includes "built-in automatic self-hosting"; Google Font CSS and files "are downloaded at build time and self-hosted"; "No requests are sent to Google by the browser".
  - `subsets` lists subsets to be "preloaded", and each gets a link preload tag. `preload` defaults to `true`.
  - `display` defaults to `'swap'`.
  - `adjustFontFallback` defaults to `true` for `next/font/google` ("an automatic fallback font should be used to reduce Cumulative Layout Shift"). For `next/font/local` it defaults to `'Arial'`.
  - For variable fonts you do not need to specify weight. `axes` includes extra axes ("By default, only the font weight is included to keep the file size down").
  - The guide recommends variable fonts "for the best performance and flexibility".
- `@font-face` descriptor support — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json):
  - `size-adjust`: Chrome 92, Firefox 92, Safari 17 (desktop and iOS).
  - `ascent-override`, `descent-override`, `line-gap-override`: Chrome 87, Firefox 89; Safari desktop "preview" only; Safari iOS not supported.
- LCP does not count text rendered with a web font during the font block period — [web.dev LCP](https://web.dev/articles/lcp)
- The Fontsource API returns 499 variable font families that include a `latin-ext` subset. Examples: Inter, Roboto Flex, Recursive, Fraunces, Bricolage Grotesque, Unbounded, Onest, Geologica, Literata, Newsreader, Commissioner, Anybody, Big Shoulders Display, Space Grotesk, Instrument Sans, Source Serif 4, JetBrains Mono — [Fontsource API query](https://api.fontsource.org/v1/fonts?variable=true&subsets=latin-ext)
- Glyph design quality for Polish (kreska angle and position, ogonek length) varies by typeface — [Twardoch: kreska](https://www.twardoch.com/download/polishhowto/kreska.html), [Twardoch: ogonek](https://www.twardoch.com/download/polishhowto/ogonek.html)
- WOFF2 reaches 97.02% on caniuse for web delivery — [caniuse](https://caniuse.com/woff2). Satori and `ImageResponse` require TTF, OTF or WOFF (see Q4) — [Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response)

### Inferences
- Configure `next/font/google` with `subsets: ['latin', 'latin-ext']`. Use one variable family for UI and body text, and at most one display family for kinetic headings. Request only the axes you animate (e.g. `wght` plus `wdth` or `opsz`) to limit file size.
- Because iOS Safari ignores ascent/descent overrides, residual layout shift from `swap` is likely on iPhones for large headings:
  - use `display: 'optional'` for the decorative display face, with body text on `swap` and adjusted fallback; or
  - reserve heading line boxes with a fixed `line-height` and `min-height`; and
  - measure CLS in the field on iOS specifically.
- Having a latin-ext subset does not guarantee good Polish glyphs. Shortlist fonts by visually checking ą ę ł ń ó ś ź ż Ą Ę Ł Ń Ó Ś Ź Ż Ć ć at 12–14 px (mobile body sizes) and at display sizes, checking kreska steepness, ogonek placement and diacritic clearance in tight leading.
- Keep separate static TTF instances (subset to latin plus latin-ext) for OG generation.

### Gaps
- I did not measure byte sizes for latin plus latin-ext variable subsets of candidate fonts.
- I did not test whether `next/font`'s generated fallback (`size-adjust` only on iOS) produces acceptable CLS on iPhones.
- I found no systematic source rating Polish diacritic quality across Google Fonts families.

---

## Recommended technical approach for an immersive-but-honest Name Atlas

### Takeaway
Build progressive enhancement in five layers. The fact layer is plain server-rendered HTML that works for bots, screen readers, no-JS users and slow phones. Everything immersive is additive, deterministic, pausable, lazily loaded and replaceable by a static poster derived from the same seed. Start with CSS-native motion, then a small WebGL2 layer, and treat WebGPU, Rive/Lottie, audio and haptics as optional extras that never gate content.

### Cited Findings
Recap of the facts each layer depends on:
- Canvas content is not exposed to assistive technology — [MDN `<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas)
- SSR or pre-rendering is recommended for users and crawlers — [Google Search Central](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- `<canvas>` is not an LCP candidate; opacity-0 elements are excluded — [web.dev LCP](https://web.dev/articles/lcp)
- CWV thresholds are LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at p75 — [web.dev Web Vitals](https://web.dev/articles/vitals)
- Same-document View Transitions are Baseline, and Next.js App Router supports `<ViewTransition>` with no configuration — [webstatus.dev](https://webstatus.dev/features/view-transitions), [Next.js guide](https://nextjs.org/docs/app/guides/view-transitions)
- Scroll-driven animations are Chromium and Safari 26 only — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json), [webstatus.dev](https://webstatus.dev/features/scroll-driven-animations)
- WebGPU is "limited"; WebGL2 reaches about 96% — [webstatus.dev](https://webstatus.dev/features/webgpu), [caniuse](https://caniuse.com/webgl2)
- `WebGPURenderer` falls back to WebGL2 — [three.js source](https://cdn.jsdelivr.net/npm/three@0.186.1/src/renderers/webgpu/WebGPURenderer.js)
- OGL is 29 KB minzipped in total — [OGL README](https://github.com/oframe/ogl)
- `ssr: false` works only in Client Components — [Next.js Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading)
- WCAG 2.2.2, 2.3.1 and 2.3.3 set the motion rules — [W3C 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), [W3C 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html), [W3C 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- Satori constraints: flexbox only, no WOFF2, 500 KB bundle — [Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response), [Satori README](https://github.com/vercel/satori)
- mulberry32 and sfc32 are recommended for seeded generation — [bryc PRNGs](https://github.com/bryc/code/blob/master/jshash/PRNGs.md)
- Math precision is implementation-dependent — [MDN Math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math)
- GSAP is free but under a proprietary licence — [GSAP Standard License](https://gsap.com/standard-license/)
- Motion is MIT with `reducedMotion` support — [npm motion](https://www.npmjs.com/package/motion), [Motion a11y](https://motion.dev/docs/react-accessibility)
- next/font subsets and fallback behaviour, and Safari's missing metric overrides — [Next.js Font](https://nextjs.org/docs/app/api-reference/components/font), [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json)

### Inferences
**Layered architecture (interpretation)**

| Layer | What | Tech | Loads | Fallback |
|---|---|---|---|---|
| L0 Facts | Surname heading, counts, confidence status, citations, data tables, links | React Server Components, SSR HTML, semantic markup, `next/font` (latin + latin-ext) | In the initial HTML; LCP = heading text | Nothing needed; this *is* the fallback |
| L1 CSS motion | Route morphs, scroll reveals, `@property`-driven gradients, short variable-font axis moments | React `<ViewTransition>`, CSS `animation-timeline: view()`, `@property`, `@supports` | Zero or near-zero JS | Instant swap or static; content never starts hidden |
| L2 Deterministic poster | Generative artwork for this surname as static SVG | Shared TS module: NFC → xmur3/cyrb53 → mulberry32/sfc32 → quantised geometry → SVG | Inline or `<img>` with fixed size in SSR | Is itself the reduced-motion, no-JS and low-tier view |
| L3 Live GPU layer | Particles or flow field animating *from the same geometry* | WebGL2 via OGL or a bespoke ~10–20 KB module; optional OffscreenCanvas worker; WebGPU only as a later option | `next/dynamic` (`ssr: false`) inside a Client Component island after `load`/idle, gated on capability and preferences | Stay on L2 poster |
| L4 Opt-in extras | Kinetic type timelines, Rive/Lottie illustrations, sound, Android haptics, share-sheet flourishes | Motion (default) or GSAP SplitText (if chosen); Rive/dotLottie only on dedicated views; Web Audio after a tap; `navigator.vibrate` where supported | Only on user action | Silently absent |

**Library shortlist with justification (interpretation)**
1. **Next.js 16 App Router with React 19.3**. `<ViewTransition>` is built in and stable in React 19.3. Server Components keep facts server-side.
2. **Motion (MIT)** for React UI motion. It has `reducedMotion="user"` and ScrollTimeline acceleration, and its licence is simple.
3. **Native CSS** (scroll-driven animations, `@property`, container queries, `text-wrap: balance`) for most reveals and typographic motion. There is no JavaScript cost, and missing support degrades safely.
4. **OGL, or a bespoke WebGL2 module**, for the generative layer: 29 KB total per README, less when tree-shaken, and full shader control. Escalate to three.js (WebGL path ≈190 KB gz) only for genuine 3D. Consider `three/webgpu` + TSL (≈296 KB gz, still experimental) only for a separate explorer route.
5. **Optional: GSAP 3.15** (free, proprietary licence) if the chosen concept relies on SplitText or MorphSVG timelines. Record the licence in the dependency justification, and fix SplitText's ARIA pattern for `<p>`/`<span>`.
6. **next/og (Satori)** for share images, using a static TTF (latin plus latin-ext) and pre-computed SVG geometry. Evaluate **Takumi** if grid or bidi layouts are needed.
7. **xmur3/cyrb53 plus mulberry32/sfc32**: tiny, public-domain/MIT, integer-exact, and inlined into one shared module (no dependency needed).
8. **Avoid or defer**:
   - Theatre.js (public releases stopped in May 2024);
   - regl (no feature releases since 2021);
   - `@react-three/offscreen` and `@react-three/a11y` (stale);
   - Lenis on mobile;
   - Rive or dotLottie WASM on surname pages;
   - animated SVG turbulence filters.

**Budgets (proposed; validate with RUM on reference devices)**
- p75 mobile LCP ≤ 2.0 s, INP ≤ 150 ms and CLS ≤ 0.05. This leaves headroom under Google's 2.5 s / 200 ms / 0.1 thresholds.
- The immersive L3 chunk is kept out of first-load JS: ≤ 60 KB gz for OGL or bespoke, ≤ 200 KB gz if three.js is justified.
- Preloaded fonts: one variable family with latin and latin-ext subsets; measure the total and keep it small (the exact target is still to be set by measurement).
- Rendering:
  - DPR capped at 1.5 on low/mid tiers and 2 on high tiers.
  - Particle tiers of roughly 1–2k (Canvas 2D fallback), 5–20k (WebGL2 mid) and ≤ 50k (WebGL2 high).
  - Auto-degrade after sustained frames over about 20 ms; design for 30 fps worst case on iOS Low Power Mode.
- Lifecycle: pause when off-screen, hidden or idle. Keep a visible pause control. Never start sound automatically.

**Fallback matrix (interpretation)**
- `prefers-reduced-motion: reduce`, or the user's in-app "reduce motion" choice (saved in a cookie so SSR can respect it): L0 + L2 poster. Opacity-only transitions; no parallax, no scroll-linked movement.
- No WebGL2, detect-gpu tier 0, or `saveData` set (Chromium only): L0 + L2.
- WebGL2 available: L0–L3, with L3 quality chosen from tier and live fps.
- WebGPU available: same as WebGL2 unless a specific effect needs compute. This is an optional code path, never required.
- Firefox stable (no scroll-driven animations): content is fully visible; reveals are skipped via `@supports`.
- Bots and no-JS: full L0 plus L2 poster; the OG image uses the same seed.

### Gaps
- Budgets and particle tiers are my proposals, not measured values. They need a device lab pass on low/mid Android and older iPhones plus field RUM.
- The final library choice depends on the chosen visual concept. For example, heavy kinetic type favours GSAP, and a pure particle field favours OGL or bespoke code.

---

## Red flags (things that would hurt performance, accessibility or SEO)

### Takeaway
The biggest risks are not exotic APIs. They are the following patterns:

- putting facts inside pixels;
- hiding server-rendered content until JavaScript animates it in;
- shipping heavy GPU or WASM runtimes on every surname page;
- auto-running motion without a pause control;
- non-deterministic art that differs between server, client and share image;
- kinetic typography that breaks Polish words for screen readers or clips their diacritics.

### Cited Findings
- Canvas content is invisible to assistive technology, and MDN advises avoiding canvas in accessible sites — [MDN `<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas)
- LCP ignores `opacity: 0` elements and elements that look like full-viewport backgrounds; canvas is not a candidate — [web.dev LCP](https://web.dev/articles/lcp)
- Not all bots run JavaScript, and Google's rendering can be delayed — [Google Search Central](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Auto-starting motion over 5 s beside content needs a pause, stop or hide mechanism (Level A) — [W3C 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- More than 3 flashes per second fails 2.3.1 (Level A) — [W3C 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
- Scroll-coupled non-essential motion can trigger vestibular reactions — [W3C 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- ARIA prohibits naming the generic (`div`/`span`) and paragraph roles — [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/). SplitText adds `aria-label` to the split element — [GSAP 3.13](https://gsap.com/blog/3-13/)
- `Math` function precision varies across engines, operating systems and architectures — [MDN Math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math)
- Animated SVG filters are slow on WebKit and iOS — [WebKit 263848](https://bugs.webkit.org/show_bug.cgi?id=263848), [GSAP forum](https://greensock.com/forums/topic/33075-gsap-and-feturbulence-mobile-performance/)
- WASM runtime sizes (researcher measurements): Rive 350–885 KB gz, dotLottie about 485 KB gz — [jsDelivr @rive-app/canvas](https://cdn.jsdelivr.net/npm/@rive-app/canvas@2.43.1/), [dotlottie-web README](https://github.com/LottieFiles/dotlottie-web/tree/main/packages/web)
- `ssr: false` works only in Client Components, and there is no automatic code splitting when a Server Component dynamically imports a Client Component — [Next.js Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading)
- Satori rejects WOFF2 and has open variable-font issues; the `ImageResponse` bundle limit is 500 KB — [Satori README](https://github.com/vercel/satori), [Satori #162](https://github.com/vercel/satori/issues/162), [Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response)
- Safari lacks `requestIdleCallback`, `prefers-reduced-transparency` and the Vibration API. iOS Low Power Mode caps `requestAnimationFrame` at 30 fps — [MDN BCD](https://unpkg.com/@mdn/browser-compat-data/data.json), [WebKit 215745](https://bugs.webkit.org/show_bug.cgi?id=215745)
- detect-gpu's benchmark source stopped updating in December 2025, and it fetches benchmark data from UNPKG by default — [detect-gpu README](https://github.com/pmndrs/detect-gpu)
- The GSAP licence is proprietary and terminable — [GSAP Standard License](https://gsap.com/standard-license/)

### Inferences
Red-flag checklist (interpretation):

**SEO and "honesty" risks**
1. **Facts drawn in pixels.** Counts, confidence or citations rendered only in canvas, WebGL, SVG art or the OG image. This hides them from screen readers, search engines and copy/paste, and invites the art to "imply" data. The art must stay decorative or be backed by an adjacent table or text.
2. **Content hidden until animated.** Starting headings or paragraphs at `opacity: 0` or off-screen, waiting for GSAP, ScrollTrigger or IntersectionObserver to reveal them. This hurts LCP, since opacity-0 elements are not candidates, and leaves no-JS users, bots and Firefox users without scroll-driven animations facing blank sections.
3. **The heading drawn in WebGL** or a full-screen canvas hero with no real text node. The result: no LCP text, nothing to index, nothing accessible.
4. **Client-only rendering of surname pages.** Using `"use client"` at the page level or fetching facts client-side breaks SSR, SEO and the "frontend never computes facts" invariant.

**Performance risks**

5. **Heavy runtimes on every page**: three.js WebGPU (~296 KB gz), full PixiJS (~228 KB gz), Rive or dotLottie WASM (350–885 KB gz), or all of GSAP's plugins loaded by default.
6. **Main-thread spikes during input**: synchronous shader compiles, WebGL context creation inside click handlers, per-frame React `setState`, or a particle simulation on the main thread. All of these hurt INP.
7. **Uncapped DPR, never-paused loops**, rendering while off-screen or hidden, or continuing the loop when the user has chosen reduced motion. The costs are battery and heat, especially on iPhones already throttled to 30 fps in Low Power Mode.
8. **Animated SVG `feTurbulence`/`feDisplacementMap` over large areas** on iOS.
9. **Late-sized canvases or poster images** without reserved dimensions, which cause CLS. Display-font swaps on iOS, where the metric-override descriptors are unsupported, also cause CLS.
10. **`requestIdleCallback`-only scheduling** with no Safari fallback, meaning the enhancement never loads on iOS. Also, `next/dynamic(..., { ssr: false })` placed in a Server Component, which errors or fails to code-split.
11. **Blind trust in detect-gpu**: a third-party CDN fetch plus benchmark data frozen in December 2025. Use a runtime fps monitor as the authority.

**Accessibility risks**

12. **Ambient motion without a visible pause control**, which fails WCAG 2.2.2 (Level A). Flashing or strobe-like particle bursts fail 2.3.1.
13. **Parallax, scroll-jacking or smooth-scroll hijacking** without a reduced-motion path, including Lenis `syncTouch` on iOS.
14. **Split-text without correct ARIA**: `aria-label` on `<p>`/`<span>` (prohibited naming), or letters exposed individually, so "Żółkiewski" is read letter by letter.
15. **Clipped Polish diacritics**: tight `line-height`, overflow masks or `background-clip: text` boxes that cut off kreska, kropka or ogonek.
16. **Latin-only font subsets**, causing fallback-glyph "ransom note" rendering of ą, ę, ł and friends. This applies both on the site and in OG images.
17. **Text placed directly over moving or bright particles** without a scrim, so contrast drops below 4.5:1. Colour-only confidence states.
18. **Relying on `prefers-reduced-transparency`** as the only transparency control; it is not supported in Safari.

**Determinism and share-image risks**

19. **Non-deterministic or engine-dependent art**: `Math.random()`, time-seeded noise, or trigonometry in the seed-to-geometry path. This causes hydration mismatches and OG images that differ from on-page art.
20. **Hashing un-normalised strings** (NFC versus NFD), so the same surname gets two different artworks.
21. **Using the site's variable WOFF2 in `ImageResponse`**. Satori will fail; use a static TTF subset.

**Dependency risks**

22. **Treating GSAP as open source.** Its licence is proprietary and Webflow-controlled.
23. **Stale dependencies**: Theatre.js, regl, `@react-three/offscreen` or `@react-three/a11y`. Also pulling Rive, Lottie, GSAP and Motion in all together, when one motion library should be the default.
24. **Essential features that depend on non-Baseline APIs**: WebGPU, cross-document view transitions, scroll-driven animations, Vibration or AudioSession used for anything beyond enhancement.

### Gaps
- I have not quantified the severity of each red flag for Name Atlas specifically. Doing so needs a prototype measured on reference devices and a screen-reader test pass with Polish content.
