import type { Slot } from "./tree-pedigree.js";

/**
 * The Konstelacja view's geometry (TASK-084), derived from the pedigree's
 * slots and nothing else (ADR-0029 §2.5.16: no view is stored). Pure, so the
 * server and the island draw the same sky and a test can check every star.
 *
 * The root sits at the bottom centre; each generation above it is a
 * half-circle of stars, father to the left of mother, as the chosen artboard
 * "A · Konstelacja" draws it: slot *i* (0-based) of the 2^g places of
 * generation *g* stands at the angle π · (1 − (i + ½) / 2^g) on the radius
 * `radii[g]`. A parent is joined to its child by a line: `open` when the
 * parent's place is empty or hidden, `hot` when the picked star is at either
 * end, `solid` otherwise.
 */

export interface Geometry {
  readonly width: number;
  readonly height: number;
  readonly cx: number;
  readonly cy: number;
  /** One radius per generation; the root's is 0. */
  readonly radii: readonly number[];
}

export const SKY: Geometry = {
  width: 1000,
  height: 640,
  cx: 500,
  cy: 580,
  radii: [0, 150, 300, 460],
};

/** What a star stands for: a source note lights it; a living person is private; a hidden one is a member's blind spot. */
export type StarKind = "source" | "entered" | "living" | "hidden" | "empty";

export interface Star {
  readonly slot: Slot;
  readonly x: number;
  readonly y: number;
  readonly kind: StarKind;
}

export type LineKind = "solid" | "open" | "hot";

export interface Line {
  /** The child's slot number. */
  readonly from: number;
  /** The parent's slot number. */
  readonly to: number;
  readonly kind: LineKind;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface Constellation {
  readonly picked: number;
  readonly stars: readonly Star[];
  readonly lines: readonly Line[];
  /** The generations above the root that have a star, with their arcs' path data. */
  readonly arcs: readonly { readonly generation: number; readonly d: string }[];
}

export function starKind(slot: Slot): StarKind {
  if (slot.hidden) return "hidden";
  if (slot.person === null) return "empty";
  if (slot.person.treated_as_living) return "living";
  return slot.person.source_note === null ? "entered" : "source";
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Where a slot stands, by its Ahnentafel number. */
export function position(
  n: number,
  geometry: Geometry = SKY,
): { readonly x: number; readonly y: number } {
  if (n <= 1) return { x: geometry.cx, y: geometry.cy };
  const generation = Math.floor(Math.log2(n));
  const places = 2 ** generation;
  const index = n - places;
  const angle = Math.PI * (1 - (index + 0.5) / places);
  const radius = geometry.radii[generation] ?? 0;
  return {
    x: round(geometry.cx + radius * Math.cos(angle)),
    y: round(geometry.cy - radius * Math.sin(angle)),
  };
}

/** The picked slot: `sel` from the address when it names a slot the pedigree has, else the root. */
export function pickSlot(slots: readonly Slot[], sel: string | null): number {
  if (sel !== null && /^[0-9]{1,3}$/u.test(sel)) {
    const n = Number(sel);
    if (slots.some((slot) => slot.n === n)) return n;
  }
  return 1;
}

export function arcPath(generation: number, geometry: Geometry = SKY): string {
  const r = geometry.radii[generation] ?? 0;
  const { cx, cy } = geometry;
  return `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`;
}

export function constellation(
  slots: readonly Slot[],
  picked: number,
  geometry: Geometry = SKY,
): Constellation {
  const stars = slots.map((slot) => ({
    slot,
    ...position(slot.n, geometry),
    kind: starKind(slot),
  }));
  const byN = new Map(stars.map((star) => [star.slot.n, star]));
  const lines: Line[] = [];
  for (const star of stars) {
    if (star.slot.n < 2) continue;
    const child = byN.get(Math.floor(star.slot.n / 2));
    if (child === undefined) continue;
    const open = star.kind === "empty" || star.kind === "hidden";
    const hot = picked === star.slot.n || picked === child.slot.n;
    lines.push({
      from: child.slot.n,
      to: star.slot.n,
      kind: open ? "open" : hot ? "hot" : "solid",
      x1: child.x,
      y1: child.y,
      x2: star.x,
      y2: star.y,
    });
  }
  const generations = [...new Set(stars.map((star) => star.slot.generation))]
    .filter((generation) => generation > 0)
    .sort((a, b) => a - b);
  return {
    picked,
    stars,
    lines,
    arcs: generations.map((generation) => ({ generation, d: arcPath(generation, geometry) })),
  };
}

/**
 * The sky's viewBox for what it holds: the top is just above the highest arc
 * (or the root's star when there is none), so a tree of two generations is
 * not drawn under two empty ones.
 */
export function viewBox(sky: Pick<Constellation, "arcs">, geometry: Geometry = SKY): string {
  const highest = sky.arcs.reduce((max, arc) => Math.max(max, arc.generation), 0);
  const top = Math.max(0, geometry.cy - (geometry.radii[highest] ?? 0) - 64);
  return `0 ${top} ${geometry.width} ${geometry.height - top}`;
}

/** The path data of every line of one kind, for a single `<path>`. */
export function linePath(lines: readonly Line[], kind: LineKind): string {
  return lines
    .filter((line) => line.kind === kind)
    .map((line) => `M${line.x1} ${line.y1}L${line.x2} ${line.y2}`)
    .join("");
}
