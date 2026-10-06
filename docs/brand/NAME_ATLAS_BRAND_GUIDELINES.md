# Name Atlas — Brand Guidelines v1.0

## 01. Brand idea

**A surname behaves like a landscape.** Layers of evidence reveal its form over time.

Visual formula:

**OLD ATLAS × CONTEMPORARY DIGITAL PRODUCT × EDITORIAL PUBLICATION × CARTOGRAPHIC DATA VISUALISATION**

Brand primitives: **POINT → TRACE → CONTOUR → PLACE → TIME → EVIDENCE**.

## 02. Brand principles

1. Evidence before atmosphere.
2. Geography is structural, not decorative.
3. One discovery, one composition.
4. Dark is immersive, not futuristic.
5. Uncertainty is designed, never hidden.
6. History is layered, never fake-vintage.
7. Surname typography is a hero asset.
8. Blue and amber are signals.
9. Real archival objects remain real.
10. The system must work without photography or the logo.

## 03. Personality

Intelligent, curious, precise, editorial, evidence-led, geographical, contemporary, human, calm, premium, culturally literate, trustworthy.

Avoid genealogy cliché, heritage nostalgia, museum staging, cottage-core, luxury-perfume tropes, astrology, mystical ancestry, fantasy, generic SaaS, crypto/gaming, cyberpunk and generic map-software aesthetics.

## 04–10. Logo system

The master symbol is the **Evolved Contour N**.

### Construction

- Five primary contour strokes in the full mark.
- Three strokes in the 32 px mark.
- Two strokes in the 16 px mark.
- Round terminals.
- No gradients or filters in the core SVG.
- Optical asymmetry is intentional: the central fold is narrower than the outer terrain.
- The single Atlas Point sits on the right-side inner slope, never dead-centre.
- Full mark stroke weight: visually ~2% of viewBox width.
- Small marks increase stroke weight rather than shrinking the full geometry.

### Clear space

Minimum clear space = the full Atlas Point diameter around all sides of the mark. For lockups, prefer 1.5× that amount.

### Minimum sizes

- Full mark: 48 CSS px minimum.
- Small mark: 20–47 px.
- 16 px cut: favicon only.
- Wordmark lockup: 112 px wide minimum in digital use.

### Approved combinations

- Dark: warm ivory contour + Atlas Blue point.
- Light/paper: Ink contour + Atlas Blue point.
- Monochrome: single ink/ivory colour with the point rendered in the same colour.

### Misuse

Never stretch, rotate, add lines, close contours, outline the point, place multiple decorative points inside the mark, add drop shadow, use a rainbow fill, put inside a generic badge/circle, or use as a factual map.

## 11. Atlas Point

Meaning: **LOCATION / DISCOVERY / EVIDENCE / FOCUS / “YOU ARE HERE.”**

Use for:
- selected map region/place;
- current discovery;
- active search transition;
- highlighted historical occurrence;
- source relationship endpoint;
- focus moment in brand graphics;
- logo.

Do not use:
- as bullet points;
- on every button;
- as repeated decorative confetti;
- where multiple equal blue points create false hierarchy;
- to imply a factual location if the graphic is decorative.

Sizes:
- micro: 6 px;
- standard UI: 8–10 px;
- map: 10–14 px plus accessible non-colour state;
- hero: 14–18 px;
- print: scale optically, never below 1.5 mm.

Glow is allowed only in hero/map focus states and must not be required to perceive the point.

## 12. Colour system

Dark environment is dominant.

Foundation families:
- Deep Plum / Aubergine: page and surfaces.
- Warm Ivory: primary typography.
- Atlas Blue: action, focus, discovery, Atlas Point.
- Amber: historical/geographic emphasis.
- Paper: rare documentary/editorial contrast.
- Green/Red: status semantics, never brand decoration.

### Usage ratio

Typical product screen:
- 70–82% Level 0 plum/dark ground;
- 10–20% raised plum/aubergine;
- 5–10% ivory text/rules;
- ≤4% Atlas Blue;
- ≤3% amber;
- paper only when function requires contrast.

Atlas Blue #1E4FD7 does **not** meet normal-text contrast on Deep Plum. On dark surfaces, use blue as a filled control/marker with ivory text or use the lighter blue text token.

## 13–17. Typography

Families:
- Display: **Fraunces**
- Interface/body: **Instrument Sans**
- Data/evidence: **IBM Plex Mono**

All are already loaded through `next/font/google` with Latin Extended. Static TTFs exist for OG/share rendering.

### Surname display

Use Fraunces with optical sizing on.

Desktop hero:
`clamp(4.5rem, 9vw, 8.5rem)`, line-height 0.88–0.96.

Desktop result:
`clamp(3.25rem, 6vw, 6.5rem)`.

Mobile:
`clamp(2.75rem, 13vw, 5rem)`.

Long names use the repository's existing measured-fit behavior where applicable. Prefer size reduction before wrapping; allow a second line only when a single line would become materially unreadable. Never strip Polish diacritics.

### Human story vs machine-readable evidence

Fraunces / Instrument Sans = interpretation and reading.  
IBM Plex Mono = dataset, date, archive ref, coordinates, confidence metadata.

## 18. Spacing

Base rhythm: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 80 / 112 / 160.

Dense evidence metadata may use 4–8 px gaps. Editorial section transitions should normally use 64–160 px.

## 19–20. Grid and layout

Desktop:
- max visual canvas ~1280–1440 px;
- 12-column mental model;
- 24–40 px gutters;
- editorial content can span 5–8 columns;
- maps/data can break the reading measure intentionally.

Tablet:
- 8-column mental model;
- 24 px gutters.

Mobile:
- 4-column mental model;
- 16–20 px gutters;
- transform the narrative, do not merely shrink desktop.

Favor asymmetry, deliberate empty space, large margins, crop and scale. Avoid equal dashboard tiles.

## 21–24. Borders, radius, shadows, surfaces

Borders are quiet structural rules, not card chrome.

Radius:
- 0–4 px editorial/data regions;
- 6–10 px interactive surfaces;
- pill only for search/chip/button treatments that genuinely need it.

No glassmorphism as a system style.

Surface hierarchy:
- Level 0: Deep Plum page ground.
- Level 1: subtle aubergine region.
- Level 2: interactive/data module.
- Level 3: popover/modal.
- Archival: warm paper; rare.

Use shadows sparingly and only for overlays/elevation. Prefer contrast and spacing first.

## 25–28. Topography and graphic language

### Contour Field
Large partial lines enter/exit the canvas. One field per major composition is normally enough.

### Topographic Crop
Extreme-scale fragment of the N/contour geometry used as editorial artwork.

### Data Trace
Fine line connecting claim → source, place → occurrence or event → archive. Decorative traces must be clearly non-factual.

### Source Coordinates
IBM Plex Mono metadata such as:
`52.2297 N`
`21.0122 E`
`[ARCHIWUM, 1892]`
`SYGN. 12/4/8`

### Fold
Layer/clip transition indicating information opening. Keep physical metaphor subtle.

### Cartographic Frame
Sparse ruler/index/grid marks at composition edges. Never turn every screen into a technical blueprint.

## 29–30. Maps and data visualisation

Use the existing factual Poland geometry and product contracts.

Map semantics:
- inactive/no-data must be visibly distinct from zero;
- selected region gets outline + label and may receive one Atlas Point;
- keyboard focus must be visible without colour;
- avoid generic road/POI maps unless the product truly needs them.

Charts:
- no rainbow palettes;
- Blue = current/active/discovery;
- Amber = historical/temporal/geographic emphasis;
- neutral plum/ivory ramps = context;
- green/red only for explicit status semantics;
- direct labels preferred over legends where feasible.

## 31–32. Imagery and archival material

Approved:
- real archival documents;
- documented historical cartography;
- real geography;
- abstract code-driven terrain;
- documented historical imagery.

Prohibited:
- random mountain photography;
- generic Polish landscapes as filler;
- AI historical people presented as real;
- family-tree/DNA/coat-of-arms clichés;
- fantasy maps;
- fake scratches, sepia damage or manufactured documents.

Historical material may be cropped, rotated, exposure-corrected and placed on paper. Do not fake age.

## 33. Iconography

Prefer Lucide/approved existing icon library where appropriate rather than drawing bespoke utility icons.

Brand-specific symbols may exist for Atlas Point, Source, Archive, Distribution and Historical Occurrence.

Guideline: 1.5–1.75 px optical stroke at 24 px, round joins/caps where compatible, 20/24 px default UI sizes, 44 px minimum touch target.

## 34–37. Buttons, inputs, navigation, cards

Primary action:
- Atlas Blue fill;
- warm ivory/white text;
- visible hover/active/focus;
- do not use blue text directly on Deep Plum at the dark base shade.

Secondary:
- dark Level 2 surface + strong ivory border/text.

Search:
- paper/ivory search surface is one of the approved rare light interventions;
- search may also use a dark input on secondary pages;
- one Atlas Point may locate the active query transition.

Navigation:
- quiet, typographic, never a floating SaaS toolbar by default.

Cards:
- only when content behaves as a discrete object;
- otherwise use spacing/rules on the canvas.

## 38–40. Evidence, confidence and sources

Evidence presentation never changes truth semantics.

Every important claim should be able to expose:
- claim;
- source/dataset;
- date;
- method where present;
- confidence.

Core display statuses:
- VERIFIED
- LIKELY
- POSSIBLE
- UNCONFIRMED

Existing domain states such as CONFLICTING and INSUFFICIENT_DATA remain valid and must not be visually collapsed.

Confidence is always label + symbol/context, never colour alone.

Source modules should resemble atlas annotations rather than legal footnotes: compact mono coordinates, clear source title, date and a direct relationship to the supported claim.

## 41. Timeline

Time runs as a trace, not a decorative progress bar.

A timeline event contains:
- date/period;
- event/occurrence;
- place if documented;
- source;
- confidence;
- optional real archival crop.

Mobile timelines become a vertical narrative.

## 42. Maps

See §29. Do not duplicate map truth inside brand components.

## 43. Search

Search is a brand moment: the query locates a name in the atlas.

Motion sequence:
input → typed surname → Atlas Point appears → contour field resolves/reorganises → data view.

Do not simulate fake research steps.

## 44. Empty/loading/error states

Loading:
contour fragments resolve → one Atlas Point locates → content appears.

Empty:
state plainly what is unavailable and what the user can do next. Never invent a decorative statistic.

Error:
separate system failure from “no evidence found.”

## 45. Motion

See `MOTION_GUIDELINES.md`. Four verbs only: RESOLVE / LOCATE / UNFOLD / CONNECT.

## 46–47. Responsive/mobile

Desktop is an editorial spatial composition. Mobile is a focused vertical story.

Large contour fields become cropped edge traces. Maps may become focused panels/full-screen mode. Metadata never shrinks below accessible reading size.

## 48. Accessibility

See `ACCESSIBILITY.md`. Art direction never overrides contrast, focus, keyboard, screen-reader, target-size or reduced-motion requirements.

## 49. Social

A share card contains:
- mark;
- surname;
- one compelling validated fact or neutral descriptor;
- topographic crop;
- one Atlas Point;
- compact source metadata.

Do not overload.

## 50. Print

Use paper, one-colour contour, blind emboss where available and optional Atlas Blue point. The system must still work with ordinary one-colour printing.

## 51–53. Implementation, tokens, assets

Use semantic variables/components in `apps/web/src/design-system`. Raw values live only in the token source. Core SVGs are under `apps/web/public/brand`.

Do not encode factual geography in decorative assets.

## 54. Developer checklist

- Uses `.atlas-v1` scope or documented semantic tokens.
- No raw colours in TS/TSX.
- No UI-derived facts.
- Blue/amber semantics respected.
- Keyboard/focus/reduced motion checked.
- Mobile transformation designed.
- Missing data ≠ zero.
- Contours used sparingly.
- Brand lab reference checked.

## 55. Designer checklist

- One primary discovery.
- Surname has appropriate visual authority.
- Evidence remains legible.
- Dark composition has sufficient quiet space.
- Blue/amber are signals, not decoration.
- No generic white card wall.
- No false archive/map imagery.
- Works without decorative imagery.

## 56. Do / Don't

**Do:** crop contours, use asymmetric whitespace, expose sources, use one Atlas Point, let data breathe, make mobile a narrative.

**Don't:** wallpaper contours, scatter glowing dots, invent provenance, replace evidence with mood, use generic gradients/glass, treat the brand as “dark mode + topography.”
