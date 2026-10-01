"use client";

import { useEffect, useRef } from "react";
import { TOKENS } from "./design-tokens.js";
import { VOIVODESHIP_VIEWBOX, VOIVODESHIPS } from "./voivodeship-geometry.js";

/**
 * The browser members this island uses, declared rather than widening the
 * repository's `lib: ["ES2022"]` (the convention of `list-atlas-sky.tsx`).
 */
interface PathLike {
  readonly kind?: "path";
}
declare const Path2D: (new (d: string) => PathLike) | undefined;
interface Context2DLike {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  lineJoin: string;
  globalAlpha: number;
  shadowBlur: number;
  shadowColor: string;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  arc(x: number, y: number, r: number, start: number, end: number): void;
  fill(): void;
  isPointInPath(path: PathLike, x: number, y: number): boolean;
  stroke(path: PathLike): void;
}
interface CanvasLike {
  width: number;
  height: number;
  getContext(kind: "2d"): Context2DLike | null;
}

/** TERC codes in the alphabetical order of the names, as the map island lists them. */
const TERC = Object.keys(VOIVODESHIPS).sort();

/** The geometry's own box (`VOIVODESHIP_VIEWBOX`), and the canvas' pixel grid over it. */
const BOX = { width: 560, height: 531 };
const DPR = 2;
/** How many register points fall on the landmass; the surname's own points come on top. */
const REGISTER_DOTS = 5200;

/** A fixed-seed generator, so the same surname always draws the same sky. */
function generator(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

function paint(
  dots: CanvasLike,
  edge: CanvasLike,
  weights: Readonly<Record<string, number>>,
): void {
  if (typeof Path2D === "undefined") return;
  const paths = TERC.map((code) => ({ code, path: new Path2D(VOIVODESHIPS[code]?.d ?? "") }));
  const largest = Math.max(0, ...Object.values(weights));
  const rnd = generator(11);

  dots.width = BOX.width * DPR;
  dots.height = BOX.height * DPR;
  const ctx = dots.getContext("2d");
  if (ctx === null) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, BOX.width, BOX.height);
  const dot = (x: number, y: number, r: number, colour: string, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  let placed = 0;
  let tries = 0;
  while (placed < REGISTER_DOTS && tries < REGISTER_DOTS * 20) {
    tries++;
    const x = rnd() * BOX.width;
    const y = rnd() * BOX.height;
    // `isPointInPath` takes canvas pixels, and the path is drawn under the
    // transform above, so the test point is scaled and the dot is not.
    const hit = paths.find((p) => ctx.isPointInPath(p.path, x * DPR, y * DPR));
    if (hit === undefined) continue;
    placed++;
    dot(x, y, 0.75, TOKENS["dusk-map-dim"], 0.6);
    const weight = weights[hit.code] ?? 0;
    if (largest > 0 && weight > 0 && rnd() < (weight / largest) * 0.9) {
      const lit = weight === largest;
      dot(x, y, lit ? 1.3 : 1, lit ? TOKENS["dusk-map-glow"] : TOKENS["dusk-amber"], 0.55 + weight);
    }
  }

  // The landmass' edge, lit from below: only the hero shows it, and the
  // stylesheet fades it as the camera comes down.
  edge.width = BOX.width * DPR;
  edge.height = BOX.height * DPR;
  const glow = edge.getContext("2d");
  if (glow === null) return;
  glow.setTransform(DPR, 0, 0, DPR, 0, 0);
  glow.clearRect(0, 0, BOX.width, BOX.height);
  glow.lineJoin = "round";
  glow.shadowColor = TOKENS["dusk-amber"];
  glow.shadowBlur = 26;
  glow.strokeStyle = TOKENS["dusk-amber"];
  glow.lineWidth = 1;
  glow.globalAlpha = 0.5;
  for (const p of paths) glow.stroke(p.path);
  glow.shadowBlur = 8;
  glow.strokeStyle = TOKENS["dusk-map-glow"];
  glow.lineWidth = 0.5;
  glow.globalAlpha = 0.22;
  for (const p of paths) glow.stroke(p.path);
}

/**
 * The dusk world (TASK-052, ADR-0021): the sky, the sun, the curved ground and
 * Poland as a landmass of points, fixed behind the page.
 *
 * In `hero` mode it lies on the horizon under the landing's search field; a
 * submitted search sets `data-dusk-zoom` on `<html>` (`dusk-zoom.tsx`) and the
 * stylesheet brings the camera down to the map and draws the sixteen
 * voivodeship borders. In `journey` mode — the surname page — it is already
 * down, at the right of the chapters.
 *
 * Nothing here is a figure. The canvas is `aria-hidden`; the register points
 * are placed at random inside the public-domain outline, and the surname's own
 * points follow `weights`, the validated `share_of_covered` values the chapter
 * beside it prints with their source and date (`dusk-world-input.ts`). With
 * no weights the world draws the register alone and lights no region.
 */
export function DuskWorld({
  mode,
  weights = {},
  lit = null,
}: {
  mode: "hero" | "journey";
  weights?: Readonly<Record<string, number>>;
  lit?: string | null;
}) {
  const dotsRef = useRef<HTMLCanvasElement>(null);
  const edgeRef = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(weights);

  useEffect(() => {
    const dots = dotsRef.current as unknown as CanvasLike | null;
    const edge = edgeRef.current as unknown as CanvasLike | null;
    if (dots === null || edge === null) return;
    paint(dots, edge, JSON.parse(key) as Record<string, number>);
  }, [key]);

  return (
    <div className={`dusk-world dusk-world-${mode}`} aria-hidden="true">
      <div className="dusk-deep" />
      <div className="dusk-sun" />
      <div className="dusk-ground" />
      <div className="dusk-map">
        <canvas ref={edgeRef} className="dusk-edge" />
        <canvas ref={dotsRef} className="dusk-dots" />
        <svg viewBox={VOIVODESHIP_VIEWBOX} className="dusk-borders" focusable="false">
          {TERC.map((code) => {
            const shape = VOIVODESHIPS[code];
            return shape === undefined ? null : (
              <path
                key={code}
                d={shape.d}
                pathLength={1}
                className={code === lit ? "is-lit" : undefined}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
