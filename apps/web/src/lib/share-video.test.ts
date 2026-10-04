import { afterEach, describe, expect, it, vi } from "vitest";
import {
  VIDEO,
  canMakeVideo,
  layerUrls,
  resetVideoAbilityForTests,
  videoSchedule,
} from "./share-video.js";

/** TASK-097 AC-2 and TASK-105 AC-1: the clip's timeline, and whether the browser may make it. */

const FULL = { length: "full", motion: "up" } as const;
const SHORT = { length: "short", motion: "side" } as const;

describe("the clip's timeline (TASK-105 AC-1)", () => {
  it("opens on the surname, then the cards in order, and the full clip closes on the summary", () => {
    expect(videoSchedule(3, FULL).segments).toEqual([
      { kind: "intro" },
      { kind: "card", card: 0, closing: false },
      { kind: "card", card: 1, closing: false },
      { kind: "card", card: 2, closing: false },
      { kind: "card", card: 0, closing: true },
    ]);
    // The short clip takes at most three cards and does not close again.
    expect(videoSchedule(7, SHORT).segments.map((s) => s.kind === "card" && s.card)).toEqual([
      false,
      0,
      1,
      2,
    ]);
    expect(videoSchedule(12, FULL).duration).toBe(videoSchedule(7, FULL).duration);
  });

  it("lasts 7 to 20 seconds for the full clip and 7 to 8 for the short one", () => {
    for (let n = 1; n <= 7; n++) {
      const full = videoSchedule(n, FULL).duration;
      expect(full, String(n)).toBeGreaterThanOrEqual(7);
      expect(full, String(n)).toBeLessThanOrEqual(20);
      const short = videoSchedule(n, SHORT).duration;
      expect(short, String(n)).toBeGreaterThanOrEqual(7);
      expect(short, String(n)).toBeLessThanOrEqual(8);
    }
  });

  it("draws the surname in on the opening plate, then pushes the summary in", () => {
    const s = videoSchedule(2, FULL);
    expect(s.frameAt(0)).toMatchObject({ segment: { kind: "intro" }, next: null, wipe: 0 });
    expect(s.frameAt(VIDEO.wipeStart + VIDEO.wipe / 2).wipe).toBeCloseTo(0.5, 5);
    expect(s.frameAt(VIDEO.intro - 0.01).wipe).toBe(1);
    const push = s.frameAt(VIDEO.intro + VIDEO.transition / 2);
    expect(push.segment.kind).toBe("intro");
    expect(push.next).toEqual({ kind: "card", card: 0, closing: false });
    expect(push.mix).toBeCloseTo(0.5, 5);
  });

  it("brings a card's figures in after it lands, whole, and keeps them for the closing summary", () => {
    const s = videoSchedule(2, FULL);
    const landed = VIDEO.intro + VIDEO.transition;
    expect(s.frameAt(landed + 0.01)).toMatchObject({ segment: { card: 0 }, reveal: 0 });
    expect(s.frameAt(landed + VIDEO.revealStart + VIDEO.reveal / 2).reveal).toBeCloseTo(0.5, 5);
    expect(s.frameAt(landed + VIDEO.revealStart + VIDEO.reveal + 0.01).reveal).toBe(1);
    expect(s.frameAt(s.duration - 0.01)).toMatchObject({
      segment: { kind: "card", card: 0, closing: true },
      next: null,
      reveal: 1,
    });
  });

  it("eases a push from still to still", () => {
    const s = videoSchedule(2, FULL);
    expect(s.frameAt(VIDEO.intro).mix).toBe(0);
    expect(s.frameAt(VIDEO.intro + VIDEO.transition * 0.999).mix).toBeGreaterThan(0.99);
    expect(s.frameAt(VIDEO.intro + VIDEO.transition * 0.25).mix).toBeLessThan(0.25);
  });

  it("reads each card in two layers and the opening from the summary's image", () => {
    expect(
      layerUrls(["/pl/nazwisko/nowak/karta/summary", "/pl/nazwisko/nowak/karta/where"], 1),
    ).toEqual({
      intro: {
        plate: "/pl/nazwisko/nowak/karta/summary?layer=intro",
        name: "/pl/nazwisko/nowak/karta/summary?layer=intro-name",
      },
      cards: [
        {
          base: "/pl/nazwisko/nowak/karta/summary?layer=base",
          reveal: "/pl/nazwisko/nowak/karta/summary?layer=reveal",
        },
      ],
    });
    expect(layerUrls([], 3)).toEqual({ intro: null, cards: [] });
  });
});

describe("whether the browser can make the clip (AC-2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetVideoAbilityForTests();
  });

  it("is false without WebCodecs", async () => {
    vi.stubGlobal("VideoEncoder", undefined);
    resetVideoAbilityForTests();
    expect(await canMakeVideo()).toBe(false);
  });

  it("follows the encoder's answer for the H.264 configuration at 1080 × 1920", async () => {
    const isConfigSupported = vi.fn(async () => ({ supported: false }));
    vi.stubGlobal("VideoEncoder", { isConfigSupported });
    resetVideoAbilityForTests();
    expect(await canMakeVideo()).toBe(false);
    expect(isConfigSupported).toHaveBeenCalledWith(
      expect.objectContaining({ codec: VIDEO.codec, width: 1080, height: 1920, framerate: 30 }),
    );
    isConfigSupported.mockResolvedValue({ supported: true });
    resetVideoAbilityForTests();
    expect(await canMakeVideo()).toBe(true);
  });

  it("is false when the encoder throws", async () => {
    vi.stubGlobal("VideoEncoder", {
      isConfigSupported: () => Promise.reject(new Error("no")),
    });
    resetVideoAbilityForTests();
    expect(await canMakeVideo()).toBe(false);
  });
});
