import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommonSurnames } from "./common-surnames.js";
import type { CommonList } from "./common-surnames.js";

// SYNTHETIC ranks: this tests rendering, not the register.
const LISTS: CommonList[] = [
  {
    comparability_group: "pesel_2026_national_female",
    external_record_id: "1148811",
    snapshot_date: "2026-01-20",
    items: [
      { display_name: "NOWAK", rank: 1, path: "/pl/nazwisko/nowak" },
      { display_name: "KOWALSKA", rank: 2, path: "/pl/nazwisko/kowalska" },
    ],
  },
  {
    comparability_group: "pesel_2026_national_male",
    external_record_id: "1148808",
    snapshot_date: "2026-01-20",
    items: [{ display_name: "NOWAK", rank: 1, path: "/pl/nazwisko/nowak" }],
  },
];

const render = (lists: CommonList[], lang: "pl" | "en") =>
  renderToStaticMarkup(createElement(CommonSurnames, { lists, lang }));

describe("CommonSurnames", () => {
  it("renders one titled list per partition, with the claims' own ranks and links", () => {
    const html = render(LISTS, "pl");
    expect(html).toContain("Najczęstsze nazwiska");
    expect(html).toContain("<h4>kobiety</h4>");
    expect(html).toContain("<h4>mężczyźni</h4>");
    expect(html).toContain('<a href="/pl/nazwisko/kowalska">KOWALSKA</a>');
    expect(html).toContain("Stan na 20 stycznia 2026 r.<");
    expect(html).not.toContain("r..");
    expect(html).toContain("nie są sumowane");
  });

  it("speaks English on the English page", () => {
    const html = render(LISTS, "en");
    expect(html).toContain("Most common surnames");
    expect(html).toContain("<h4>female</h4>");
    expect(html).toContain("never summed");
  });

  it("renders nothing when no rank claims exist", () => {
    expect(render([], "pl")).toBe("");
    expect(render([{ ...LISTS[0]!, items: [] }], "pl")).toBe("");
  });
});
