import { describe, expect, it } from "vitest";
import { JOURNEY_STEPS } from "./dusk-world.js";
import { SECTIONS, SNAPSHOT_ANCHOR, SOURCES_ANCHOR, SUMMARY_ANCHOR } from "./sections.js";

/**
 * TASK-053: the world follows the journey by element id, so its list of
 * screens is the registry's anchors and nothing else.
 */
describe("the journey's screens", () => {
  it("are the snapshot, every chapter's anchor, the sources and the summary, each once", () => {
    expect(JOURNEY_STEPS).toEqual([
      SNAPSHOT_ANCHOR,
      ...SECTIONS.map((section) => section.anchor),
      SOURCES_ANCHOR,
      SUMMARY_ANCHOR,
    ]);
    expect(new Set(JOURNEY_STEPS).size).toBe(JOURNEY_STEPS.length);
  });
});
