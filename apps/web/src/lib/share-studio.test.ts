import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STUDIO_METADATA, ShareStudio, chosenCard } from "./share-studio.js";
import type { GateVerdict } from "./download-gate.js";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import type { ShareCardKey } from "./share-facts.js";

/** TASK-093 §3.3, AC-3 to AC-5: the share studio for each verdict of the download gate. */

const OFFERED: readonly ShareCardKey[] = ["summary", "rarity", "where"];

function studio(gate: GateVerdict, lang: Lang = "pl", card: ShareCardKey = "rarity"): string {
  const path = lang === "en" ? "/en/surname/kowalski" : "/pl/nazwisko/kowalski";
  return renderToStaticMarkup(
    createElement(ShareStudio, {
      lang,
      surname: "KOWALSKI",
      path,
      otherPath: lang === "en" ? "/pl/nazwisko/kowalski" : "/en/surname/kowalski",
      offered: OFFERED,
      card,
      gate,
      shareUrl: `https://atlas.test${path}`,
    }),
  );
}

const unescape = (html: string) => html.replaceAll("&amp;", "&");

describe("the share studio (TASK-093)", () => {
  it("is never indexed (AC-3)", () => {
    expect(STUDIO_METADATA.robots).toEqual({ index: false, follow: false });
  });

  it("gives the full image and the buttons with accounts off or a session (AC-4)", () => {
    for (const gate of ["off", "open"] as const) {
      const html = studio(gate);
      expect(html, gate).toContain('src="/pl/nazwisko/kowalski/karta/rarity"');
      expect(html, gate).not.toContain("/podglad");
      expect(html, gate).toContain(UI.pl.studioDownload);
      expect(html, gate).toContain(UI.pl.studioInstagram);
      expect(html, gate).not.toContain(UI.pl.studioSignInPrompt);
    }
  });

  it("gives a reader without a session the preview and a sign-in that returns here (AC-4)", () => {
    for (const lang of ["pl", "en"] as const) {
      const html = unescape(studio("sign-in", lang));
      const t = UI[lang];
      expect(html).toContain(
        lang === "pl"
          ? 'src="/pl/nazwisko/kowalski/karta/rarity/podglad"'
          : 'src="/en/surname/kowalski/card/rarity/preview"',
      );
      expect(html).toContain(t.studioSignInPrompt);
      expect(html).not.toContain(t.studioDownload);
      const next = encodeURIComponent(
        lang === "pl"
          ? "/pl/nazwisko/kowalski/udostepnij?card=rarity"
          : "/en/surname/kowalski/share?card=rarity",
      );
      expect(html).toContain(
        lang === "pl"
          ? `href="/pl/konto/zaloguj?next=${next}"`
          : `href="/en/account/sign-in?next=${next}"`,
      );
    }
  });

  it("gives the preview and a message when the accounts database cannot say (AC-4)", () => {
    const html = studio("unavailable");
    expect(html).toContain("/karta/rarity/podglad");
    expect(html).toContain(UI.pl.studioUnavailable);
    expect(html).not.toContain(UI.pl.studioDownload);
  });

  it("lists the surname's cards, marks the one shown, and keeps the ways on (AC-5, §3.3)", () => {
    const html = unescape(studio("off"));
    expect(html).toContain('href="/pl/nazwisko/kowalski/udostepnij?card=summary"');
    expect(html).toContain('aria-current="page">Rzadkość<');
    expect(html).toContain('href="/pl/nazwisko/kowalski/udostepnij?card=where"');
    expect(html).not.toContain("card=meaning");
    expect(html).toContain('href="/pl/nazwisko/kowalski?view=cards"');
    expect(html).toContain('href="/pl/oferta"');
    // The page link's share is named apart from the card's own (TASK-093 follow-up).
    expect(html).toContain(`>${UI.pl.studioShareLink}</button>`);
    expect(html).toContain('href="/pl/porownaj?qa=KOWALSKI"');
    // The language switch leads to the studio in the other language.
    expect(html).toContain('href="/en/surname/kowalski/share?card=rarity"');
  });

  it("shows the summary for a missing or unknown card, and a card only if the surname has it (AC-5)", () => {
    expect(chosenCard(undefined, OFFERED)).toBe("summary");
    expect(chosenCard("horoscope", OFFERED)).toBe("summary");
    expect(chosenCard("meaning", OFFERED)).toBe("summary");
    expect(chosenCard("where", OFFERED)).toBe("where");
    expect(chosenCard(["rarity", "where"], OFFERED)).toBe("rarity");
    expect(chosenCard("summary", [])).toBeNull();
  });
});
