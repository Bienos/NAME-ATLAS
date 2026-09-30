"use client";

import { useEffect, useRef } from "react";
import { TOKENS } from "./design-tokens.js";
import { countsByRank, skyDotRadius, skyPoint } from "./list-atlas-geometry.js";

/**
 * The browser members this island uses, declared rather than widening the
 * repository's `lib: ["ES2022"]` (the convention of `list-atlas-shell.tsx`).
 */
interface Context2DLike {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  globalAlpha: number;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  arc(x: number, y: number, r: number, start: number, end: number): void;
  fill(): void;
  stroke(): void;
  setLineDash(segments: number[]): void;
  drawImage(image: CanvasLike, dx: number, dy: number): void;
}
interface CanvasLike {
  width: number;
  height: number;
  readonly clientWidth: number;
  getContext(kind: "2d"): Context2DLike | null;
}
interface IntersectionObserverLike {
  observe(target: CanvasLike): void;
  disconnect(): void;
}
declare const IntersectionObserver:
  | (new (
      callback: (entries: readonly { readonly isIntersecting: boolean }[]) => void,
      options?: { readonly rootMargin?: string },
    ) => IntersectionObserverLike)
  | undefined;
declare const document: { createElement(tag: "canvas"): CanvasLike };
declare const matchMedia: ((query: string) => { readonly matches: boolean }) | undefined;
declare const devicePixelRatio: number | undefined;
declare function requestAnimationFrame(callback: () => void): number;
declare function cancelAnimationFrame(handle: number): void;
declare function addEventListener(type: "resize", listener: () => void): void;
declare function removeEventListener(type: "resize", listener: () => void): void;

/** One list's sky, as the artefact stores it. */
export interface SkyList {
  /** The list's distinct counts, ascending: `dots.histogram[].count`. */
  readonly counts: readonly number[];
  /** How many surnames have each of those counts: `dots.histogram[].surnames`. */
  readonly surnames: readonly number[];
  /** Where the dashed ring runs: the q = 0.5 concentration set's surnames, or null. */
  readonly half: number | null;
  /** How many of the most common surnames the legend names; they are drawn in Atlas Blue. */
  readonly named: number;
}

/** The sky's full size in px: dots and their shade are scaled to it below. */
const FULL_SIZE = 620;

/** How long one slice of painting may run, in ms, so no frame is held up. */
const SLICE_MS = 8;

/** How the dot of a surname with `count` bearers at `rank` is shaded, in draw order. */
function shade(rank: number, count: number, named: number, k: number) {
  if (rank < named) return { key: 0, colour: TOKENS.accent, alpha: 1 };
  if (count >= 1000) return { key: 1, colour: TOKENS["text-primary"], alpha: 0.88 };
  if (count >= 100) return { key: 2, colour: TOKENS["text-primary"], alpha: 0.42 * k ** 1.5 };
  if (count >= 10) return { key: 3, colour: TOKENS["text-primary"], alpha: 0.2 * k };
  return { key: 4, colour: TOKENS["text-tertiary"], alpha: 0.13 * k * k };
}

/**
 * Plate I's sky (TASK-043 §2.7): one dot per surname on one list, painted on
 * a canvas from the list's stored `dots` histogram.
 *
 * The most common surname sits at the centre and the rarest at the edge, on
 * a log scale of rank along a golden-angle spiral; a dot grows with its count
 * (`list-atlas-geometry.ts`). Nothing here is a figure: the canvas is
 * `aria-hidden`, and every number it pictures is server-rendered beside it.
 *
 * Each list has its own canvas, and the list switch shows one of them with
 * CSS (`.lf-alt`), so switching runs no script. A canvas paints the first
 * time it comes near the screen, in slices of about 8 ms, so no frame is held
 * up. With motion allowed the dots appear from the edge inward; with reduced
 * motion they are painted off screen and shown at once, in their final
 * state. Its pixel grid follows the screen's density, up to 2×, and it is
 * repainted when its size changes.
 */
export function ListAtlasSky({ list }: { list: SkyList }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current as unknown as CanvasLike | null;
    if (canvas === null) return;
    const byRank = countsByRank(list.counts, list.surnames);
    const n = byRank.length;
    const motion =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: no-preference)").matches;
    let frame = 0;
    let drawnSize = 0;
    let seen = false;

    /** Paints the sky; `progressive` shows it as it is painted, else all at once. */
    const draw = (progressive: boolean) => {
      cancelAnimationFrame(frame);
      const size = canvas.clientWidth;
      if (!(size > 0)) return;
      const dpr = Math.min(2, Math.max(1, devicePixelRatio ?? 1));
      const px = Math.round(size * dpr);
      const target = progressive ? canvas : document.createElement("canvas");
      target.width = px;
      target.height = px;
      const ctx = target.getContext("2d");
      if (ctx === null) return;
      drawnSize = size;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const centre = size / 2;
      const radius = size / 2 - 8;
      const k = Math.min(1, size / FULL_SIZE);
      let rank = n - 1;
      let current = -1;
      // The dust first and the brightest dots last, so they sit on top and a
      // progressive paint travels inward.
      const paint = () => {
        const until = Date.now() + SLICE_MS;
        while (rank >= 0) {
          const end = Math.max(-1, rank - 128);
          for (; rank > end; rank--) {
            const count = byRank[rank] ?? 0;
            const style = shade(rank, count, list.named, k);
            if (style.key !== current) {
              ctx.fillStyle = style.colour;
              ctx.globalAlpha = style.alpha;
              current = style.key;
            }
            const { r, a } = skyPoint(rank, n);
            const x = centre + radius * r * Math.cos(a);
            const y = centre + radius * r * Math.sin(a);
            const dot = skyDotRadius(count, k);
            if (dot < 1.1) ctx.fillRect(x - dot, y - dot, dot * 2, dot * 2);
            else {
              ctx.beginPath();
              ctx.arc(x, y, dot, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          if (Date.now() >= until) break;
        }
        if (rank >= 0) {
          frame = requestAnimationFrame(paint);
          return;
        }
        if (list.half !== null && list.half < n) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = TOKENS["text-primary"];
          ctx.lineWidth = 1.25;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(centre, centre, radius * skyPoint(list.half, n).r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (target !== canvas) {
          canvas.width = px;
          canvas.height = px;
          canvas.getContext("2d")?.drawImage(target, 0, 0);
        }
      };
      paint();
    };

    let resizing = 0;
    const onResize = () => {
      cancelAnimationFrame(resizing);
      resizing = requestAnimationFrame(() => {
        if (seen && canvas.clientWidth !== drawnSize) draw(false);
      });
    };
    addEventListener("resize", onResize);

    let observer: IntersectionObserverLike | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (seen || !entries.some((entry) => entry.isIntersecting)) return;
          seen = true;
          observer?.disconnect();
          draw(motion);
        },
        { rootMargin: "200px" },
      );
      observer.observe(canvas);
    } else {
      seen = true;
      draw(false);
    }

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizing);
      observer?.disconnect();
      removeEventListener("resize", onResize);
    };
  }, [list]);

  return <canvas ref={ref} className="lf-sky" aria-hidden="true" />;
}
