import { vi } from "vitest";

/**
 * Freezes `Date`/`setTimeout`/etc. at a fixed instant for deterministic
 * tests (docs/canonical/17 §3.1 — Vitest with a mocked clock). Returns a
 * handle whose `restore()` must be called in test teardown.
 */
export interface FrozenClock {
  readonly now: Date;
  advance(ms: number): void;
  restore(): void;
}

export function freezeClock(at: Date = new Date("2026-01-01T00:00:00.000Z")): FrozenClock {
  vi.useFakeTimers();
  vi.setSystemTime(at);

  return {
    now: at,
    advance(ms: number) {
      vi.advanceTimersByTime(ms);
    },
    restore() {
      vi.useRealTimers();
    },
  };
}
