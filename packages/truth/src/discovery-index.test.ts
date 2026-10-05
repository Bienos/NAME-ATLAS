import { describe, expect, it } from "vitest";
import type { MeaningInterpretation } from "@name-atlas/contracts";
import { originAlternatives, worksCited } from "./discovery-index.js";

/** A synthetic interpretation; no Polish surname's origin is asserted here. */
function interpretation(
  root_form: string | null,
  root_language: string | null,
  title: string,
): MeaningInterpretation {
  return {
    root_form,
    root_language,
    literal_gloss: "synthetic gloss",
    formation_type: "OTHER",
    work: { title, author_or_publisher: "Synthetic Author", year: 1933 },
    locator: "s. 1",
  };
}

describe("the DiscoveryIndex counts each item once (TASK-116 §3, canonical/17 §42)", () => {
  it("counts two works proposing the same root, in any case, as one origin alternative and two sources", () => {
    const agree = [
      interpretation("ROOT-1", "test", "Work A"),
      interpretation("root-1", "TEST", "Work B"),
    ];
    expect(originAlternatives(agree)).toBe(1);
    expect(worksCited(agree)).toBe(2);
  });

  it("counts two works proposing different roots as two of each", () => {
    const conflict = [
      interpretation("ROOT-1", "test", "Work A"),
      interpretation("ROOT-2", "test", "Work B"),
    ];
    expect(originAlternatives(conflict)).toBe(2);
    expect(worksCited(conflict)).toBe(2);
  });

  it("counts one work cited for two roots as one source", () => {
    const oneWork = [
      interpretation("ROOT-1", "test", "Work A"),
      interpretation("ROOT-2", "test", "Work A"),
    ];
    expect(originAlternatives(oneWork)).toBe(2);
    expect(worksCited(oneWork)).toBe(1);
  });

  it("never merges a stated root with no root: they are different statements", () => {
    expect(
      originAlternatives([
        interpretation("ROOT-1", "test", "Work A"),
        interpretation(null, null, "Work B"),
      ]),
    ).toBe(2);
  });

  it("counts nothing when there is nothing", () => {
    expect(originAlternatives([])).toBe(0);
    expect(worksCited([])).toBe(0);
  });
});
