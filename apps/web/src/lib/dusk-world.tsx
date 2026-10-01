"use client";

import { useEffect, useRef, useState } from "react";
import { TOKENS } from "./design-tokens.js";
import { VOIVODESHIP_VIEWBOX, VOIVODESHIPS } from "./voivodeship-geometry.js";
import { SECTIONS, SNAPSHOT_ANCHOR, SOURCES_ANCHOR, SUMMARY_ANCHOR } from "./sections.js";

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
  globalAlpha: number;
  shadowBlur: number;
  shadowColor: string;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  arc(x: number, y: number, r: number, start: number, end: number): void;
  fill(path?: PathLike): void;
  getImageData(x: number, y: number, w: number, h: number): { readonly data: ArrayLike<number> };
}
interface CanvasLike {
  width: number;
  height: number;
  getContext(kind: "2d", options?: { willReadFrequently?: boolean }): Context2DLike | null;
}
interface StepElementLike {
  getBoundingClientRect(): { readonly top: number };
}
declare const document:
  | {
      createElement(tag: "canvas"): CanvasLike;
      getElementById(id: string): StepElementLike | null;
    }
  | undefined;
declare const window: {
  readonly scrollY: number;
  readonly innerHeight: number;
  addEventListener(type: "scroll", listener: () => void, options: { passive: boolean }): void;
  removeEventListener(type: "scroll", listener: () => void): void;
};

/** How the world is drawn: see `site-shell.tsx`. */
export type WorldMode = "hero" | "journey" | "quiet";

/**
 * The journey's screens by element id: the snapshot, the four chapters'
 * anchors (`sections.ts`), the sources and the summary. An answer that lacks
 * one simply never reaches it. Which one is being read is decided by where
 * each sits on the page, so an intent that reorders the chapters is followed.
 */
const FIRST_STEP = SNAPSHOT_ANCHOR;
export const JOURNEY_STEPS: readonly string[] = [
  FIRST_STEP,
  ...SECTIONS.map((section) => section.anchor),
  SOURCES_ANCHOR,
  SUMMARY_ANCHOR,
];

/** TERC codes in the alphabetical order of the names, as the map island lists them. */
const TERC = Object.keys(VOIVODESHIPS).sort();

/** The geometry's own box (`VOIVODESHIP_VIEWBOX`), and the canvas' pixel grid over it. */
const BOX = { width: 560, height: 531 };
const DPR = 2;

/** A fixed-seed generator, so the same page always draws the same sky. */
function generator(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

/**
 * Which voivodeship each pixel of the box falls in, and whether it is land at
 * all: the sixteen outlines are filled once on a scratch canvas, each in its
 * own red level, then all of them in white. Every later test is a lookup, so
 * the world paints thousands of points in a few milliseconds. Anti-aliasing
 * blends two levels along a shared border; the nearest level is taken, which
 * can misplace a point by a pixel and carries no meaning (the points are not
 * figures), and the land test reads the white pass, where shared borders do
 * not open a seam.
 */
function regionMask(): {
  readonly at: (x: number, y: number) => string | null;
  readonly land: (x: number, y: number) => boolean;
} | null {
  if (typeof Path2D === "undefined" || typeof document === "undefined") return null;
  const scratch = document.createElement("canvas");
  scratch.width = BOX.width;
  scratch.height = BOX.height;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (ctx === null) return null;
  const paths = TERC.map((code) => new Path2D(VOIVODESHIPS[code]?.d ?? ""));
  paths.forEach((path, index) => {
    // Levels 10, 20, … 160: one per region, and 0 is the sea and abroad.
    ctx.fillStyle = `rgb(${String((index + 1) * 10)},0,0)`;
    ctx.fill(path);
  });
  const levels = ctx.getImageData(0, 0, BOX.width, BOX.height).data;
  ctx.clearRect(0, 0, BOX.width, BOX.height);
  ctx.fillStyle = "rgb(255,255,255)";
  for (const path of paths) ctx.fill(path);
  const white = ctx.getImageData(0, 0, BOX.width, BOX.height).data;
  const index = (x: number, y: number): number | null => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= BOX.width || py >= BOX.height) return null;
    return (py * BOX.width + px) * 4;
  };
  const land = (x: number, y: number): boolean => {
    const i = index(x, y);
    return i !== null && (white[i] ?? 0) >= 128;
  };
  return {
    land,
    at: (x, y) => {
      const i = index(x, y);
      if (i === null || !land(x, y)) return null;
      const level = Math.round((levels[i] ?? 0) / 10);
      return TERC[Math.min(TERC.length, Math.max(1, level)) - 1] ?? null;
    },
  };
}

function paint(
  dots: CanvasLike,
  rim: CanvasLike,
  mode: WorldMode,
  weights: Readonly<Record<string, number>>,
): void {
  const mask = regionMask();
  if (mask === null) return;
  const rnd = generator(11);
  const largest = Math.max(0, ...Object.values(weights));

  const ctxOf = (canvas: CanvasLike) => {
    canvas.width = BOX.width * DPR;
    canvas.height = BOX.height * DPR;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return null;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, BOX.width, BOX.height);
    return ctx;
  };
  const ctx = ctxOf(dots);
  const glow = ctxOf(rim);
  if (ctx === null || glow === null) return;
  const dot = (c: Context2DLike, x: number, y: number, r: number, colour: string, a: number) => {
    c.globalAlpha = Math.min(1, a);
    c.fillStyle = colour;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  };
  /** On the land, with the sea or abroad within `d` px of it: the coast and the frontier. */
  const onRim = (x: number, y: number, d: number) =>
    [0, 1, 2, 3, 4, 5, 6, 7].some((k) => {
      const a = (k * Math.PI) / 4;
      return !mask.land(x + d * Math.cos(a), y + d * Math.sin(a));
    });

  // At dusk the land itself holds a little of the light, under its points.
  if (mode === "hero" && typeof Path2D !== "undefined") {
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = TOKENS["dusk-amber"];
    for (const code of TERC) ctx.fill(new Path2D(VOIVODESHIPS[code]?.d ?? ""));
  }

  // The register: one point per sample of the land. Nothing here is a count.
  const samples = mode === "hero" ? 15000 : 5200;
  for (let placed = 0, tries = 0; placed < samples && tries < samples * 6; tries++) {
    const x = rnd() * BOX.width;
    const y = rnd() * BOX.height;
    const region = mask.at(x, y);
    if (region === null) continue;
    placed++;
    if (mode === "hero") {
      // The landmass at dusk: warm points, a few brighter, the coast and the
      // borders of the land lit hardest, as the mockup draws it.
      const bright = rnd();
      const spark = bright > 0.975;
      const colour = spark ? TOKENS["dusk-map-glow"] : TOKENS["dusk-amber"];
      ctx.shadowColor = TOKENS["dusk-amber"];
      ctx.shadowBlur = spark ? 5 : 0;
      dot(ctx, x, y, spark ? 1.3 : 0.6 + rnd() * 0.5, colour, 0.45 + bright * 0.55);
    } else {
      dot(ctx, x, y, 0.75, TOKENS["dusk-map-dim"], 0.6);
      const weight = weights[region] ?? 0;
      if (largest > 0 && weight > 0 && rnd() < (weight / largest) * 0.9) {
        const lit = weight === largest;
        dot(
          ctx,
          x,
          y,
          lit ? 1.3 : 1,
          lit ? TOKENS["dusk-map-glow"] : TOKENS["dusk-amber"],
          0.55 + weight,
        );
      }
    }
  }

  // The outline as light: points along the land's edge, blurred into a glow.
  // Only the hero shows it; the stylesheet fades it as the camera comes down.
  if (mode === "hero") {
    glow.shadowColor = TOKENS["dusk-amber"];
    glow.shadowBlur = 6;
    for (let placed = 0, tries = 0; placed < 2600 && tries < 120000; tries++) {
      const x = rnd() * BOX.width;
      const y = rnd() * BOX.height;
      if (!mask.land(x, y) || !onRim(x, y, 2.2)) continue;
      placed++;
      dot(glow, x, y, 0.9 + rnd() * 0.5, TOKENS["dusk-map-glow"], 0.75 + rnd() * 0.25);
    }
  }
}

/**
 * The dusk world (TASK-052, ADR-0021): the sky, the sun, the curved ground and
 * Poland as a landmass of points, fixed behind the page.
 *
 * In `hero` mode the land lies on the horizon under the landing's search
 * field, its edge lit; a submitted search sets `data-dusk-zoom` on `<html>`
 * (`dusk-zoom.tsx`) and the stylesheet brings the camera down to the map and
 * draws the sixteen voivodeship borders. In `journey` mode — a surname's
 * answer — it is already down, at the side. In `quiet` mode — the reading
 * pages — there is only the sky.
 *
 * Nothing here is a figure. The canvas is `aria-hidden`; the register points
 * are placed at random inside the public-domain outline and stand for no
 * count, and the surname's own points follow `weights`, the validated
 * `share_of_covered` values the chapter beside it prints with their source and
 * date (`dusk-world-input.ts`). With no weights the world draws the register
 * alone and lights no region.
 */
export function DuskWorld({
  mode,
  weights = {},
  lit = null,
}: {
  mode: WorldMode;
  weights?: Readonly<Record<string, number>>;
  lit?: string | null;
}) {
  const dotsRef = useRef<HTMLCanvasElement>(null);
  const rimRef = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(weights);
  // Which screen of the journey is in view (TASK-053). The stylesheet keeps
  // the map beside the steps whose figures sit in a narrow column and steps it
  // back where a screen brings its own map or runs the full width.
  const [step, setStep] = useState<string>(FIRST_STEP);

  useEffect(() => {
    if (mode === "quiet") return;
    const dots = dotsRef.current as unknown as CanvasLike | null;
    const rim = rimRef.current as unknown as CanvasLike | null;
    if (dots === null || rim === null) return;
    paint(dots, rim, mode, JSON.parse(key) as Record<string, number>);
  }, [key, mode]);

  useEffect(() => {
    if (mode !== "journey") return;
    const update = () => {
      // The screen being read: of those whose top has passed 45% of the
      // window, the one that starts lowest on the page.
      const line = window.innerHeight * 0.45;
      let current: string = FIRST_STEP;
      let best = Number.NEGATIVE_INFINITY;
      for (const id of JOURNEY_STEPS) {
        const top = document?.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line && top > best) {
          best = top;
          current = id;
        }
      }
      setStep(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
    };
  }, [mode]);

  return (
    <div
      className={`dusk-world dusk-world-${mode}`}
      data-step={mode === "journey" ? step : undefined}
      aria-hidden="true"
    >
      <div className="dusk-deep" />
      <div className="dusk-sun" />
      <div className="dusk-ground" />
      {mode === "quiet" ? null : (
        <div className="dusk-map">
          <canvas ref={rimRef} className="dusk-edge" />
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
      )}
    </div>
  );
}
