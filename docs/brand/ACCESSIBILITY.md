# Accessibility

Dark art direction does not override usability.

## Contrast

Required targets:
- body text: WCAG AA 4.5:1;
- large text: 3:1;
- non-text interactive boundaries/focus: 3:1 where required.

Reference checks on Deep Plum `#1f071f`:
- Warm Ivory `#fffaf3`: ~18.2:1
- Soft Ivory `#f0d6db`: ~13.9:1
- Muted Ivory `#d9b8c4`: ~10.5:1
- Atlas Blue `#1e4fd7`: ~2.9:1 — **not normal text**
- Blue 400 `#4d78e5`: ~4.6:1
- Blue 300 `#82a5f2`: ~7.8:1
- Amber `#fcbf5b`: ~11.5:1

Therefore:
- primary blue buttons use ivory text;
- text links on dark use accessible blue 400/300 or ivory with blue focus/marker;
- decorative blue may remain base Atlas Blue.

## Focus

- visible on every keyboard-interactive element;
- do not use colour alone;
- 2px minimum ring with offset where layout allows;
- focus must remain visible on dark, paper and blue surfaces.

## Touch

44 × 44 CSS px target minimum for primary mobile controls.

## Maps

- hover has an equivalent focus state;
- selected region has outline/label, not colour alone;
- no-data differs by pattern/label, not just hue;
- textual table/list remains available when the map is factual.

## Confidence

Always word + symbol/context. Never infer confidence from hue.

## Screen readers

Decorative topography, folds and contour fields: `aria-hidden="true"`.  
Factual charts/maps require text equivalents/labels.  
Logo mark is hidden when adjacent wordmark already provides the accessible name.

## Motion

Respect `prefers-reduced-motion` as specified in MOTION_GUIDELINES.md.

## Metadata

Do not shrink mono evidence text below practical legibility to preserve an aesthetic. 12px is the floor for non-essential metadata; important source/date data should usually be 13–14px.

## Forms/errors

Labels remain programmatically associated. Error copy identifies the problem and recovery action. “No evidence” is not a system error.

## Testing checklist

- keyboard-only;
- VoiceOver/NVDA smoke test;
- 200% browser zoom;
- 320px viewport;
- high contrast where available;
- reduced motion;
- light archival surface contrast;
- map without colour perception.
