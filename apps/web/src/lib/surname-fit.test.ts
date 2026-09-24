import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DISPLAY_FONT_SHA256 } from "./display-metrics.js";
import { surnameEm } from "./surname-fit.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("the surname hero's measured width", () => {
  it("is measured from the pages' 16 pt cut, not the share card's display cut", () => {
    // The card's Newsreader is the 72 pt cut, about 3% wider; metrics taken
    // from it would fit every page surname to the wrong width.
    const card = readFileSync(path.join(appRoot, "assets/fonts/Newsreader-Medium.ttf"));
    expect(createHash("sha256").update(card).digest("hex")).not.toBe(DISPLAY_FONT_SHA256);
    expect(DISPLAY_FONT_SHA256).toBe(
      "68c4493c7c6c9aaff48defeeb6408e7ce705efc4c33363de4d9d6f5e07775064",
    );
  });

  it("uses real advance widths, so two ten-letter names differ", () => {
    // Checked against fontTools on the same file: NOWAK's advances sum to
    // 4.035 em, WAWRZYNIAK's to 7.35 em; the tracking is -0.04 em per letter.
    expect(surnameEm("NOWAK")).toBeCloseTo(4.035 - 5 * 0.04, 3);
    expect(surnameEm("WAWRZYNIAK")).toBeCloseTo(7.35 - 10 * 0.04, 3);
    expect(surnameEm("WAWRZYNIAK")).toBeGreaterThan(surnameEm("WIŚNIEWSKI"));
  });

  it("measures the composed and decomposed spelling alike", () => {
    expect(surnameEm("ŁÓDŹ")).toBeCloseTo(surnameEm("ŁÓDŹ"), 6);
  });

  it("counts a character the face lacks as an average capital, not as nothing", () => {
    expect(surnameEm("ЖЖ")).toBeCloseTo(2 * 0.7 - 2 * 0.04, 6);
  });

  it("never hands the stylesheet a width it could divide by badly", () => {
    expect(surnameEm("")).toBe(1);
  });
});
