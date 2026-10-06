# Graphic Language

The identity must work without scenic imagery.

## 1. Contour Field

Large, partial topographic lines entering from beyond the viewport.

Rules:
- 4–9 visible lines is normally enough.
- opacity is subordinate to content;
- avoid full-screen wallpaper;
- never imply the lines are a factual terrain map unless sourced.

## 2. Topographic Crop

An enlarged fragment of the Evolved Contour N or generated contour system.

Use for:
- hero art;
- section transitions;
- social/print crops.

At large scale, it should read as abstract terrain before it reads as a logo.

## 3. Atlas Point

One precise point locating a discovery. See brand guidelines §11.

## 4. Data Trace

A 1–1.5px line connecting related information.

Factual trace: only when product data supports the relationship.  
Decorative trace: may suggest flow but must remain outside data visualisation and carry no labels that make it look factual.

## 5. Fold

Subtle clip/transform revealing a layer. No fake 3D-paper gimmicks.

## 6. Source Coordinates

Mono annotation attached to evidence:
`[DATASET, DATE]`
`[SOURCE]`
`SYGN. 12/4/8`
`52.2297 N · 21.0122 E`

Do not fabricate coordinates for decorative compositions.

## 7. Cartographic Frame

Sparse rulers/index marks aligned to composition edges. Maximum one frame treatment per viewport.

## Generative system

Components in `src/design-system/graphics` are deterministic from `seed`. The same seed must produce the same paths across sessions.

Props are visual only: density, intensity, orientation, focusPoint, opacity, variant. They must never accept research data unless a dedicated factual adapter explicitly maps validated data into them.
