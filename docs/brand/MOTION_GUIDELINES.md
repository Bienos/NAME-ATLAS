# Motion Guidelines

Motion vocabulary:

## RESOLVE
Ambiguous contour fragments become legible structure.

Use for loading and hero entry.  
Typical duration: 260–520ms.

## LOCATE
The Atlas Point finds or confirms a position.

Use for map selection, active discovery and search transition.  
Typical duration: 160–260ms.

## UNFOLD
A layer reveals another layer of evidence.

Use for drawers, accordions, source detail and major page transitions.  
Typical duration: 260–520ms.

## CONNECT
A trace draws between a claim and its source/place/time.

Use only when the relationship is real or explicitly decorative.  
Typical duration: 260–520ms.

## Tokens

- micro: 90ms
- quick: 160ms
- base: 260ms
- unfold: 520ms
- narrative: 900ms

Easing:
- resolve: `cubic-bezier(0.22, 1, 0.36, 1)`
- locate: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- unfold: `cubic-bezier(0.16, 1, 0.3, 1)`

## Stagger

Use 30–60ms for closely related items. Avoid cascading whole dashboards.

## Hover

90–160ms. Motion should confirm affordance, not entertain.

## Page transition

900ms is reserved for the one major search → atlas transformation. Ordinary route changes should remain fast.

## Loading

Full-page: contour fragments resolve, then one point locates, then content fades/reveals.  
Inline: two/three contour strokes and one locating point; keep under ~1s before repeating.

## Reduced motion

Under `prefers-reduced-motion: reduce`:
- no path-drawing travel;
- no zoom/parallax;
- no stagger;
- state changes happen immediately or with short opacity only;
- never delay navigation to finish an animation.
