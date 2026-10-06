import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CheckoutSection } from "./checkout-section.js";

function render(lang: "pl" | "en", purchases: { tier: string; amountTotal: number }[] = []) {
  return renderToStaticMarkup(
    createElement(CheckoutSection, {
      lang,
      status: null,
      purchases: purchases.map((p) => ({ ...p, paidOn: "2026-10-06" })),
    }),
  );
}

describe("the account page's purchases section (TASK-111, TASK-144)", () => {
  it("shows a buy button for the 8,99 zł baby-names product, before the dearer tiers", () => {
    const pl = render("pl");
    expect(pl).toContain("Zakupy (tryb testowy)");
    expect(pl).toContain('name="tier" value="babynames"');
    expect(pl).toContain("Kup „Imiona dla dziecka” — 8,99 zł");
    expect(pl.indexOf('value="babynames"')).toBeLessThan(pl.indexOf('value="smaller"'));
    const en = render("en");
    expect(en).toContain("Buy “Baby names” — PLN 8.99");
  });

  it("shows the 15,99 zł full-name comparison between the 8,99 zł product and the 28,99 zł tier (TASK-155)", () => {
    const pl = render("pl");
    expect(pl).toContain('name="tier" value="fullnames"');
    expect(pl).toContain("Kup „Porównanie imion i nazwisk” — 15,99 zł");
    expect(pl.indexOf('value="babynames"')).toBeLessThan(pl.indexOf('value="fullnames"'));
    expect(pl.indexOf('value="fullnames"')).toBeLessThan(pl.indexOf('value="smaller"'));
    expect(render("en")).toContain("Buy “Full-name comparison” — PLN 15.99");
  });

  it("lists a purchase of it by its name", () => {
    expect(render("pl", [{ tier: "babynames", amountTotal: 899 }])).toContain(
      "Imiona dla dziecka — 8,99 zł",
    );
    expect(render("en", [{ tier: "babynames", amountTotal: 899 }])).toContain(
      "Baby names — PLN 8.99",
    );
  });
});
