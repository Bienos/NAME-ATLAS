import type { ListFacts, ListFactsArtefact } from "@name-atlas/contracts";
import {
  crowdLayout,
  dotStackLevels,
  linearPosition,
  logPositionIn,
  polylinePath,
  roomSeats,
  round1,
} from "./list-atlas-geometry.js";

/**
 * The landing atlas's drawings, laid out once per artefact (TASK-040).
 *
 * Everything here is presentation geometry (ADR-0015 §2.5): where a dot sits,
 * what path a line takes, how many rows a strip or a room needs so the two
 * columns line up. No value computed here is shown to a reader as a figure.
 *
 * The landing page is rendered on every request, but the artefact is fixed for
 * the life of the process (`listFacts()` parses it once and returns the same
 * object). So the layout is memoised at module scope, keyed by the two lists'
 * `sha256`: a thousand-dot crowd per list is packed once per process, not once
 * per request. A hit also requires the very same artefact object, so a
 * different artefact that happens to carry the same checksums (a test's
 * altered copy) is laid out afresh rather than drawn from another's layout.
 *
 * Arrays the contract keys by value (the curve's and the expectations' `n`)
 * are sorted here before anything is drawn: the contract does not promise
 * their order, and a view must look entries up by key, never by position
 * (`docs/contracts/list-facts.md`).
 */

/** Width of the strip's and the curve's drawing box, in SVG units. */
export const STRIP_WIDTH = 1000;
/** One example room's dot on the strip, in SVG units. */
export const STRIP_DOT = 22;
/** Gap between neighbouring seats in the room drawing, in SVG units. */
const SEAT_PITCH = 10;
const ROOM_PAD = 12;
/** Gap between neighbouring people in the crowd drawing, in SVG units. */
const CROWD_UNIT = 10;
/** The crowd is revealed ring by ring from its centre. */
const CROWD_RINGS = 6;

export interface CurveLayout {
  /** The curve's points, ascending by n. */
  readonly points: readonly { readonly n: number; readonly p: number }[];
  readonly first: number;
  readonly last: number;
  /** The whole curve as one SVG path in a 1000 × 1000 box. */
  readonly path: string;
}

export interface SparkPoint {
  readonly n: number;
  readonly value: number;
  /** Position in the spark's box, as fractions (y upwards). */
  readonly x: number;
  readonly y: number;
}

export interface SparkLayout {
  /** The expectations, ascending by n, with their positions. */
  readonly points: readonly SparkPoint[];
  readonly line: string;
  /** The diagonal "everyone a different surname", on the same axes. */
  readonly reference: string;
}

export interface StripLayout {
  /** Per example room, in the artefact's room order: x in SVG units and stack level. */
  readonly xs: readonly number[];
  readonly levels: readonly number[];
  /** Where the half line sits, in SVG units. */
  readonly half: number;
}

export interface RoomLayout {
  readonly width: number;
  readonly height: number;
  /** Seat centres in SVG units, numbered from the front left. */
  readonly seats: readonly { readonly x: number; readonly y: number }[];
  readonly wall: string;
  readonly door: string;
  /** The line joining the first pair. */
  readonly pair: string;
  /**
   * The line after seat `n_half`, between the seats filled first and the rest,
   * and where it meets the room's right wall as a fraction of the room's
   * height; null when the room has fewer seats than `n_half`.
   */
  readonly half: { readonly path: string; readonly y: number } | null;
}

export interface CrowdLayoutDrawing {
  readonly size: number;
  /** Per ring, one path of zero-length round-capped segments: people with no namesake. */
  readonly loners: readonly string[];
  /** Per ring, people who share their surname with someone in the crowd. */
  readonly members: readonly string[];
  readonly links: readonly (readonly [number, number, number, number])[];
}

export interface ListLayout {
  readonly curve: CurveLayout;
  readonly spark: SparkLayout;
  readonly strip: StripLayout;
  readonly room: RoomLayout;
  readonly crowd: CrowdLayoutDrawing;
}

export interface AtlasLayout {
  readonly male: ListLayout;
  readonly female: ListLayout;
  /**
   * The strip's height in SVG units, from whichever list's rooms stack
   * higher: both columns get the same height so they line up. Layout only.
   */
  readonly stripHeight: number;
}

function curveLayout(facts: ListFacts): CurveLayout {
  const points = [...facts.collision.curve].sort((a, b) => a.n - b.n);
  const first = points[0]?.n ?? 2;
  const last = points[points.length - 1]?.n ?? 2;
  const path = polylinePath(
    points.map((point) => [linearPosition(point.n, 0, last), point.p] as const),
    1000,
    1000,
  );
  return { points, first, last, path };
}

function sparkLayout(facts: ListFacts): SparkLayout {
  const sorted = [...facts.crowd.expected_distinct].sort((a, b) => a.n - b.n);
  const nMin = sorted[0]?.n ?? 1;
  const nMax = sorted[sorted.length - 1]?.n ?? 1;
  const yMin = Math.min(nMin, ...sorted.map((p) => p.value));
  const fx = (n: number) => logPositionIn(n, nMin, nMax);
  const fy = (v: number) => logPositionIn(v, yMin, nMax);
  const points = sorted.map((p) => ({ n: p.n, value: p.value, x: fx(p.n), y: fy(p.value) }));
  return {
    points,
    line: polylinePath(
      points.map((p) => [p.x, p.y] as const),
      1000,
      1000,
    ),
    reference: polylinePath(
      [
        [fx(nMin), fy(nMin)],
        [fx(nMax), fy(nMax)],
      ],
      1000,
      1000,
    ),
  };
}

function stripLayout(facts: ListFacts, last: number): StripLayout {
  const xs = facts.collision.example_rooms.first_pair_at.map(
    (n) => linearPosition(n, 0, last) * STRIP_WIDTH,
  );
  return {
    xs,
    levels: dotStackLevels(xs, STRIP_DOT),
    half: round1(linearPosition(facts.collision.n_half, 0, last) * STRIP_WIDTH),
  };
}

function roomLayout(facts: ListFacts, minRows: number): RoomLayout {
  const [a, b] = facts.collision.example_rooms.showcase_pair;
  const grid = roomSeats(b, 6, minRows);
  const width = grid.columns * SEAT_PITCH + 2 * ROOM_PAD - SEAT_PITCH;
  const height = grid.rows * SEAT_PITCH + 2 * ROOM_PAD + 8;
  const seats = grid.seats.map((seat) => ({
    x: ROOM_PAD + seat.x * SEAT_PITCH,
    y: ROOM_PAD + seat.y * SEAT_PITCH,
  }));
  const door = width / 2;
  const from = seats[a - 1] ?? { x: 0, y: 0 };
  const to = seats[b - 1] ?? { x: 0, y: 0 };
  const lift = Math.max(6, Math.abs(to.x - from.x) / 3);
  const n = (v: number) => String(round1(v));
  // Seats fill row by row, so the seats up to `n_half` end part-way along a
  // row: the line steps down beside that seat, from the right wall to the left.
  const last = seats[facts.collision.n_half - 1];
  const next = seats[facts.collision.n_half];
  let half: RoomLayout["half"] = null;
  if (last !== undefined) {
    const top = last.y - SEAT_PITCH / 2;
    const bottom = last.y + SEAT_PITCH / 2;
    half =
      next !== undefined && next.y === last.y
        ? {
            path: `M${n(width - 4)} ${n(top)}H${n((last.x + next.x) / 2)}V${n(bottom)}H4`,
            y: top / height,
          }
        : { path: `M${n(width - 4)} ${n(bottom)}H4`, y: bottom / height };
  }
  return {
    width,
    height,
    seats,
    wall: `M${n(door - 9)} ${n(height - 4)}H4V4H${n(width - 4)}V${n(height - 4)}H${n(door + 9)}`,
    door: `M${n(door - 9)} ${n(height - 4)}A18 18 0 0 1 ${n(door + 9)} ${n(height - 22)}`,
    pair: `M${n(from.x)} ${n(from.y)}C${n(from.x)} ${n(from.y - lift)} ${n(to.x)} ${n(to.y - lift)} ${n(to.x)} ${n(to.y)}`,
    half,
  };
}

function crowdDrawing(facts: ListFacts): CrowdLayoutDrawing {
  const e = facts.crowd.example;
  const layout = crowdLayout(e.n, e.group_sizes, e.seed);
  const px = (i: number) => round1((layout.points[i]?.x ?? 0) * CROWD_UNIT);
  const py = (i: number) => round1((layout.points[i]?.y ?? 0) * CROWD_UNIT);
  // Dots as zero-length round-capped segments: one short path per ring keeps
  // a thousand dots light, and lets each ring be revealed in turn.
  const loners: string[] = Array.from({ length: CROWD_RINGS }, () => "");
  const members: string[] = Array.from({ length: CROWD_RINGS }, () => "");
  layout.points.forEach((point, i) => {
    const ring = Math.min(CROWD_RINGS - 1, Math.floor(point.r * CROWD_RINGS));
    const mark = `M${String(px(i))} ${String(py(i))}h0`;
    if ((layout.group[i] ?? -1) === -1) loners[ring] += mark;
    else members[ring] += mark;
  });
  return {
    size: round1(layout.size * CROWD_UNIT),
    loners,
    members,
    links: layout.links.map(([from, to]) => [px(from), py(from), px(to), py(to)] as const),
  };
}

/** Seat rows a room needs for its own first pair: at least ten, twelve seats a row. */
function roomRows(facts: ListFacts): number {
  return Math.max(10, Math.ceil(facts.collision.example_rooms.showcase_pair[1] / 12));
}

function computeAtlasLayout(facts: ListFactsArtefact): AtlasLayout {
  const { male, female } = facts.lists;
  // Both rooms get as many rows as the fuller one needs, so the two columns
  // line up; the extra seats are empty. Layout only.
  const rows = Math.max(roomRows(male), roomRows(female));
  const one = (list: ListFacts): ListLayout => {
    const curve = curveLayout(list);
    return {
      curve,
      spark: sparkLayout(list),
      strip: stripLayout(list, curve.last),
      room: roomLayout(list, rows),
      crowd: crowdDrawing(list),
    };
  };
  const layout = { male: one(male), female: one(female) };
  const levels = Math.max(0, ...layout.male.strip.levels, ...layout.female.strip.levels);
  return { ...layout, stripHeight: (levels + 1) * STRIP_DOT + 6 };
}

const memo = new Map<string, { readonly facts: ListFactsArtefact; readonly layout: AtlasLayout }>();

/**
 * The atlas's layout for `facts`, computed once per artefact per process (see
 * the module comment). Pure: the same artefact always lays out the same way.
 */
export function atlasLayout(facts: ListFactsArtefact): AtlasLayout {
  const key = `${facts.lists.male.source.sha256}:${facts.lists.female.source.sha256}`;
  const hit = memo.get(key);
  if (hit !== undefined && hit.facts === facts) return hit.layout;
  const layout = computeAtlasLayout(facts);
  memo.set(key, { facts, layout });
  return layout;
}
