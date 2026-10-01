import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { assessmentWord, htmlLang } from "./messages.js";
import { HowView, howMetadata } from "./how-page.js";
import { ASSESSMENTS, howDocument } from "./how-text.js";

describe("the how-it-works pages (TASK-052)", () => {
  it("render every section and every confidence word, in each language", () => {
    for (const lang of ["pl", "en"] as const) {
      const html = renderToStaticMarkup(createElement(HowView, { lang }));
      const doc = howDocument(lang);
      expect(html).toContain(`<main lang="${htmlLang(lang)}"`);
      expect(html).toContain(doc.title);
      for (const section of doc.sections) expect(html).toContain(`<h3>${section.heading}</h3>`);
      for (const status of ASSESSMENTS) expect(html).toContain(assessmentWord(status, lang));
    }
  });

  it("have the same sections in Polish and English", () => {
    expect(howDocument("pl").sections.length).toBe(howDocument("en").sections.length);
  });

  it("mark their place in the header and switch language to the same page", () => {
    const pl = renderToStaticMarkup(createElement(HowView, { lang: "pl" }));
    expect(pl).toContain('href="/pl/jak-to-dziala" aria-current="page"');
    expect(pl).toContain('href="/en/how-it-works" hrefLang="en"');
    expect(howMetadata("en").alternates?.canonical).toBe("/en/how-it-works");
  });

  it("never says a surname tells where a family lives or comes from", () => {
    for (const lang of ["pl", "en"] as const) {
      const text = JSON.stringify(howDocument(lang)).toLowerCase();
      for (const wrong of ["mieszka", "pochodzi z", "lives in", "comes from", "originates"]) {
        expect(text, `${lang}: ${wrong}`).not.toContain(wrong);
      }
    }
  });
});
