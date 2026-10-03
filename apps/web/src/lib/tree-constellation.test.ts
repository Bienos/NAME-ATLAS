import { describe, expect, it } from "vitest";
import {
  arcPath,
  constellation,
  linePath,
  pickSlot,
  position,
  SKY,
  starKind,
  viewBox,
} from "./tree-constellation.js";
import { pedigree } from "./tree-pedigree.js";
import { ID, person, tree, treeForMember } from "./tree-fixture.js";

/**
 * TASK-084 AC-2 and AC-3: the stars stand where the artboard puts them, the
 * lines say what joins whom, a star's kind follows the slot.
 */

const slots = () => pedigree(tree());
const byN = (n: number) => slots().find((slot) => slot.n === n);

describe("the constellation's geometry (TASK-084, AC-2)", () => {
  it("puts the root at the bottom centre and the parents on the first arc, father left of mother", () => {
    expect(position(1)).toEqual({ x: SKY.cx, y: SKY.cy });
    const father = position(2);
    const mother = position(3);
    expect(father.x).toBeLessThan(SKY.cx);
    expect(mother.x).toBeGreaterThan(SKY.cx);
    expect(father.y).toBe(mother.y);
    // 135° on the first radius.
    expect(father.x).toBeCloseTo(SKY.cx - (SKY.radii[1] ?? 0) * Math.SQRT1_2, 0);
    expect(father.y).toBeCloseTo(SKY.cy - (SKY.radii[1] ?? 0) * Math.SQRT1_2, 0);
  });

  it("spreads each generation over its half-circle, from the father's side to the mother's", () => {
    const xs = [4, 5, 6, 7].map((n) => position(n).x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    const radius = SKY.radii[2] ?? 0;
    for (const n of [4, 5, 6, 7]) {
      const { x, y } = position(n);
      expect(Math.hypot(x - SKY.cx, y - SKY.cy)).toBeCloseTo(radius, 0);
      expect(y).toBeLessThan(SKY.cy);
    }
    expect(arcPath(1)).toBe(`M${SKY.cx - 150} ${SKY.cy} A150 150 0 0 1 ${SKY.cx + 150} ${SKY.cy}`);
  });

  it("joins a parent to its child: open to an empty place, lit at the picked star, solid elsewhere", () => {
    const sky = constellation(slots(), 1);
    expect(sky.stars.map((star) => star.slot.n)).toEqual(slots().map((slot) => slot.n));
    const line = (to: number) => sky.lines.find((l) => l.to === to);
    expect(line(2)).toMatchObject({ from: 1, kind: "hot" });
    expect(line(3)).toMatchObject({ from: 1, kind: "hot" });
    expect(line(4)).toMatchObject({ from: 2, kind: "solid" });
    expect(line(7)).toMatchObject({ from: 3, kind: "open" });
    expect(line(8)).toMatchObject({ from: 4, kind: "open" });
    expect(sky.lines.every((l) => l.from === Math.floor(l.to / 2))).toBe(true);
    expect(sky.arcs.map((arc) => arc.generation)).toEqual([1, 2, 3]);

    const antoni = constellation(slots(), 10);
    expect(antoni.lines.find((l) => l.to === 10)).toMatchObject({ from: 5, kind: "hot" });
    // Only the lines that touch the picked star are lit, not the whole way to the root.
    expect(antoni.lines.find((l) => l.to === 5)).toMatchObject({ from: 2, kind: "solid" });
    expect(antoni.lines.find((l) => l.to === 2)).toMatchObject({ kind: "solid" });
    // An empty place stays open even beside the picked star.
    const halina = constellation(slots(), 5);
    expect(halina.lines.find((l) => l.to === 11)).toMatchObject({ kind: "open" });

    const hot = linePath(antoni.lines, "hot");
    expect(hot.startsWith("M")).toBe(true);
    expect(hot.split("M").length - 1).toBe(1);
    expect(linePath(constellation(slots(), 5).lines, "hot").split("M").length - 1).toBe(2);
    expect(linePath(antoni.lines, "solid")).not.toContain("NaN");
  });

  it("fits the sky's viewBox to the highest arc it has", () => {
    const three = constellation(slots(), 1);
    expect(viewBox(three)).toBe(
      `0 ${SKY.cy - (SKY.radii[3] ?? 0) - 64} ${SKY.width} ${SKY.height - (SKY.cy - (SKY.radii[3] ?? 0) - 64)}`,
    );
    const two = constellation(
      slots().filter((slot) => slot.generation < 2),
      1,
    );
    expect(viewBox(two)).toBe("0 366 1000 274");
    expect(viewBox({ arcs: [] })).toBe("0 516 1000 124");
  });

  it("picks the slot the address names when the pedigree has it, else the root", () => {
    expect(pickSlot(slots(), null)).toBe(1);
    expect(pickSlot(slots(), "10")).toBe(10);
    expect(pickSlot(slots(), "99")).toBe(1);
    expect(pickSlot(slots(), "abc")).toBe(1);
    expect(pickSlot(slots(), "-2")).toBe(1);
    expect(pickSlot([], "1")).toBe(1);
  });
});

describe("a star's kind (TASK-084, AC-3)", () => {
  it("is living for a person treated as living, entered or from a source for the deceased, empty or hidden for a place", () => {
    expect(starKind(byN(1)!)).toBe("living");
    expect(starKind(byN(3)!)).toBe("living"); // no year of death: treated as living
    expect(starKind(byN(4)!)).toBe("entered");
    expect(starKind(byN(7)!)).toBe("empty");
    const sourced = {
      ...byN(10)!,
      person: { ...person(ID.antoni, "Antoni", "Kaczmarek", 1899, 1968), source_note: "Akt zgonu" },
    };
    expect(starKind(sourced)).toBe("source");
    const member = pedigree(treeForMember());
    expect(member.map((slot) => starKind(slot))).not.toContain("living");
  });
});
