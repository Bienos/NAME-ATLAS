import { describe, expect, it } from "vitest";
import {
  ACCOUNT_ACTIONS,
  ACCOUNT_STEPS,
  accountPath,
  actionPath,
  isAccountAction,
  isTreeNext,
  safeNext,
  stepFromSlug,
} from "./account-paths.js";
import { SHARE_CARDS, studioPath } from "./share-facts.js";

const LANGS = ["pl", "en"] as const;

describe("the account's addresses (TASK-062)", () => {
  it("names the account page and its steps in each language", () => {
    expect(accountPath("pl", "account")).toBe("/pl/konto");
    expect(accountPath("en", "account")).toBe("/en/account");
    expect(accountPath("pl", "sign-in")).toBe("/pl/konto/zaloguj");
    expect(accountPath("en", "sign-in")).toBe("/en/account/sign-in");
    expect(accountPath("pl", "confirm")).toBe("/pl/konto/potwierdz");
    expect(accountPath("en", "new-password")).toBe("/en/account/new-password");
  });

  it("gives every step its own address in each language", () => {
    for (const lang of LANGS) {
      const paths = ACCOUNT_STEPS.map((step) => accountPath(lang, step));
      expect(new Set(paths).size, lang).toBe(ACCOUNT_STEPS.length);
    }
  });

  it("round-trips: the segments of an address name the step it was built from", () => {
    for (const lang of LANGS) {
      for (const step of ACCOUNT_STEPS) {
        const path = accountPath(lang, step);
        const segments = path.split("/").slice(3);
        expect(stepFromSlug(lang, segments), `${lang} ${step}`).toBe(step);
      }
    }
  });

  it("answers null (a 404) for a slug that is no step, another language's, or too deep", () => {
    expect(stepFromSlug("pl", ["nope"])).toBeNull();
    expect(stepFromSlug("pl", ["sign-in"])).toBeNull();
    expect(stepFromSlug("en", ["zaloguj"])).toBeNull();
    expect(stepFromSlug("pl", ["zaloguj", "extra"])).toBeNull();
    expect(stepFromSlug("pl", undefined)).toBe("account");
    expect(stepFromSlug("pl", [])).toBe("account");
  });

  it("puts a query on an address, encoded", () => {
    expect(accountPath("pl", "sign-up", { status: "sent" })).toBe("/pl/konto/zaloz?status=sent");
    expect(accountPath("en", "confirm", { token: "a-b_c", status: "too-short" })).toBe(
      "/en/account/confirm?token=a-b_c&status=too-short",
    );
    expect(accountPath("pl", "account", { status: "a b&c" })).toBe("/pl/konto?status=a+b%26c");
  });

  it("knows the eight actions and their routes (Google's terms step, TASK-084)", () => {
    expect(ACCOUNT_ACTIONS).toHaveLength(8);
    for (const action of ACCOUNT_ACTIONS) {
      expect(isAccountAction(action)).toBe(true);
      expect(actionPath(action)).toBe(`/api/account/${action}`);
    }
    for (const word of ["", "constructor", "SIGN-IN", "sign-in/x", "__proto__"]) {
      expect(isAccountAction(word), word).toBe(false);
    }
  });
});

describe("where a sign-in may return to (TASK-064, AC-5)", () => {
  it("takes a surname page of this site, with or without the deck", () => {
    for (const page of [
      "/pl/nazwisko/kowalski",
      "/pl/nazwisko/kowalski?view=cards",
      "/en/surname/nowak-k3m9qp",
      "/en/surname/o'neil?view=cards",
      // `canonicalSlug` keeps a surname's letters and the address carries them encoded.
      "/pl/nazwisko/%C5%82uczak",
      "/pl/nazwisko/%C5%82uczak?view=cards",
    ]) {
      expect(safeNext(page), page).toBe(page);
    }
  });

  it("takes whatever the page's own address builder makes for a surname", () => {
    // `pathForSlug` is `encodeURIComponent` of the slug: the pattern must take its output.
    for (const slug of ["kowalski", "łuczak", "o'neil", "żółć-nowak", "smith-jones-k3m9qp"]) {
      const page = `/pl/nazwisko/${encodeURIComponent(slug)}?view=cards`;
      expect(safeNext(page), slug).toBe(page);
    }
  });

  it("refuses everything else", () => {
    const refused: unknown[] = [
      undefined,
      null,
      42,
      ["/pl/nazwisko/kowalski"],
      "",
      "/",
      "https://evil.test/pl/nazwisko/kowalski",
      "//evil.test",
      "//evil.test/pl/nazwisko/kowalski",
      "/\\evil.test",
      "/pl/nazwisko/kowalski/../../konto",
      "/pl/nazwisko/..",
      "/pl/nazwisko/.",
      "/pl/nazwisko/%2e%2e",
      "/pl/nazwisko/%2E%2e",
      "/pl/nazwisko/a%2fb",
      "/pl/nazwisko/a%5cb",
      "/pl/nazwisko/kowalski%0a",
      "/pl/nazwisko/kowalski%0d%0aSet-Cookie:x=y",
      "/pl/nazwisko/kowalski%00",
      "/pl/nazwisko/%FF",
      "/pl/nazwisko/%zz",
      "/pl/nazwisko/",
      "/pl/nazwisko",
      "/pl/nazwisko/kowalski/",
      "/pl/nazwisko/kowalski/karta/summary",
      "/pl/nazwisko/kowalski#karty",
      "/pl/nazwisko/kowalski?view=page",
      "/pl/nazwisko/kowalski?view=cards&next=/x",
      "/pl/nazwisko/kowalski?",
      "/pl/konto",
      "/pl/konto/zaloguj",
      "/api/account/delete",
      "/pl/oferta",
      "/de/nachname/kowalski",
      " /pl/nazwisko/kowalski",
      "/pl/nazwisko/kowalski ",
      "/pl/nazwisko/ko walski",
      "javascript:alert(1)",
      `/pl/nazwisko/${"a".repeat(200)}`,
    ];
    for (const value of refused) expect(safeNext(value), String(value)).toBeNull();
  });
});

describe("the share studio as a return address (TASK-093, AC-6)", () => {
  it("takes the studio in its own language, with or without one of its cards", () => {
    for (const card of SHARE_CARDS) {
      for (const page of [
        `/pl/nazwisko/kowalski/udostepnij?card=${card}`,
        `/en/surname/o'neil/share?card=${card}`,
        `/pl/nazwisko/%C5%82uczak/udostepnij?card=${card}`,
        studioPath("/pl/nazwisko/kowalski", "pl", card),
        studioPath("/en/surname/nowak-k3m9qp", "en", card),
      ]) {
        expect(safeNext(page), page).toBe(page);
      }
    }
    expect(safeNext("/pl/nazwisko/kowalski/udostepnij")).toBe("/pl/nazwisko/kowalski/udostepnij");
    expect(safeNext("/en/surname/kowalski/share")).toBe("/en/surname/kowalski/share");
  });

  it("refuses a studio address with anything else in it", () => {
    for (const value of [
      "/pl/nazwisko/kowalski/share",
      "/en/surname/kowalski/udostepnij",
      "/pl/nazwisko/kowalski/udostepnij?card=horoscope",
      "/pl/nazwisko/kowalski/udostepnij?card=",
      "/pl/nazwisko/kowalski/udostepnij?card=summary&card=rarity",
      "/pl/nazwisko/kowalski/udostepnij?card=summary&next=/x",
      "/pl/nazwisko/kowalski/udostepnij?view=cards",
      "/pl/nazwisko/kowalski/udostepnij?card=summary#x",
      "/pl/nazwisko/kowalski/udostepnij/",
      "/pl/nazwisko/kowalski/udostepnij?",
      "/pl/nazwisko/kowalski?view=cards/udostepnij",
      "/pl/nazwisko/../udostepnij",
      "/pl/nazwisko/%2e%2e/udostepnij",
      "/pl/nazwisko/a%2fb/udostepnij",
      "//evil.test/pl/nazwisko/kowalski/udostepnij",
    ]) {
      expect(safeNext(value), value).toBeNull();
    }
  });
});

describe("an invitation to a tree as a return address (TASK-094, AC-6)", () => {
  const token = "A".repeat(43);

  it("takes the invitation page with its token, in both languages, and knows it leads to the tree", () => {
    for (const page of [
      `/pl/konto/drzewa/zaproszenie?t=${token}`,
      `/en/account/trees/invitation?t=${token}`,
    ]) {
      expect(safeNext(page), page).toBe(page);
      expect(isTreeNext(page), page).toBe(true);
    }
  });

  it("refuses the page without a well-formed token, or with anything else in it", () => {
    for (const value of [
      "/pl/konto/drzewa/zaproszenie",
      "/pl/konto/drzewa/zaproszenie?t=short",
      `/pl/konto/drzewa/zaproszenie?t=${token}&x=1`,
      `/en/account/trees/invitation?t=${token}/`,
      `/pl/konto/drzewa/karty?t=${token}`,
    ]) {
      expect(safeNext(value), value).toBeNull();
    }
  });
});

describe("the baby-names page as a return address (TASK-141)", () => {
  it("takes the page's two bare addresses, and nothing more", () => {
    expect(safeNext("/pl/imiona-dla-dziecka")).toBe("/pl/imiona-dla-dziecka");
    expect(safeNext("/en/baby-names")).toBe("/en/baby-names");
    for (const value of [
      "/pl/imiona-dla-dziecka?imie=ZOFIA",
      "/pl/imiona-dla-dziecka/",
      "/en/baby-names/x",
      "/pl/baby-names",
      "//evil.example/pl/imiona-dla-dziecka",
    ]) {
      expect(safeNext(value), value).toBeNull();
    }
  });
});
