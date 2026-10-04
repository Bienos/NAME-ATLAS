import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GateVerdict } from "./download-gate.js";

/**
 * TASK-097 AC-3: the studio offers the video only where the card may be
 * downloaded. The button itself appears only in a browser that can encode, so
 * the client part is replaced with a marker that shows what it was given.
 */
vi.mock("./studio-client.js", () => ({
  StudioActions: () => null,
  StudioVideo: (props: { images: readonly string[]; fileName: string }) =>
    createElement("i", { "data-video": props.images.join(" "), "data-file": props.fileName }),
}));

const { ShareStudio } = await import("./share-studio.js");

function studio(gate: GateVerdict, lang: "pl" | "en" = "pl"): string {
  const path = lang === "en" ? "/en/surname/kowalski" : "/pl/nazwisko/kowalski";
  return renderToStaticMarkup(
    createElement(ShareStudio, {
      lang,
      surname: "KOWALSKI",
      path,
      otherPath: null,
      offered: ["summary", "rarity", "where"],
      card: "summary",
      gate,
      shareUrl: null,
    }),
  );
}

describe("the share video in the studio (TASK-097 AC-3)", () => {
  it("is offered with accounts off or a session, with every card the studio has, summary first", () => {
    for (const gate of ["off", "open"] as const) {
      const html = studio(gate);
      expect(html, gate).toContain(
        'data-video="/pl/nazwisko/kowalski/karta/summary /pl/nazwisko/kowalski/karta/rarity /pl/nazwisko/kowalski/karta/where"',
      );
      expect(html, gate).toContain('data-file="kowalski-wideo.mp4"');
    }
    expect(studio("open", "en")).toContain('data-file="kowalski-video.mp4"');
  });

  it("is not offered without a session or when the accounts database cannot say", () => {
    for (const gate of ["sign-in", "unavailable"] as const) {
      expect(studio(gate), gate).not.toContain("data-video");
    }
  });
});
