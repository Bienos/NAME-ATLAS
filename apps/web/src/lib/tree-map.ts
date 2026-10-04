import type { TreePersonRead } from "@name-atlas/family";
import { pickSlot } from "./tree-constellation.js";
import type { Slot } from "./tree-pedigree.js";
import type { PlaceRegion } from "./tree-places.js";
import { VOIVODESHIP_VIEWBOX, VOIVODESHIPS } from "./voivodeship-geometry.js";

/**
 * The Mapa view's layout (TASK-092), derived from the pedigree's slots and
 * the register's localities behind the tree's place codes, nothing else
 * (ADR-0029 §2.5.16). Pure.
 *
 * The register holds no coordinates for a locality, so a person stands in
 * their voivodeship: the outline `voivodeship-geometry.ts` keys by TERC, with
 * the centre of its bounding box as the anchor of its marker and label. A
 * child is joined to a parent by an arc when their voivodeships differ.
 */

export type MarkKind = "source" | "entered" | "living";

export interface MapPerson {
  readonly slot: Slot;
  readonly person: TreePersonRead;
  readonly place: PlaceRegion;
  /** The voivodeship's TERC code. */
  readonly terc: string;
}

export interface RegionGroup {
  readonly terc: string;
  readonly name: string;
  readonly count: number;
  readonly kind: MarkKind;
  /** The picked person was born here. */
  readonly picked: boolean;
  readonly x: number;
  readonly y: number;
}

export interface Arc {
  /** The child's slot number. */
  readonly from: number;
  /** The parent's slot number. */
  readonly to: number;
  readonly d: string;
}

export interface RailItem {
  readonly slot: Slot;
  readonly person: TreePersonRead;
  /** The locality, when the register knows it; null for a typed place or none. */
  readonly place: PlaceRegion | null;
  readonly onMap: boolean;
}

export interface TreeMap {
  readonly picked: number;
  readonly people: readonly MapPerson[];
  readonly groups: readonly RegionGroup[];
  readonly arcs: readonly Arc[];
  readonly rail: readonly { readonly generation: number; readonly items: readonly RailItem[] }[];
  /** People in the pedigree with no voivodeship on the map. */
  readonly offMap: number;
}

export { pickSlot };

const NUMBERS = /-?[0-9]+(?:\.[0-9]+)?/gu;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** The centre of a voivodeship's bounding box, or null for a code the geometry lacks. */
export function anchor(terc: string): { readonly x: number; readonly y: number } | null {
  const shape = VOIVODESHIPS[terc];
  if (shape === undefined) return null;
  const numbers = shape.d.match(NUMBERS)?.map(Number) ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = numbers[i] ?? 0;
    const y = numbers[i + 1] ?? 0;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) return null;
  return { x: round((minX + maxX) / 2), y: round((minY + maxY) / 2) };
}

export function kindOf(person: TreePersonRead): MarkKind {
  if (person.treated_as_living) return "living";
  return person.source_note === null ? "entered" : "source";
}

const RANK: Readonly<Record<MarkKind, number>> = { living: 0, entered: 1, source: 2 };

/** A quadratic arc from a to b, bowing upwards, as the artboard draws it. */
export function arcPath(
  a: { readonly x: number; readonly y: number },
  b: { readonly x: number; readonly y: number },
): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const mx = (a.x + b.x) / 2 + nx * 0.28 * len;
  const my = (a.y + b.y) / 2 + ny * 0.28 * len;
  return `M${a.x} ${a.y}Q${round(mx)} ${round(my)} ${b.x} ${b.y}`;
}

export function treeMap(
  slots: readonly Slot[],
  places: readonly PlaceRegion[],
  picked: number,
): TreeMap {
  const byCode = new Map(places.map((place) => [place.code, place]));
  const people: MapPerson[] = [];
  const rail = new Map<number, RailItem[]>();
  let offMap = 0;
  for (const slot of slots) {
    if (slot.person === null) continue;
    const code = slot.person.birth.place_code;
    const place = code === null ? null : (byCode.get(code) ?? null);
    const terc = place?.region?.code ?? null;
    const onMap = terc !== null && VOIVODESHIPS[terc] !== undefined;
    if (onMap && place !== null && terc !== null) {
      people.push({ slot, person: slot.person, place, terc });
    } else {
      offMap += 1;
    }
    const list = rail.get(slot.generation) ?? [];
    list.push({ slot, person: slot.person, place, onMap });
    rail.set(slot.generation, list);
  }
  const groups = new Map<
    string,
    { name: string; count: number; kind: MarkKind; picked: boolean }
  >();
  for (const one of people) {
    const group = groups.get(one.terc) ?? {
      name: one.place.region?.name ?? one.terc,
      count: 0,
      kind: "living" as MarkKind,
      picked: false,
    };
    group.count += 1;
    const kind = kindOf(one.person);
    if (RANK[kind] > RANK[group.kind]) group.kind = kind;
    if (one.slot.n === picked) group.picked = true;
    groups.set(one.terc, group);
  }
  const tercOf = new Map(people.map((one) => [one.slot.n, one.terc]));
  const arcs: Arc[] = [];
  for (const one of people) {
    if (one.slot.n < 2) continue;
    const childTerc = tercOf.get(Math.floor(one.slot.n / 2));
    if (childTerc === undefined || childTerc === one.terc) continue;
    const a = anchor(childTerc);
    const b = anchor(one.terc);
    if (a === null || b === null) continue;
    arcs.push({ from: Math.floor(one.slot.n / 2), to: one.slot.n, d: arcPath(a, b) });
  }
  return {
    picked,
    people,
    groups: [...groups.entries()]
      .map(([terc, group]) => ({ terc, ...group, ...(anchor(terc) ?? { x: 0, y: 0 }) }))
      .sort((a, b) => a.terc.localeCompare(b.terc)),
    arcs,
    rail: [...rail.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([generation, items]) => ({ generation, items })),
    offMap,
  };
}

/** The map's viewBox, as the geometry states it. */
export const MAP_VIEWBOX = VOIVODESHIP_VIEWBOX;

/** The geometry's TERC codes, for a test that every anchor lies inside the viewBox. */
export const MAP_TERCS: readonly string[] = Object.keys(VOIVODESHIPS).sort();
