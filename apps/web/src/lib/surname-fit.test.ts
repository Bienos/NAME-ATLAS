import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DISPLAY_FONT_SHA256 } from "./display-metrics.js";
import { surnameEm } from "./surname-fit.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("the surname hero's measured width", () => {
  it("is measured from the committed Fraunces Medium, the face the pages and the card share", () => {
    // The pages load Fraunces with its optical-size axis; a surname at 56–96px
    // is drawn near the 72 pt cut this file is (TASK-052, ADR-0021).
    const card = readFileSync(path.join(appRoot, "assets/fonts/Fraunces-Medium.ttf"));
    expect(createHash("sha256").update(card).digest("hex")).toBe(DISPLAY_FONT_SHA256);
    expect(DISPLAY_FONT_SHA256).toBe(
      "934b0448ec4605c4b10dc43b1f2d6b95aeb4e121d58e48ce6ee4a6ca046004d8",
    );
  });

  it("uses real advance widths, so two ten-letter names differ", () => {
    // Summed from the file's hmtx: NOWAK's advances are 3.883 em, WAWRZYNIAK's
    // 7.082 em; the tracking is -0.04 em per letter.
    expect(surnameEm("NOWAK")).toBeCloseTo(3.883 - 5 * 0.04, 3);
    expect(surnameEm("WAWRZYNIAK")).toBeCloseTo(7.082 - 10 * 0.04, 3);
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
