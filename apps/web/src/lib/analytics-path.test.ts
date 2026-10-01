import { describe, expect, it } from "vitest";
import { analyticsUrl, redactSurnamePath } from "./analytics-path.js";
import { beforeSend } from "./site-analytics.js";

const HOST = "https://name-atlas-two.vercel.app";

describe("TASK-058 AC-1: the analytics never sees a surname", () => {
  it("replaces the slug on the surname pages and their images, in both languages", () => {
    const cases: readonly [string, string][] = [
      ["/pl/nazwisko/kowalski", "/pl/nazwisko/[slug]"],
      ["/en/surname/kowalski", "/en/surname/[slug]"],
      ["/pl/nazwisko/d%C4%85browski", "/pl/nazwisko/[slug]"],
      ["/pl/nazwisko/kowalski/karta/rarity", "/pl/nazwisko/[slug]/karta/rarity"],
      ["/en/surname/kowalski/card/rarity", "/en/surname/[slug]/card/rarity"],
      ["/pl/nazwisko/kowalski/opengraph-image", "/pl/nazwisko/[slug]/opengraph-image"],
    ];
    for (const [path, expected] of cases) {
      expect(redactSurnamePath(path), path).toBe(expected);
      expect(analyticsUrl(`${HOST}${path}`), path).toBe(`${HOST}${expected}`);
    }
  });

  it("drops the query and the hash, where the landing and the comparison carry surnames", () => {
    expect(analyticsUrl(`${HOST}/?surname=Kowalski`)).toBe(`${HOST}/`);
    expect(analyticsUrl(`${HOST}/pl/porownaj?a=kowalski&b=nowak`)).toBe(`${HOST}/pl/porownaj`);
    expect(analyticsUrl(`${HOST}/pl/nazwisko/kowalski?view=cards#where`)).toBe(
      `${HOST}/pl/nazwisko/[slug]`,
    );
  });

  it("leaves every other page as it is", () => {
    for (const path of [
      "/",
      "/pl/oferta",
      "/en/offer",
      "/pl/porownaj",
      "/pl/jak-to-dziala",
      "/en/privacy",
    ]) {
      expect(analyticsUrl(`${HOST}${path}`)).toBe(`${HOST}${path}`);
    }
    expect(redactSurnamePath("/pl/nazwisko/")).toBe("/pl/nazwisko/");
  });

  it("works on a bare path too, and sends nothing for an address it cannot read", () => {
    expect(analyticsUrl("/pl/nazwisko/nowak?x=1")).toBe("/pl/nazwisko/[slug]");
    expect(analyticsUrl("http://")).toBeNull();
  });

  it("rewrites the event's url and keeps the rest; an unreadable one is not sent", () => {
    const event = { type: "pageview" as const, url: `${HOST}/pl/nazwisko/nowak?view=cards` };
    expect(beforeSend(event)).toEqual({ type: "pageview", url: `${HOST}/pl/nazwisko/[slug]` });
    expect(beforeSend({ type: "pageview", url: "http://" })).toBeNull();
  });
});
