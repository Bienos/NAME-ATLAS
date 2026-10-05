import { describe, expect, it } from "vitest";
import { analyticsUrl, redactSurnamePath, redactTreePath } from "./analytics-path.js";
import { beforeSend, speedInsightsRoute } from "./site-analytics.js";

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

  it("drops the token a mail's link carries, on both account pages in both languages (TASK-062, AC-10)", () => {
    const token = "k".repeat(43);
    for (const path of [
      "/pl/konto/potwierdz",
      "/en/account/confirm",
      "/pl/konto/nowe-haslo",
      "/en/account/new-password",
    ]) {
      expect(analyticsUrl(`${HOST}${path}?token=${token}`), path).toBe(`${HOST}${path}`);
      expect(analyticsUrl(`${path}?token=${token}&status=too-short`), path).toBe(path);
    }
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

describe("TASK-076 AC-7: the analytics never sees a tree's or a person's id", () => {
  const TREE = "0199a1b2-0000-7000-8000-00000000aa01";
  const PERSON = "0199a1b2-0000-7000-8000-00000000bb01";

  it("replaces both ids on the tree pages, in both languages, and drops the draft in the query", () => {
    expect(analyticsUrl(`/pl/konto/drzewa/${TREE}`)).toBe("/pl/konto/drzewa/[tree]");
    expect(analyticsUrl(`/en/account/trees/${TREE}/add?given=Halina&child=${PERSON}`)).toBe(
      "/en/account/trees/[tree]/add",
    );
    expect(analyticsUrl(`/pl/konto/drzewa/${TREE}/osoba/${PERSON}?status=saved`)).toBe(
      "/pl/konto/drzewa/[tree]/osoba/[person]",
    );
    expect(analyticsUrl(`${HOST}/en/account/trees/${TREE}/person/${PERSON}`)).toBe(
      `${HOST}/en/account/trees/[tree]/person/[person]`,
    );
    expect(analyticsUrl("/pl/konto/drzewa")).toBe("/pl/konto/drzewa");
    expect(analyticsUrl("/pl/konto/drzewa/zgoda?tree=x&given=Halina")).toBe(
      "/pl/konto/drzewa/zgoda",
    );
  });
});

describe("the Konstelacja's address in the statistics (TASK-091, AC-1)", () => {
  it("keeps the view's slug and replaces the tree's id", () => {
    expect(
      redactTreePath("/pl/konto/drzewa/0199a1b2-0000-7000-8000-00000000aa01/konstelacja"),
    ).toBe("/pl/konto/drzewa/[tree]/konstelacja");
    expect(
      redactTreePath("/en/account/trees/0199a1b2-0000-7000-8000-00000000aa01/constellation"),
    ).toBe("/en/account/trees/[tree]/constellation");
  });
});

describe("the Mapa's address in the statistics (TASK-092, AC-1)", () => {
  it("keeps the view's slug and replaces the tree's id", () => {
    expect(redactTreePath("/pl/konto/drzewa/0199a1b2-0000-7000-8000-00000000aa01/mapa")).toBe(
      "/pl/konto/drzewa/[tree]/mapa",
    );
  });
});

describe("a claimant's own card in the statistics (TASK-094)", () => {
  const PERSON_ID = "0199a1b2-0000-7000-8000-00000000ab03";

  it("replaces the person's id on the card route, in both languages", () => {
    expect(analyticsUrl(`/pl/konto/drzewa/karta/${PERSON_ID}`)).toBe(
      "/pl/konto/drzewa/karta/[person]",
    );
    expect(analyticsUrl(`https://name-atlas.pl/en/account/trees/card/${PERSON_ID}?saved=1`)).toBe(
      "https://name-atlas.pl/en/account/trees/card/[person]",
    );
  });

  it("leaves the cards list and the invitation page as they are; the token is in the query", () => {
    expect(analyticsUrl("/pl/konto/drzewa/karty")).toBe("/pl/konto/drzewa/karty");
    expect(analyticsUrl("/en/account/trees/invitation?t=abc")).toBe("/en/account/trees/invitation");
  });
});

describe("Vercel Speed Insights never sees a surname either", () => {
  const TREE = "0199a1b2-0000-7000-8000-00000000aa01";
  const PERSON = "0199a1b2-0000-7000-8000-00000000bb01";

  it("rewrites a measurement's address and keeps the rest; an unreadable one is not sent", () => {
    const vital = {
      type: "vital" as const,
      url: `${HOST}/pl/nazwisko/nowak?view=cards`,
      route: "/pl/nazwisko/[slug]",
    };
    expect(beforeSend(vital)).toEqual({ ...vital, url: `${HOST}/pl/nazwisko/[slug]` });
    expect(beforeSend({ type: "vital" as const, url: "http://" })).toBeNull();
  });

  it("gives the route's pattern when the params match the path", () => {
    expect(speedInsightsRoute("/pl/nazwisko/kowalski", { slug: "kowalski" })).toBe(
      "/pl/nazwisko/[slug]",
    );
    expect(
      speedInsightsRoute("/en/surname/kowalski/card/rarity", { slug: "kowalski", card: "rarity" }),
    ).toBe("/en/surname/[slug]/card/[card]");
    expect(
      speedInsightsRoute(`/pl/konto/drzewa/${TREE}/osoba/${PERSON}`, {
        rest: [TREE, "osoba", PERSON],
      }),
    ).toBe("/pl/konto/drzewa/[...rest]");
    expect(speedInsightsRoute("/pl/oferta", {})).toBe("/pl/oferta");
    expect(speedInsightsRoute("/pl/konto/drzewa", { rest: undefined })).toBe("/pl/konto/drzewa");
  });

  it("still drops the surname when the path and the params differ in encoding", () => {
    // A slug keeps its Polish letters; the pattern match fails on one side
    // percent-encoded and the other not, and the path would go out as it is.
    expect(speedInsightsRoute("/pl/nazwisko/%C5%82uczak", { slug: "łuczak" })).toBe(
      "/pl/nazwisko/[slug]",
    );
    expect(speedInsightsRoute("/pl/nazwisko/łuczak/karta/rarity", { slug: "%C5%82uczak" })).toBe(
      "/pl/nazwisko/[slug]/karta/rarity",
    );
    expect(speedInsightsRoute("/en/surname/nowak", null)).toBe("/en/surname/[slug]");
    expect(speedInsightsRoute(`/pl/konto/drzewa/${TREE}/osoba/${PERSON}`, null)).toBe(
      "/pl/konto/drzewa/[tree]/osoba/[person]",
    );
  });

  it("loads nothing when there is no path", () => {
    expect(speedInsightsRoute(null, null)).toBeNull();
  });
});
