import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TYPE_FAMILIES } from "./design-tokens.js";
import { formatPercentChange } from "./messages.js";
import { Figure } from "./share-card.js";

/**
 * TASK-059: the Fraunces file the share cards ship draws "+" as a bar with its
 * stroke displaced under the next digit, so a growing surname's "+0,9%" read as
 * "−0,9%" on ZAREMBA's change card. A figure's sign is drawn in the interface
 * face, where both signs are correct.
 */
const html = (text: string) =>
  renderToStaticMarkup(createElement(Figure, { text, size: 200, color: "#ffffff" }));

describe("TASK-059 AC-1: a figure's sign is never drawn in the display face", () => {
  it("sets a plus in the interface face and its digits in the display face", () => {
    const out = html(formatPercentChange(0.9, "pl"));
    expect(out).toMatch(new RegExp(`font-family:${TYPE_FAMILIES.ui}[^>]*>\\+</div>`, "u"));
    expect(out).toContain(">0,9%</div>");
    expect(out.startsWith(`<div style="font-family:${TYPE_FAMILIES.display}`)).toBe(true);
  });

  it("does the same for a minus, so the two signs look alike", () => {
    const out = html(formatPercentChange(-3.6, "pl"));
    expect(out).toMatch(new RegExp(`font-family:${TYPE_FAMILIES.ui}[^>]*>−</div>`, "u"));
    expect(out).toContain(">3,6%</div>");
  });

  it("keeps the figure's text whole: sign, digits and per cent, in both languages", () => {
    for (const [pct, lang, text] of [
      [0.9, "pl", "+0,9%"],
      [0.9, "en", "+0.9%"],
      [-3.7, "pl", "−3,7%"],
      [50, "en", "+50.0%"],
    ] as const) {
      expect(formatPercentChange(pct, lang)).toBe(text);
      const plain = html(text).replace(/<[^>]+>/gu, "");
      expect(plain).toBe(text);
    }
  });

  it("leaves a figure without a sign whole, in the display face only", () => {
    for (const text of ["1 na 318", "20,0%", "160 571", "0,0%"]) {
      const out = html(text);
      expect(out).not.toContain(TYPE_FAMILIES.ui);
      expect(out.replace(/<[^>]+>/gu, "")).toBe(text);
    }
  });
});
