import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CheckoutSection } from "./checkout-section.js";

function render(
  lang: "pl" | "en",
  purchases: { tier: string; amountTotal: number }[] = [],
  mode: "test" | "live" = "test",
) {
  return renderToStaticMarkup(
    createElement(CheckoutSection, {
      lang,
      mode,
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

  it("puts the withdrawal statement, unticked and required, in every buy form (TASK-179)", () => {
    const pl = render("pl");
    const forms = pl.split("<form").length - 1;
    expect(forms).toBe(5);
    const boxes = pl.match(/<input type="checkbox"[^>]*>/gu) ?? [];
    expect(boxes).toHaveLength(forms);
    for (const box of boxes) {
      expect(box).toContain('name="withdrawal_consent"');
      expect(box).toContain('value="v1"');
      expect(box).toContain('required=""');
    }
    expect(pl).not.toContain("checked");
    expect(pl).toContain("tracę prawo do odstąpienia od umowy");
    expect(render("en")).toContain("I thereby lose my right to withdraw from the contract");
  });

  it("says nothing of a test in live mode (TASK-179)", () => {
    const pl = render("pl", [], "live");
    expect(pl).toContain(">Zakupy<");
    expect(pl).not.toContain("tryb testowy");
    expect(pl).not.toContain("4242");
    expect(pl).toContain("Kup „Imiona dla dziecka” — 8,99 zł");
    const en = render("en", [], "live");
    expect(en).not.toContain("test");
    expect(en).toContain("Buy “Baby names” — PLN 8.99");
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
