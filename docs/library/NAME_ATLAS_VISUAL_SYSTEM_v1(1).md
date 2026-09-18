# NAME ATLAS — VISUAL SYSTEM v1.0

# 1. EXECUTIVE VISUAL SUMMARY

## Final visual direction

**Name Atlas is a contemporary editorial atlas for personal history: precise like cartography, expressive like cultural publishing, and emotionally paced like documentary storytelling.**

### Final visual formula

**55% Editorial Cartography**  
Maps, coordinates, points, geographic structure, spatial storytelling, evidence tied to place.

**25% Modernist Editorial Design**  
Large typography, asymmetry, strong composition, intelligent use of empty space, restrained expressive colour.

**15% Archival Storytelling**  
Authentic documents, source material, historical chronology, photographic evidence.

**5% Cinematic Reveal**  
Used only for significant discoveries: an early record, migration, archival evidence, premium report opening.

---

## Brand essence

**PLACE × TIME × EVIDENCE × IDENTITY**

Name Atlas does not visually say:

> genealogy.

It says:

> **discovery of identity through geography and history.**

The primary visual primitives are:

**POINT → LINE → PLACE → TIME**

A point can mean a person, record, town or occurrence.

A line can mean movement, connection, evidence or passage through time.

A field/map provides context.

A date gives temporal meaning.

---

## Core system

| Layer | Final recommendation |
|---|---|
| Primary background | warm Paper |
| Primary text | near-black Ink |
| Brand colour | Atlas Blue |
| Expressive accent | Signal Red |
| Secondary accent | Land Green |
| Display typography | editorial serif |
| UI typography | neutral grotesk |
| Data typography | mono |
| Shape language | almost square, precise |
| Main map style | editorial, low-detail, data-led |
| Cards | used sparingly |
| Motion | draw, connect, unfold |
| Premium | greater depth, evidence and composition — not gold |
| Archive | faithful reproduction |
| Confidence | symbol + label + evidence |
| Main UI | light |
| Dark UI | limited narrative scenes |
| Mobile | vertical discovery story |
| Desktop | editorial canvas |

---

## Core colours

**Ink** `#101413`  
**Paper** `#F3F0E8`  
**Atlas Blue** `#1E4FD7`  
**Signal Red** `#D9483B`  
**Land Green** `#667762`

Atlas Blue is the signature digital colour.

Signal Red is punctuation, not a second primary.

---

## Core typography

### Brand / editorial
**Tiempos Headline**  
Open-source fallback: **Newsreader**

### Product/UI
**Suisse International**  
Open-source fallback: **Inter**

### Data
**IBM Plex Mono**

For MVP, I would actually begin with:

**Newsreader + Inter + IBM Plex Mono**

This is inexpensive, internationalisation-friendly and sufficiently flexible before investing in custom typography.

---

## Dark mode

Do **not** build Name Atlas visually around dark mode.

Use:

### Light Atlas
~90% of experience.

### Night Archive
~10% of experience.

Night Archive appears at meaningful historical transitions:

- earliest available trace;
- important archival discovery;
- migration story;
- premium report opening;
- deep family research.

That contrast gives dark scenes emotional weight.

---

# 2. VISUAL PRINCIPLES

## 01 — One Discovery, One Composition

Each major viewport should communicate one primary discovery.

Example:

> **12,481 people carry this surname**

gets its own typographic moment.

Not:

population + gender + rarity + ranking + map + related surnames inside six cards.

### Rationale
Discovery needs hierarchy and pacing.

### Don't
Build dashboard walls.

---

## 02 — Geography Is Narrative

Maps are not decorative visualisations.

They answer:

> Where does this story happen?

### Example
Instead of showing a choropleth next to three widgets:

full viewport map → strongest region appears → annotation explains why it matters.

### Don't
Use Google Maps-style roads, shops, POIs and unnecessary geographic noise.

---

## 03 — Evidence Before Atmosphere

Historical material exists because it supports a statement.

### Example

> Historical variant found in an 1887 source.

Show:

- authentic crop;
- archive;
- collection;
- year;
- confidence.

### Don't
Put random old handwriting behind headlines because it looks historical.

---

## 04 — History Is Layered, Not Vintage

History is represented by:

- chronology;
- source depth;
- geographic change;
- evolving spelling;
- documentation.

Not by brown paper.

### Don't

- fake sepia;
- torn edges;
- stamps;
- wax;
- scratches;
- parchment.

---

## 05 — Empty Space Is Part of the Evidence

Premium perception comes primarily from confidence in hierarchy.

One number on an otherwise quiet screen can feel considerably more valuable than twelve metrics.

### Use
Large editorial gaps of 48–160 px.

### Don't
Fill empty areas with illustrations.

---

## 06 — Data Should Read Like Editorial Content

A statistic should have meaning attached.

Instead of:

> `12,481`

write:

> **12,481 people**  
> currently carry this surname in Poland.

And, when useful:

> approximately **1 in 3,020 people**.

---

## 07 — Uncertainty Is Designed, Not Hidden

Historical research inherently contains uncertainty.

Name Atlas should make uncertainty part of its visual intelligence.

Every important interpretive claim can be:

**VERIFIED**  
**LIKELY**  
**POSSIBLE**  
**UNCONFIRMED**

### Don't
Translate uncertainty into vague copy.

---

## 08 — The User's Name Is the Hero, Not the Interface

For a result:

`[YOUR SURNAME]`

may occupy 20–30% of the viewport.

Navigation should become quiet.

### Don't
Put the surname inside a small `<h2>` in a card.

---

## 09 — Movement Explains Relationships

Motion should answer:

- where something appeared;
- where it moved;
- what connected;
- what changed;
- what came next.

### Don't
Animate because an element entered the viewport.

---

## 10 — Real Objects Stay Real

Photographs, maps and documents are historical objects.

They must retain visual integrity.

### Allowed
Cropping, exposure correction, rotation, neutral background.

### Not allowed
Invented damage, fake age, AI reconstruction presented as original.

---

## 11 — Premium Means More Evidence

Free and paid Name Atlas remain the same brand.

Premium gives:

- more historical layers;
- richer timeline;
- deeper maps;
- archival material;
- source apparatus;
- personalisation.

### Don't
Turn premium black and gold.

---

## 12 — Every Decorative Element Must Earn Its Place

Every visual should support at least one:

**Discovery / Trust / Identity / Place / Time / Evidence / Emotion / Premium Value**

If not:

remove it.

---

# 3. BRAND PERSONALITY

| Axis | Name Atlas | Interpretation |
|---|---:|---|
| Modern ↔ Historical | **70 / 30 Modern** | present-day product interpreting history |
| Scientific ↔ Emotional | **60 / 40 Scientific** | evidence first, emotion through relevance |
| Minimal ↔ Expressive | **60 / 40 Minimal** | quiet base + occasional strong gestures |
| Premium ↔ Accessible | **65 / 35 Premium** | premium without exclusivity |
| Editorial ↔ Product | **60 / 40 Editorial** | publication pacing with excellent usability |
| Serious ↔ Curious | **55 / 45 Serious** | trustworthy, never dry |
| Local ↔ Global | **20 / 80 Global** | Polish launch, international visual language |
| Static ↔ Dynamic | **40 / 60 Dynamic** | maps/time benefit from motion |
| Institutional ↔ Personal | **35 / 65 Personal** | evidence quality of an institution, experience of a personal product |

The key tension is:

> **museum credibility + consumer curiosity.**

---

# 4. COLOUR SYSTEM

## 4.1 Core brand

| Token | HEX | RGB | Role |
|---|---|---|---|
| Ink | `#101413` | 16,20,19 | primary typography |
| Paper | `#F3F0E8` | 243,240,232 | default background |
| Atlas Blue | `#1E4FD7` | 30,79,215 | brand/action/map |
| Signal Red | `#D9483B` | 217,72,59 | editorial emphasis/migration |
| Land Green | `#667762` | 102,119,98 | geographic secondary |

Ink on Paper has very high contrast.

Atlas Blue on Paper is also suitable for normal-size text.

Signal Red should primarily be used for large text, lines, markers and graphic emphasis rather than small body text.

---

## 4.2 Neutral scale

A slightly warm scale rather than SaaS blue-grey.

| Token | HEX |
|---|---|
| Neutral 50 | `#F8F7F2` |
| Neutral 100 | `#F3F0E8` |
| Neutral 200 | `#E8E5DC` |
| Neutral 300 | `#D6D2C8` |
| Neutral 400 | `#B5B2A9` |
| Neutral 500 | `#8D8C85` |
| Neutral 600 | `#6E716C` |
| Neutral 700 | `#4F534F` |
| Neutral 800 | `#303532` |
| Neutral 900 | `#1C211F` |
| Neutral 950 | `#101413` |

### Usage

50–200:
backgrounds, alternate chapters, map land.

300–400:
rules, non-essential boundaries.

500–600:
secondary labels.

700–950:
text.

Never put body text in Neutral 400.

---

## 4.3 Evidence confidence colours

These are **not alert colours**.

| Status | HEX | Symbol |
|---|---|---|
| Verified | `#236A58` | solid node |
| Likely | `#1E4FD7` | ¾ ring |
| Possible | `#8A6515` | ½ ring |
| Unconfirmed | `#6E716C` | dotted ring |

Confidence must **always** contain:

symbol + word.

Never colour only.

---

## 4.4 Semantic UI

| Role | Colour |
|---|---|
| Positive | `#236A58` |
| Warning | `#8A6515` |
| Error | `#B54436` |
| Focus | `#1E4FD7` |
| Selected | Atlas Blue |
| Inactive | Neutral 500 |
| Locked premium | Ink + Neutral 200 |
| Hover light | `#E8E5DC` |
| Hover blue | `#163DA9` |

Premium locked state should not become purple/gold.

---

# 4.5 Map colours

## Modern distribution

Sequential Atlas Blue:

`#DCE5FF`  
`#B5C8FA`  
`#82A5F2`  
`#4D78E5`  
`#1E4FD7`  
`#1438A0`

Use six bins maximum.

---

## Historical distribution

`#E9B5AF`  
`#DC7E73`  
`#C85245`  
`#9F342C`

Distinct from current distribution.

---

## Migration

Route:
`#D9483B`

Origin node:
Ink

Destination:
Signal Red

Do not give line thickness meaning unless it actually represents quantity.

---

## Origin locations

Primary candidate:
Atlas Blue

Secondary candidate:
`#667762`

Uncertain region:
diagonal hatch + neutral outline.

---

## Archive points

Ink outline with Paper interior.

When active:
Ink-filled.

---

## No data

`#E8E5DC`

Not zero.

**No data ≠ 0 occurrences.**

---

# 4.6 Premium report palette

More print-oriented and restrained:

Paper `#F3F0E8`  
Ink `#101413`  
Deep Blue `#163B93`  
Burgundy `#762E35`  
Forest `#405744`

No more than two accents per spread.

---

# 4.7 Social palette

Social can become more assertive:

Atlas Blue `#1E4FD7`

Signal Red `#D9483B`

Poster Yellow `#EDC74A`

Fresh Green `#7B985D`

Paper

Ink

Poster Yellow should **not** migrate into normal product UI except campaigns.

---

# 5. LIGHT / DARK SYSTEM

## Recommendation

Do not prioritise a full user-selectable dark theme for MVP.

Build tokens so one can be added later.

### Primary: Atlas Light

Paper surfaces.

Ink text.

Maps extremely clean.

---

### Secondary: Archive Night

Background:
`#0F1211`

Primary text:
`#F3F0E8`

Secondary:
`#B5B2A9`

Atlas Light Blue:
`#7197FF`

Signal:
`#E86E62`

### Use only for

- historical reveal;
- archive viewer;
- major migration sequence;
- premium opening;
- family research documentary moments.

A screen switching into Archive Night should mean:

> **we have moved deeper into history.**

Therefore do not use it casually.

---

# 6. TYPOGRAPHY SYSTEM

# 6.1 Three voices

## Editorial / Display

### Primary
**Tiempos Headline**

### Open source
**Newsreader Variable**

Used for:

- surname;
- chapter;
- origin statement;
- major historical discovery;
- report cover.

Character:

intellectual, contemporary, literary.

Not aristocratic.

---

## UI Sans

### Primary
**Suisse International**

### Open source
**Inter Variable**

Used for:

navigation, body, forms, buttons, descriptions.

---

## Data

### Primary/open source
**IBM Plex Mono**

Used selectively for:

- year;
- coordinates;
- source IDs;
- archive ranges;
- small technical labels.

Do **not** use mono for all numbers.

Big emotional numbers can remain sans.

---

# 6.2 Mobile type scale

| Token | Size | Line height | Weight | Tracking |
|---|---:|---:|---:|---:|
| Display XL | 56 | 54 | 450 | -0.045em |
| Display L | 44 | 44 | 450 | -0.035em |
| H1 | 36 | 40 | 500 | -0.025em |
| H2 | 30 | 35 | 500 | -0.02em |
| H3 | 24 | 30 | 550 | -0.015em |
| H4 | 20 | 26 | 600 | -0.01em |
| Body L | 18 | 28 | 400 | 0 |
| Body | 16 | 24 | 400 | 0 |
| Body S | 14 | 21 | 400 | 0 |
| Label | 13 | 16 | 600 | +0.035em |
| Caption | 12 | 17 | 450 | +0.01em |
| Data L | 32 | 36 | 500 | -0.03em |
| Data | 14 | 19 | 500 | 0 |
| Micro | 11 | 15 | 500 | +0.03em |

---

# Desktop type scale

| Token | Size | Line height |
|---|---:|---:|
| Display XL | 120 | 108 |
| Display L | 88 | 86 |
| H1 | 64 | 66 |
| H2 | 48 | 54 |
| H3 | 36 | 43 |
| H4 | 26 | 32 |
| Body L | 20 | 31 |
| Body | 17 | 26 |
| Body S | 15 | 22 |
| Label | 13 | 17 |
| Caption | 12 | 18 |
| Data L | 48 | 52 |
| Data | 14 | 20 |
| Micro | 11 | 16 |

Tablet interpolates using `clamp()` rather than needing a completely separate scale.

---

# 6.3 Dynamic surname sizing

This is critical.

### Preferred
One line.

### Rule

**≤ 10 grapheme clusters**  
full Display XL.

**11–16**  
reduce approximately 10–15%.

**17–22**  
reduce 20–30%.

**23+**  
use display fitting algorithm.

### Minimum surname size

Mobile:
**32 px**

Desktop:
**56 px**

### Maximum lines
2.

### Never
ellipsis on the principal surname heading.

### Wrapping priority

1. space;
2. hyphen;
3. approved linguistic break;
4. grapheme-safe emergency wrapping.

Never split inside combining diacritic sequences.

---

## International fallback

Latin:
Newsreader / Inter.

Greek/Cyrillic:
Noto Serif / Noto Sans if primary font lacks coverage.

CJK:
Noto Serif CJK / Noto Sans CJK.

Arabic:
Noto Naskh Arabic / Noto Sans Arabic.

Typography should use a script-aware fallback stack, not a single enormous global font.

---

# 7. GRID + SPACING

# Mobile

### 0–599 px

4-column construction grid.

Margin:
**16 px**

Gutter:
**12 px**

Default content:
4 cols.

Inset editorial body:
sometimes 3 cols.

Full-width map:
edge-to-edge.

Minimum touch:
44 × 44.

---

# Tablet

600–899.

8 columns.

Margins:
32 px.

Gutter:
20 px.

---

# Desktop

900–1599.

12-column **editorial construction grid**.

Not SaaS columns.

Margins:

48 px compact desktop.

64 px ≥1200.

Gutter:
24 px.

Maximum visual canvas:
**1440 px**

Long-form reading width:
**620–720 px**

Data annotation:
280–360 px.

---

# Wide

1600+.

Canvas:
max 1600.

Do not infinitely expand maps/text.

Whitespace expands first.

---

# Editorial layout patterns

### 12/12
Full map.

### 8/4
Main insight + annotation.

### 7/5
Map/story split.

### 5/7
Narrative + evidence.

### 4/4/4
Only when comparing three meaningful objects.

### 3/9
Source rail + document.

Avoid repetitive:

`4 + 4 + 4 card grid`.

---

# Spacing tokens

```text
2
4
8
12
16
24
32
48
64
80
96
128
160
```

### Component spacing
8–24.

### Section spacing mobile
64–96.

### Chapter spacing mobile
96–128.

### Section desktop
96–128.

### Chapter desktop
128–160.

The larger spaces are part of the brand.

---

# 8. CORE GRAPHIC LANGUAGE

Five directions worth exploring.

## A. Coordinate Cross

`+`

Position as identity.

Strong for maps.

Weak for time.

---

## B. Atlas Thread

`POINT → LINE → POINT → TICK`

One continuous system connecting people, places and dates.

Excellent across every product layer.

---

## C. Strata

Stacked horizontal layers representing periods.

Excellent history metaphor.

Less useful for maps.

---

## D. Registry Mark

Abstract archival index notation.

Strong credibility.

Potentially too institutional.

---

## E. Meridian Frame

Map meridian/parallel geometry.

Global and atlas-like.

Could feel like a travel company.

---

# Final choice: ATLAS THREAD

The primary grammar:

```text
●────────│────────●────────○
PLACE    YEAR     RECORD   POSSIBLE
```

Components:

### Point
Occurrence / person / location / evidence.

### Thread
Connection / chronology / migration.

### Tick
Date / evidence boundary.

### Ring
Uncertainty / candidate location.

### Field
Geographic area / broader context.

---

# Atlas Thread applications

### Logo
Point crossing a short axis.

### Hero
Tiny points slowly connect behind input.

### Map
Routes and occurrences.

### Timeline
Same visual primitive.

### Loading
A real result node joins the line.

### Divider
Small thread rather than generic HR.

### Premium reveal
Basic thread develops into multiple evidence branches.

### Social
One recognisable line running through every template.

### Report
Thread crosses chapter numbers/page margins.

This consistency is what makes the system ownable.

---

# 9. LOGO DIRECTIONS

## 01. Pure Wordmark

**NAME ATLAS**

Custom spacing and one altered letter.

Potential modification:

crossbar or terminal of `A` references coordinates.

### Advantages
Global, elegant, durable.

### Risk
Needs excellent custom typography to become ownable.

### App icon
`NA`.

---

## 02. Atlas Point

A central point intersected by one horizontal and one vertical line.

```text
  │
──●──
  │
```

Not a location pin.

### Advantages
Simple; geographic; tiny-size performance excellent.

### Risk
Coordinate symbols are common.

---

## 03. Atlas Thread

Two nodes connected through one date tick.

```text
●────│────●
```

### Advantages
Encodes place + time + relationship.

Can become entire graphic language.

### Risk
Horizontal symbol can be awkward as square app icon.

---

## 04. NA Coordinate Monogram

N and A built on a map grid.

### Advantages
Strong app icon.

### Risk
Could become overly tech/architecture.

---

## 05. Fold / Index

Abstract page corner intersecting with map coordinate.

### Advantages
Connects atlas + publication.

### Risk
Could resemble document software.

---

# Recommended logo system

**Wordmark + Atlas Point derived from Atlas Thread.**

Primary:
wordmark.

Secondary:
Point symbol.

App icon:
Point / NA hybrid.

Avoid trying to tell the entire genealogy story inside a logo.

---

# 10. ICONOGRAPHY

## Base geometry

24 × 24.

Stroke:
**1.5 px**

Small version 16 × 16:
1.25 px.

Large editorial:
2 px at 32+.

---

## Visual characteristics

- square/neutral terminals;
- mostly geometric;
- occasional circular evidence nodes;
- minimal internal details;
- no soft cartoon rounded strokes.

---

## Custom icon families

### Geography
Map  
Region  
Place  
Coordinates  
Migration

### History
Timeline  
Year  
Archive  
Document  
Historical map

### Evidence
Source  
Verified  
Likely  
Possible  
Unconfirmed

### Family
Person  
Connection  
Family group  
Branch

### Product
Report  
Gift  
Share  
Save  
Premium chapter

---

## Library usage

Lucide/Phosphor can be used internally as geometric scaffolding.

Before product use:

- redraw terminals;
- standardise node language;
- remove excessive curves;
- replace generic location pins;
- integrate Atlas Thread geometry.

---

# 11. CONFIDENCE SYSTEM

This is a distinct design language, not form validation.

## VERIFIED

Symbol:

**solid node**

`●`

Colour:
`#236A58`

Label:

**VERIFIED / POTWIERDZONE**

Meaning:

Direct support from suitable evidence.

---

## LIKELY

Symbol:

circle with 75% circumference.

Colour:
Atlas Blue.

Meaning:

Evidence converges strongly, but interpretation is not directly proven.

---

## POSSIBLE

Symbol:

half-ring.

Colour:
`#8A6515`

Meaning:

Plausible interpretation supported by partial evidence.

---

## UNCONFIRMED

Symbol:

dotted ring.

Colour:
Neutral 600.

Meaning:

Potential clue without enough support.

---

## Example

> **Possible place of origin**  
> [REGION]
>
> ◕ **LIKELY**
>
> Three independent surname-level sources point toward this region.
>
> `Why we think this →`

---

## Tooltip / drawer

### LIKELY

> **What “Likely” means**  
> Multiple independent signals support this interpretation. It should not be treated as proof of a specific family's origin.

Then:

`View supporting sources`

---

## Important

Never use:

> 87% confidence

unless there is an empirically calibrated statistical model where 87% genuinely means something.

---

# 12. DATA VISUALISATION

## Population count

### Preferred
Large editorial number.

```text
12,481

people currently carry
this surname in Poland
```

Add comparison only if useful.

### Don't
KPI card.

---

## Rarity

Preferred later in §13.

---

## Rank

Use ordinal:

> **#8,420** among surnames in this dataset.

Always say which dataset/universe.

---

## Gender distribution

Preferred:

two opposing bars sharing a central baseline.

Not donut.

If gender data is incomplete, show only covered data.

---

## Country distribution

Horizontal ranked bars.

Top 5 + Other.

Mobile:
scroll list with mini bars.

---

## Regional concentration

Primary:
map.

Secondary:
ranked textual list.

Never require map alone to understand values.

---

## Change over time

Preferred:

small-multiple maps:

`1900 | 1950 | 2000 | NOW`

or indexed line when comparable longitudinal counts genuinely exist.

Never infer quantitative change from incompatible datasets.

---

## Variant frequency

Ranked typographic list.

```text
[VARIANT A]  ━━━━━━━━━
[VARIANT B]  ━━━━━
[VARIANT C]  ━━
```

Only if counts exist.

Otherwise:

presence/time/location matrix.

---

## Historical dates

Timeline.

Not bar chart.

---

## Migration

Origin/destination map.

Animation draws route only if connection is evidence-based.

Possible migration:
dashed.

Verified migration:
solid.

---

## Source confidence

Evidence stack:

```text
LINGUISTIC      ● VERIFIED
GEOGRAPHIC      ◕ LIKELY
ARCHIVAL        ◕ LIKELY
HERALDIC        ○ POSSIBLE
```

---

## Compare surnames

Desktop:
side-by-side editorial split.

Mobile:
A/B swipe.

Suitable visualisations:

- population;
- percentile;
- strongest region;
- maps;
- historical depth.

---

# 13. RARITY SYSTEM

Rarity needs statistical honesty.

## Option A — Percentile

> **Rarer than 94% of surnames in the dataset**

Most defensible if dataset coverage is well defined.

### Recommended primary method.

---

## Option B — 1 in X

> **Approximately 1 in 18,400 people**

Very understandable.

Excellent social asset.

---

## Option C — Distribution Field

10,000 small nodes.

Only relevant percentage remains filled.

Beautiful, but can become decorative.

Use for social.

---

## Option D — Ranked Spectrum

```text
COMMON ──────────────●── RARE
```

Only if rarity thresholds have a formal methodology.

---

## Option E — Numerical index

`RARITY 94 / 100`

Most shareable.

But potentially misleading if it looks like a gamified proprietary score.

### Recommendation

Never lead with 94/100 alone.

Use:

> **Rarity percentile: 94**
>
> Rarer than approximately 94% of surnames in the current dataset.

Social version can shorten this.

---

# 14. CARTOGRAPHIC SYSTEM

# Base map principles

No default Google look.

Remove:

- roads;
- shops;
- business labels;
- transit;
- most terrain;
- decorative 3D.

Keep only geography required to understand the story.

---

# A. CURRENT DISTRIBUTION MAP

### Background
Paper.

### Land
Neutral 100.

### Water
`#E9EDF0` or Paper with coast outline.

### Internal regions
Neutral 300, 0.75 px.

### Data
Sequential Atlas Blue.

### Interaction
Tap/hover region.

Result:

```text
[REGION]
2,481 people
19.8% of national occurrences
```

### Mobile
Full-width, 70–90vw tall.

Bottom sheet rather than permanent legend.

---

# B. HISTORICAL MAP

Use different visual grammar.

Current borders:
faint dotted reference only.

Historical boundary:
stronger line.

Data:
historical red scale.

Top label:

> **Administrative boundaries shown for [YEAR/PERIOD]**

Never silently place 1850 data inside present-day administrative geography without explanation.

---

# C. ORIGIN MAP

This is not distribution.

Candidates use:

### Likely
solid soft outline.

### Possible
hatched region.

### Unconfirmed
dotted perimeter.

Labels include confidence.

Don't put one exact pin when the evidence only supports a province/region.

---

# D. MIGRATION MAP

Source node.

Destination node.

Curved Atlas Thread path.

### Verified path
solid.

### Possible
dashed.

### Direction
small directional tick, not large airplane-style arrow.

Animation:
draw from source → destination.

---

# E. FAMILY RESEARCH MAP

Much more precise.

Potential evidence types:

- known family place;
- candidate record;
- confirmed record;
- migration;
- archive.

Do not reveal sensitive precise modern addresses.

---

# F. GLOBAL MAP

Recommended projection for static views:

**Equal Earth**

because continents retain more honest comparative area.

Interactive world exploration may use Web Mercator if technically necessary.

---

# Handling difficult geographic data

## No data
Neutral fill.

## Zero
Explicit `0` only where dataset coverage allows the conclusion.

## Tiny samples
Aggregate rather than imply precision.

## Approximate historical place
Use uncertainty halo.

## Multiple places with identical names
Disambiguation drawer.

## Disappeared / renamed settlement
Show historical name + modern equivalent.

## Overlapping points
Cluster with count.

---

# 15. TIMELINE SYSTEM

Five timeline families.

## 01. Atlas Thread

Best default.

Desktop:

```text
1750 ───●──── 1820 ─────◕──── 1880 ──●── 1945 ───── 2026
```

Events can branch toward document/place.

---

## 02. Chronological Spine

Mobile-first.

```text
1750
 │
 ● historical variant
 │
 │
1820
 │
 ◕ possible location
 │
1880
```

Best mobile implementation.

---

## 03. Layered Geography

Rows:

```text
PLACE      ━━━━━━━━━━━━━
SPELLING       ━━━━━━━━━━━━━
ARCHIVE             ━━━━━━━━━
MIGRATION                ━━━━━
```

Excellent for deep research.

---

## 04. Snapshot Sequence

Four full map/image panels:

`1850 → 1900 → 1950 → TODAY`

Best for geographical change.

---

## 05. Archive Strip

Each event is represented by an evidence object.

Useful only for premium report.

---

# Dates

### Exact
`12 MAY 1884`

solid tick.

### Approximate
`c. 1880`

open tick.

### Range
`1878—1886`

horizontal segment.

### Unknown gap

Long empty line with:

`record gap`

not invisible interpolation.

### Conflicting dates

Two offset ticks connected to one event.

### Migration
diagonal branch.

### Variant change
new label above track.

---

# 16. ARCHIVE / SOURCE SYSTEM

## Archive presentation

A historical scan sits on neutral Paper or Ink.

No fake matting.

Minimum metadata:

```text
[INSTITUTION]
[COLLECTION]
[YEAR / RANGE]
[SOURCE ID]
```

---

## Cropping rules

### Preview
Crop to relevant area.

### Evidence state
Transparent Atlas Blue highlight around relevant text.

### Full viewer
User can always access full scanned page if rights permit.

Never permanently modify the historical source.

---

## Document viewer

Mobile:

full-screen.

Pinch zoom.

Floating:

`View source details`

Desktop:

document 8 columns.

Source/evidence rail 4 columns.

---

# 17. SOURCE CITATION SYSTEM

## Inline source

Consumer version:

> The surname appears in records from the late nineteenth century. **[S3]**

`S3` is interactive.

---

## Expanded source card

```text
SOURCE 03

National / Regional Archive
Collection title

Coverage
1878–1912

Used for
Historical spelling evidence

Evidence relationship
Direct occurrence

Confidence
VERIFIED

View original source →
```

---

## Source drawer

Mobile bottom sheet.

Contains:

- institution;
- title;
- record type;
- period;
- link;
- access date;
- evidence type.

---

## Bibliography

Full premium report:

`Sources & Methodology`

Organised by:

1. population;
2. linguistic;
3. historical;
4. geographic;
5. archival;
6. family-specific.

---

## Source citation visual language

Use:

`S01`, `S02`, `S03`

in IBM Plex Mono.

This becomes part of the Name Atlas identity.

---

# 18. IMAGE + ILLUSTRATION SYSTEM

# Photography

Use photography only when it contributes place or evidence.

### Preferred

- historic street;
- architecture;
- landscape;
- archival photography;
- museum object;
- original family upload.

---

## Treatment

Archival original:
keep original tonal quality.

Monochrome original:
stay monochrome.

Colour original:
do not automatically desaturate.

Modern location photography:
natural colour, low saturation only if photographer/source supports it.

---

## Crop language

Default:
4:3.

Editorial:
3:2.

Portrait:
4:5.

Full bleed only for major chapter transitions.

No arbitrary rounded image cards.

---

# Illustration

Yes, but **diagrammatic rather than figurative**.

## Allowed illustration vocabulary

- map fragments;
- topographic curves;
- coordinate fields;
- point/line networks;
- typographic forms;
- route fragments;
- generative geographic textures.

## Avoid

- roots;
- trees;
- DNA helices;
- castles;
- shields;
- crowns;
- silhouettes of ancestors.

---

# 19. UI COMPONENT SYSTEM

Rather than style every component differently, there are four component families:

### Action
Inputs/buttons/navigation.

### Evidence
Sources/confidence/archive.

### Discovery
Metrics/maps/timeline.

### Object
Report/gift/social/family research.

---

## Key components

| Component | Structure | Important states |
|---|---|---|
| `NameSearchField` | large text input + arrow | idle, typing, suggested, loading, invalid |
| `LocaleSwitch` | compact text toggle | default, active |
| `ChapterRail` | chapter index | current, read, upcoming |
| `AtlasMapControls` | layer/time/legend | active, disabled |
| `EvidenceBadge` | symbol + confidence | 4 confidence levels |
| `SourceReference` | S-number + source | idle, hover, open |
| `HeroMetric` | value + sentence | loaded, unavailable |
| `RarityMeasure` | percentile + context | loaded, low-data |
| `RegionRow` | place + value | idle, selected |
| `ArchiveExcerpt` | authentic crop + metadata | preview, expanded |
| `TimelineRecord` | date + node + content | exact, approx, conflict |
| `MigrationTrace` | route + metadata | verified, likely, possible |
| `DiscoveryIndex` | found categories + counts | free, expanded |
| `ReportObject` | personalized cover | preview, purchased |
| `ChapterPreview` | section + coverage | available, partial, unavailable |
| `PurchasePanel` | scope + price + CTA | idle, checkout |
| `ShareAction` | icon + label | idle, copied |
| `SaveAtlas` | save result | idle, saved |
| `FieldInput` | standard personal-data field | all form states |
| `SelectSheet` | consumer-simple selector | closed/open |
| `SourceDrawer` | evidence sheet | collapsed/expanded |
| `SystemToast` | lightweight confirmation | success/info/error |
| `LookupProgress` | real pipeline status | active/completed |
| `NoEvidenceState` | absence explanation | informative |
| `CoverageWarning` | data quality explanation | contextual |

---

# State language

## Hover
Colour or underline, not lift + shadow by default.

## Active
Atlas Blue + 1 px emphasis.

## Focus
2 px Atlas Blue outer ring with clear offset.

## Disabled
Neutral 400, but maintain readability.

## Pressed mobile
95–98% opacity/brightness, no dramatic scaling.

---

# 20. CARD SYSTEM

Cards are permitted when an object needs boundaries.

## Should be cards

### Archive Card
It represents a discrete source object.

### Source Card
Discrete evidence object.

### Location Candidate
Candidate entity.

### Family Clue
Candidate research object.

### Report Preview
An actual product object.

---

## Usually not cards

### Population
Full editorial composition.

### Rarity
Full editorial composition.

### Meaning
Text composition.

### Origin statement
Editorial section.

### Main map
Full canvas.

### Timeline
Full-width structure.

---

# Card styling

Default:

Paper or white.

1 px border Neutral 300.

Radius:
2–6 px.

Shadow:
none.

Hover desktop:
subtle border darkening.

Do not float cards over grey backgrounds by default.

---

# 21. BUTTON SYSTEM

## Primary

Atlas Blue.

White text.

Height:
48 mobile / 46 desktop.

Horizontal padding:
20–24.

Radius:
4.

---

## Secondary

Transparent.

Ink border 1 px.

---

## Tertiary

Text only.

Underline appears on hover/focus.

---

## Editorial CTA

```text
SEE THE EVIDENCE     →
```

Often more appropriate than a filled button.

---

## Premium CTA

Ink background + Paper text.

Not gold.

Example:

**OPEN THE FULL ATLAS**

---

## Icon button

44 × 44 minimum.

---

# CTA language

Prefer verbs:

**Discover**  
**Explore**  
**Open**  
**Continue**  
**See evidence**  
**View source**  
**Go further back**  
**Open chapter**

Avoid:

**Upgrade**  
**Go Pro**  
**Unlock Features**

---

# 22. FORM SYSTEM

# Surname field

The most important input in the product.

## Default

```text
Enter your surname
────────────────────────────── →
```

Avoid generic rectangular form if art direction can support editorial underline.

---

## Typing

Typed surname uses Display/Sans hybrid sizing: 24–32 mobile.

CTA becomes active as soon as valid Unicode input exists.

---

## Unicode

Store/display user input using Unicode NFC normalisation.

Never transliterate automatically for display.

---

## Diacritics

Search layer may internally compare:

`Ł / L`

`ö / oe`

etc.

But never silently replace user's spelling.

---

## Typo handling

> We couldn't find an exact match.
>
> Did you mean:
>
> `[SUGGESTION A]`  
> `[SUGGESTION B]`

Also:

`Search exactly as entered`.

---

## Suggestions

Suggestions should differentiate:

- exact database surname;
- spelling variant;
- close spelling.

---

## Unsupported surname

Never:

> Error.

Use:

> **We don't have enough data for this surname yet.**
>
> We can still check broader linguistic and international sources.

Only if true.

---

# Family forms

Ask one thing at a time.

### Region

> Where is your family most strongly associated with?

`I don't know` must always exist.

### Ancestor

Name.

Approximate year.

Place.

Maiden name.

Migration knowledge.

Use explanation:

> This helps us distinguish surname-wide records from your family's branch.

---

# 23. MOTION SYSTEM

Motion has three purposes:

**REVEAL / CONNECT / TRAVEL**

Nothing else.

---

## Duration tokens

### Instant
80–120 ms

feedback.

### Fast
160–220 ms

button/selection.

### Standard
260–360 ms

drawer/content transition.

### Narrative
500–800 ms

map/timeline.

### Major reveal
800–1100 ms

very rare.

Never create artificial waiting to justify a 1-second animation.

---

## Easing

Primary:

`cubic-bezier(0.22, 1, 0.36, 1)`

Exit:

`cubic-bezier(0.4, 0, 1, 1)`

Linear reserved for:

real progress.

---

## Search

Input becomes result heading through shared-element transition.

Not disappearing/reappearing.

---

## Map reveal

Land appears immediately.

Data points stagger 20–40 ms.

Do not animate thousands of dots individually.

---

## Data count

Counter animation:
only 250–500 ms.

Numbers must remain readable.

---

## Timeline

Atlas Thread draws in reading direction.

Events fade only once the line reaches their position.

---

## Migration

Route draws source to destination.

Possible migration:
dashed line.

---

## Variant morph

Use restrained typographic crossfade:

`FORM A → FORM B`

Do not distort letters like generative AI.

---

## Archive reveal

Document moves 8–16 px and opacity 0→1.

No theatrical folder opening.

---

## Premium reveal

Free index expands into full report spine/contents.

Motion communicates **more depth**, not a magical vault opening.

---

## Reduced motion

When `prefers-reduced-motion`:

- no drawing paths;
- no counters;
- no parallax;
- no auto-pan maps;
- use instant state change or ≤100 ms opacity.

---

# 24. LOADING SYSTEM

Never fake depth.

## Quick lookup: <400 ms

No loader.

Keep input pressed state.

---

## 400 ms–2 s

Subtle Atlas Thread.

```text
●───────○
```

Status:

> Checking surname data…

---

## Deeper lookup

Real backend stages only:

```text
Current distribution       ✓
Linguistic sources         ✓
Historical variants        …
```

---

## Archive query

Show real query categories.

Not:

> Searching 10 billion records…

unless that's literally true and relevant.

---

## Report generation

```text
Building your Atlas

Maps                ✓
Historical variants ✓
Sources              ✓
Report layout        …
```

If report generation takes considerable time, allow leaving the page and email notification.

---

# 25. PREMIUM VISUAL LANGUAGE

Premium does **not** change the brand.

It increases:

### Depth
More evidence.

### Scale
Larger maps.

### Rhythm
More publication-like pacing.

### Objectness
Personal cover.

### Source visibility
Footnotes / bibliography.

### Historical imagery
More original evidence.

---

## FREE

- current map;
- basic origin;
- basic meaning;
- rarity;
- current count.

Visual density:
low.

---

## FULL REPORT

- full maps;
- historical variants;
- timeline;
- places;
- archive references;
- migration;
- sources.

Visual density:
medium.

---

## FAMILY RESEARCH

- named evidence;
- candidate record comparison;
- family-specific places;
- deeper chronology;
- conflicts;
- research notes.

Visual density:
higher, but structured.

This should feel like moving from:

**museum exhibition → exhibition catalogue → research dossier.**

---

# 26. PAYWALL VISUAL SYSTEM

## Principle

The paywall is a **chapter threshold**.

Not a modal shouting:

> Premium!

---

## A. Report Preview

Personal cover.

3–5 page thumbnails.

Research coverage.

Price.

---

## B. Discovery Summary

```text
WE FOUND MORE

08  historical variants
04  possible places
11  archival references
03  migration clues
```

Only real numbers.

---

## C. Timeline Unlock

Current free timeline continues visually beyond its visible range.

Premium section not blurred.

Instead:

labels:

`4 historical periods available`

---

## D. Archive Findings

Stacked source objects.

Metadata visible.

Full interpretation paid.

---

## E. Family Origin

Broad surname map narrows into region-level family research.

Strong transition from product 1 → product 2.

---

# Price treatment

Not giant discount typography.

```text
29 PLN

one-time payment
```

Equal visual weight to scope.

---

## Trust directly beside CTA

> One-time purchase  
> Sources included  
> No subscription

---

# 27. PREMIUM REPORT SYSTEM

The report must be independently beautiful.

Not website screenshots printed to PDF.

---

# Digital report

Interactive long-form publication.

Features:

- maps;
- layers;
- expandable sources;
- archive viewer;
- timeline;
- chapter navigation.

---

# PDF

Poland:
A4 first.

International:
US Letter export later.

Margins:
18–22 mm.

8-column page grid.

Baseline:
4 mm.

---

# Future physical book

Recommended format:

**170 × 240 mm**

More collectible than office A4.

Matte uncoated stock.

Do not simulate paper texture digitally.

---

# Report structure

```text
COVER

CONTENTS

01 NAME
02 ORIGIN
03 MEANING
04 TODAY
05 MAP
06 VARIANTS
07 THROUGH TIME
08 HISTORICAL PLACES
09 MIGRATION
10 ARCHIVES
11 SOURCES
12 NEXT RESEARCH STEPS
```

Family edition adds:

```text
13 YOUR FAMILY
14 CANDIDATE RECORDS
15 RESEARCH QUESTIONS
```

---

# Report typography

Serif:
large chapter openings.

Sans:
explanation.

Mono:
source IDs, dates, coordinates.

---

# Page numbers

Outer bottom edge.

Format:

`042 / NAME ATLAS`

or:

`NA · 042`

---

# Pull quotes

Not inspirational quotes.

Use actual findings:

> “Three independent sources point toward the same region.”

---

# Tables

Thin rules.

No zebra stripes unless necessary.

---

# 28. REPORT COVER SYSTEM — 8 DIRECTIONS

All examples use:

**[YOUR SURNAME]**

## 01. Pure Type

```text
NAME ATLAS

[YOUR
SURNAME]

RESEARCH EDITION
2026
```

Maximum longevity.

---

## 02. Coordinate Cover

Surname + coordinates of strongest associated region.

Only where meaningful.

---

## 03. Map Fragment

Minimal contour of relevant area.

No whole world map.

---

## 04. Atlas Thread

Single path connects 3–5 significant geographic/time nodes.

Excellent signature direction.

---

## 05. Timeline

```text
[EARLIEST EVIDENCE] ───────── 2026
```

Simple, personal.

---

## 06. Data Pattern

Pattern derived from **real distribution data**.

If based on data, explicitly say so.

Never pretend decorative noise is meaningful.

---

## 07. Archive Crop

One authentic source fragment.

Reserved for research reports with a meaningful document.

---

## 08. Origin Field

Abstract geographic boundary of probable origin.

Confidence indicator small.

---

# Recommended cover system

**Atlas Thread as master.**

Secondary cover modes selected according to data availability.

---

# 29. SOCIAL SYSTEM

Social may be 20–30% more expressive than core UI.

But typography and Atlas Thread remain.

---

## 9:16

1080 × 1920.

Safe area:
120 px top/bottom.

---

## 1:1

1080 × 1080.

---

## 16:9

1600 × 900 minimum.

---

# Template 1 — Rarity

```text
MY SURNAME

RARER THAN
94%
OF SURNAMES
IN THIS DATASET

NAME ATLAS
```

---

# Template 2 — 1 in X

```text
1 IN
18,400

people carries
my surname
```

---

# Template 3 — Map

Large map.

Tiny copy.

---

# Template 4 — Strongest Region

Map crop + huge region.

---

# Template 5 — Origin

`LIKELY ORIGIN`

with confidence.

---

# Template 6 — Variants

Historical forms stacked typographically.

---

# Template 7 — Earliest Evidence

```text
EARLIEST TRACE
IN NAME ATLAS SOURCES

[YEAR/PERIOD]
```

Critical wording.

---

# Template 8 — Migration

Two locations + line.

---

# Template 9 — Compare

Split screen:

`SURNAME A / SURNAME B`

---

# Template 10 — Atlas Cover

Your personalised report cover.

Highest premium/social crossover.

---

# 30. GIFT SYSTEM

Name:

### NAME ATLAS
### FAMILY EDITION

Not:

Gift Card.

---

## Gift flow visual language

More book publishing.

Less product UI.

Recipient appears on a flyleaf-style page:

```text
Prepared for

[RECIPIENT]

From

[SENDER]

[DEDICATION]
```

---

## Digital preview

3D object only slightly.

No fake luxury renders with gold foil.

---

## Physical possibilities

### Report
softcover.

### Family Atlas
hardcover.

### Map print
large-format cartographic poster.

### Archival timeline
fold-out later.

---

# 31. MOBILE / DESKTOP / RESPONSIVE

# Mobile language

Mobile is not a small website.

It is:

**reveal → swipe/scroll → discovery → evidence**

---

## Mobile principles

One major insight per viewport.

Sticky bottom CTA only when relevant.

Bottom sheets for:

- source;
- region;
- legend;
- filters.

Maps get nearly full screen.

Timeline vertical.

Report preview horizontal swipe.

---

# Desktop language

Desktop can become more editorial.

### Patterns

Split map/content.

Large side annotation.

Sources in margin.

Horizontal timelines.

Multi-layer evidence workspace.

No persistent left SaaS sidebar.

---

# Responsive examples

| Component | Mobile | Tablet | Desktop |
|---|---|---|---|
| surname | fit width | larger | oversized |
| map | full bleed | full/7 cols | 7–9 columns |
| timeline | vertical | hybrid | horizontal |
| sources | bottom sheet | side sheet | right rail |
| archive | full screen | 5/3 split | 8/4 split |
| report preview | swipe | 2 pages | 3–4 page spread |
| paywall | vertical | centred | product-object split |
| chapter nav | compact sticky | top rail | top + chapter index |

---

# 32. ACCESSIBILITY

Target:

**WCAG 2.2 AA minimum.**

## Colour

Body contrast ≥4.5:1.

Large text ≥3:1.

UI boundaries/focus ≥3:1 where required.

---

## Confidence

Never only colour.

Always:

icon + word.

---

## Maps

Every map must have an alternative:

> **View as ranked list**

Screen reader description:

> “Highest surname concentration is in [REGION], followed by…”

---

## Timeline

DOM order remains chronological regardless of visual composition.

---

## Touch

44×44 minimum target.

Prefer 48.

---

## Keyboard

Every:

- map region;
- source;
- drawer;
- timeline entry;
- archive zoom control

must be keyboard accessible.

---

## Focus

Never remove browser focus without replacement.

---

## Reduced motion

Respect OS setting.

---

## Data visualisation

No essential information encoded exclusively by:

- hue;
- size;
- animation.

---

# 33. INTERNATIONALISATION

Design everything with **30–50% copy expansion capacity**.

German can be much longer than English.

---

## Never hardcode

fixed-width CTA labels.

---

## Surname support

Accept:

- spaces;
- hyphens;
- apostrophes;
- diacritics;
- combining marks;
- non-Latin Unicode.

---

## Numbers

Localise:

`12,481`

vs

`12 481`

according to locale.

---

## Dates

Do not visually assume:

`MM/DD/YYYY`.

---

## RTL future

Use CSS logical properties:

`margin-inline`

`padding-inline`

`inset-inline`.

Interface direction can mirror.

Maps do **not** mirror geography.

---

## Country names

Allow 2 lines in compact contexts.

Never abbreviate unfamiliar countries automatically.

---

# 34. DESIGN TOKENS

Example implementable system:

```css
:root {
  /* Brand */
  --color-brand-ink: #101413;
  --color-brand-paper: #F3F0E8;
  --color-brand-atlas: #1E4FD7;
  --color-brand-signal: #D9483B;
  --color-brand-land: #667762;

  /* Surface */
  --surface-primary: #F3F0E8;
  --surface-elevated: #F8F7F2;
  --surface-inverse: #101413;

  /* Text */
  --text-primary: #101413;
  --text-secondary: #4F534F;
  --text-tertiary: #6E716C;
  --text-inverse: #F3F0E8;

  /* Borders */
  --border-soft: #D6D2C8;
  --border-default: #B5B2A9;
  --border-strong: #6E716C;

  /* Confidence */
  --confidence-verified: #236A58;
  --confidence-likely: #1E4FD7;
  --confidence-possible: #8A6515;
  --confidence-unconfirmed: #6E716C;

  /* Map */
  --map-density-1: #DCE5FF;
  --map-density-2: #B5C8FA;
  --map-density-3: #82A5F2;
  --map-density-4: #4D78E5;
  --map-density-5: #1E4FD7;
  --map-density-6: #1438A0;
  --map-migration: #D9483B;

  /* Type */
  --font-display: "Newsreader", serif;
  --font-ui: "Inter", sans-serif;
  --font-data: "IBM Plex Mono", monospace;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Space */
  --space-1: 2px;
  --space-2: 4px;
  --space-3: 8px;
  --space-4: 12px;
  --space-5: 16px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 48px;
  --space-9: 64px;
  --space-10: 80px;
  --space-11: 96px;
  --space-12: 128px;
  --space-13: 160px;

  /* Radius */
  --radius-none: 0;
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-sheet: 16px;
  --radius-round: 999px;

  /* Border */
  --border-hairline: 1px;
  --border-emphasis: 2px;

  /* Motion */
  --duration-instant: 100ms;
  --duration-fast: 180ms;
  --duration-standard: 300ms;
  --duration-narrative: 650ms;
  --duration-reveal: 900ms;

  --ease-primary: cubic-bezier(.22, 1, .36, 1);
  --ease-exit: cubic-bezier(.4, 0, 1, 1);

  /* Breakpoints */
  --bp-tablet: 600px;
  --bp-desktop: 900px;
  --bp-wide: 1200px;
  --bp-xwide: 1600px;
}
```

---

# 35. COMPONENT NAMING

Recommended React/Figma taxonomy:

```text
Search/
  NameSearch
  NameSuggestion
  SearchProgress

Identity/
  NameDisplay
  OriginStatement
  RarityMeasure
  PopulationStatement

Atlas/
  DistributionMap
  OriginMap
  HistoricalMap
  MigrationMap
  MapLegend
  MapLayerSelector

Evidence/
  ConfidenceMark
  EvidenceStatement
  SourceLink
  SourceCard
  SourceDrawer

History/
  AtlasTimeline
  TimelineEntry
  HistoricalVariant
  HistoricalPlace
  MigrationEvent

Archive/
  ArchivePreview
  ArchiveViewer
  ArchiveMetadata
  RecordCandidate

Discovery/
  DiscoveryIndex
  ChapterIntro
  InsightStatement
  EvidenceSummary

Report/
  ReportCover
  ReportContents
  ReportPreview
  ReportChapter
  ReportPurchase

Family/
  FamilyContextForm
  AncestorInput
  FamilyPlaceInput
  ResearchCandidate

Commerce/
  PurchasePanel
  PriceDisplay
  CheckoutTrust
  GiftEdition

Share/
  SharePreview
  ShareTemplate
  ShareAction
```

---

# 36. FIGMA ARCHITECTURE

```text
00 — Start Here
     Principles
     Naming
     Release Notes

01 — Foundations
     Grid
     Spacing
     Shape
     Elevation
     Accessibility

02 — Brand
     Wordmark
     Marks
     Atlas Thread
     Graphic Motifs

03 — Colour
     Core
     Neutral
     Evidence
     Maps
     Premium
     Social

04 — Typography
     Styles
     Responsive
     International Scripts

05 — Iconography
     Core
     Evidence
     Maps
     Product

06 — Components
     Actions
     Forms
     Navigation
     Evidence
     Feedback

07 — Data Visualisation
     Metrics
     Rarity
     Comparison
     Distribution

08 — Cartography
     Current
     Historical
     Origin
     Migration
     Family
     Global

09 — History + Archive
     Timeline
     Documents
     Sources
     Viewer

10 — Patterns
     Discovery
     Research
     Loading
     Empty
     Paywall

11 — Mobile
     Landing
     Results
     Report
     Checkout

12 — Desktop
     Landing
     Results
     Research

13 — Premium Report
     Digital
     PDF
     Print

14 — Social
     Story
     Square
     OG

15 — Gift
     Digital
     Print

16 — Prototype
     Free Flow
     Purchase
     Family Research

17 — QA
     Accessibility
     Localisation
     Edge Cases
```

---

# 37. DO / DON'T LIBRARY

| DO | DON'T |
|---|---|
| Give one discovery visual dominance | Build KPI dashboards |
| Show source metadata | Hide methodology |
| Reproduce archive material faithfully | Add fake ageing |
| Use uncertainty labels | Pretend hypotheses are facts |
| Use contemporary cartography | Copy Google Maps |
| Use Paper backgrounds | Use parchment textures |
| Use Atlas Blue purposefully | Cover every screen in blue |
| Use Signal Red as punctuation | Turn red into generic error colour |
| Let typography become expressive | Use display serif everywhere |
| Preserve surname spelling | Auto-normalise visible surname |
| Let long names resize | Truncate hero surname |
| Use maps to answer questions | Use maps as backgrounds |
| Distinguish no-data from zero | Colour both identically |
| Provide textual map alternative | Require map interpretation |
| Show real historical borders | Put old data silently on modern borders |
| Use path width only when quantitative | Make pretty migration ribbons |
| Show exact evidence dates | Invent exact dates from ranges |
| Use authentic photos | Generate fake ancestors |
| Ask family data with rationale | Collect private details casually |
| Use editorial whitespace | Fill space with decorative imagery |
| Use cards for discrete objects | Put every section in a card |
| Keep corners precise | Apply 24px radius everywhere |
| Animate relationships | Animate for novelty |
| Use real backend progress | Fake search drama |
| Keep premium brand-consistent | Switch premium to black/gold |
| Sell research depth | Sell vague “Pro features” |
| Make archive IDs readable | Turn source data into academic clutter |
| Use confidence icon + text | Rely on colour |
| Use accessible focus | Remove outlines |
| Keep social expressive but branded | Invent a separate social aesthetic |

---

# 38. VISUAL QUALITY CONTROL CHECKLIST

Before approving any screen:

1. Is there one obvious primary idea?
2. Could a user describe that idea in one sentence?
3. Does this look like Name Atlas without the logo?
4. Is geography meaningful or decorative?
5. Is time meaningful or decorative?
6. Does each major factual claim have a source path?
7. Is uncertainty visible where necessary?
8. Are we accidentally turning possibility into certainty?
9. Is historical material authentic?
10. Have we added fake vintage styling?
11. Does the screen have enough whitespace?
12. Could this screen belong to a generic SaaS?
13. Are there too many cards?
14. Is Atlas Blue being used intentionally?
15. Is Signal Red overused?
16. Does typography create real hierarchy?
17. Does the surname remain visually important?
18. Does it handle a very long surname?
19. Does it handle Polish diacritics?
20. Does it survive 40% text expansion?
21. Is the mobile experience designed, not reduced?
22. Is every touch target large enough?
23. Can the data be understood without colour?
24. Can a screen reader understand the content order?
25. Is there a map/list accessibility alternative?
26. Is any animation artificially delaying information?
27. Does reduced motion retain the meaning?
28. Does premium mean deeper evidence rather than decoration?
29. Would the result still feel valuable without animation?
30. Is the user's family being represented more confidently than the evidence allows?
31. Does this object support Discovery, Trust, Identity, Place, Time, Evidence, Emotion or Premium Value?
32. If not, can we remove it?

---

# 39. KEY SCREEN EXAMPLES

## SCREEN 01 — Landing

### Hierarchy

Small:

**NAME ATLAS**

Large serif:

> **Every surname begins somewhere.**

Input becomes second-largest object.

### Composition
40% open Paper space.

Lower-right corner contains an extremely subtle Atlas Thread with three anonymous nodes.

### Colour
Paper / Ink.

Atlas Blue only on active search state.

### Motion
While typing, one node becomes active.

No animated map background.

### User focus
100% input.

---

# SCREEN 02 — First Result

```text
[YOUR SURNAME]


12,481

people currently carry
this surname in Poland


approximately
1 in 3,020
```

### Typography
Surname editorial serif.

12,481 huge sans.

Explanation regular sans.

### Composition
Top-left aligned, not centred.

### Motion
Number resolves once.

### Focus
Recognition:

> Name Atlas knows this surname.

---

# SCREEN 03 — Distribution Map

Full viewport.

Title:

> **Where the name lives today**

Map fills 80%.

Bottom annotation:

> Highest current concentration  
> **[REGION]**

`View ranked regions →`

### Desktop
Map 8 columns.

Annotation 4.

### Mobile
Map full bleed.

Information in bottom sheet.

---

# SCREEN 04 — Historical Discovery

Switch to Archive Night.

Tiny heading:

`HISTORICAL EVIDENCE / 03`

Large:

> **The spelling changed over time.**

Two verified historical forms appear.

Third line:

> **+ [X] further variants found**

Atlas Thread extends downward into next chapter.

No document shown unless there is one.

---

# SCREEN 05 — Timeline

Return to Paper.

```text
THROUGH TIME

[PERIOD] ──●──── [PERIOD] ──◕──── [YEAR] ───── NOW
             │                   │
          variant             location
```

Large blank areas communicate missing periods honestly.

---

# SCREEN 06 — Premium Report Preview

Left/mobile top:

personalised report cover:

```text
NAME ATLAS

[YOUR SURNAME]

ORIGIN
PLACE
TIME
EVIDENCE

RESEARCH EDITION
```

Below:

> **We found enough material for 7 report chapters.**

Then editorial index:

```text
01 Origin                  ready
02 Distribution            ready
03 Historical variants     [X] found
04 Historical places       [X] found
05 Timeline                available
06 Archives                [X] references
07 Sources                 included
```

---

# SCREEN 07 — Paywall

Not modal-looking.

Feels like final page of free chapter.

Large serif:

> **Continue the Atlas.**

Sub:

> Open the historical places, variants and sources found during this research.

Product object remains visible.

Price:

**29 PLN**

`one-time purchase`

Primary:

**OPEN THE FULL ATLAS →**

Below:

`View sample report`

`Methodology`

`No subscription`

No countdown.

---

# SCREEN 08 — Social Asset

Paper or strong Atlas Blue.

```text
MY SURNAME

1 IN
[X]

people in Poland

[mini map]

NAME ATLAS
```

Atlas Thread crosses page vertically.

More graphic/modernist than core UI.

No premium teaser in main message.

Small bottom CTA only:

`Discover yours`

---

# 40. FINAL NAME ATLAS VISUAL SYSTEM

## One sentence

> **Name Atlas is an editorial cartographic system that turns surnames into journeys through place, time and evidence.**

---

## BRAND ESSENCE

**Personal history made spatial, temporal and verifiable.**

---

## VISUAL FORMULA

### 55% Editorial Cartography
Maps, regions, coordinates, movement.

### 25% Modernist Publishing
Typography, asymmetry, whitespace, graphic confidence.

### 15% Evidence & Archive
Documents, sources, historical layers.

### 5% Cinematic Reveal
Rare emotional transitions.

---

## CORE COLOURS

**Ink** `#101413`  
**Paper** `#F3F0E8`  
**Atlas Blue** `#1E4FD7`  
**Signal Red** `#D9483B`  
**Land Green** `#667762`

---

## CORE TYPOGRAPHY

**Newsreader / Tiempos**  
emotion + history.

**Inter / Suisse**  
product + explanation.

**IBM Plex Mono**  
evidence + metadata.

---

## CORE MOTIF

# ATLAS THREAD

**POINT + LINE + TICK + FIELD**

One geometry connecting:

- logo;
- maps;
- timeline;
- migration;
- evidence;
- loading;
- report;
- social.

---

## MAP LANGUAGE

Quiet base.

Low geographic noise.

Data first.

Present = blue.

History = restrained red.

Uncertainty = pattern/outline.

---

## DATA LANGUAGE

Numbers become statements.

Never dashboards.

One major metric per composition.

---

## ARCHIVE LANGUAGE

Faithful originals.

Precise metadata.

No artificial nostalgia.

---

## MOTION LANGUAGE

**Connect → draw → unfold.**

Motion explains a relationship.

Never simulates fake research.

---

## PREMIUM LANGUAGE

More evidence.

More history.

More spatial and temporal depth.

Personalised publication object.

Never superficial luxury.

---

## MOBILE LANGUAGE

One discovery per screen.

Maps become canvases.

Sources become sheets.

Timeline becomes a vertical journey.

---

# WHAT MAKES NAME ATLAS OWNABLE

It is not just the colours.

The recognisable combination is:

**huge personal typography**

+

**Paper × Atlas Blue**

+

**Atlas Thread**

+

**editorial cartography**

+

**visible evidence confidence**

+

**authentic archival objects**

+

**one-discovery-per-screen pacing**

That system could eventually cover:

**surname → family → ancestor → place → migration → document → entire family history**

without requiring a visual rebrand.

---

# WHAT MUST NEVER HAPPEN

Name Atlas must never drift into:

**beige genealogy website**

**fake heritage luxury**

**black-and-gold premium**

**AI gradient consumer startup**

**rounded SaaS dashboard**

**family-tree clip art**

**generic ancestry DNA aesthetic**

**fake archive imagery**

**invented genealogy**

or

**a wall of statistics with a map beside it.**

The correct mental model for every future design decision should remain:

> **We're not designing a database about surnames. We're designing an atlas people use to enter their own history.**
