import { describe, expect, it } from "vitest";
import { applySlice, filingLetter, parseSliceSpec, SliceSpecError } from "./slice.js";
import type { LinedRow } from "./slice.js";

function lined(...entries: readonly (readonly [string, number])[]): LinedRow[] {
  return entries.map(([surname, count], index) => ({
    row: { surname, count },
    line: index + 2,
  }));
}

describe("parseSliceSpec", () => {
  it("reads top:N", () => {
    expect(parseSliceSpec("top:5000")).toEqual({ kind: "TOP", count: 5000 });
  });

  it("reads prefix:A-F and uppercases it", () => {
    expect(parseSliceSpec("prefix:a-f")).toEqual({ kind: "PREFIX", from: "A", to: "F" });
  });

  it("fails closed on an unreadable expression rather than importing everything", () => {
    for (const bad of ["", "5000", "top:", "top:0", "prefix:F-A", "prefix:A", "all"]) {
      expect(() => parseSliceSpec(bad), bad).toThrow(SliceSpecError);
    }
  });
});

describe("filingLetter", () => {
  it("folds Polish diacritics to the base letter a reader files under", () => {
    expect(filingLetter("Ćwik")).toBe("C");
    expect(filingLetter("Ąder")).toBe("A");
    expect(filingLetter("Żurek")).toBe("Z");
    expect(filingLetter("Śliwa")).toBe("S");
  });

  it("maps Ł, which NFD does not decompose", () => {
    expect(filingLetter("Łuczak")).toBe("L");
    expect(filingLetter("łuczak")).toBe("L");
  });

  it("returns null rather than guessing for a non-Latin or non-letter start", () => {
    expect(filingLetter("ЌATOVIЌ")).toBeNull();
    expect(filingLetter("/SILASSIE")).toBeNull();
    expect(filingLetter("")).toBeNull();
  });
});

describe("applySlice TOP", () => {
  const rows = lined(["NOWAK", 200], ["KOWALSKI", 150], ["RARE", 1], ["WISNIEWSKI", 120]);

  it("keeps the largest counts and reports the rest as excluded", () => {
    const { kept, excluded } = applySlice(rows, { kind: "TOP", count: 2 });
    expect(kept.map((entry) => entry.row.surname)).toEqual(["NOWAK", "KOWALSKI"]);
    expect(excluded).toBe(2);
  });

  it("preserves input order in kept, so the file's order survives the filter", () => {
    const { kept } = applySlice(rows, { kind: "TOP", count: 3 });
    expect(kept.map((entry) => entry.line)).toEqual([2, 3, 5]);
  });

  it("carries each row's original line, never a recomputed position", () => {
    const { kept } = applySlice(rows, { kind: "TOP", count: 1 });
    expect(kept[0]?.line).toBe(2);
    const tail = applySlice(rows, { kind: "TOP", count: 4 }).kept.at(-1);
    expect(tail?.row.surname).toBe("WISNIEWSKI");
    expect(tail?.line).toBe(5);
  });

  it("breaks ties deterministically, so one file and one N give one slice", () => {
    const tied = lined(["B", 10], ["A", 10], ["C", 10]);
    const first = applySlice(tied, { kind: "TOP", count: 2 }).kept;
    const second = applySlice(tied, { kind: "TOP", count: 2 }).kept;
    expect(first.map((e) => e.row.surname)).toEqual(second.map((e) => e.row.surname));
    expect(first.map((e) => e.row.surname)).toEqual(["B", "A"]);
  });

  it("keeps everything when N exceeds the file", () => {
    const { kept, excluded } = applySlice(rows, { kind: "TOP", count: 99 });
    expect(kept).toHaveLength(4);
    expect(excluded).toBe(0);
  });
});

describe("applySlice PREFIX", () => {
  const rows = lined(["ADAMSKI", 5], ["ĆWIK", 4], ["NOWAK", 3], ["ŁUCZAK", 2], ["FIT", 1]);

  it("keeps the inclusive range, folding diacritics into it", () => {
    const { kept, excluded } = applySlice(rows, { kind: "PREFIX", from: "A", to: "F" });
    expect(kept.map((entry) => entry.row.surname)).toEqual(["ADAMSKI", "ĆWIK", "FIT"]);
    expect(excluded).toBe(2);
  });

  it("excludes a surname whose filing letter cannot be established", () => {
    const odd = lined(["ЌATOVIЌ", 9]);
    expect(applySlice(odd, { kind: "PREFIX", from: "A", to: "Z" }).kept).toHaveLength(0);
  });

  it("preserves original lines across the gap it leaves", () => {
    const { kept } = applySlice(rows, { kind: "PREFIX", from: "A", to: "F" });
    expect(kept.map((entry) => entry.line)).toEqual([2, 3, 6]);
  });
});
