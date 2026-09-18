import { afterEach, describe, expect, it } from "vitest";
import { freezeClock } from "./frozen-clock.js";
import type { FrozenClock } from "./frozen-clock.js";

describe("freezeClock", () => {
  let clock: FrozenClock | undefined;

  afterEach(() => {
    clock?.restore();
    clock = undefined;
  });

  it("pins Date.now() to the requested instant", () => {
    clock = freezeClock(new Date("2026-03-15T12:00:00.000Z"));
    expect(new Date().toISOString()).toBe("2026-03-15T12:00:00.000Z");
  });

  it("advances the clock by the requested number of milliseconds", () => {
    clock = freezeClock(new Date("2026-03-15T12:00:00.000Z"));
    clock.advance(60_000);
    expect(new Date().toISOString()).toBe("2026-03-15T12:01:00.000Z");
  });
});
