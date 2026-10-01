import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingCompare, LandingHow } from "./landing-sections.js";
import { UI } from "./messages.js";

/** TASK-053: the landing's last two sections. */
describe("the landing's how-it-works and compare sections", () => {
  it("state the three rules and link to the page that explains them, in both languages", () => {
    for (const lang of ["pl", "en"] as const) {
      const html = renderToStaticMarkup(createElement(LandingHow, { lang }));
      expect(UI[lang].landingHowPoints).toHaveLength(3);
      for (const point of UI[lang].landingHowPoints) expect(html).toContain(point);
      expect(html).toContain(
        lang === "pl" ? 'href="/pl/jak-to-dziala"' : 'href="/en/how-it-works"',
      );
    }
  });

  it("send two typed surnames to the comparison, with ids of their own", () => {
    const pl = renderToStaticMarkup(createElement(LandingCompare, { lang: "pl" }));
    expect(pl).toContain('action="/pl/porownaj" method="get"');
    expect(pl).toMatch(/<input id="landing-qa"[^>]* name="qa"\/>/u);
    expect(pl).toMatch(/<input id="landing-qb"[^>]* name="qb"\/>/u);
    expect(pl).not.toContain('id="surname"');
    const en = renderToStaticMarkup(createElement(LandingCompare, { lang: "en" }));
    expect(en).toContain('action="/en/compare" method="get"');
  });

  it("never say a surname tells where a family lives or comes from", () => {
    for (const lang of ["pl", "en"] as const) {
      const text = [
        renderToStaticMarkup(createElement(LandingHow, { lang })),
        renderToStaticMarkup(createElement(LandingCompare, { lang })),
        ...UI[lang].analysisSteps,
      ]
        .join(" ")
        .toLowerCase();
      for (const wrong of ["mieszka", "pochodzi z", "lives in", "comes from"]) {
        expect(text, `${lang}: ${wrong}`).not.toContain(wrong);
      }
    }
  });
});
