# Award-winning immersive web experiences 2022–2026: catalogue, patterns, trends, and what transfers to Name Atlas

Research date: 2026-09-30. Under every question, **Cited Findings = FACT** (what a site is or does, what award it won, which numbers were published, each with an inline source). **Inferences = INTERPRETATION** (why it works, what transfers to Name Atlas). The ideas in the last two sections are interpretation grounded in the cited precedents.

Method notes, so the report writer can weigh the evidence:
- Awwwards annual-award pages and FWA news pages render client-side. Awwwards data was read from its hall-of-fame, winners and `/sites/` pages. FWA of the Year data was read from FWA's own public JSON endpoint (`https://thefwa.com/api/editorials/<slug>`), which backs the human-readable FWA news URLs cited below.
- Codrops (tympanus.net) returns a Cloudflare challenge to automated fetches, so Codrops findings come from search-engine index snippets and are marked "(snippet)".
- This session's shared web-search budget ran out mid-research. Later verification used direct page fetches only, which leaves some named gaps.
- On 2026-09-30 every live URL below was HTTP-checked. **HTTP 200** means the server responded; it does not prove the WebGL experience runs on every device. The only non-200 result was mausoleodiaugusto.it, which returned 403 (probably bot protection, so it may still be online).

---

## 1. Which sites won or were shortlisted for the major awards 2022–2026, and which studios define the state of the art?

### Takeaway
From 2022 to 2025 the top Awwwards and FWA prizes went to a small group of teams that build real-time 3D worlds:
- Resn: KPR.
- Media.Monks for Getty: Persepolis Reimagined.
- Lusion: Lusion v3.
- abeto: Igloo Inc and Messenger.
- Kris Temmerman: Food for Fish, built on WebGPU.
- Bruno Simon: his 2025 portfolio.
- OFF+BRAND: Lando Norris.

Locomotive and Immersive Garden dominated the agency and studio titles. Heritage work also won at the very top: Getty's Persepolis won FWA of the Year 2022 and Awwwards Developer Site of the Year 2022, and Getty's Gehry project won two Webbys in 2024. Cultural-archive subjects can beat brand spectacle.

### Cited Findings

#### 1a. Awwwards Annual Awards (hall of fame / winners pages)
- **2022**:
  - Site of the Year: **KPR** ([awwwards.com/sites/kpr](https://www.awwwards.com/sites/kpr)).
  - Developer Site of the Year: **Persepolis Reimagined** ([awwwards.com/sites/persepolis-reimagined](https://www.awwwards.com/sites/persepolis-reimagined)).
  - E-commerce: Mr. Pops ([/sites/mr-pops](https://www.awwwards.com/sites/mr-pops)).
  - Agency: Locomotive.
  - Studio: Synchronized Studio.
  - Independent: Jesper Landberg.
  - Users' Choice: **The Other Side of Truth** ([/sites/the-other-side-of-truth](https://www.awwwards.com/sites/the-other-side-of-truth)).
  - Source: [Awwwards hall of fame 2022](https://www.awwwards.com/annual-awards/hall-of-fame/2022).
- **2023**:
  - Site of the Year and Developer Site of the Year: **Lusion v3** ([/sites/lusion-v3](https://www.awwwards.com/sites/lusion-v3)).
  - E-commerce: Mana Yerba Mate ([/sites/mana-yerba-mate](https://www.awwwards.com/sites/mana-yerba-mate)).
  - Agency: Locomotive ([/locomotive/](https://www.awwwards.com/locomotive/)).
  - Studio: Obys ([/obys/](https://www.awwwards.com/obys/)).
  - Independent: Aristide Benoist ([/aristidebenoist/](https://www.awwwards.com/aristidebenoist/)).
  - Users' Choice: Noomo Agency ([/sites/noomo-agency](https://www.awwwards.com/sites/noomo-agency)).
  - Source: [Awwwards hall of fame 2023](https://www.awwwards.com/annual-awards/hall-of-fame/2023).
- **2024**:
  - Site of the Year and Developer Site of the Year: **Igloo Inc** ([/sites/igloo-inc](https://www.awwwards.com/sites/igloo-inc)).
  - E-commerce: Opal Tadpole ([/sites/opal-tadpole](https://www.awwwards.com/sites/opal-tadpole)).
  - Agency: Locomotive.
  - Studio: Immersive Garden ([/immersivegarden/](https://www.awwwards.com/immersivegarden/)).
  - Independent: Jesper Landberg ([/jesperlandberg/](https://www.awwwards.com/jesperlandberg/)).
  - Users' Choice: Don't Board Me ([/sites/dont-board-me](https://www.awwwards.com/sites/dont-board-me)).
  - Source: [Awwwards hall of fame 2024](https://www.awwwards.com/annual-awards/hall-of-fame/2024).
- **2025** (the page shows vote counts):
  - Site of the Year: **Lando Norris** (43 votes).
  - Developer Site of the Year: **Messenger** (54).
  - E-commerce: Scout Motors (28).
  - Agency: Immersive Garden (39).
  - Studio: Malvah (27).
  - Independent: Louis Paquet (41).
  - Users' Choice: Lando Norris (596).
  - Source: [Awwwards annual awards winners](https://www.awwwards.com/annual-awards/winners).
- **Conflicts to note.** The hall-of-fame and winners pages above are treated as authoritative. Search-engine summaries, whose originating pages could not be identified, made three claims they contradict:
  - That "Don't Board Me" by The First The Last won Site of the Year 2024. The hall of fame lists it as Users' Choice.
  - That TANDEM by Oimachi won Site of the Year 2025. It is not on the 2025 winners page.
  - That KPR was the "2023" Site of the Year. It sits on the 2022 hall-of-fame page, and its Site of the Day was 26 Dec 2022.
  - Authoritative sources: [Awwwards hall of fame 2024](https://www.awwwards.com/annual-awards/hall-of-fame/2024); [Awwwards hall of fame 2022](https://www.awwwards.com/annual-awards/hall-of-fame/2022); [Awwwards winners](https://www.awwwards.com/annual-awards/winners); [Awwwards KPR](https://www.awwwards.com/sites/kpr).

#### 1b. FWA of the Year (FOTY) and People's Choice (PCA)
- **2022: FOTY and PCA both went to "Getty Villa: Persepolis Reimagined"** ([persepolis.getty.edu](https://persepolis.getty.edu/)), credited to The Getty and Media.Monks. FWA's description: "For Getty, we brought the ancient Persian city of Persepolis back to life, with a virtual tour of its grand palaces, towering statues, and peerless artworks…" — [FWA 2022 announcement](https://thefwa.com/news/fwa-of-the-year-2022-peoples-choice-award-winners-announced)
- **2023**, from the [FWA 2023 announcement](https://thefwa.com/news/fwa-of-the-year-2023-peoples-choice-award-winners-announced):
  - FOTY: **Lusion v3** ([lusion.co](https://lusion.co/)).
  - PCA: **Loewe x Howl's Moving Castle** ([howls.loewe.com](https://howls.loewe.com/)) by Stink Studios for LOEWE. FWA calls it "This exclusive interactive mobile experience takes users on a journey where they must follow their heart."
- **2024**, from the [FWA 2024 announcement](https://thefwa.com/news/fwa-of-the-year-2024-peoples-choice-award-winners-announced):
  - FOTY: **Food for Fish** ([foodforfish.org](https://foodforfish.org/)) by Kris Temmerman, described only as "a WebGPU experiment".
  - PCA: **Hatom** ([hatom.com](https://www.hatom.com/)) by Immersive Garden: "the 5 stages of a griffin's transformation".
- **2025: FOTY and PCA both went to "Bruno's Portfolio"** ([bruno-simon.com](https://bruno-simon.com)). FWA's description: "Discover the world of Bruno Simon in this creative and immersive 3D experience. And please, don't break anything!" — [FWA 2025 announcement](https://thefwa.com/news/fwa-of-the-year-2025-peoples-choice-award-winners-announced)
- **Process.** FWA of the Year is chosen from the 12 FWA of the Month finalists. The announcements cite "365 FWA Of The Day Winners" and "500+ International Judges (200+ women, 200+ men)" — [FWA 2024 announcement](https://thefwa.com/news/fwa-of-the-year-2024-peoples-choice-award-winners-announced)

#### 1c. Webby Awards
- **Best Visual Design – Aesthetic.** This category judges only visual design, for sites that are meant to be beautiful and emotional. Source: [Webby category page](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-visual-design-aesthetic).
  - **2024**: Webby to **"Sculpting Harmony"** (Getty × Resn). People's Voice to "A Light in the Woods" (Bear Machine Music).
  - **2025**: Webby to **"Immersive Garden"** (the studio's own site). People's Voice to "LMI: The Vincent van Gogh Experience" (OddCommon).
  - **2026**: Webby to **"Igloo Inc"** (Bureaux). People's Voice to "The Renaissance Edition" (Shopify).
- **Sculpting Harmony** ([gehry.getty.edu](https://gehry.getty.edu/)) won two Webbys in 2024: Architecture, Art & Design, and Best Visual Design – Aesthetic. It centres on Frank Gehry's work. The client was the Getty Research Institute and Getty Digital; credits include Senior Curator for Architecture Maristella Casciato. Source: [Webby entry](https://winners.webbyawards.com/2024/websites-and-mobile-sites/features-design/best-visual-design-aesthetic/279895/sculpting-harmony).
- **Cultural Institutions.** Source: [Webby category page](https://winners.webbyawards.com/winners/websites-and-mobile-sites/general-desktop-mobile-sites/cultural-institutions).
  - **2024**: Webby to **The Book of HOV** ([thebookofhov.com](https://www.thebookofhov.com/)), by Linked by Air. People's Voice to the Smithsonian National Museum of Asian Art redesign (idfive).
  - **2025**: Webby to **Nordiska Museet** (Bazooka AB). People's Voice to National Park Service, "Life at Lewis Mountain: Shenandoah in the Jim Crow Era" (Alexander & Tom).
  - **2026**: Webby to **National Gallery Imaginarium** (Fabrique & Q42). People's Voice to the National Gallery of Art website.
- **Language Explorer** (Google, with Hook and Blinkk; [live site](https://sites.research.google/languages/language-explorer/)) won the Webby for **Responsible AI** in 2026 and was an Honoree in Best Visual Design – Aesthetic 2026 — [Webby entry](https://winners.webbyawards.com/2026/websites-and-mobile-sites/responsible-technology/responsible-ai/364609/language-explorer)

#### 1d. Site catalogue (FACT: what it is, core idea, techniques, awards)
- **Lando Norris** ([landonorris.com](https://landonorris.com/), HTTP 200), by OFF+BRAND.
  - Awards: Awwwards Site of the Year and Users' Choice 2025. Site of the Day on 17 Nov 2025, overall 8.18 (creativity 8.71), Developer award 7.58.
  - Tags: Webflow, GSAP, WebGL, 3D, Gestures/Interaction. Two-colour palette: #D2FF00 on #111112.
  - Awwwards description: "a high-performance platform for F1 driver Lando Norris, capturing his energy and racing passion through dynamic interactions, bold visuals…" — [Awwwards](https://www.awwwards.com/sites/lando-norris)
  - DesignRush describes OFF+BRAND as a Glasgow studio. It reports that "Reactive, blob-like overlays animate across the hero image as the cursor moves", echoing "the graphic language of Norris' helmet", and that the modular layout separates "On Track" results from "Off Track" culture — [DesignRush](https://designrush.com/best-designs/websites/lando-norris-website-design)
- **Messenger** ([messenger.abeto.co](https://messenger.abeto.co/), HTTP 200), by abeto.
  - Awards: Awwwards Developer Site of the Year 2025. Site of the Day on 10 Nov 2025, overall 7.92.
  - Developer award 8.21. Sub-scores: Animations 9.00, WPO (web performance optimisation) 8.80, Responsive 8.40, Accessibility 7.60.
  - Tags: Three.js, WebGL, WebSockets.
  - Tagline: "It's a small planet, but someone's gotta make the deliveries". Players navigate a character, meet NPCs and configure their character — [Awwwards](https://www.awwwards.com/sites/messenger)
- **Igloo Inc** ([igloo.inc](https://www.igloo.inc/), HTTP 200), by abeto with Bureaux, for the parent company of Pudgy Penguins.
  - Awards: Awwwards Site of the Year and Developer Site of the Year 2024. Site of the Day on 23 Jul 2024, overall 7.92. Developer award 7.66, with Animations 9.6 and Responsive 8.4 but "lower marks for accessibility and semantic SEO" — [Awwwards](https://www.awwwards.com/sites/igloo-inc)
  - Case-study details, from the [Awwwards case study](https://www.awwwards.com/igloo-inc-case-study.html):
    - Each project sits inside an ice block grown by "a custom algorithm that mimicked the growth of ice crystals inside a container".
    - A custom VDB-to-browser exporter carries volumetric particle simulations that form a different shape for each link. The team says the compressed volume data came out smaller than standard website images. Particles shift colour with speed and glow during shape transitions.
    - The UI is rendered in WebGL. Glitch effects are "a simple WebGL shader, which doesn't affect performance", and text scrambles work by "adjust[ing] the offset of the SDF texture".
    - The intro is rendered in real time. Transitions use chromatic aberration, "tech displacement" and frost.
    - Stack: Houdini, Blender, Three.js, three-mesh-bvh, Svelte, GSAP, Vite.
    - Bureaux supplied music and sound effects matched to the particle movement.
    - Load time is kept low with custom geometry exporters and staged texture loading and shader compilation. The team measured continuously "to ensure smooth navigation on low-end devices".
- **Lusion v3** ([lusion.co](https://lusion.co/), HTTP 200), by Lusion.
  - Awards: Awwwards Site of the Year and Developer Site of the Year 2023, and FWA of the Year 2023.
  - Site of the Day on 2 Oct 2023. Developer award 8.41. Sub-scores: Animations 10.00, WPO 9.00, Responsive 8.40, Accessibility 7.40.
  - Features a reactive cursor and scroll animations. Palette: #1a2ffb on #f0f1fa — [Awwwards](https://www.awwwards.com/sites/lusion-v3)
  - Lusion describes itself as "a real-time application focused creative studio" (UK). Its profile shows 1 Site of the Year, 3 Sites of the Month and 14 Sites of the Day. Recent work: Oryzo AI (Site of the Month, Apr 2026), EverSwap (Site of the Day, Jun 2026), Spaace (Site of the Day, Jun 2024) — [Awwwards profile](https://www.awwwards.com/lusion/)
- **KPR** ([kprverse.com](https://kprverse.com/), HTTP 200), by Resn.
  - Awards: Awwwards Site of the Year 2022. Site of the Day on 26 Dec 2022, overall 7.98. Developer sub-scores: Animations 9.6, WPO 8.4, Responsive 7.2, Accessibility 6.0.
  - Copy: "Enter New Eden, an immersive world brought to life with captivating art and storytelling. One world, two factions."
  - Features click-and-hold interactions, custom loaders and scroll-based animation — [Awwwards](https://www.awwwards.com/sites/kpr)
- **Persepolis Reimagined** ([persepolis.getty.edu](https://persepolis.getty.edu/), HTTP 200; the old path getty.edu/persepolis redirects there), for the Getty. Awwwards credits "Monks"; FWA credits "Media.Monks".
  - Awards: Awwwards Developer Site of the Year 2022, and FWA of the Year plus People's Choice 2022. Site of the Day on 1 Jun 2022, Developer award 8.03.
  - Tech: WebGL, Vue.js, GSAP, 360-degree viewing.
  - It offers an immersive WebGL menu and a virtual reconstruction of the city, "revived from ruins and restored to imperial power" — [Awwwards](https://www.awwwards.com/sites/persepolis-reimagined); [FWA](https://thefwa.com/news/fwa-of-the-year-2022-peoples-choice-award-winners-announced)
- **The Other Side of Truth** ([theothersideoftruth.com](https://theothersideoftruth.com/), HTTP 200), by The First The Last with individual collaborators.
  - Awards: Awwwards Users' Choice 2022. Site of the Day on 2 Jun 2022.
  - Tech: WebGL, GSAP, PixiJS, Nuxt.js.
  - A single-page scroll story around the message "Ukraine is our home, we will defend it to the end…", in a blue and yellow palette — [Awwwards](https://www.awwwards.com/sites/the-other-side-of-truth)
- **Bruno's Portfolio, 2025 version** ([bruno-simon.com](https://bruno-simon.com), HTTP 200). Awards: FWA of the Year plus People's Choice 2025. Details from the [Awwwards case study](https://www.awwwards.com/brunos-portfolio-case-study.html):
  - A rebuild of the viral 2019 world where visitors drive a red car and crash into things.
  - Built on Three.js with WebGPU and WebGL fallbacks. Shaders are written in TSL, the Three.js shading language written in JavaScript. Scenes are built in Blender, with Python scripts for asset conversion.
  - Game layer: a daily-reset leaderboard, achievements that unlock vehicle skins, and "Whispers" (moderated visitor messages with country flags, at most 30 active).
  - On mobile, "water blur and depth-of-field effects are disabled, and shadow map resolution is reduced".
  - Rendering techniques: instancing, frustum culling, DRACO compression and ETC1S/UASTC textures. The grass is "around 78,400 blades".
  - Spatialised audio, with three CC0 music tracks. Front-end code is MIT-licensed.
- **Food for Fish** ([foodforfish.org](https://foodforfish.org/), HTTP 200), by Kris Temmerman. FWA of the Year 2024, described only as "a WebGPU experiment" — [FWA](https://thefwa.com/news/fwa-of-the-year-2024-peoples-choice-award-winners-announced)
- **Hatom** ([hatom.com](https://www.hatom.com/), HTTP 200), by Immersive Garden.
  - Awards: FWA People's Choice 2024. Awwwards Site of the Day on 4 Nov 2024, overall 7.96.
  - Developer sub-scores: Animations 9.40, Accessibility 6.60, WPO 7.80, Markup 6.80.
  - "The 5 stages of a griffin's transformation", with click-and-hold effects and phase transitions. Palette: #F76CFE and #C1FF12 — [Awwwards](https://www.awwwards.com/sites/hatom)
- **Loewe x Howl's Moving Castle** ([howls.loewe.com](https://howls.loewe.com/), HTTP 200), by Stink Studios. FWA People's Choice 2023, as an "exclusive interactive mobile experience" — [FWA](https://thefwa.com/news/fwa-of-the-year-2023-peoples-choice-award-winners-announced)
- **Other award winners with only the Awwwards page verified**:
  - [Don't Board Me](https://www.awwwards.com/sites/dont-board-me): Users' Choice 2024.
  - [Opal Tadpole](https://www.awwwards.com/sites/opal-tadpole): E-commerce 2024.
  - [Noomo Agency](https://www.awwwards.com/sites/noomo-agency): Users' Choice 2023.
  - [Scout Motors](https://www.awwwards.com/sites/scout-motors): E-commerce 2025.
  - Source: [Awwwards hall of fame](https://www.awwwards.com/annual-awards/hall-of-fame/2024).

#### 1e. Studios (FACT)
- **Locomotive** was Awwwards Agency of the Year in 2022, 2023 and 2024 — [Awwwards HoF 2022](https://www.awwwards.com/annual-awards/hall-of-fame/2022), [2023](https://www.awwwards.com/annual-awards/hall-of-fame/2023), [2024](https://www.awwwards.com/annual-awards/hall-of-fame/2024). Figma cites Locomotive as an example of "Experimental Navigation" — [Figma](https://www.figma.com/resource-library/web-design-trends/)
- **Immersive Garden** (Paris) collected:
  - Awwwards Studio of the Year 2024 and Agency of the Year 2025.
  - The Webby for Best Visual Design – Aesthetic 2025.
  - FWA Hall of Fame membership.
  - Projects: Hatom, David Whyte Experience, Toom Archives.
  - Sources: [Awwwards HoF 2024](https://www.awwwards.com/annual-awards/hall-of-fame/2024); [Awwwards winners](https://www.awwwards.com/annual-awards/winners); [Webby](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-visual-design-aesthetic); [FWA HoF](https://thefwa.com/about/hall-of-fame/)
- **abeto** made Igloo Inc (with Bureaux) and Messenger. The Igloo case study describes abeto as "a specialized team of technical artists" — [Awwwards case study](https://www.awwwards.com/igloo-inc-case-study.html)
- **Resn** made KPR (Site of the Year 2022) and Sculpting Harmony (two Webbys, 2024), and is in the FWA Hall of Fame — [Awwwards](https://www.awwwards.com/sites/kpr); [Webby](https://winners.webbyawards.com/2024/websites-and-mobile-sites/features-design/best-visual-design-aesthetic/279895/sculpting-harmony)
- **Other named winners**:
  - Obys: Studio of the Year 2023.
  - Aristide Benoist: Independent of the Year 2023.
  - Jesper Landberg: Independent of the Year 2022 and 2024.
  - Louis Paquet: Independent of the Year 2025.
  - Malvah: Studio of the Year 2025.
  - Synchronized Studio: Studio of the Year 2022.
  - Sources: Awwwards HoF pages above; [Awwwards winners](https://www.awwwards.com/annual-awards/winners).
- **14islands** (Sweden, est. 2011) has 20 Sites of the Day, 10 Honorable Mentions and 20 Developer awards. Recent: "365 — A Year of Cartier" (Site of the Day, Feb 2025), Axolot Games (Mar 2024), 14islands V4 (Dec 2023) — [Awwwards profile](https://www.awwwards.com/14islands/)
- **FWA Hall of Fame members** include Active Theory, Merci-Michel, Immersive Garden, Resn, Monks, Stink Studios, Hello Monday/DEPT®, makemepulse, UNIT9, Jam3, North Kingdom and Google Creative Lab — [FWA Hall of Fame](https://thefwa.com/about/hall-of-fame/), data read via `https://thefwa.com/api/hof`.
- **Polish studios**:
  - **Huncwot** (Warszawa): "a creative agency, specialising in interactive design and clever technology". 32 Sites of the Day, 14 Honorable Mentions, 28 Developer awards. Notable work: Obama Presidency Oral History, Maze, Incite, Elders Project, Penderecki's Garden — [Awwwards profile](https://www.awwwards.com/huncwot/). Also "Where is Poland?" (Site of the Day, 25 Feb 2019) — [Awwwards](https://www.awwwards.com/sites/where-is-poland)
  - **Merixstudio** (Poznań): "250+ creative technologists". 7 Sites of the Day, 1 Site of the Month, 2 Honorable Mentions, 5 Developer awards. Notable work: "Dukaj. The Old Axolotl", "Polish Christmas: interactive guide", Autarq, Skytte — [Awwwards profile](https://www.awwwards.com/merixstudio/)
  - **BRIGHT**: Warsaw Rising 1944 (Site of the Day, 16 Sep 2014) — [Awwwards](https://www.awwwards.com/sites/warsaw-rising-1944)
  - **Greg Matyszewski** is a Warsaw-based designer and developer. His LinkedIn profile, seen only as a search snippet, lists Awwwards Sites of the Day, service on the Awwwards Developer Award jury, and "Where is Poland?". Awwwards credits that site to Huncwot — [LinkedIn](https://pl.linkedin.com/in/gregmatys)

#### 1f. Codrops 2025 case studies, as technique references (snippet)
- **UntilLabs** (10 Dec 2025): "a real photograph of people" is rebuilt "as a living particle system — a digital scene shaped by real data, natural motion, and physics-driven behavior". The particles render to an off-screen FBO, so grading and post-processing never touch the particle shaders — [Codrops](https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/)
- **The Monolith Project** (29 Nov 2025): a 13-scene WebGL epic in React Three Fiber, with deferred rendering and outlines, composable materials, a composable particle system and a scene-transition system — [Codrops](https://tympanus.net/codrops/2025/11/29/building-the-monolith-composable-rendering-systems-for-a-13-scene-webgl-epic/)
- **Phantom.land** (30 Jun 2025): an interactive grid plus a 3D face particle system, built with React Three Fiber, GLSL and GSAP. Lightweight WebP textures and custom shader materials turn 2D portraits into interactive 3D figures — [Codrops](https://tympanus.net/codrops/2025/06/30/invisible-forces-the-making-of-phantom-lands-interactive-grid-and-3d-face-particle-system/). Live at [phantom.land](https://www.phantom.land/) (HTTP 200).
- **Other 2025 Codrops titles**:
  - "Particles, Progress, and Perseverance: A Journey into WebGPU Fluids" (29 Jan 2025) — [Codrops](https://tympanus.net/codrops/2025/01/29/particles-progress-and-perseverance-a-journey-into-webgpu-fluids/)
  - "Behind the Curtain: Building Aurel's Grand Theater" (20 May 2025) — [Codrops](https://tympanus.net/codrops/2025/05/20/behind-the-curtain-building-aurels-grand-theater-from-design-to-code/)
  - "Building Aether 1: Sound Without Boundaries" (6 Aug 2025) — [Codrops](https://tympanus.net/codrops/2025/08/06/building-aether-1-sound-without-boundaries/)

### Inferences
- **Authored worlds win the very top.** The top prizes of 2022–2024 went to real-time worlds with their own rules: procedural ice, a drivable island, a delivery planet. In 2023 and 2024 the same site won both Site of the Year and Developer Site of the Year (Lusion v3, then Igloo Inc). Design and engineering excellence are judged as one craft.
- **2025 shifted slightly.** Site of the Year went to Lando Norris, a Webflow + GSAP + WebGL personal-brand site, while the "full 3D world" (Messenger) took the Developer prize. The jury rewarded one strong, brand-derived graphic idea (helmet-shaped blobs, a two-colour identity) over maximal 3D.
- **Cultural institutions are repeat patrons of top-tier work.** Getty commissioned Monks (Persepolis, 2022) and then Resn (Gehry, 2024), and both won. National Gallery's Imaginarium won in 2026. Serious heritage subjects are fully competitive; they are not a niche.
- **WebGPU reached the top prizes in 2024–2025** (Food for Fish, then Bruno Simon). The leading practitioners still ship a WebGL fallback, which is a model for a mobile product.
- **Best Polish reference: Huncwot.** For Name Atlas's subject matter (archives, oral history, Polish identity and history), Huncwot's output is the nearest Polish precedent. It is chaptered, typographic and content-first rather than spectacle-first.

### Gaps
- **CSS Design Awards** Website of the Year 2022–2025: cssdesignawards.com/woty2024/ returned empty content to the fetcher. Not verified.
- **Webby 2022–2023** winners in Best Visual Design – Aesthetic and Cultural Institutions: not shown on the category pages retrieved.
- **Awwwards shortlists.** Only winners were retrieved, not the Site of the Year nominee lists, and there is no systematic 2023–2026 Site of the Month list. The Sites of the Month found were incidental: David Whyte Experience, Toom Archives, and Lusion's Oryzo AI (Apr 2026).
- **Studios without verified 2023–2026 projects**: Active Theory, Unseen Studio, darkroom.engineering (formerly Studio Freight), Dogstudio/DEPT and Exo Ape. The Awwwards profile slugs tried returned 404 and the search budget was exhausted. For Merci-Michel, only FWA Hall of Fame membership is verified.
- **Missing site details**: no description beyond the award listing for Food for Fish (beyond "a WebGPU experiment"), Don't Board Me, Opal Tadpole, Noomo or Scout Motors.
- **Unverified search-summary claims** (originating pages not identified, so not used as findings):
  - KPR was the launch site of a "Web3 project of digital collectables".
  - The Warsaw studio **Unikorns** has "multiple Awwwards recognitions, including Site of the Day".
- **Other Polish studios** beyond Huncwot, Merixstudio and BRIGHT were not surveyed.

---

## 2. Which recurring patterns produce immersion and a sense of emergence, and which are now overused or clichéd (2025–2026)?

### Takeaway
Winning sites create emergence by **making a process visible**:
- Things grow (procedural ice).
- Particles assemble into shapes (volumetric particles forming each link's shape).
- Forms metamorphose in stages (Hatom's griffin).
- A form "develops" out of a real image (UntilLabs photo to particles, Phantom.land portraits to 3D particles).

Usually a deliberate human gesture gates the moment (click-and-hold or long-press), and sound is mapped to the motion. The critique literature and 2026 trend reports flag the tired side of the same vocabulary: motion as decoration, cursor-only interaction, scroll hijacking and parallax, and visual sameness.

### Cited Findings
**Emergence mechanics seen in award winners**
- **Procedural growth.** Igloo Inc's ice is "grown" inside a base shape by an algorithm that imitates crystal growth — [Awwwards case study](https://www.awwwards.com/igloo-inc-case-study.html)
- **Particles assembling into forms.** In Igloo Inc, volumetric particle simulations form a different shape per link, shift colour with speed and glow during transitions — [Awwwards case study](https://www.awwwards.com/igloo-inc-case-study.html)
- **Real image to particles.** UntilLabs turns a photograph of people into living particles; Phantom.land turns 2D portraits into interactive 3D face particles (snippets) — [Codrops UntilLabs](https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/); [Codrops Phantom.land](https://tympanus.net/codrops/2025/06/30/invisible-forces-the-making-of-phantom-lands-interactive-grid-and-3d-face-particle-system/)
- **Staged metamorphosis.** Hatom has five transformation stages, click-and-hold and "phase transitions" — [Awwwards](https://www.awwwards.com/sites/hatom)
- **Evolving environment.** Toom Archives centres on a "metamorphic temple with evolving weather and particles", with a custom alphabet and a timeline interface — [Immersive Garden](https://immersive-g.com/projects/aten7)
- **Hold-to-reveal rituals.** KPR and Hatom use click-and-hold. In the David Whyte Experience, "A long press on any painting reveals a video depicting the actual location that inspired it" — [Awwwards KPR](https://www.awwwards.com/sites/kpr); [Immersive Garden search result](https://immersive-g.com/projects/david-whyte-experience)
- **Typographic motion**:
  - Igloo's text scramble is done by offsetting an SDF texture in WebGL — [Awwwards case study](https://www.awwwards.com/igloo-inc-case-study.html)
  - Webflow's 2026 "Dynamic text treatments": "Text animates in, treatments feel like someone is actively writing out a statement" — [Webflow](https://webflow.com/blog/web-design-trends-2026)
  - Figma's 2026 list includes "kinetic lettering" — [Figma](https://www.figma.com/resource-library/web-design-trends/)
- **Preloader as ritual**:
  - KPR uses "custom loaders" — [Awwwards](https://www.awwwards.com/sites/kpr)
  - Igloo renders its intro in real time rather than as video, to keep the style consistent and the file small — [Awwwards case study](https://www.awwwards.com/igloo-inc-case-study.html)
  - Tesoro carries its colour system into its preloader — [Webflow](https://webflow.com/blog/web-design-trends-2026)
- **Sound as structure**:
  - Igloo's music and sound effects are matched to particle movement — [Awwwards case study](https://www.awwwards.com/igloo-inc-case-study.html)
  - David Whyte has bespoke soundscapes and voice recordings of the poems — [Immersive Garden](https://immersive-g.com/projects/david-whyte-experience)
  - Bruno Simon uses spatialised environmental and object audio — [Awwwards case study](https://www.awwwards.com/brunos-portfolio-case-study.html)
  - National Gallery Imaginarium has sound design by Nick Ryan and original poetry by Sir Ben Okri — [Webby](https://winners.webbyawards.com/2026/websites-and-mobile-sites/general-desktop-mobile-sites/cultural-institutions/380455/national-gallery-imaginarium)
- **Cursor-reactive surfaces.**
  - Lando Norris has blob overlays that follow the cursor — [DesignRush](https://designrush.com/best-designs/websites/lando-norris-website-design)
  - Lusion v3 has a reactive cursor — [Awwwards](https://www.awwwards.com/sites/lusion-v3)
  - David Whyte has a watercolour effect driven by the cursor — [Immersive Garden search result](https://immersive-g.com/projects/david-whyte-experience)
- **Scroll.** The Other Side of Truth is a single scroll story — [Awwwards](https://www.awwwards.com/sites/the-other-side-of-truth). Webflow's 2026 report says: "Last year's scroll trend was sophisticated scroll-based narratives. This year is about scroll as a navigation tool". Its examples are progress indicators and a scroll-velocity speedometer on Dropbox Dash's McLaren F1 site — [Webflow](https://webflow.com/blog/web-design-trends-2026)
- **Play and presence.** Bruno Simon has achievements, leaderboards and visitor "Whispers" — [Awwwards case study](https://www.awwwards.com/brunos-portfolio-case-study.html). Messenger has NPCs and uses WebSockets — [Awwwards](https://www.awwwards.com/sites/messenger)

**Critique and saturation signals**
- ZURB (25 Jul 2026) criticises "Motion treated as decoration rather than functional" and "Interactions gated on cursor movement (non-functional on touch/keyboard)". It also criticises accessibility being treated as secondary to animation quality — [ZURB Radar](https://radar.zurb.com/article/your-award-winning-site-might-be-locking-people-out)
- WCAG 2.3.3 gives parallax scrolling as an example of interaction-triggered motion that can cause "dizziness, nausea and headaches" in people with vestibular disorders — [W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- Webflow (23 Dec 2025) warns that "visual homogeneity becomes a real risk" as tools get more powerful and accessible — [Webflow](https://webflow.com/blog/web-design-trends-2026)
- AIGA Eye on Design (Angelica Frey, 16 May 2022) frames "rebellious" web design as a reaction against "Bootstrap UI with its clean, responsive designs" — [Eye on Design](https://eyeondesign.aiga.org/the-era-of-nonchalant-web-design-is-here/). A related Eye on Design piece blames moodboard culture for sameness in advertising — [Eye on Design](https://eyeondesign.aiga.org/all-advertising-looks-the-same-these-days-blame-the-moodboard/)
- Figma's mainstream 2026 list includes "3D and Immersive Elements", "Dark Mode", "Retrofuturism" (neon accents, chrome textures), "Neumorphism", and scroll-triggered "Motion Design and Animation" — [Figma](https://www.figma.com/resource-library/web-design-trends/)
- The palettes recorded on Awwwards for recent winners are:
  - Lando Norris: #D2FF00 on #111112.
  - Hatom: #F76CFE and #C1FF12.
  - Lusion v3: #1a2ffb on #f0f1fa.
  - Messenger: #81BFBC and #C9D5C3.
  - Igloo Inc: #b6bac5 and #383e4e.
  - Sources: [Lando](https://www.awwwards.com/sites/lando-norris); [Hatom](https://www.awwwards.com/sites/hatom); [Lusion](https://www.awwwards.com/sites/lusion-v3); [Messenger](https://www.awwwards.com/sites/messenger); [Igloo](https://www.awwwards.com/sites/igloo-inc)

### Inferences
**Still fresh and potent in 2025–2026**
- **Emergence with a causal rule.** A growth algorithm, physics, or a real data or image source (Igloo, UntilLabs, Phantom.land) reads as fresh. A generic "particles morph into logo" does not.
- **Gesture-gated reveals.** Press-and-hold works natively on touch and turns a reveal into a small ritual (KPR, Hatom, David Whyte).
- **Staged transformation as narrative structure.** Hatom's griffin gives the user a sense of progress through states.
- **Sound mapped to the visible system, or voice.** Igloo's sound follows its particles; David Whyte and Imaginarium use voice. Both beat an ambient loop.
- **Glyph-level typography in WebGL (SDF).** Cheap per-letter effects are directly relevant to animating diacritics.
- **Scroll as wayfinding** (progress, chapters) rather than hijacked cinema, per Webflow's 2026 report.
- **Presence traces**, such as Bruno Simon's Whispers, when moderated and aggregated.

**Now overused (interpretation unless a source is cited)**
- Smooth-scroll-everything and heavy parallax (see WCAG 2.3.3 and ZURB).
- Custom cursor followers and hover-only reveals, which don't work on touch (ZURB).
- Particle morphs and glitch or text-scramble on every label. Igloo used them with purpose; copies usually don't.
- "3D because 3D": generic globes, floating product blobs, gradient-mesh or aurora backgrounds. Figma now lists 3D and immersive as a mainstream trend, so it no longer differentiates.
- Acid-lime or neon on near-black. Two recent winners share #D2FF00 and #C1FF12 accents, which suggests it is becoming a period signature.
- Numeric 0–100% preloaders and long blocking intros.

### Gaps
- **No prevalence data.** No quantitative source measured how common these patterns were in 2025–2026. One search summary claimed "scrolljacking and replacing the cursor appear on well more than half of the Awwwards sites", but its underlying source could not be identified; treat it as unverified.
- **No source names the specific clichés.** No retrieved source explicitly calls "3D globes", "gradient blobs" or "dark-mode neon" clichés; those judgements above are interpretation.
- **Codrops coverage is thin.** Codrops technique articles were read only through search snippets.

---

## 3. Which immersive sites deal with archives, memory, heritage, identity, language, names, genealogy or time?

### Takeaway
There is a strong, award-validated line of heritage and memory work:
- Getty's reconstruction (Persepolis) and architecture archive (Gehry).
- Immersive Garden's memory landscapes for the poet David Whyte.
- Huncwot's oral-history archives and Polish-history projects.
- The National Gallery's poetry-and-sound Imaginarium.
- Google's Language Explorer, which states its own epistemic limits inside the interface.

The name-centred memorials (Arolsen #everynamecounts, Yad Vashem IRemember Wall) show that **an individual name, an authentic record and one participatory act** create emotional engagement without an invented narrative.

### Cited Findings
**Heritage reconstruction and archives**
- **Persepolis Reimagined** (Getty; Monks / Media.Monks), [persepolis.getty.edu](https://persepolis.getty.edu/):
  - What it is: a virtual reconstruction of the ancient city, "revived from ruins and restored to imperial power", with an immersive WebGL menu and 360° tours.
  - Awards: FWA of the Year plus People's Choice 2022, and Awwwards Developer Site of the Year 2022.
  - Sources: [Awwwards](https://www.awwwards.com/sites/persepolis-reimagined); [FWA](https://thefwa.com/news/fwa-of-the-year-2022-peoples-choice-award-winners-announced)
- **Sculpting Harmony** (Getty Research Institute and Getty Digital; Resn), [gehry.getty.edu](https://gehry.getty.edu/):
  - What it is: a project centred on Frank Gehry's work, credited to curators and emerging-platform staff.
  - Awards: two Webbys, 2024.
  - Source: [Webby](https://winners.webbyawards.com/2024/websites-and-mobile-sites/features-design/best-visual-design-aesthetic/279895/sculpting-harmony)
- **The Book of HOV** (Linked by Air; client General Idea; produced by Special Production Agency), [thebookofhov.com](https://www.thebookofhov.com/):
  - Awards: Webby, Cultural Institutions, 2024. The experience itself was not described in the retrieved entry.
  - Source: [Webby](https://winners.webbyawards.com/2024/websites-and-mobile-sites/general-desktop-mobile-sites/cultural-institutions/289534/the-book-of-hov)
- **Mausoleum of Augustus**, [mausoleodiaugusto.it](https://www.mausoleodiaugusto.it/):
  - What it is: a portal by Fondazione TIM with scientific collaboration from the Sovrintendenza Capitolina. It offers "an interactive journey through Rome's history" using animation and WebGL.
  - Awards: Awwwards Site of the Day; the date was not verified.
  - Status: HTTP 403 to the automated check.
  - Source: [Corriere Comunicazioni](https://www.corrierecomunicazioni.it/?p=103657) (snippet)
- **Other Webby winners, details not retrieved**:
  - Nordiska Museet (Bazooka AB): Webby 2025 — [Webby](https://winners.webbyawards.com/2025/websites-and-mobile-sites/general-desktop-mobile-sites/cultural-institutions/324196/nordiska-museet)
  - NPS "Life at Lewis Mountain: Shenandoah in the Jim Crow Era": People's Voice 2025 — [Webby](https://winners.webbyawards.com/winners/websites-and-mobile-sites/general-desktop-mobile-sites/cultural-institutions)
  - "LMI: The Vincent van Gogh Experience" (OddCommon): People's Voice 2025, Best Visual Design – Aesthetic — [Webby](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-visual-design-aesthetic)

**Memory, voice and poetry**
- **David Whyte Experience** (Immersive Garden), [davidwhyte.com/experience](https://davidwhyte.com/experience/), HTTP 200:
  - Awwwards copy: "Discover an immersive journey through watercolor landscapes shaped by the places that inspired poet David Whyte". There are full-screen poetry presentations and long-press landscape reveals.
  - Awards: Awwwards Site of the Day, 31 Dec 2024. Developer award 7.29, Accessibility 6.80 — [Awwwards](https://www.awwwards.com/sites/david-whyte-experience)
  - Immersive Garden's project page describes watercolour paintings for key life moments, bespoke soundscapes and voice recordings of the poems. The aim is to evoke "memory and emotion". The page also lists an Awwwards Site of the Month — [Immersive Garden](https://immersive-g.com/projects/david-whyte-experience)
- **National Gallery Imaginarium** (Fabrique & Q42), [imaginarium.nationalgallery.org.uk](https://imaginarium.nationalgallery.org.uk/):
  - Credits: original poetry by Sir Ben Okri and sound design by Nick Ryan. Q42 handled technical development and 3D.
  - Awards: Webby, Cultural Institutions, 2026.
  - Source: [Webby](https://winners.webbyawards.com/2026/websites-and-mobile-sites/general-desktop-mobile-sites/cultural-institutions/380455/national-gallery-imaginarium)
- **Obama Presidency Oral History** (Huncwot; Columbia University), [obamaoralhistory.columbia.edu](https://obamaoralhistory.columbia.edu/):
  - What it is: "450+ officials, activists, organizers, and extraordinary people from all walks of life", navigated through an interactive timeline, a grid of interviews, a map and an interview player.
  - Tech: GSAP, Three.js, TypeScript.
  - Awards: Awwwards Honorable Mention, 25 Jun 2026.
  - Source: [Awwwards](https://www.awwwards.com/sites/obama-presidency-oral-history)
- **Elders Project** (Huncwot; Columbia's Incite Center), [eldersproject.incite.columbia.edu](https://eldersproject.incite.columbia.edu/):
  - What it is: "untold stories of 250+ elders–activists, storytellers, and community builders", with transcripts, audio and animation, in a #F8F7F7 / #1B1B1B palette.
  - Awards: Awwwards Honorable Mention, 28 May 2024.
  - Source: [Awwwards](https://www.awwwards.com/sites/elders-project)

**Polish heritage precedents**
- **Where is Poland?**, [whereispoland.com/en](https://whereispoland.com/en), HTTP 200:
  - Publisher: the Adam Mickiewicz Institute with Culture.pl, within the POLSKA 100 programme, funded under "NIEPODLEGŁA 2017–2022".
  - Subject: "the story of Poland under partition, seen through a foreigner's eyes".
  - Structure: nine chapters, built from archival photographs, film excerpts and documents from the National Museum in Warsaw, the Library of Congress and Smithsonian Folkways. Content by Mikołaj Gliński and Patryk Zakrzewski; development by Huncwot — [whereispoland.com](https://whereispoland.com/en)
  - Awards and tech: Awwwards Site of the Day, 25 Feb 2019. Tags: parallax, typography, storytelling, GSAP. Palette: black and #D14836 — [Awwwards](https://www.awwwards.com/sites/where-is-poland)
- **Penderecki's Garden** (Huncwot), [pendereckisgarden.pl/en](https://pendereckisgarden.pl/en):
  - What it is: a Three.js virtual garden celebrating Krzysztof Penderecki as a "passionate gardener and one of the greatest composers of the 20th century", with a chapter selector and audio.
  - Awards: Site of the Day, 29 Apr 2021.
  - Source: [Awwwards](https://www.awwwards.com/sites/pendereckis-garden)
- **Warsaw Rising 1944** (BRIGHT, with the Topography of Terror Foundation and the Warsaw Rising Museum), [warsawrising.eu](https://warsawrising.eu/), HTTP 200:
  - What it is: a 70th-anniversary site using WebGL.
  - Awards: Site of the Day, 16 Sep 2014. This is older than the 2022–2026 window but is a Polish precedent.
  - Source: [Awwwards](https://www.awwwards.com/sites/warsaw-rising-1944)
- **Merixstudio's Polish-culture projects.** "Polish Christmas: interactive guide" and "Dukaj. The Old Axolotl" (based on the Jacek Dukaj novel) are listed as award-winning; their URLs and dates were not retrieved — [Awwwards profile](https://www.awwwards.com/merixstudio/)

**Names and participatory memorials**
- **#everynamecounts** (Arolsen Archives), [arolsen-archives.org/en/participate/everynamecounts](https://arolsen-archives.org/en/participate/everynamecounts/):
  - How it works: it is a crowdsourced digital memorial. Volunteers "are guided to randomly chosen archived documents and asked to transcribe the names and details… into the database".
  - Scale: the archive holds information on "approximately 17.5 million people" and is part of UNESCO's Memory of the World programme. A press-page snippet says "Since its launch in January 2020, over 10,000 volunteers have digitized over 2.5 million documents"; this figure is probably outdated.
  - Partners: UNESCO, the Auschwitz-Birkenau State Museum and the Anne Frank House.
  - Sources: [Arolsen](https://arolsen-archives.org/en/participate/everynamecounts/); [Arolsen press release](https://arolsen-archives.org/en/press-releases/everynamecounts-make-sure-their-names-will-never-be-forgotten/)
- **IRemember Wall** (Yad Vashem), [iremember.yadvashem.org](https://iremember.yadvashem.org/):
  - How it works: participants are linked, at random or by choice, with one of 4.8 million names in the Central Database of Shoah Victims' Names, and "both names appear together on the Wall". It runs in six languages and is built to be shared on social media.
  - Reach: "More than 85,000 victims were commemorated by people from 175 countries". The year of that figure is unclear.
  - Sources: [Calcalist](https://www.calcalistech.com/articles/0,7340,L-3889685,00.html); [Jewish News](https://www.jewishnews.co.uk/yad-vashem-to-launch-virtual-commemoration-wall-for-holocaust-remembrance-day/)

**Language and identity**
- **Language Explorer** (Google; Hook, Blinkk), [sites.research.google/languages/language-explorer](https://sites.research.google/languages/language-explorer/), HTTP 200:
  - Scope: "the world's 7,000+ languages" across "190+ countries/regions" and "159 scripts".
  - How you explore: an interactive map, search by name, country or continent, and an A–Z list.
  - Data: LinguaMeta, an "open-source dataset" "citing 19 different sources" (published at LREC-COLING 2024).
  - Stated limits: the site says "all attempts to represent languages geographically are problematic", and that each coordinate is "some kind of notional 'centre' for the language". It excludes ancient, historical, constructed and signed languages — [site](https://sites.research.google/languages/language-explorer/)
  - Awards: Webby, Responsible AI, 2026 — [Webby](https://winners.webbyawards.com/2026/websites-and-mobile-sites/responsible-technology/responsible-ai/364609/language-explorer)
- **The Other Side of Truth**: a national-identity and advocacy piece about Ukraine's defence, Awwwards Users' Choice 2022 — [Awwwards](https://www.awwwards.com/sites/the-other-side-of-truth)

**Time and "year in review" formats**
- **"365 — A Year of Cartier"** (14islands): Site of the Day, Feb 2025. Details were not retrieved — [Awwwards 14islands profile](https://www.awwwards.com/14islands/)
- **Spotify Wrapped Party**: cited as an Awwwards-reviewed experience with Accessibility 7.00, "the second-lowest mark on its dev card". Its URL was not retrieved — [ZURB Radar](https://radar.zurb.com/article/your-award-winning-site-might-be-locking-people-out)

### Inferences
- **What the best heritage pieces share.** Each pairs **one strong spatial metaphor** (a reconstructed city, a garden, watercolour landscapes, a temple-archive) with **chapters** and **primary material**: archival media, real voices, transcripts, source institutions. The archive's own material becomes the aesthetic. This fits Name Atlas's rule that facts are rendered, never invented.
- **What the name memorials show.** Arolsen and Yad Vashem show that a **single name** carries great weight when attached to a real record and a small act: transcribing, or pairing and sharing. For Name Atlas, participation should centre on **evidence**, such as "help find an earlier attestation", not on stories.
- **Language Explorer is the closest model for Name Atlas's epistemics.** It is a beautiful, award-winning interface that openly states the limits of its own map. Caveats can be part of the design, not fine print.
- **Huncwot is the natural Polish reference** for this content (oral-history archives, the partitions, Penderecki). Its style is restrained, typographic and chaptered, a useful counterweight to WebGL maximalism.
- **Ethical caution.** IRemember's random pairing of a user with a victim's name is powerful. Copied literally, a "you and this person" pairing would imply kinship or ancestry, which Name Atlas must not claim.

### Gaps
- **No surname-specific precedent found.** No award-recognised immersive web experience about surnames or genealogy from 2022–2026 was found. Dedicated searches (e.g., The Pudding or NYT name pieces, genealogy campaigns) could not run after the search budget was exhausted.
- **Missing interaction details.** The Imaginarium fetch returned only its title, and The Book of HOV, Nordiska museet and Lewis Mountain were not described in their entries.
- **Unverified numbers.** The Arolsen and Yad Vashem statistics come from search snippets of press pages and may be out of date. The Mausoleum of Augustus Site of the Day date is unverified.
- **Conflicting dates for David Whyte.** Awwwards shows Site of the Day on 31 Dec 2024. A search snippet says Site of the Month for December 2024. Immersive Garden lists a Site of the Month without a month.

---

## 4. What do design-trend sources say are the emerging directions for 2025–2026?

### Takeaway
The trend sources converge on **intentionality and human craft as the answer to AI-driven sameness**. That means:
- Proprietary, ownable effects.
- Art and craft textures combined with advanced UI.
- Radical brevity in copy, and TL;DR-first structure.
- Dynamic typography.
- Scroll used as wayfinding.
- Full colour systems.
- Imperfect, lo-fi and tactile aesthetics.

On the technical side, WebGPU is becoming production-ready and has already won top awards.

### Cited Findings
- **Webflow, "8 web design trends to watch in 2026"** (Leah Retta and Jose Ocando, 23 Dec 2025). Source: [Webflow](https://webflow.com/blog/web-design-trends-2026).
  1. **Proprietary effects and styles.** "Visual homogeneity becomes a real risk… These aren't effects anyone can replicate with a prompt."
  2. **Art converging with advanced UI.** "Combining vintage aesthetics with sophisticated interactions to signal human craft". Examples: Pencil.dev's ASCII-art classical figure, Rootly's impressionist backdrop.
  3. **Minimalism in copy.** "Brevity signals that someone cared enough to edit."
  4. **The TL;DR experience.** Structured overviews first, depth on demand. Example: Flabbergast.
  5. **Explosion of color.** Whole colour systems instead of a single accent. Example: Tesoro, including its preloader.
  6. **Dynamic text treatments.** "Enhancement without distraction."
  7. **Guided scrolling.** Scroll as navigation: progress indicators, a scroll-velocity speedometer.
  8. **The infinite canvas.** Dot grids, nodes and open space.
- **Figma, "Web design trends for 2026"** (undated resource page). Source: [Figma](https://www.figma.com/resource-library/web-design-trends/).
  - 3D and immersive elements.
  - Experimental navigation (Locomotive, The Outline, Palmer, Google Arts & Culture).
  - Vibrant colour.
  - Bold typography with kinetic lettering.
  - Dark mode.
  - Motion design.
  - Gamified design.
  - Neumorphism.
  - Retrofuturism.
  - Maximalism.
  - Collage.
  - Neo-brutalism / "anti-design".
  - Sustainable web design.
  - AI-assisted chatbots, voice interfaces and adaptive forms.
- **Canva Design Trends 2026, "Imperfect by Design"** (15 Dec 2025). Canva surveyed 1,000 creators in the US and Brazil and analysed data from 260M+ creators and 1B+ monthly designs. Source: [Campaign India](https://www.campaignindia.in/article/2026-is-the-year-of-imperfect-by-design/506629).
  - 80% of creators said "2026 is the year we regain creative control".
  - **Reality Warp**: searches for "liminal" and "uncanny" up 220%.
  - **Prompt Playground**: "lo-fi aesthetic" searches up 527%.
  - **Explorecore**: zine- and Substack-style layouts up 85%.
  - **Texture Check**: realistic texture searches up 30%.
  - **Notes App Chic**: DIY and collage searches up 90%.
  - **Opt-Out Era**: "clean layout", "serif" and "simple branding" searches up 54%.
  - **Drama Club**: cinematic storytelling up 27%.
  - 77% call AI an "essential partner".
- **iF Design Trend Report 2026** identifies "four diametrical trend pairs" at the intersection of technological, social and ecological change (snippet) — [designboom](https://www.designboom.com/design/if-design-trend-report-2026/)
- **AIGA Eye on Design, "The Era of Rebellious Web Design Is Here"** (16 May 2022): messy, tactile language drawn from print, collage and analogue scribbles, set against Bootstrap sameness. Examples: The Outline, and BDG properties such as Gawker, Bustle and Inverse — [Eye on Design](https://eyeondesign.aiga.org/the-era-of-nonchalant-web-design-is-here/)
- **It's Nice That, 2025 features** (snippet):
  - Koto's "Seasoned" hub, styled after 1970s–80s cookbooks, with archival footage — [It's Nice That](https://www.itsnicethat.com/articles/koto-studio-seasoned-graphic-design-project-300125)
  - Stripe's miniature motorised city that live-streams live data — [It's Nice That](https://www.itsnicethat.com/articles/michael-jeter-stripe-black-friday-cyber-monday-advertising-event-project-011225)
- **Codrops 2025 case-study themes**: WebGPU fluids, living particle systems built from photographs, composable React Three Fiber rendering for multi-scene narratives, and sound-led product storytelling (snippets) — [Codrops WebGPU fluids](https://tympanus.net/codrops/2025/01/29/particles-progress-and-perseverance-a-journey-into-webgpu-fluids/); [Codrops Aether 1](https://tympanus.net/codrops/2025/08/06/building-aether-1-sound-without-boundaries/)
- **WebGPU at the top awards.** WebGPU work won FWA of the Year 2024 (Food for Fish) and 2025 (Bruno Simon, built with WebGPU and TSL plus a WebGL fallback) — [FWA 2024](https://thefwa.com/news/fwa-of-the-year-2024-peoples-choice-award-winners-announced); [Awwwards case study](https://www.awwwards.com/brunos-portfolio-case-study.html)
- **Browser platform.** A secondary source (via search summary) reports that WebGPU became stable in Chrome, Edge and Firefox, and in Safari on supported Apple hardware, during 2025. It also says the View Transitions API became a native UI primitive — [OpenReplay blog](https://blog.openreplay.com/de/frontend-trends-geformt-web-2025/)

### Inferences
- **Craft is the proof.** The strongest 2026 signal for Name Atlas is that effects must be **proprietary and meaningful**, not library defaults. Name Atlas promises evidence and honesty, so a visual language derived from its own data (diacritics, attestations, counts, confidence) is both on-trend and on-brand.
- **Answer first, depth second.** TL;DR-first structure plus guided scrolling suits a mobile product whose core is a factual answer: give the answer at once and make immersion the optional depth.
- **Use real texture, not fake age.** The "imperfect / texture / human craft" trends favour **real archival texture**: scans of the attestations themselves. This also avoids fabricated "old paper".
- **The surname is the hero.** Kinetic and bold typography appears in both Figma's and Webflow's lists, so the surname itself, with its diacritics, should be the main visual object.

### Gaps
- **Sources not retrieved** because the search budget was exhausted: Muzli, Awwwards editorial trend articles, Creative Review, and It's Nice That trend essays for 2025–2026. The Figma page is undated.
- **Spatial or "Vision Pro"-inspired UI.** No source on this in the 2025–2026 web was retrieved.
- **Full reports not read.** The Canva and iF reports themselves were not read; the Canva figures come from Campaign India's summary, and the Business Wire release returned 403.
- **Unattributed claim.** A search summary said bento grids are now an "industry standard" and that "67% of top SaaS sites" use them. The originating source could not be identified, so this is unverified.

---

## 5. How do these sites handle mobile performance, loading time and accessibility?

### Takeaway
Juries score animation far above accessibility. On every Awwwards developer card checked, Accessibility was at or near the lowest sub-score (6.0 for KPR), while Animations/Transitions scored 9–10. The best teams engineer performance deliberately, with device quality tiers, compression and staged shader compilation. In my static scan, **reduced-motion handling appeared in the code of only about 6 of 19 award sites**, and several sites ship **3–6.5 MB of uncompressed HTML/CSS/JS before any 3D assets load**.

### Cited Findings
- **Awwwards developer sub-scores** (Animations/Transitions, Accessibility, WPO, Responsive):
  - **KPR**: 9.6 / **6.0** / 8.4 / 7.2 — [Awwwards](https://www.awwwards.com/sites/kpr)
  - **Hatom**: 9.40 / **6.60** / 7.80 / 7.20; Markup 6.80 — [Awwwards](https://www.awwwards.com/sites/hatom)
  - **David Whyte**: 8.00 / **6.80** / 7.40 / 7.20 — [Awwwards](https://www.awwwards.com/sites/david-whyte-experience)
  - **Lusion v3**: 10.00 / 7.40 / 9.00 / 8.40 — [Awwwards](https://www.awwwards.com/sites/lusion-v3)
  - **Messenger**: 9.00 / 7.60 / 8.80 / 8.40 — [Awwwards](https://www.awwwards.com/sites/messenger)
  - **Igloo Inc**: Animations 9.6 and Responsive 8.4, with "lower marks for accessibility and semantic SEO" — [Awwwards](https://www.awwwards.com/sites/igloo-inc)
- **ZURB Radar** (25 Jul 2026). Source: [ZURB Radar](https://radar.zurb.com/article/your-award-winning-site-might-be-locking-people-out).
  - Lacoste Polo Factory scored 9.20 on animations and 6.00 on accessibility; one reviewer gave accessibility a 5.
  - Spotify Wrapped Party scored 7.00 on accessibility, the second-lowest mark on its card.
  - ZURB cites the WebAIM Million: "95.9%" of the top million home pages fail automated WCAG tests.
  - Its recommendation: put alt text, button labels, keyboard navigation and contrast into the definition of done.
- **WCAG 2.3.3 "Animation from Interactions"** (Level AAA). Source: [W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
  - Wording: "Motion animation triggered by interaction can be disabled, unless the animation is essential…".
  - Recommended techniques: the `prefers-reduced-motion` media query in CSS, the same check in JS, or a site-wide toggle.
  - Scrolling itself is allowed; non-essential motion layered onto scroll must be possible to disable.
- **Performance practice worth copying**:
  - **Bruno Simon's device tiers.** Mobile automatically drops water blur and depth of field and lowers shadow-map resolution. The site also uses instancing, frustum culling, DRACO and ETC1S/UASTC textures, and falls back from WebGPU to WebGL — [Awwwards case study](https://www.awwwards.com/brunos-portfolio-case-study.html)
  - **Igloo Inc's loading strategy.** Custom geometry exporters and staged texture and shader loading keep initial load low. Compressed volume data came out smaller than standard web images. The team says WebGL UI effects avoid the cost of CSS clipping and masking, and tested so as "to ensure smooth navigation on low-end devices" — [Awwwards case study](https://www.awwwards.com/igloo-inc-case-study.html)
  - **Loewe x Howl's Moving Castle** was conceived as a mobile experience and won FWA People's Choice 2023 — [FWA](https://thefwa.com/news/fwa-of-the-year-2023-peoples-choice-award-winners-announced)
  - **Language Explorer** offers search and an A–Z list alongside its map, so users need not rely on the map — [site](https://sites.research.google/languages/language-explorer/)
- **Researcher's own static scan (2026-09-30).** Source: this researcher's scan of each live URL.
  - Method: I downloaded each homepage plus up to 40 statically linked JS/CSS files with curl (uncompressed, analytics excluded). I then searched them for `prefers-reduced-motion`, `reduced-motion`, `reducedMotion` or `reduceMotion`.
  - Limits: dynamically imported chunks and 3D, texture or audio assets were **not** scanned or counted. Finding the string does not prove a correct implementation, and not finding it does not prove absence.

  | Site | Uncompressed HTML+CSS+JS fetched | Reduced-motion reference found |
  |---|---|---|
  | [Lando Norris](https://landonorris.com/) | 6,629 KiB (15 files) | yes, in a site JS chunk |
  | [Messenger](https://messenger.abeto.co/) | 1,888 KiB (3) | none found |
  | [Igloo Inc](https://www.igloo.inc/) | 18 KiB (1). Inconclusive: the app loads its code dynamically | none found |
  | [Lusion](https://lusion.co/) | 1,369 KiB (2) | none found |
  | [KPR](https://kprverse.com/) | 1,000 KiB (40, hit the cap) | none found |
  | [Persepolis](https://persepolis.getty.edu/) | 1,596 KiB (5) | yes (app.css, app.js) |
  | [Bruno Simon](https://bruno-simon.com/) | 4,841 KiB (2) | none found |
  | [Hatom](https://www.hatom.com/) | 4,131 KiB (12) | none found |
  | [David Whyte](https://davidwhyte.com/experience/) | 6,470 KiB (22) | only inside the third-party mapbox-gl.js |
  | [Toom Archives / Aten7](https://www.aten7.com/intro) | 2,012 KiB (13) | none found |
  | [Sculpting Harmony](https://gehry.getty.edu/) | 552 KiB (40, hit the cap) | none found |
  | [Where is Poland?](https://whereispoland.com/en) | 1,601 KiB (4) | none found |
  | [Penderecki's Garden](https://pendereckisgarden.pl/en) | 3,116 KiB (3; the HTML alone is ~742 KiB) | none found |
  | [Obama Presidency Oral History](https://obamaoralhistory.columbia.edu/) | 2,887 KiB (4) | yes (scripts.min.js) |
  | [Elders Project](https://eldersproject.incite.columbia.edu/) | 1,953 KiB (3) | yes (scripts.min.js) |
  | [National Gallery Imaginarium](https://imaginarium.nationalgallery.org.uk/) | 1,679 KiB (2) | yes (main JS bundle) |
  | [Food for Fish](https://foodforfish.org/) | 1,145 KiB (11) | none found |
  | [Loewe x Howl's](https://howls.loewe.com/) | 1,381 KiB (2) | none found |
  | [Language Explorer](https://sites.research.google/languages/language-explorer/) | 2,281 KiB (15) | yes (CSS) |

### Inferences
- **Relatively good.**
  - Messenger and Lusion v3 have the highest WPO and responsive scores.
  - Bruno Simon has explicit device quality tiers.
  - Igloo Inc tests on low-end devices and stages its loading.
  - Language Explorer offers non-map access paths and references reduced motion in its CSS.
  - Huncwot's Columbia archives reference reduced motion and use content-first, text-rich structures.
  - Persepolis references reduced motion in its app CSS and JS.
- **Relatively weak.**
  - KPR: Accessibility 6.0, Responsive 7.2.
  - Hatom: Accessibility 6.6, Markup 6.8.
  - Lacoste Polo Factory: Accessibility 6.0.
  - Heavy static payloads: Lando Norris (~6.5 MiB of uncompressed code) and David Whyte (~6.3 MiB, including a map library).
- **What this means for Name Atlas**, a mobile-first product for Polish and diaspora adults of all ages:
  - The immersive layer must be **progressive enhancement on top of a complete semantic HTML answer**.
  - `prefers-reduced-motion` should jump to the **finished, composed state**, never to an empty or loading one.
  - Cursor-gated reveals don't work on touch.
  - Budget the initial code tightly and lazy-load WebGL only after the factual answer has rendered.

### Gaps
- **No performance measurements.** No lab or field metrics (LCP, INP, total transfer including 3D assets) were captured, and no device testing was done. My scan misses dynamic imports; the 18 KiB result for Igloo Inc is an artefact of that.
- **Reduced-motion behaviour untested.** It was not tested with the OS setting turned on.
- **Scoring method unknown.** Awwwards' official rubric for developer scoring (who scores, how) was not retrieved.

---

## Transferable ideas for a surname-discovery product

### Takeaway
The award-level vocabulary that transfers to Name Atlas has three parts:
- **Evidence-gated emergence**: form appears only as sources arrive.
- **Gesture-based reveal rituals** that are also the citation UI.
- **A proprietary visual grammar for confidence and diacritics.**

All of it sits on top of a TL;DR-first, fully accessible factual answer. The award winners supply the craft vocabulary; Name Atlas's rules (no invented story, absence ≠ zero, competing hypotheses shown as competing) supply the meaning that keeps these effects from being decoration.

### Cited Findings (precedents the ideas rest on)
- **Procedural growth** and **particles forming shapes**, with colour mapped to speed — [Igloo case study](https://www.awwwards.com/igloo-inc-case-study.html)
- **Real images reconstructed as particles** (snippets) — [Codrops UntilLabs](https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/); [Codrops Phantom.land](https://tympanus.net/codrops/2025/06/30/invisible-forces-the-making-of-phantom-lands-interactive-grid-and-3d-face-particle-system/)
- **Long-press reveals of the real place** — [Immersive Garden, David Whyte](https://immersive-g.com/projects/david-whyte-experience)
- **Staged transformation** — [Awwwards, Hatom](https://www.awwwards.com/sites/hatom)
- **A custom alphabet and timeline archive** — [Immersive Garden, Toom Archives](https://immersive-g.com/projects/aten7)
- **SDF text effects in WebGL** — [Igloo case study](https://www.awwwards.com/igloo-inc-case-study.html)
- **Chaptered archival storytelling from institutional sources** — [Where is Poland?](https://whereispoland.com/en)
- **An oral-history archive navigated by timeline, grid and map** — [Awwwards, Obama Oral History](https://www.awwwards.com/sites/obama-presidency-oral-history)
- **Caveats stated inside the interface** ("all attempts to represent languages geographically are problematic") — [Language Explorer](https://sites.research.google/languages/language-explorer/)
- **Name-level participation and sharing** — [Arolsen #everynamecounts](https://arolsen-archives.org/en/participate/everynamecounts/); [IRemember Wall](https://www.calcalistech.com/articles/0,7340,L-3889685,00.html)
- **2026 trends**: proprietary effects, TL;DR, guided scrolling and dynamic text — [Webflow](https://webflow.com/blog/web-design-trends-2026)
- **Texture, lo-fi and "regain creative control"** — [Campaign India on Canva](https://www.campaignindia.in/article/2026-is-the-year-of-imperfect-by-design/506629)
- **Device quality tiers** — [Bruno Simon case study](https://www.awwwards.com/brunos-portfolio-case-study.html)
- **Reduced-motion techniques** — [W3C WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- **Custom loaders; real-time intro instead of video** — [Awwwards, KPR](https://www.awwwards.com/sites/kpr); [Igloo case study](https://www.awwwards.com/igloo-inc-case-study.html)

### Inferences (INTERPRETATION: 20 ideas)
1. **Crystallising the canonical name.** The typed input (e.g., "Luczak") resolves into its canonical form. The ogonek or stroke of "Ł" grows in like Igloo's ice. If "Łuczak" and "Luczak" are both real, separate names, the specimen visibly **forks into two**; it never silently autocorrects. The diacritic is shown as identity, not decoration.
2. **Confidence as a state of matter.** One consistent grammar, always paired with the text label:
   - VERIFIED: crisp, fully formed.
   - LIKELY: formed, with a fine grain.
   - POSSIBLE: translucent.
   - UNCONFIRMED: outline only.
   - CONFLICTING: two forms overlaid and never merged.
   - INSUFFICIENT_DATA: an unresolved haze labelled "no evidence found ≠ none exists".
3. **Evidence-gated emergence.** Particles or strokes only settle where a claim has a source. The "reveal" is literally the source arriving; a claim with no evidence stays unresolved. The spectacle is tied to a real referent, as in UntilLabs and Phantom.land.
4. **Press-and-hold to "develop" a claim.** Long-press a claim to develop its evidence: dataset name and date, archive and call number, a scan crop. This follows David Whyte's long-press. Tap and keyboard equivalents are required. The ritual *is* the citation UI.
5. **The lookup as preloader ritual.** Instead of a fake 0–100% counter, the loading moment shows the real steps: diacritics normalised, registry snapshot [date] queried, archives searched. The ritual is truthful. This extends KPR's custom loaders and Igloo's real-time intro.
6. **The count as a field, not a digit.** Render the PESEL count as a field of marks at a stated scale (1 mark = N people), with the dataset date stamped into the image. Suppressed or absent values get a distinct "withheld" texture, never an empty field and never zero.
7. **Rarity through scale and silence (optional sound).** A muted-by-default sonic signature where rarer names are sparser and more isolated. It maps sound to the visible system, as Igloo does, and is opt-in for accessibility.
8. **Hear the name.** Pronunciation (IPA plus audio) as an identity-affirming moment for diaspora users whose family lost the diacritic. It follows the voice-led work of Imaginarium and David Whyte. It is itself a claim, so it must carry a status.
9. **Competing hypotheses as parallel branches.** Origin hypotheses grow as separate branches with equal visual weight unless the evidence ranks them. They are never braided into one story. KPR's "One world, two factions" duality is the narrative model, used as a metaphor only.
10. **Time as depth: attestation strata.** A vertical "core sample" or descent. Attested layers light up with the fragment, date and archive. Layers not yet searched look *unexcavated*, not blank. The model is Persepolis reconstruction and the Toom Archives timeline, with no invented content.
11. **Real archival texture, not faux-vintage.** Where the licence allows, the history chapter's texture is a crop of the actual attestation scan. This fits the craft and texture trends without AI "old paper".
12. **The TL;DR specimen first.** The first screen is the complete factual answer: canonical name, count and dataset date, rarity band, and a status mark on each claim. Immersion is optional depth below. This follows Webflow's TL;DR experience and suits mobile-first.
13. **A guided chapter spine.** Five or six chapters (Name, Count, Rarity, Meaning, History, Sources) with a progress indicator and native scroll, not hijacked. The models are Where is Poland?'s nine chapters and Penderecki's chapter selector.
14. **One proprietary effect, used everywhere.** For example, diacritics drawn as settling ink strokes, and an "evidence grain" whose density encodes confidence. It replaces stock particles and glitch effects (Webflow's "proprietary effects").
15. **Glyph-level Polish typography.** An SDF/WebGL layer lets each Polish letter (ą ć ę ł ń ó ś ź ż) animate individually and cheaply, as in Igloo's SDF text. An accessible HTML text twin mirrors it, and could borrow a Toom-style bespoke letterform system.
16. **A shareable "name specimen" card.** A generated card with the surname set large with its diacritics, count and dataset date, rarity band and status marks. It must stay truthful when screenshotted out of context. The shareability model is IRemember; Wrapped-style formats are relevant but under-evidenced here.
17. **Participation around evidence.** An optional, moderated "know an earlier record?" contribution flow, modelled on #everynamecounts' transcription of real documents. It is about evidence, never family stories.
18. **Name neighbourhoods, not ancestors.** Show morphological or etymological relatives (a shared root, or suffix families such as -czak or -ski) only where evidence supports them. Deliberately **do not** copy IRemember-style person pairing, which would imply kinship.
19. **An honest map caveat, if geography appears.** Follow Language Explorer: say explicitly that registry distributions are aggregates and "notional", and show suppressed areas as suppressed. This matters all the more because the warm-paper atlas direction is excluded.
20. **Device tiers and a reduced-motion "finished state".** Use automatic quality tiers (Bruno Simon) and low-end testing (Igloo). Under `prefers-reduced-motion`, show the final composed specimen immediately (WCAG 2.3.3). Load WebGL only after the HTML answer has rendered.

### Gaps
- **Untested with users.** None of these ideas has been tested with Name Atlas's audience. No source was found on how Polish and diaspora adults respond to abstract versus literal heritage visuals.
- **Licensing is unresolved.** Rights to reuse archival scans as texture (idea 11) and the availability of pronunciation data (idea 8) are not established here.
- **Share-card evidence is thin.** No verified data was retrieved on share or virality rates for name or year-in-review cards.

---

## Clichés to avoid

### Takeaway
For Name Atlas, the most important things to avoid are:
- Motion that carries no meaning.
- Interaction that assumes a cursor.
- Hijacked or parallax scroll without a reduced-motion path.
- The generic "3D / neon / blob" look of 2023–2025 award sites.

Most important of all: the surname-site clichés that would also break the product's rules, namely heraldry, sepia "ancestors", single-story "your name means…" cards and fake precision.

### Cited Findings
- **"Motion treated as decoration"** and **cursor-gated interactions** are named as failures — [ZURB Radar](https://radar.zurb.com/article/your-award-winning-site-might-be-locking-people-out)
- **Parallax is a vestibular trigger**; non-essential motion must be possible to disable — [W3C WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- **Scroll is moving from spectacle to wayfinding.** "Last year's scroll trend was sophisticated scroll-based narratives. This year is about scroll as a navigation tool" — [Webflow](https://webflow.com/blog/web-design-trends-2026)
- **Homogeneity risk**, and proprietary effects as the answer to it — [Webflow](https://webflow.com/blog/web-design-trends-2026). Sameness driven by templates and moodboards — [Eye on Design](https://eyeondesign.aiga.org/the-era-of-nonchalant-web-design-is-here/); [Eye on Design moodboard piece](https://eyeondesign.aiga.org/all-advertising-looks-the-same-these-days-blame-the-moodboard/)
- **Now mainstream in a vendor trend list**: 3D and immersive elements, dark mode, retrofuturist neon and chrome, neumorphism — [Figma](https://www.figma.com/resource-library/web-design-trends/)
- **Acid accents across recent winners**: #D2FF00 (Lando Norris) and #C1FF12 (Hatom) — [Awwwards, Lando](https://www.awwwards.com/sites/lando-norris); [Awwwards, Hatom](https://www.awwwards.com/sites/hatom)
- **Heavy code payloads** of 4–6.5 MB of uncompressed HTML/CSS/JS on several showcase sites — see the researcher scan in Q5.

### Inferences (INTERPRETATION: the list)
1. **Smooth-scroll-everything, scroll hijacking and deep parallax** as the default feel. Use native scroll with a progress spine instead.
2. **Custom cursor followers and hover-only reveals.** On a mobile-first product they either don't exist or hide content.
3. **Generic particle morphs, text scrambles and glitch or chromatic-aberration transitions on every label.** These signalled craft in 2023–2024 and now signal a template.
4. **The spinning 3D globe with glowing pins** as the "where your name lives" hero, and any **warm-paper editorial atlas** (the owner's explicit exclusion).
5. **Gradient-mesh blobs, aurora backgrounds and floating glassy 3D shapes** used as filler. Blobs only work when brand-derived, as with Lando Norris's helmet.
6. **Acid-lime or neon on near-black "dark tech" palettes**, and dark mode as the whole aesthetic. By 2025 this reads as an Awwwards-era signature.
7. **Numeric 0→100% preloaders and long unskippable intros.** Show the real lookup steps instead (idea 5).
8. **Faux-vintage heritage kitsch**: parchment, wax seals, sepia "ancestor" portraits, AI-generated old photos. It fabricates evidence-looking material and clashes with the "no claims about the user's ancestors" rule.
9. **Coats of arms and heraldic crests.** They are the classic surname-site cliché and are explicitly banned by product rules.
10. **The single-story "Your name means…" card**, and fake-precise percentages or "ancestry %" graphics. They violate "never invent a story" and "competing hypotheses shown as competing".
11. **Treating zero, empty or blank as the absence state.** It violates "absence of evidence is not zero"; use explicit INSUFFICIENT_DATA or withheld textures.
12. **Bento-grid stat dashboards.** They look like SaaS, not discovery. The claim that bento is now "industry standard" is unverified (see Q4 gaps).
13. **Autoplay ambient music.** Sound should be opt-in and mapped to meaning.
14. **Multi-megabyte JS before the first fact.** The factual answer must render before any WebGL loads.

### Gaps
- **Interpretation, not measurement.** No retrieved source quantifies how common these clichés are in 2025–2026, or explicitly names globes, blobs or neon as clichés; items 3–6 are judgement based on the award palettes and trend lists above.
- **No user evidence.** Whether Polish users read particular motifs (e.g., parchment, eagles, folk patterns) as kitsch or as heritage was not researched.
