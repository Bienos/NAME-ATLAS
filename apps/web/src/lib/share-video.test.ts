import { afterEach, describe, expect, it, vi } from "vitest";
import { VIDEO, canMakeVideo, resetVideoAbilityForTests, videoSchedule } from "./share-video.js";

/** TASK-097 AC-1 and AC-2: the clip's timeline, and whether the browser may make it. */

describe("the clip's timeline (AC-1)", () => {
  it("lasts 8 to 15 seconds for one to seven cards, and caps at seven", () => {
    for (let n = 1; n <= 7; n++) {
      const { duration, hold } = videoSchedule(n);
      expect(duration, String(n)).toBeGreaterThanOrEqual(8);
      expect(duration, String(n)).toBeLessThanOrEqual(15);
      expect(hold).toBeGreaterThanOrEqual(VIDEO.minHold);
    }
    expect(videoSchedule(12).duration).toBe(videoSchedule(7).duration);
  });

  it("holds each card in order, slides to the next, and closes on the summary", () => {
    const s = videoSchedule(3);
    const step = s.hold + VIDEO.transition;
    for (let i = 0; i < 3; i++) {
      expect(s.frameAt(i * step + s.hold / 2)).toEqual({ card: i, next: null, mix: 0 });
    }
    const slide = s.frameAt(s.hold + VIDEO.transition / 2);
    expect(slide.card).toBe(0);
    expect(slide.next).toBe(1);
    expect(slide.mix).toBeCloseTo(0.5, 5);
    // After the last card the summary slides back in and is held to the end.
    expect(s.frameAt(2 * step + s.hold + VIDEO.transition / 2)).toMatchObject({ card: 2, next: 0 });
    expect(s.frameAt(s.duration - 0.01)).toEqual({ card: 0, next: null, mix: 0 });
    expect(s.duration).toBeCloseTo(3 * s.hold + 3 * VIDEO.transition + VIDEO.closing, 9);
  });

  it("eases a slide from still to still", () => {
    const s = videoSchedule(2);
    expect(s.frameAt(s.hold).mix).toBe(0);
    const late = s.frameAt(s.hold + VIDEO.transition * 0.999).mix;
    expect(late).toBeGreaterThan(0.99);
    expect(s.frameAt(s.hold + VIDEO.transition * 0.25).mix).toBeLessThan(0.25);
  });

  it("holds a single card for the whole clip", () => {
    const s = videoSchedule(1);
    expect(s.duration).toBe(8);
    for (const t of [0, 3, 7.9]) expect(s.frameAt(t)).toEqual({ card: 0, next: null, mix: 0 });
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
