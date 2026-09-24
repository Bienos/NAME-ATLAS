import { describe, expect, it } from "vitest";
import { countGraphemes, surnameSizing, surnameSizingStyle } from "./surname-sizing";

describe("countGraphemes", () => {
  it("counts user-perceived letters, not code units", () => {
    // D + O + G̈ (G + U+0308 COMBINING DIAERESIS) + A + N — a real PESEL form.
    expect("DOG̈AN".length).toBe(6);
    expect(countGraphemes("DOG̈AN")).toBe(5);
    // Ễ precomposed and decomposed are both one grapheme.
    expect(countGraphemes("NGUYỄN")).toBe(6);
    expect(countGraphemes("NGUYỄN")).toBe(6);
    expect(countGraphemes("Łuczak")).toBe(6);
  });
});

describe("surnameSizing (visual system §6.3)", () => {
  it.each([
    ["Nowak", 1, false],
    ["Kowalczyk", 1, false],
    ["Wiśniewskaaa", 0.88, false],
    ["Brzęczyszczykiewicz", 0.75, false],
    ["Konstantynopolitańczykowianeczka", 0.75, true],
  ] as const)("sizes %s by its grapheme tier", (name, scale, fitted) => {
    expect(surnameSizing(name)).toMatchObject({ scale, fitted });
  });

  it("puts the tier boundaries at 10, 16 and 22 graphemes", () => {
    const tier = (length: number) => surnameSizing("a".repeat(length));
    expect(tier(10).scale).toBe(1);
    expect(tier(11).scale).toBe(0.88);
    expect(tier(16).scale).toBe(0.88);
    expect(tier(17).scale).toBe(0.75);
    expect(tier(22).fitted).toBe(false);
    expect(tier(23).fitted).toBe(true);
  });

  it("never divides by zero for an empty field", () => {
    expect(surnameSizingStyle("")["--surname-graphemes"]).toBe("1");
  });
});
