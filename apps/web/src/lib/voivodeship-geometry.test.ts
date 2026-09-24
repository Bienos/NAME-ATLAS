import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VOIVODESHIP_VIEWBOX, VOIVODESHIPS } from "./voivodeship-geometry.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const terc = JSON.parse(
  readFileSync(path.join(repoRoot, "fixtures/teryt/voivodeship-terc-correspondence.json"), "utf8"),
) as { correspondence: { terc_code: string; terc_name: string }[] };

describe("voivodeship geometry", () => {
  it("has exactly the 16 TERC voivodeships, under their TERC names", () => {
    const expected = Object.fromEntries(terc.correspondence.map((c) => [c.terc_code, c.terc_name]));
    const actual = Object.fromEntries(Object.entries(VOIVODESHIPS).map(([k, v]) => [k, v.name]));
    expect(actual).toEqual(expected);
    expect(Object.keys(actual)).toHaveLength(16);
  });

  it("gives every voivodeship a closed path inside the view box", () => {
    const [, , width, height] = VOIVODESHIP_VIEWBOX.split(" ").map(Number);
    for (const { d } of Object.values(VOIVODESHIPS)) {
      expect(d).toMatch(/^M[\d.]+,[\d.]+/u);
      expect(d.endsWith("Z")).toBe(true);
      for (const [, x, y] of d.matchAll(/([\d.]+),([\d.]+)/gu)) {
        expect(Number(x)).toBeLessThanOrEqual(width!);
        expect(Number(y)).toBeLessThanOrEqual(height!);
      }
    }
  });
});
