import type { BirthYearFigures } from "@name-atlas/truth";

/**
 * The year-by-year dashboard's figures (TASK-170), from one sex's history as
 * `readBirthNameFacts` returns it. Arithmetic on the claims only: differences,
 * ratios, sums and averages of stored counts and ranks. A year without a count
 * claim is never 0: it is skipped by every sum and ratio, and a sum over such
 * years is "at least" (`partial`). Pure; no formatting.
 */

/** One year as the dashboard reads it. */
export interface DashYear {
  readonly year: number;
  /** "LISTED": a count claim; "BELOW": a stored list without the name; "NO_LIST": no list stored. */
  readonly state: "LISTED" | "BELOW" | "NO_LIST";
  readonly count: number | null;
  /** The list's cut-off, when a list is stored. */
  readonly threshold: number | null;
  readonly rank: number | null;
  readonly universe: number | null;
  readonly sharePerMillion: number | null;
  /** count ÷ the previous year's count − 1, when both years have a count claim. */
  readonly change: number | null;
  /** The previous year's rank − this rank (positive: climbed), when both have a rank claim. */
  readonly rankMove: number | null;
}

export interface DashDecade {
  readonly from: number;
  readonly to: number;
  /** The sum of the counts on the years with a count claim. */
  readonly sum: number;
  /** True when a stored year of the decade has no count claim: the sum is "at least". */
  readonly partial: boolean;
  readonly yearsListed: number;
  readonly yearsStored: number;
  /** The mean of the rank claims, rounded; null without one. */
  readonly averageRank: number | null;
  readonly bestRank: number | null;
}

export type DashMoment =
  | { readonly kind: "FIRST_LISTED"; readonly year: number; readonly fromStart: boolean }
  | { readonly kind: "TOP_TEN"; readonly year: number; readonly rank: number }
  | { readonly kind: "NUMBER_ONE"; readonly year: number; readonly years: number }
  | { readonly kind: "PEAK"; readonly year: number; readonly count: number }
  | { readonly kind: "BIGGEST_RISE"; readonly year: number; readonly change: number }
  | { readonly kind: "LAST_LISTED"; readonly year: number };

export interface Dashboard {
  readonly years: readonly DashYear[];
  /** Sum of every count claim since the first year; `partial` as for a decade. */
  readonly total: number;
  readonly totalPartial: boolean;
  readonly yearsListed: number;
  readonly yearsStored: number;
  readonly best: { readonly rank: number; readonly years: readonly number[] } | null;
  readonly latestChange: { readonly year: number; readonly change: number } | null;
  readonly rises: number;
  readonly falls: number;
  readonly biggestRise: DashYear | null;
  readonly biggestFall: DashYear | null;
  readonly decades: readonly DashDecade[];
  readonly moments: readonly DashMoment[];
}

export function dashYears(history: readonly BirthYearFigures[]): DashYear[] {
  const out: DashYear[] = [];
  history.forEach((y, i) => {
    const prev = i > 0 ? history[i - 1] : undefined;
    const count = y.count?.count ?? null;
    const prevCount = prev?.count?.count ?? null;
    const rank = y.rank?.rank ?? null;
    const prevRank = prev?.rank?.rank ?? null;
    out.push({
      year: y.birth_year,
      state: y.list === null ? "NO_LIST" : count === null ? "BELOW" : "LISTED",
      count,
      threshold: y.list?.publication_threshold ?? null,
      rank,
      universe: y.rank?.universe_size ?? null,
      sharePerMillion: y.count?.share_per_million ?? null,
      change: count !== null && prevCount !== null && prevCount > 0 ? count / prevCount - 1 : null,
      rankMove: rank !== null && prevRank !== null ? prevRank - rank : null,
    });
  });
  return out;
}

function decadeOf(years: readonly DashYear[], from: number, to: number): DashDecade | null {
  const inside = years.filter((y) => y.year >= from && y.year <= to);
  if (inside.length === 0) return null;
  const stored = inside.filter((y) => y.state !== "NO_LIST");
  const listed = stored.filter((y) => y.count !== null);
  const ranks = inside.flatMap((y) => (y.rank === null ? [] : [y.rank]));
  return {
    from,
    to: Math.min(to, inside[inside.length - 1]!.year),
    sum: listed.reduce((s, y) => s + (y.count ?? 0), 0),
    partial: stored.some((y) => y.state === "BELOW"),
    yearsListed: listed.length,
    yearsStored: stored.length,
    averageRank:
      ranks.length === 0 ? null : Math.round(ranks.reduce((s, r) => s + r, 0) / ranks.length),
    bestRank: ranks.length === 0 ? null : Math.min(...ranks),
  };
}

export function buildDashboard(history: readonly BirthYearFigures[]): Dashboard | null {
  const years = dashYears(history);
  const listed = years.filter((y) => y.count !== null);
  const firstListed = listed[0];
  const lastListed = listed[listed.length - 1];
  const latest = years[years.length - 1];
  if (firstListed === undefined || lastListed === undefined || latest === undefined) return null;

  const stored = years.filter((y) => y.state !== "NO_LIST");
  const ranked = years.filter((y) => y.rank !== null);
  const bestRank = ranked.length === 0 ? null : Math.min(...ranked.map((y) => y.rank!));
  const changes = years.filter((y) => y.change !== null);
  const pick = (better: (a: number, b: number) => boolean) =>
    changes.reduce<DashYear | null>(
      (b, y) => (b === null || better(y.change!, b.change!) ? y : b),
      null,
    );
  const biggestRise = pick((a, b) => a > b);
  const biggestFall = pick((a, b) => a < b);
  const peak = listed.reduce((b, y) => (y.count! > b.count! ? y : b), firstListed);

  const decades: DashDecade[] = [];
  for (let from = Math.floor(years[0]!.year / 10) * 10; from <= latest.year; from += 10) {
    const d = decadeOf(years, from, from + 9);
    if (d !== null) decades.push(d);
  }

  const moments: DashMoment[] = [
    {
      kind: "FIRST_LISTED",
      year: firstListed.year,
      fromStart: firstListed.year === years[0]!.year,
    },
  ];
  const topTen = years.find((y) => y.rank !== null && y.rank <= 10);
  if (topTen !== undefined && topTen.year !== firstListed.year) {
    moments.push({ kind: "TOP_TEN", year: topTen.year, rank: topTen.rank! });
  }
  const atOne = years.filter((y) => y.rank === 1);
  if (atOne.length > 0) {
    moments.push({ kind: "NUMBER_ONE", year: atOne[0]!.year, years: atOne.length });
  }
  moments.push({ kind: "PEAK", year: peak.year, count: peak.count! });
  if (biggestRise !== null && biggestRise.change! > 0) {
    moments.push({ kind: "BIGGEST_RISE", year: biggestRise.year, change: biggestRise.change! });
  }
  if (lastListed.year !== latest.year) moments.push({ kind: "LAST_LISTED", year: lastListed.year });
  moments.sort((a, b) => a.year - b.year);

  return {
    years,
    total: listed.reduce((s, y) => s + y.count!, 0),
    totalPartial: stored.some((y) => y.state === "BELOW"),
    yearsListed: listed.length,
    yearsStored: stored.length,
    best:
      bestRank === null
        ? null
        : { rank: bestRank, years: ranked.filter((y) => y.rank === bestRank).map((y) => y.year) },
    latestChange: latest.change === null ? null : { year: latest.year, change: latest.change },
    rises: changes.filter((y) => y.change! > 0).length,
    falls: changes.filter((y) => y.change! < 0).length,
    biggestRise: biggestRise !== null && biggestRise.change! > 0 ? biggestRise : null,
    biggestFall: biggestFall !== null && biggestFall.change! < 0 ? biggestFall : null,
    decades,
    moments,
  };
}

/**
 * Sort keys for the year grid, as CSS `order` values (1 = first): newest
 * first, most children first, best rank first, biggest rise first. Years with
 * no value for a key go last, newest first among them.
 */
export function sortOrders(
  years: readonly DashYear[],
): Map<number, { year: number; count: number; rank: number; change: number }> {
  const byKey = (value: (y: DashYear) => number | null, desc: boolean): Map<number, number> => {
    const sorted = [...years].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (va === null && vb === null) return b.year - a.year;
      if (va === null) return 1;
      if (vb === null) return -1;
      return desc ? vb - va || b.year - a.year : va - vb || b.year - a.year;
    });
    return new Map(sorted.map((y, i) => [y.year, i + 1]));
  };
  const year = byKey((y) => y.year, true);
  const count = byKey((y) => y.count, true);
  const rank = byKey((y) => y.rank, false);
  const change = byKey((y) => y.change, true);
  return new Map(
    years.map((y) => [
      y.year,
      {
        year: year.get(y.year)!,
        count: count.get(y.year)!,
        rank: rank.get(y.year)!,
        change: change.get(y.year)!,
      },
    ]),
  );
}
