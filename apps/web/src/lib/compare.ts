import type {
  DistributionEntry,
  PopulationObservation,
  RarityEntry,
  SurnameResultResponse,
} from "@name-atlas/contracts";

/**
 * Surname comparison (TASK-025, directive §24).
 *
 * The whole module is one question: **may these two figures be put next to each
 * other?** `docs/canonical/11` §6.1 makes `comparability_group` the gate on
 * quantitative comparison, and this applies it — plus the snapshot date, and,
 * for a rarity figure, the denominator. A pair that fails any of those is not
 * ranked; it is reported as not comparable, with the reason.
 *
 * Nothing here implies a relationship between the two surnames. A comparison of
 * counts is a comparison of counts: `ARCHITECTURE.md`'s domain rules and the
 * directive's §5 both forbid reading shared ancestry, ethnicity or family
 * relation out of a surname, and the page states that in words.
 */

export type NotComparable =
  | "DIFFERENT_PARTITION"
  | "DIFFERENT_SNAPSHOT_DATE"
  | "DIFFERENT_DENOMINATOR"
  | "MISSING_ON_ONE_SIDE";

export interface ComparablePair<T> {
  readonly comparable: true;
  readonly group: string | null;
  readonly a: T;
  readonly b: T;
}

export interface IncomparablePair {
  readonly comparable: false;
  readonly group: string | null;
  readonly reason: NotComparable;
}

export type Pairing<T> = ComparablePair<T> | IncomparablePair;

/** Groups observations by `comparability_group`, so like meets like or nothing does. */
function byGroup<T extends { comparability_group: string | null }>(
  items: readonly T[],
): Map<string | null, T> {
  const map = new Map<string | null, T>();
  for (const item of items) {
    // First wins: a partition carries one observation per resource version, and
    // a second would be a supersession bug rather than a thing to average.
    if (!map.has(item.comparability_group)) map.set(item.comparability_group, item);
  }
  return map;
}

/** Every partition present on either side, in a stable order. */
function groupsOf(a: ReadonlySet<string | null>, b: ReadonlySet<string | null>): (string | null)[] {
  const all = new Set<string | null>([...a, ...b]);
  return [...all].sort((x, y) => String(x).localeCompare(String(y)));
}

export function comparePopulation(
  left: SurnameResultResponse,
  right: SurnameResultResponse,
): readonly Pairing<PopulationObservation>[] {
  const a = byGroup(left.population?.state === "READY" ? left.population.observations : []);
  const b = byGroup(right.population?.state === "READY" ? right.population.observations : []);
  return groupsOf(new Set(a.keys()), new Set(b.keys())).map((group) => {
    const x = a.get(group);
    const y = b.get(group);
    if (!x || !y) return { comparable: false, group, reason: "MISSING_ON_ONE_SIDE" };
    if (x.snapshot_date !== y.snapshot_date) {
      return { comparable: false, group, reason: "DIFFERENT_SNAPSHOT_DATE" };
    }
    if (x.value.value === null || y.value.value === null) {
      return { comparable: false, group, reason: "MISSING_ON_ONE_SIDE" };
    }
    if (x.value.unit !== y.value.unit) {
      // Different units are a different kind of thing counted, not a bigger or
      // smaller number of the same thing.
      return { comparable: false, group, reason: "DIFFERENT_PARTITION" };
    }
    return { comparable: true, group, a: x, b: y };
  });
}

export function compareRarity(
  left: SurnameResultResponse,
  right: SurnameResultResponse,
): readonly Pairing<RarityEntry>[] {
  const a = byGroup(left.rarity?.state === "READY" ? left.rarity.entries : []);
  const b = byGroup(right.rarity?.state === "READY" ? right.rarity.entries : []);
  return groupsOf(new Set(a.keys()), new Set(b.keys())).map((group) => {
    const x = a.get(group);
    const y = b.get(group);
    if (!x || !y) return { comparable: false, group, reason: "MISSING_ON_ONE_SIDE" };
    if (x.snapshot_date !== y.snapshot_date) {
      return { comparable: false, group, reason: "DIFFERENT_SNAPSHOT_DATE" };
    }
    // `1 in X` is only a ranking of rarity when both X share a denominator.
    // Two different published universes give two different X for the same count.
    if (x.denominator !== y.denominator) {
      return { comparable: false, group, reason: "DIFFERENT_DENOMINATOR" };
    }
    return { comparable: true, group, a: x, b: y };
  });
}

/**
 * Regional breakdowns side by side. Two entries may be drawn on one scale only
 * when they come from the same regional resource: same comparability group and
 * same snapshot date. Anything else is reported, not drawn.
 *
 * A pair is comparable as a *layout*, not as a ranking: the page shows both
 * maps and both tables, and says nothing about which surname is "more"
 * anywhere. Each side keeps its own coverage warning.
 */
export function compareDistribution(
  left: SurnameResultResponse,
  right: SurnameResultResponse,
): readonly Pairing<DistributionEntry>[] {
  const a = byGroup(left.distribution?.state === "READY" ? left.distribution.entries : []);
  const b = byGroup(right.distribution?.state === "READY" ? right.distribution.entries : []);
  return groupsOf(new Set(a.keys()), new Set(b.keys())).map((group) => {
    const x = a.get(group);
    const y = b.get(group);
    if (!x || !y) return { comparable: false, group, reason: "MISSING_ON_ONE_SIDE" };
    if (x.snapshot_date !== y.snapshot_date) {
      return { comparable: false, group, reason: "DIFFERENT_SNAPSHOT_DATE" };
    }
    return { comparable: true, group, a: x, b: y };
  });
}

/**
 * Which of a comparable pair is rarer, as a **relation** rather than a score.
 *
 * Compares `share` — the exact `numerator / denominator` the claim carries to
 * nine places — and **not** the displayed `1 in X`, which is rounded half up.
 * Two different counts in one universe can round to the same X, and comparing
 * the rounded figure would then report two surnames as equally rare when one is
 * measurably rarer (caught by review 2026-09-21).
 *
 * `null` means the two shares are equal, which is a genuine tie and not a
 * ranking. `TOO_CLOSE` means they differ but round to the same displayed
 * figure: the page then says the figures are too close to separate, rather than
 * ranking two numbers a reader can see are identical.
 */
export type RarityRelation = "a" | "b" | "TOO_CLOSE" | null;

export function rarerOf(pair: ComparablePair<RarityEntry>): RarityRelation {
  if (pair.a.share === pair.b.share) return null;
  if (pair.a.primary.value === pair.b.primary.value) return "TOO_CLOSE";
  // A smaller share is rarer, and a larger `1 in X` says the same thing.
  return pair.a.share < pair.b.share ? "a" : "b";
}

// ---------------------------------------------------------------------------
// Two to four people (TASK-155, D-049)
// ---------------------------------------------------------------------------

/**
 * One partition's figures for every person compared, in their order (a person
 * whose surname did not resolve is `null` and has no figure anywhere). `entries`
 * holds one item per person, `null` where that person has no figure in the
 * partition: an absent figure is said, never drawn as a zero.
 *
 * Comparable when at least two people have a figure and every present figure
 * passes the same checks a pair does (date, then unit or denominator). A person
 * without a figure does not stop the others being compared; with two people,
 * that leaves one figure, so the outcome is the pair's `MISSING_ON_ONE_SIDE`.
 */
export interface ManyPairing<T> {
  readonly comparable: boolean;
  readonly group: string | null;
  /** Why not, when not comparable; null when comparable. */
  readonly reason: NotComparable | null;
  readonly entries: readonly (T | null)[];
}

/** A check every present figure must pass, and the reason given when they differ. */
type Check<T> = readonly [(item: T) => unknown, NotComparable];

/** Gates one partition's figures, one per person (`null` for none). */
export function gateMany<T>(
  group: string | null,
  entries: readonly (T | null)[],
  checks: readonly Check<T>[],
): ManyPairing<T> {
  const present = entries.filter((e): e is T => e !== null);
  if (present.length < 2) {
    return { comparable: false, group, reason: "MISSING_ON_ONE_SIDE", entries };
  }
  for (const [of, reason] of checks) {
    const first = of(present[0] as T);
    if (present.some((item) => of(item) !== first)) {
      return { comparable: false, group, reason, entries };
    }
  }
  return { comparable: true, group, reason: null, entries };
}

function groupsOfMany<T extends { comparability_group: string | null }>(
  maps: readonly Map<string | null, T>[],
): (string | null)[] {
  return groupsOf(new Set(maps.flatMap((m) => [...m.keys()])), new Set());
}

export function comparePopulationMany(
  responses: readonly (SurnameResultResponse | null)[],
): readonly ManyPairing<PopulationObservation>[] {
  const maps = responses.map((r) =>
    byGroup(r?.population?.state === "READY" ? r.population.observations : []),
  );
  return groupsOfMany(maps).map((group) =>
    gateMany(
      group,
      // A figure published as null is no figure: never a zero.
      maps.map((m) => {
        const item = m.get(group);
        return item === undefined || item.value.value === null ? null : item;
      }),
      [
        [(x) => x.snapshot_date, "DIFFERENT_SNAPSHOT_DATE"],
        [(x) => x.value.unit, "DIFFERENT_PARTITION"],
      ],
    ),
  );
}

export function compareRarityMany(
  responses: readonly (SurnameResultResponse | null)[],
): readonly ManyPairing<RarityEntry>[] {
  const maps = responses.map((r) => byGroup(r?.rarity?.state === "READY" ? r.rarity.entries : []));
  return groupsOfMany(maps).map((group) =>
    gateMany(
      group,
      maps.map((m) => m.get(group) ?? null),
      [
        [(x) => x.snapshot_date, "DIFFERENT_SNAPSHOT_DATE"],
        [(x) => x.denominator, "DIFFERENT_DENOMINATOR"],
      ],
    ),
  );
}

export function compareDistributionMany(
  responses: readonly (SurnameResultResponse | null)[],
): readonly ManyPairing<DistributionEntry>[] {
  const maps = responses.map((r) =>
    byGroup(r?.distribution?.state === "READY" ? r.distribution.entries : []),
  );
  return groupsOfMany(maps).map((group) =>
    gateMany(
      group,
      maps.map((m) => m.get(group) ?? null),
      [[(x) => x.snapshot_date, "DIFFERENT_SNAPSHOT_DATE"]],
    ),
  );
}

/**
 * The rarest of a comparable partition, by the same rule as {@link rarerOf}:
 * by the exact `share`, never the rounded `1 in X`. `null` when the smallest
 * share is held by more than one person (a genuine tie); `TOO_CLOSE` when
 * another person's figure rounds to the same displayed `1 in X`.
 */
export function rarestOf(pairing: ManyPairing<RarityEntry>): number | "TOO_CLOSE" | null {
  const present = pairing.entries
    .map((entry, index) => ({ entry, index }))
    .filter((x): x is { entry: RarityEntry; index: number } => x.entry !== null);
  if (!pairing.comparable || present.length < 2) return null;
  const least = present.reduce((min, x) => (x.entry.share < min.entry.share ? x : min));
  const others = present.filter((x) => x.index !== least.index);
  if (others.some((x) => x.entry.share === least.entry.share)) return null;
  if (others.some((x) => x.entry.primary.value === least.entry.primary.value)) return "TOO_CLOSE";
  return least.index;
}
