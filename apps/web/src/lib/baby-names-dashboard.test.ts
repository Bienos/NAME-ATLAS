import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { CitationDto } from "@name-atlas/contracts";
import type { BirthYearFigures } from "@name-atlas/truth";
import { buildDashboard, dashYears, sortOrders } from "./baby-names-dashboard.js";
import {
  ChartSwitch,
  DashSummary,
  Decades,
  Moments,
  YearGrid,
  YearOnYear,
  signedPercent,
} from "./baby-names-dashboard-view.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";

/** TASK-170: the dashboard's arithmetic over one sex's history, and its panels. */

const cite = { title: "Imiona", locator: "zasób 1" } as unknown as CitationDto;

/** count null: below the list's cut-off; list false: no list stored. */
function year(
  y: number,
  count: number | null,
  rank: number | null,
  opts: { list?: boolean; sum?: number } = {},
): BirthYearFigures {
  const sum = opts.sum ?? 100_000;
  const list =
    opts.list === false
      ? null
      : {
          list_id: `l${y}`,
          birth_year: y,
          sex: "FEMALE" as const,
          publication_threshold: y < 2013 ? 5 : 2,
          people_sum: sum,
        };
  return {
    birth_year: y,
    list,
    count:
      list === null || count === null
        ? null
        : {
            claim_id: `c${y}`,
            count,
            share_per_million: Math.floor((count * 1_000_000) / sum),
            one_in: Math.round(sum / count),
            citation: cite,
          },
    rank:
      list === null || rank === null
        ? null
        : { claim_id: `r${y}`, rank, universe_size: 900, citation: cite },
  };
}

// 2000–2012: 2000 listed, 2001 below the cut-off, 2002 no list, then rising to no. 1 and a fall.
const HISTORY: BirthYearFigures[] = [
  year(2000, 100, 40),
  year(2001, null, null),
  year(2002, 0, null, { list: false }),
  year(2003, 200, 20),
  year(2004, 300, 12),
  year(2005, 450, 8),
  year(2006, 900, 2),
  year(2007, 1000, 1),
  year(2008, 1200, 1),
  year(2009, 1100, 1),
  year(2010, 800, 3),
  year(2011, 700, 4),
  year(2012, 770, 4),
];

describe("dashYears", () => {
  it("states each year; a change and a rank move only between two listed years", () => {
    const years = dashYears(HISTORY);
    expect(years.map((y) => y.state).slice(0, 4)).toEqual(["LISTED", "BELOW", "NO_LIST", "LISTED"]);
    expect(years[1]).toMatchObject({ count: null, change: null, threshold: 5 });
    expect(years[2]).toMatchObject({ count: null, threshold: null });
    // 2003 follows a gap: no change, no rank move.
    expect(years[3]).toMatchObject({ change: null, rankMove: null });
    expect(years[4]!.change).toBeCloseTo(0.5);
    expect(years[4]!.rankMove).toBe(8);
    expect(years[10]!.change).toBeCloseTo(800 / 1100 - 1);
    expect(years[10]!.rankMove).toBe(-2);
  });
});

describe("buildDashboard", () => {
  const dash = buildDashboard(HISTORY)!;

  it("sums only listed years and marks the sum 'at least' when a stored year is below the cut-off", () => {
    expect(dash.total).toBe(100 + 200 + 300 + 450 + 900 + 1000 + 1200 + 1100 + 800 + 700 + 770);
    expect(dash.totalPartial).toBe(true);
    expect(dash.yearsListed).toBe(11);
    expect(dash.yearsStored).toBe(12);
  });

  it("finds the best rank with its years, the latest change, the rises and falls", () => {
    expect(dash.best).toEqual({ rank: 1, years: [2007, 2008, 2009] });
    expect(dash.latestChange?.year).toBe(2012);
    expect(dash.latestChange?.change).toBeCloseTo(0.1);
    expect(dash.rises).toBe(6);
    expect(dash.falls).toBe(3);
    expect(dash.biggestRise?.year).toBe(2006);
    expect(dash.biggestFall?.year).toBe(2010);
  });

  it("splits decades and never counts a missing year as zero", () => {
    expect(dash.decades.map((d) => [d.from, d.to])).toEqual([
      [2000, 2009],
      [2010, 2012],
    ]);
    const first = dash.decades[0]!;
    expect(first).toMatchObject({ yearsListed: 8, yearsStored: 9, partial: true, bestRank: 1 });
    expect(first.sum).toBe(100 + 200 + 300 + 450 + 900 + 1000 + 1200 + 1100);
    expect(dash.decades[1]).toMatchObject({ sum: 2270, partial: false, averageRank: 4 });
  });

  it("lists the moments in time order", () => {
    expect(dash.moments.map((m) => [m.kind, m.year])).toEqual([
      ["FIRST_LISTED", 2000],
      ["TOP_TEN", 2005],
      ["BIGGEST_RISE", 2006],
      ["NUMBER_ONE", 2007],
      ["PEAK", 2008],
    ]);
    expect(dash.moments.find((m) => m.kind === "NUMBER_ONE")).toMatchObject({ years: 3 });
  });

  it("names the last year on the list when later years are below the cut-off", () => {
    const d = buildDashboard([...HISTORY, year(2013, null, null), year(2014, null, null)])!;
    expect(d.moments.at(-1)).toEqual({ kind: "LAST_LISTED", year: 2012 });
    expect(d.latestChange).toBeNull();
  });

  it("is null for a sex with no count in any year", () => {
    expect(buildDashboard([year(2000, null, null), year(2001, null, null)])).toBeNull();
  });
});

describe("sortOrders", () => {
  it("orders newest first, most children, best rank and biggest rise; years without a value last", () => {
    const orders = sortOrders(dashYears(HISTORY));
    expect(orders.get(2012)!.year).toBe(1);
    expect(orders.get(2000)!.year).toBe(13);
    expect(orders.get(2008)!.count).toBe(1);
    expect(orders.get(2001)!.count).toBeGreaterThan(11);
    expect(orders.get(2007)!.rank).toBe(3);
    expect(orders.get(2009)!.rank).toBe(1);
    expect(orders.get(2006)!.change).toBe(1);
  });
});

describe("the panels", () => {
  const dash = buildDashboard(HISTORY)!;
  const html = (lang: "pl" | "en") =>
    renderToStaticMarkup(
      createElement("div", null, [
        createElement(DashSummary, { key: 1, dash, lang }),
        createElement(ChartSwitch, { key: 2, dash, sex: "FEMALE", lang }, "COUNT"),
        createElement(Moments, { key: 3, dash, lang }),
        createElement(YearOnYear, { key: 4, dash, lang }),
        createElement(Decades, { key: 5, dash, lang }),
        createElement(YearGrid, { key: 6, dash, sex: "FEMALE", lang }),
      ]),
    );

  it("renders every panel in both languages, with 'at least' sums and no zero for a missing year", () => {
    for (const lang of ["pl", "en"] as const) {
      const t = BABY_NAMES_TEXT[lang];
      const out = html(lang);
      for (const panel of ["summary", "metric", "moments", "yoy", "decades", "grid"]) {
        expect(out, `${lang} ${panel}`).toContain(`data-dash="${panel}"`);
      }
      expect(out).toContain(t.dashTotal(2000));
      expect(out).toContain(t.dashAtLeast);
      expect(out).toContain(t.momentNumberOneDesc(3));
      // The share chart: a bar for each listed year, a tick for 2001, nothing for 2002.
      expect(out.match(/<rect class="bn-share-bar"/gu)).toHaveLength(11);
      expect(out).not.toContain('data-share-year="2001"');
      expect(out).not.toMatch(/<rect[^>]*height="0"/u);
      // The grid: 2001 below the cut-off of 5, 2002 without a list; no "0" count anywhere.
      expect(out).toContain(`&lt; 5 · ${t.belowThreshold}`);
      expect(out).toContain(t.noYearList);
      expect(out).not.toMatch(
        /data-grid-year="200[12]"[^>]*><span class="bn-grid-year">\d+<\/span><span>0</u,
      );
      // No script and no buttons: radios and labels only.
      expect(out).not.toContain("<button");
      expect(out).not.toContain("<script");
      expect(out.match(/type="radio"/gu)).toHaveLength(6);
    }
  });

  it("writes changes with a sign", () => {
    expect(signedPercent(0.123, "pl")).toBe("+12,3%");
    expect(signedPercent(-0.08, "en")).toBe("−8.0%");
    expect(signedPercent(0, "pl")).toBe("0,0%");
  });
});
