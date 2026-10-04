import { afterEach, describe, expect, it, vi } from "vitest";
import { savesThroughSheet } from "./share-actions.js";

/** A browser whose share sheet takes files, with the given user agent and touch points. */
function browser(userAgent: string, maxTouchPoints = 0, shares = true): void {
  vi.stubGlobal("navigator", {
    userAgent,
    maxTouchPoints,
    share: shares ? () => Promise.resolve() : undefined,
    canShare: shares ? () => true : undefined,
  });
}

describe("savesThroughSheet: the studio's save goes to the gallery through the share sheet", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("on an iPhone", () => {
    browser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15");
    expect(savesThroughSheet()).toBe(true);
  });

  it("on an iPad, which reports itself as a Mac with a touch screen", () => {
    browser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 5);
    expect(savesThroughSheet()).toBe(true);
  });

  it("not on a Mac without touch, nor on Android, whose downloads show in its gallery", () => {
    browser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 0);
    expect(savesThroughSheet()).toBe(false);
    browser("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile", 5);
    expect(savesThroughSheet()).toBe(false);
  });

  it("not where the share sheet does not take files", () => {
    browser("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)", 5, false);
    expect(savesThroughSheet()).toBe(false);
  });
});
