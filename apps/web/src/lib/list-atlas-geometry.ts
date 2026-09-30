/**
 * Presentation geometry for the landing atlas (TASK-040): where a mark sits on
 * a plate, never what a figure is.
 *
 * Every function here turns numbers that `listFacts()` already carries into
 * positions, scales and layouts. None of them returns a figure a reader is
 * shown: the plates print the artefact's own values, formatted by
 * `messages.ts`, and use these only to place them (ADR-0015 §2.5: "Positions
 * and scales are presentation geometry").
 *
 * Deterministic on purpose: the same artefact always draws the same picture,
 * so a server render and a screenshot agree.
 */

/** Position of `value` on a log axis over [1, max], as a fraction of the axis. */
export function logPosition(value: number, max: number): number {
  if (!(max > 1) || !(value > 0)) return 0;
  return clamp01(Math.log(value) / Math.log(max));
}

/** Position of `value` on a log axis over [min, max], as a fraction of the axis. */
export function logPositionIn(value: number, min: number, max: number): number {
  if (!(min > 0) || !(max > min) || !(value > 0)) return 0;
  return clamp01((Math.log(value) - Math.log(min)) / (Math.log(max) - Math.log(min)));
}

/** Position of `value` on a linear axis over [min, max], as a fraction. */
export function linearPosition(value: number, min: number, max: number): number {
  if (!(max > min)) return 0;
  return clamp01((value - min) / (max - min));
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Powers of ten strictly inside (min, max): the log axis's round ticks. */
export function powersOfTen(min: number, max: number): number[] {
  const ticks: number[] = [];
  for (let t = 10; t < max; t *= 10) if (t > min) ticks.push(t);
  return ticks;
}

/** Round ticks for a linear axis from 0 to about `max`: at most `most` + 1 of them. */
export function niceTicks(max: number, most = 4): number[] {
  if (!(max > 0)) return [0];
  const raw = max / most;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= raw) ??
    10 * magnitude;
  const ticks: number[] = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return ticks;
}

export interface RowLabel {
  readonly x: number;
  readonly chars: number;
  readonly anchor: "start" | "middle" | "end";
}

/** The data face at 0.75rem: IBM Plex Mono advances 0.6em, 7.2px. */
const CHAR_PX = 7.2;
const GAP_PX = 10;
/** One em of the root font size at 100% text, in px. */
const EM_PX = 16;

/**
 * The row widths, in em of the root font size, at which labels are fitted
 * (narrowest first). A label of tier `k` is drawn only where its row is at
 * least `LABEL_TIERS_EM[k]` wide (`globals.css` has one container query per
 * tier), so it is fitted against the text size as well as the screen: at 200%
 * text a phone's row is half as many em wide, and keeps only the labels that
 * fit there. The narrowest is a 320px phone's narrowest row at 200% text.
 */
export const LABEL_TIERS_EM = [8.5, 12.5, 17, 22, 30, 47] as const;

export interface TierLabel {
  readonly x: number;
  readonly chars: number;
  /** Hang the label this way from its mark, where it fits, instead of centring it. */
  readonly away?: "start" | "end";
}

export interface TierFit {
  /** The index into `LABEL_TIERS_EM` from which the label is drawn, or -1: never. */
  readonly tier: number;
  readonly anchor: RowLabel["anchor"];
}

/**
 * Which labels on one row can be drawn without overlapping, at which widths.
 *
 * A label sits at `x` (a fraction of the row) and is `chars` characters of the
 * data face wide. `order` lists label indices most important first. The row is
 * tried at each tier's width, narrowest first: a label not yet kept is kept
 * when, hung from its mark so it stays inside the row, it clears every label
 * already kept and every `reserved` mark (a stem, a node). Tiers nest — a label
 * kept at one width is kept at every wider one, where it only has more room —
 * so no two labels drawn together can overlap at any width. A label keeps the
 * anchor it was fitted with at its own tier.
 */
export function fitTiers(
  labels: readonly TierLabel[],
  order: readonly number[],
  reserved: readonly number[] = [],
  tiersEm: readonly number[] = LABEL_TIERS_EM,
): TierFit[] {
  const fits: TierFit[] = labels.map(() => ({ tier: -1, anchor: "middle" }));
  const extent = (label: TierLabel, anchor: RowLabel["anchor"], px: number): [number, number] => {
    const width = label.chars * CHAR_PX;
    const at = label.x * px;
    const from = anchor === "start" ? at : anchor === "end" ? at - width : at - width / 2;
    return [from - GAP_PX / 2, from + width + GAP_PX / 2];
  };
  tiersEm.forEach((em, tier) => {
    const px = em * EM_PX;
    const taken: [number, number][] = reserved.map((x) => [x * px - 4, x * px + 4]);
    labels.forEach((label, index) => {
      const fit = fits[index];
      if (fit !== undefined && fit.tier !== -1) taken.push(extent(label, fit.anchor, px));
    });
    for (const index of order) {
      const label = labels[index];
      if (label === undefined || fits[index]?.tier !== -1) continue;
      const anchor =
        label.away !== undefined && fitsAt(label.x, label.chars, px, label.away)
          ? label.away
          : anchorFor(label.x, label.chars, px);
      if (!fitsAt(label.x, label.chars, px, anchor)) continue;
      const [a, b] = extent(label, anchor, px);
      if (taken.every(([c, d]) => b <= c || a >= d)) {
        fits[index] = { tier, anchor };
        taken.push([a, b]);
      }
    }
  });
  return fits;
}

/** Where a label hangs from its mark so it stays inside a row `px` wide. */
export function anchorFor(x: number, chars: number, px: number): RowLabel["anchor"] {
  const half = (chars * CHAR_PX) / 2;
  if (x * px < half) return "start";
  if ((1 - x) * px < half) return "end";
  return "middle";
}

/** Whether a label hung from its mark at `x` by `anchor` stays inside a row `px` wide. */
export function fitsAt(x: number, chars: number, px: number, anchor: RowLabel["anchor"]): boolean {
  const width = chars * CHAR_PX;
  if (anchor === "start") return (1 - x) * px >= width;
  if (anchor === "end") return x * px >= width;
  return Math.min(x, 1 - x) * px >= width / 2;
}

/**
 * An SVG path through points given as fractions of a box `width` × `height`
 * (y measured upwards from the bottom edge).
 */
export function polylinePath(
  points: readonly (readonly [number, number])[],
  width: number,
  height: number,
): string {
  return points
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"}${round1(x * width)} ${round1((1 - y) * height)}`,
    )
    .join("");
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * A one-sided dot plot: every value becomes one dot at its own x, lifted to the
 * lowest level where it does not overlap a dot already placed. Values are
 * placed in ascending order, so the stack reads like a histogram.
 *
 * `xs` are positions in the plot's units; `diameter` is a dot's size in the
 * same units. Returns each input's level (0 = on the baseline), in input order.
 */
export function dotStackLevels(xs: readonly number[], diameter: number): number[] {
  const order = xs.map((x, index) => ({ x, index })).sort((a, b) => a.x - b.x || a.index - b.index);
  const placed: { x: number; level: number }[] = [];
  const levels = new Array<number>(xs.length).fill(0);
  for (const { x, index } of order) {
    let level = 0;
    const near = placed.filter((p) => Math.abs(p.x - x) < diameter);
    while (near.some((p) => p.level === level)) level += 1;
    placed.push({ x, level });
    levels[index] = level;
  }
  return levels;
}

/** mulberry32: a small seeded generator, used here only to scatter marks. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CrowdPoint {
  readonly x: number;
  readonly y: number;
  /** Distance from the centre as a fraction of the disc's radius: drives the reveal order. */
  readonly r: number;
}

export interface CrowdLayout {
  readonly points: readonly CrowdPoint[];
  /** Per point: the index of its group in `groupSizes`, or -1 for a person with no namesake. */
  readonly group: readonly number[];
  /** Pairs of point indices joined by a line, one tree per group. */
  readonly links: readonly (readonly [number, number])[];
  /** The disc's diameter in layout units (one unit = the gap between neighbours). */
  readonly size: number;
}

const HEX_STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
];

/**
 * A crowd of `n` dots packed in a disc, with each shared-surname group seated
 * together and joined.
 *
 * The dots sit on a hexagonal lattice, the `n` cells nearest the centre. Groups
 * are placed largest first, each grown from a seeded anchor over free
 * neighbouring cells and kept one cell apart from other groups where the
 * lattice allows, so two groups never read as one. Where a person sits is
 * invented for the picture; only the group sizes come from the artefact.
 */
export function crowdLayout(n: number, groupSizes: readonly number[], seed: number): CrowdLayout {
  const radius = Math.ceil(Math.sqrt(n / 2.7)) + 2;
  const cells: { q: number; r: number; x: number; y: number; d: number; a: number }[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const x = q + r / 2;
      const y = (r * Math.sqrt(3)) / 2;
      cells.push({ q, r, x, y, d: Math.hypot(x, y), a: Math.atan2(y, x) });
    }
  }
  cells.sort((a, b) => a.d - b.d || a.a - b.a);
  const chosen = cells.slice(0, n);
  const indexOf = new Map(chosen.map((c, i) => [`${String(c.q)},${String(c.r)}`, i]));
  const neighbours = chosen.map((c) =>
    HEX_STEPS.map(([dq, dr]) => indexOf.get(`${String(c.q + dq)},${String(c.r + dr)}`)).filter(
      (i): i is number => i !== undefined,
    ),
  );
  const outer = Math.max(...chosen.map((c) => c.d), 1);

  const random = seededRandom(seed);
  const order = chosen.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }

  const group = new Array<number>(chosen.length).fill(-1);
  const links: [number, number][] = [];
  const grow = (anchor: number, size: number, keepApart: boolean): [number, number][] | null => {
    const free = (i: number) =>
      group[i] === -1 && (!keepApart || (neighbours[i] ?? []).every((k) => group[k] === -1));
    if (!free(anchor)) return null;
    const members = [anchor];
    const edges: [number, number][] = [];
    const seen = new Set(members);
    const turn = Math.floor(random() * HEX_STEPS.length);
    for (let head = 0; head < members.length && members.length < size; head++) {
      const from = members[head]!;
      const around = neighbours[from] ?? [];
      const rotated = [
        ...around.slice(turn % Math.max(1, around.length)),
        ...around.slice(0, turn % Math.max(1, around.length)),
      ];
      for (const next of rotated) {
        if (members.length >= size) break;
        if (seen.has(next) || !free(next)) continue;
        seen.add(next);
        members.push(next);
        edges.push([from, next]);
      }
    }
    return members.length === size ? edges : null;
  };

  groupSizes.forEach((size, g) => {
    for (const keepApart of [true, false]) {
      for (const anchor of order) {
        const edges = grow(anchor, size, keepApart);
        if (edges === null) continue;
        group[anchor] = g;
        for (const [, member] of edges) group[member] = g;
        links.push(...edges);
        return;
      }
    }
  });

  const extent = Math.max(...chosen.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y))), 1);
  return {
    points: chosen.map((c) => ({ x: c.x + extent + 1, y: c.y + extent + 1, r: c.d / outer })),
    group,
    links,
    size: 2 * (extent + 1),
  };
}

export interface Seat {
  readonly x: number;
  readonly y: number;
}

/**
 * Seats of a lecture room in two blocks of `perBlock` columns with an aisle
 * between them, numbered row by row from the front left. Enough rows for at
 * least `atLeast` seats and never fewer than `minRows`.
 */
export function roomSeats(
  atLeast: number,
  perBlock = 6,
  minRows = 10,
): { seats: Seat[]; columns: number; rows: number } {
  const columns = perBlock * 2;
  const rows = Math.max(minRows, Math.ceil(atLeast / columns));
  const seats: Seat[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const aisle = column >= perBlock ? 2 : 0;
      seats.push({ x: column + aisle, y: row });
    }
  }
  return { seats, columns: columns + 2, rows };
}
