import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import PlSheet, {
  generateMetadata as plMetadata,
} from "../app/pl/imiona-dla-dziecka/udostepnij/page.js";
import EnSheet, { generateMetadata as enMetadata } from "../app/en/baby-names/share/page.js";
import { middleware } from "../middleware.js";
import { resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import { BabyNamesView, loadBabyNames } from "./baby-names-page.js";
import { BabyShareView, loadBabyShare } from "./baby-names-share-page.js";
import { shareDeps } from "./baby-names-share-test-fixtures.js";
import type { Lang } from "./messages.js";

/**
 * TASK-152 AC-3 and AC-4: the share sheet's markup (the picker, the format
 * toggle, the preview, the actions, no checkout) and the way to it from the
 * page; the sheet's gating, headers and absence from every sitemap.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  resetAccountsRuntimeForTests();
});

const BOUGHT = { paid: ["babynames" as const] };

async function sheet(
  lang: Lang,
  query: Record<string, string>,
  session: { userId: string } | null,
): Promise<string> {
  const data = await loadBabyShare({ lang, query, session, deps: shareDeps(BOUGHT) });
  return renderToStaticMarkup(createElement(BabyShareView, { data }))
    .replace(/&#x27;/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/&amp;/gu, "&");
}

const GIRLS = { imie: "Zofia", sex: "girls" };
const STORY_IMG = "/pl/imiona-dla-dziecka/karta/story?imie=ZOFIA&sex=girls";

describe("the way to the sheet on the page (AC-4)", () => {
  it("is one link per sex with figures, to the sheet for that name and sex, and none for a sex below the cut-off", async () => {
    const data = await loadBabyNames({
      lang: "pl",
      query: GIRLS,
      session: { userId: "free" },
      deps: shareDeps(BOUGHT),
    });
    const html = renderToStaticMarkup(createElement(BabyNamesView, { data })).replace(
      /&amp;/gu,
      "&",
    );
    expect(html).toContain('href="/pl/imiona-dla-dziecka/udostepnij?imie=ZOFIA&sex=girls"');
    expect(html).toContain('data-share="FEMALE"');
    expect(html).not.toContain('data-share="MALE"');
    expect(html).toContain("Karta z tymi liczbami, do wysłania bliskim.");
    expect(html.match(/bn-share-link/gu)).toHaveLength(1);
  });
});

describe("the share sheet (AC-4)", () => {
  it("signed out: explains and links to sign-in, which comes back to the page; no image", async () => {
    const html = await sheet("pl", GIRLS, null);
    expect(html).toContain("Karty do udostępnienia są dla zalogowanych.");
    expect(html).toContain('href="/pl/konto/zaloguj?next=%2Fpl%2Fimiona-dla-dziecka"');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("ZOFIA");
  });

  it("without a name or sex, or for a name with no card for that sex, says so and leads back", async () => {
    expect(await sheet("pl", {}, { userId: "free" })).toContain(
      "Wpisz imię na stronie Imiona dla dziecka",
    );
    const boys = await sheet("pl", { imie: "Zofia", sex: "boys" }, { userId: "free" });
    expect(boys).toContain("Dla tej płci nie ma karty: imienia nie ma na ostatniej liście.");
    expect(boys).toContain('href="/pl/imiona-dla-dziecka?imie=Zofia&sex=boys#sex-boys"');
    expect(boys).not.toContain("<img");
    const unknown = await sheet("en", { name: "Nikt", sex: "girls" }, { userId: "free" });
    expect(unknown).toContain("There is no card for this sex");
  });

  it("offers the basic card to a reader without the entitlement and shows the paid one inert, with nothing to buy", async () => {
    const html = await sheet("pl", GIRLS, { userId: "free" });
    // The picker: the basic option is the current link; the paid option is a span, no link, no button.
    expect(html).toMatch(/<a class="bns-option" href="[^"]*card=basic[^"]*" aria-current="page"/u);
    expect(html).toContain(
      '<span class="bns-option bns-locked" aria-disabled="true" data-option="paid"',
    );
    expect(html).toContain("8,99 zł · Wkrótce");
    expect(html).not.toMatch(/href="[^"]*card=paid/u);
    expect(html).not.toMatch(/checkout|platnosc|płatno|stripe|kup teraz|\bkup\b/iu);
    // The island's two buttons (share, copy link), and no other: nothing buys.
    const buttons = html.match(/<button[^>]*>[^<]*<\/button>/gu) ?? [];
    expect(buttons).toHaveLength(2);
    expect(buttons.join(" ")).toContain("Udostępnij");
    expect(buttons.join(" ")).toContain("Kopiuj link");
    // The preview and the download link, which work without script.
    expect(html).toContain(
      `<img src="${STORY_IMG}" width="1080" height="1920" alt="Karta do udostępnienia: ZOFIA, dziewczynki"`,
    );
    expect(html).toContain(
      `<a href="${STORY_IMG}" download="zofia-girls-story.png" data-action="save">Zapisz obraz</a>`,
    );
    // The format toggle, the current one marked.
    expect(html).toMatch(
      /<a class="bns-option bns-pill" href="[^"]*format=story[^"]*" aria-current="page" data-format="story">Pionowa 9:16<\/a>/u,
    );
    expect(html).toMatch(
      /<a class="bns-option bns-pill" href="[^"]*format=square[^"]*" data-format="square">Kwadrat 1:1<\/a>/u,
    );
    expect(html).toContain(
      "Link prowadzi do tej strony dla tego imienia i tej płci. Otwiera się po zalogowaniu.",
    );
    expect(html).toContain(
      "Na karcie jest tylko to, co widać za darmo · Nic o Twoim dziecku, tylko o imieniu",
    );
    expect(html).toContain('href="/pl/imiona-dla-dziecka?imie=ZOFIA&sex=girls#sex-girls"');
  });

  it("switches the preview to the square card, and keeps the basic card for ?card=paid without the entitlement", async () => {
    const square = await sheet("pl", { ...GIRLS, format: "square" }, { userId: "free" });
    expect(square).toContain(
      '<img src="/pl/imiona-dla-dziecka/karta/square?imie=ZOFIA&sex=girls" width="1080" height="1080"',
    );
    expect(square).toContain('download="zofia-girls-square.png"');
    expect(square).toMatch(/format=square[^"]*" aria-current="page"/u);
    const paid = await sheet("pl", { ...GIRLS, card: "paid" }, { userId: "free" });
    expect(paid).toContain(`<img src="${STORY_IMG}"`);
    expect(paid).toContain("bns-locked");
  });

  it("offers the paid card to an entitled account, story-only, with its own footer", async () => {
    const html = await sheet("pl", { ...GIRLS, card: "paid" }, { userId: "paid" });
    expect(html).toMatch(/<a class="bns-option" href="[^"]*card=paid[^"]*" aria-current="page"/u);
    expect(html).not.toContain("Wkrótce");
    expect(html).not.toContain("bns-locked");
    expect(html).toContain(
      '<img src="/pl/imiona-dla-dziecka/karta/paid?imie=ZOFIA&sex=girls" width="1080" height="1920"',
    );
    expect(html).toContain("Karta „Rok po roku” jest tylko pionowa.");
    expect(html).not.toContain('data-format="square"');
    expect(html).toContain('download="zofia-girls-paid.png"');
    expect(html).toContain("Na karcie są liczby z widoku „Rok po roku”");
    expect(html).not.toMatch(/checkout|stripe/iu);
    // And the basic card still, when chosen.
    const basic = await sheet("en", { name: "Zofia", sex: "girls" }, { userId: "paid" });
    expect(basic).toMatch(/href="[^"]*card=paid[^"]*"/u);
    expect(basic).toContain('<img src="/en/baby-names/card/story?name=ZOFIA&sex=girls"');
    expect(basic).toContain("Portrait 9:16");
  });
});

describe("the sheet's routes (AC-3)", () => {
  const PAGES = [
    { lang: "pl", Page: PlSheet, metadata: plMetadata, path: "/pl/imiona-dla-dziecka/udostepnij" },
    { lang: "en", Page: EnSheet, metadata: enMetadata, path: "/en/baby-names/share" },
  ] as const;

  it("answer 404 with the flag unset or not exactly 1, with empty metadata", async () => {
    for (const value of [undefined, "0", "true"]) {
      vi.stubEnv("BABY_NAMES_ENABLED", value);
      for (const { Page, metadata } of PAGES) {
        await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({
          digest: expect.stringContaining("404") as unknown,
        });
        expect(metadata()).toEqual({});
      }
    }
  });

  it("answer 404 with the flag on but accounts off, and are noindex when on", async () => {
    vi.stubEnv("BABY_NAMES_ENABLED", "1");
    vi.stubEnv("ACCOUNTS_DATABASE_URL", undefined);
    vi.stubEnv("RESEND_API_KEY", undefined);
    vi.stubEnv("GOOGLE_CLIENT_ID", undefined);
    for (const { Page, metadata } of PAGES) {
      await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({
        digest: expect.stringContaining("404") as unknown,
      });
      expect(metadata().robots).toEqual({ index: false, follow: false });
    }
  });

  it("and the card routes are sent private, no-store by the middleware", () => {
    for (const path of [
      "/pl/imiona-dla-dziecka/udostepnij",
      "/en/baby-names/share",
      "/pl/imiona-dla-dziecka/karta/story",
      "/pl/imiona-dla-dziecka/karta/paid",
      "/en/baby-names/card/square",
    ]) {
      const response = middleware(
        new NextRequest(`https://name-atlas.pl${path}?imie=Zofia&sex=girls`),
      );
      expect(response.headers.get("cache-control"), path).toBe("private, no-store");
    }
  });

  it("are in no sitemap", () => {
    const dir = join(__dirname, "..", "app");
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
      );
    const files = readdirSync(dir)
      .filter((f) => f.startsWith("sitemap") || f.startsWith("robots"))
      .flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        /imiona-dla-dziecka|baby-names|udostepnij|\/karta\//u,
      );
    }
  });
});
