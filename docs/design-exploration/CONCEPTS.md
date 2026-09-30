# Name Atlas — twelve design directions

**Status:** design exploration requested by the project owner (September 2026). It is input for a design decision, not the decision itself, and it is not a task. Nothing here changes `PRODUCT.md`, `ARCHITECTURE.md`, contracts or code.

- **Mockups:** a private design canvas with 75 artboards — three overview boards, then twelve rows of six artboards each (concept board, desktop arrival, three phone screens, share card): <https://claude.ai/artifact/34xWnVPmpqwdxWwo98mCv7>. It is visible only to its owner until shared from its Share menu.
- **Research behind it:** [`reports/Name Atlas immersive design research.md`](reports/Name%20Atlas%20immersive%20design%20research.md) and the seven sourced notes in [`research_notes/`](research_notes/).
- **Preview:** [`preview-reveal-screens.jpg`](preview-reveal-screens.jpg) shows the "name emerges" phone screen of every direction side by side.

## How to read the mockups

- **Real data:** every direction shows the same real values from the repo's PESEL fixtures — WOŹNIAK, **42,550** in the men's surname list and **43,066** in the women's list, positions No. 9 and No. 11, as of 20 Jan 2026 (dane.gov.pl dataset 1681, CC0). The two lists are **never added together**: the publisher does not say how they relate, and each list drops its own single-bearer surnames, so a total would be both forbidden and quietly wrong.
- **Illustrative content:** meanings (*woźny* — court usher, Likely; *wóz / woźnica* — carter, Possible; overall "sources disagree"), historical traces (c. 1560, 1740s, 1890s, 1930s, a 1600–1700 gap) and every confidence level shown for them are placeholders, and each screen that shows them says so. They are not research findings.
- **Absence example:** *Źdźbłowski* is a made-up demo name, used to show the "not in the published lists" and "not enough evidence" states.
- **Interactive artboards:** every Desktop artboard has a working surname input that re-draws the art from the typed letters (never the facts). Ostrość's Evidence screen also works (its history rows turn the focus ring).

## What every direction shares

These are the product's trust rules, turned into design material. They hold in all twelve.

| Rule | How it shows up on screen |
|---|---|
| Answer first | Name, both counts, date and a confidence mark are in the first viewport. Any ritual (typing flourish, drilling, guessing) is optional and never gates a fact. |
| Two lists, no sum | Two fields, two numbers, a visible seam, and a one-line note: "Two lists, no sum — the register doesn't say how they overlap." |
| Counts carry scope and date | "PESEL register · living persons · as of 20 Jan 2026" beside every count, on every screen, so any screenshot stays true. |
| One confidence grammar | A four-step ladder (Verified → Likely → Possible → Unconfirmed) drawn with channels people read as "less certain" — softness, lightness, dashing, disorder — plus two separate states: **Sources disagree** is a split mark with both claims drawn crisply; **Not enough evidence** is a reserved empty place at full size. The word is always shown. Nothing about confidence animates. |
| Absence is not zero | Two different marks: "not published by the source" (in each list, 0 or 1 person, or outside the register's scope) and "not in our sources yet" (with a log of what was searched). |
| Rivals stay rivals | Competing origins sit side by side at equal size, listed alphabetically, with no winner implied. |
| Art from letters only | Each direction has a generative "signature" drawn only from the letters and diacritics of the surname, captioned "Drawn only from the letters of Woźniak — it says nothing about family history." Counts, meaning, region and history never drive it. |
| No lineage | Copy speaks of "people with this surname" and "Sharing a surname doesn't mean sharing a family." No ancestors, crests, family trees, maps, faces or heritage kitsch. |
| Variants stay separate | Woźniak and Wozniak appear as neighbours labelled "different name — not merged", never morphed into each other. |

## The twelve directions

### 01 · Powidok — Afterimage
*"Look into the dark. The name stays."* After Władysław Strzemiński's *Afterimages of Light* (1948–49). The screen is a dark retina; the typed name flares as light and leaves a complementary afterimage. **Count:** two luminous grain fields, one grain per 10 register entries. **Confidence:** persistence of light — crisp and bright for Verified, softer and dimmer down the ladder, a faint dashed rim for Unconfirmed; conflict is two crisp lights, sodium and cyan, never merged; the unknown is a dark place held open by a thin rim ("not seen yet"). **Signature:** one light thread per letter; vowels loop, consonants reach, diacritics flare. **Look:** retina black, sodium orange, afterimage cyan; Instrument Serif and Instrument Sans. **Cost:** medium (production bloom wants WebGL2). **Risk:** dark UI can read as "night mode"; glow must never cost contrast.

### 02 · Tłum — The Crowd
*"Every mark is someone. None of them is a story."* After Magdalena Abakanowicz's crowds ("variants of a certain prototype") and Isotype. **Count:** exact isotype fields of standing strokes — 1 mark = 10 entries, the last mark cut to the remainder, "order means nothing" — two crowds facing each other across an axis; an optional "guess the size" before the reveal. Abstract strokes only: no human figures, no "you are here". **Confidence:** stroke rendering — solid, lighter and grained, dashed, faint dotted; conflict is two crisp marks with a ≠; the unknown is an empty plinth. **Look:** cast concrete, charcoal, rust; Big Shoulders Display and Archivo. **Cost:** low–medium. **Risk:** very common names need a larger declared unit; research finds unit visuals move empathy only a little — their value is honesty about scale.

### 03 · Odwiert — Core Sample
*"Drill down through time. We only show the layers we actually recovered."* Time as depth, drawn like a geological core log. **Count:** the 2026 segment split lengthwise into two halves, one per list, one grain per register entry. **History:** a separate core segment only where a dated record exists; gaps are drillers' **"no recovery"** boxes (crossed) — the rock isn't missing, our sample is; never solid strata between records. **Confidence:** lithology — solid bedrock, fine stipple, sparse gravel, dashed empty outline; conflict is one segment split into two patterns. **Signature:** a "name cap" of one stratum per letter. **Look:** lab white, basalt, ochre, oxide, field-tag yellow; Chivo and Chivo Mono. **Cost:** low (SVG, CSS scroll-driven reveals). **Risk:** long histories make long scrolls; the scientific tone needs warmth from type.

### 04 · Firmament — Star Atlas
*"Every trace is a star. Some are bright. Some skies we haven't observed yet."* After Johannes Hevelius's star atlas (Gdańsk, 1690). **Count:** "the living sky" — two star clouds, one point per 10 register entries. **History:** "the historical sky" — each dated trace is a star whose magnitude is the strength of its evidence; rival origins are two constellations drawn only through the items each one cites; unsearched regions are hatched **"unobserved"** — "an unobserved sky isn't an empty sky". **Confidence:** magnitude 1 with spikes, magnitude 2, magnitude 3, open ring; conflict is a double star. **Look:** midnight, starlight, engraving gold; Cormorant Garamond and Jost. **Cost:** medium. **Risk:** astrology associations; a careless line implies a link nobody has shown.

### 05 · Ostrość — Focus
*"What's certain comes into focus. What isn't, we won't sharpen."* The interface is a lens. **Count:** two spiral discs of exactly one point per entry, with a loupe. **Confidence:** sharpness — 0 / 1 / 2.5 / 5 px blur with dimming; conflict is a split-image rangefinder (two crisp halves that won't line up — the Evidence screen splits "Woźniak" itself); the unknown is a frame of soft bokeh. Blur is reserved for doubt: navigation uses yellow autofocus brackets and a focus ring marked in years, never blur. **Look:** optical black, glass, focus yellow; Geist and Geist Mono. **Cost:** medium (blur on low-end phones must be pre-rendered). **Risk:** blur can't carry text, so every label stays sharp beside its mark.

### 06 · Kreska — The Mark
*"One small mark. A different name."* Polish diacritics as the brand's graphic atoms. The typed name is set enormous; the marks (kreska, ogonek, kropka, the Ł stroke) arrive last, in vermilion, cut from the typeface's own outlines. As you type, the path **forks at the diacritic** — "Woź…" and "Woz…" are two names, never merged; a row of diacritic keys helps diaspora users without a Polish keyboard. **Confidence:** the kreska as a meter — heavy stroke, thin stroke, dashed, dotted outline; conflict is two mirrored strokes; the unknown is an empty bracket. **Look:** paper white, ink, vermilion; Bricolage Grotesque and Półtawski Nowy (a revival of a 1928 typeface drawn for Polish). **Cost:** low — pure typography, fast and accessible. **Risk:** less "immersive" than generative worlds; depends on flawless diacritics in every font and share image.

### 07 · Wycinanka — Cut
*"Every name folds into its own pattern."* Łowicz and Kurpie paper-cuts, made strict and generative. The letters are folded and cut into a unique symmetric pattern (stems cut slots, bowls cut rings, accents cut small marks), so Woźniak and Wozniak cut differently. Facts arrive as separate flat coloured sheets, never on the pattern. **Count:** two solid sheets with unit squares (1 square = 1,000 entries). **Confidence:** paper integrity — solid, a few holes, lace, pencilled outline; conflict is two cuts in two colours; the unknown is a folded, uncut sheet. **Look:** white, black, vermilion, emerald, sun yellow; Unbounded and Hanken Grotesk. **Cost:** medium (the pattern generator needs long-form QA across all names). **Risk:** the closest to folk kitsch; regional patterns could imply a region or group, so motifs come only from letter geometry.

### 08 · Osnowa — Warp & Weft
*"Time is the warp. Evidence is the weft. Where nothing is woven, you'll see bare thread."* After Abakanowicz's woven *Abakans* and Anni Albers. A woven band grows as research runs: vertical warp threads are the years, each dated record is a weft pass woven at its date, and spans without evidence stay bare warp. **Confidence:** weave density — tight, regular, loose, a single floating thread; conflict is one band split into two crisp wefts; the unknown is bare warp held in a reserved band. **Count:** one pick = 1,000 entries, the last pick stopping part-way across (+550, +66), with a bare slit between the two lists labelled "No sum". **Signature:** the letters become a weaver's name draft (an 8-shaft threading). **Look:** indigo, madder, linen, ochre; Gloock and Work Sans. **Cost:** medium–high (convincing thread rendering). **Risk:** weaving reads as craft and heritage and can drift toward nostalgia.

### 09 · Akta — The Case File
*"No story until the evidence says so."* Investigative aesthetics (Forensic Architecture, Mark Lombardi). Every fact is an **exhibit** with an accession number, source and date; rival origins are open lines of inquiry joined by a yellow ≠; a **search log** records every place looked, including where nothing was found — "Finding nothing is still a finding." **Count:** Exhibit 01, with exact dot tallies (1 dot = 10 entries). **Confidence:** a tag with four quarter-cells, like GRADE ratings — 4/4, 3/4, 2/4 dashed, 1/4 dotted; the unknown is an empty exhibit frame ("No exhibit"). **Signature:** a "case mark" tracing the name across a 7 × 5 alphabet grid. **Look:** graphite, light-table white, forensic yellow; Schibsted Grotesk and Martian Mono. **Cost:** low. **Risk:** "investigation" can feel cold or police-like; dense information must stay readable.

### 10 · Chór — Chorus
*"Hear the name. Watch it resonate."* A name is first a sound. The letters become tones through a **declared key** (a musical cryptogram — Polish diacritics act as accidentals, so Woźniak plays B A E♯ G B A D); the tones set a plate ringing and sand settles into a Chladni figure unique to the name, so Woźniak and Wozniak draw different figures. **Count:** the sand itself — two plates, one grain per 10 register entries. **Confidence:** how settled the sand is — crisp lines, diffuse, partly formed, barely suggested; conflict is a split plate with two figures; the unknown is an empty plate with a rest: "Silence isn't zero." **Look:** plate black, sand, brass; Syne and Figtree. Sound plays only after a tap. **Cost:** medium–high. **Risk:** some users will read meaning into the figure; the printed key and legend must say it is letters only.

### 11 · Palimpsest — Layers
*"Written by many hands. Stacked, the name comes clear."* Every source is a translucent sheet carrying its recorded form; stacked, the forms that agree reinforce into the crisp modern name; where they differ, the difference stays visible. **Confidence:** the hand that wrote it — ink, hard pencil, soft pencil, faint dashed tracing; conflict is two sheets split by a red correction bracket; the unknown is a blank sheet holding the place. Script is asemic and generated from the letters (labelled as such), never imitation documents. **Count:** tally strokes, one stroke per 1,000 entries, last stroke to exact height. **Look:** carbon, vellum, graphite, correction red; Bona Nova (a revival of Andrzej Heidrich's Bona) and Fragment Mono. **Cost:** medium. **Risk:** thin histories give a thin stack; translucency needs careful contrast on phones.

### 12 · Kompozycja — Spatial Composition
*"Evidence as a sculpture you can walk around — empty space included."* After Katarzyna Kobro's *Spatial Compositions* and her 8:5 rhythm. Each claim is a plane in a small constructivist sculpture that assembles as evidence arrives; the void is part of the work. **Count:** two planes to scale, one per list. **Confidence:** plane solidity — solid colour, white with a black edge, translucent with a dashed edge, wire edges; conflict is two planes intersecting at an off-grid angle; the unknown is an empty volume marked by corner ticks ("space kept"). **Look:** gallery white, black, Kobro red and yellow; Anybody and Red Hat Mono. **Cost:** high (true 3D and its accessibility). **Risk:** abstract planes need strong labelling or they read as decoration.

## At a glance

Placements and ratings are the designer's judgement, not measurements.

| # | Direction | Mode | Confidence drawn as | Rooted in | Share | Build cost |
|---|---|---|---|---|---|---|
| 01 | Powidok | Dark | glow and softness | Strzemiński | High | Medium |
| 02 | Tłum | Light | stroke fill and dashes | Abakanowicz | Medium | Low–medium |
| 03 | Odwiert | Light | pattern density | core logs | Medium | Low |
| 04 | Firmament | Dark | star magnitude | Hevelius | High | Medium |
| 05 | Ostrość | Dark | blur | lens optics, Richter | Medium | Medium |
| 06 | Kreska | Light | stroke meter | Polish diacritics, Półtawski | High | Low |
| 07 | Wycinanka | Light | paper integrity | Łowicz and Kurpie paper-cuts | Very high | Medium |
| 08 | Osnowa | Dark | weave density | Abakans, Albers | Medium | Medium–high |
| 09 | Akta | Dark | tag fill ¼–4/4 | investigative practice | Medium | Low |
| 10 | Chór | Dark | pattern clarity | Chladni, Penderecki | High | Medium–high |
| 11 | Palimpsest | Dark | ink to pencil | parish registers, Bona | Medium | Medium |
| 12 | Kompozycja | Light | plane solidity | Kobro, Strzemiński | Medium | High |

## Designer's recommendation

The directions are not mutually exclusive; the research report argues for one signature move used everywhere, carried by a small number of fixed components. A strong combination to put in front of users:

1. **Kreska as the identity system.** It is the cheapest and most accessible, it is unmistakably Polish without folk motifs, and it makes the product's sharpest differentiator — diacritic identity, the Łuczak/Luczak split that matters most to diaspora users — the brand itself.
2. **One emergence world for the count moment**, tested head to head: **Powidok** (light, most atmospheric) against **Tłum** (strokes, most literal about scale).
3. **Odwiert for the history chapter** — the "no recovery" gap is the most honest and most legible way seen here to show that absence of records is not absence of people.
4. **Akta's search log for every absence state** — it turns "we found nothing" into visible work.

Kompozycja and Chór are the most novel but the most costly; they suit a campaign or landing page better than the core product. Wycinanka is the most shareable, but its folk-kitsch risk argues for using its pattern only as the share-card generator, if at all.

## Found while building — to fix in product copy

- **"Nobody or exactly one person carries it" is wrong for two lists.** A surname missing from both lists could be carried by one man and one woman. Correct wording is per list: "In each list, nobody or exactly one person carries it — or it's outside the register's scope." All mockups were corrected.
- **"Living in Poland" is not yet a safe description of the register.** The two lists together hold about 42.76 million entries (researcher's own computation from the 2026 files, not verified here) — more than Poland's resident population — so the register likely includes people abroad. Mockups say "living persons on the PESEL register". This belongs with D-006 in `docs/DECISIONS_NEEDED.md`.
- **Pronunciation needs its own font.** None of the display or text faces used here include IPA characters (ʑ, ɲ, ɔ, ˈ); a pronunciation line needs a dedicated face or a plain respelling, and a pronunciation is itself a claim that needs a status.
- **Polish accent shapes need `lang="pl"`.** Only a few Google Fonts families (Archivo, Chivo, Cormorant Garamond, Playfair Display, Vollkorn) ship Polish-specific kreska shapes, and they switch on only when the text is marked as Polish.

## What to test before choosing

From the research report: whether people can order the four ladder steps at phone size; whether the split mark reads as disagreement rather than "half-certain"; whether the empty place reads as unknown rather than zero or an error; how Polish readers take the Polish wording of the six statuses; how Polish and diaspora adults respond to abstract rather than literal heritage visuals; and whether rare and common surnames are shared at different rates.
