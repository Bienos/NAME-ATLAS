import { describe, expect, it } from "vitest";
import { COUPLE_NAMES_LIMIT, coupleNames, nameRow, partOf } from "./couple.js";
import { resolved, unresolved } from "./couple-fixture.js";

/** TASK-100 §3.3.1: the names a couple could carry, and what one lookup says of each. */
describe("coupleNames", () => {
  it("lists A, B, each other form, both joined orders, and the joined orders in the other forms", () => {
    const names = coupleNames(
      { display: "KOWALSKI", otherForm: "KOWALSKA" },
      { display: "WIŚNIEWSKA", otherForm: "WIŚNIEWSKI" },
    );
    expect(names).toEqual([
      "KOWALSKI",
      "WIŚNIEWSKA",
      "KOWALSKA",
      "WIŚNIEWSKI",
      "KOWALSKI-WIŚNIEWSKA",
      "WIŚNIEWSKA-KOWALSKI",
      "KOWALSKA-WIŚNIEWSKI",
      "WIŚNIEWSKI-KOWALSKA",
    ]);
    expect(names.length).toBeLessThanOrEqual(COUPLE_NAMES_LIMIT);
  });

  it("joins a part in its other form where only that part has one", () => {
    expect(
      coupleNames(
        { display: "KOWALSKI", otherForm: "KOWALSKA" },
        { display: "NOWAK", otherForm: null },
      ),
    ).toEqual([
      "KOWALSKI",
      "NOWAK",
      "KOWALSKA",
      "KOWALSKI-NOWAK",
      "NOWAK-KOWALSKI",
      "KOWALSKA-NOWAK",
      "NOWAK-KOWALSKA",
    ]);
  });

  it("shows a surname with no other form as itself and its two joined orders, each once", () => {
    expect(
      coupleNames({ display: "NOWAK", otherForm: null }, { display: "WÓJCIK", otherForm: null }),
    ).toEqual(["NOWAK", "WÓJCIK", "NOWAK-WÓJCIK", "WÓJCIK-NOWAK"]);
  });

  it("shows duplicates once, letter case aside", () => {
    expect(
      coupleNames({ display: "NOWAK", otherForm: null }, { display: "Nowak", otherForm: null }),
    ).toEqual(["NOWAK", "NOWAK-Nowak"]);
    expect(
      coupleNames(
        { display: "KOWALSKI", otherForm: "KOWALSKA" },
        { display: "KOWALSKA", otherForm: "KOWALSKI" },
      ),
    ).toEqual(["KOWALSKI", "KOWALSKA", "KOWALSKI-KOWALSKA", "KOWALSKA-KOWALSKI"]);
  });

  it("never lists more than eight", () => {
    expect(COUPLE_NAMES_LIMIT).toBe(8);
  });
});

describe("partOf", () => {
  it("takes the display name and other_form from a resolved result, and nothing from an unresolved one", () => {
    expect(
      partOf(
        resolved({
          id: "01a0b9e3-34f3-7633-a239-2b8596dfc001",
          display: "KOWALSKI",
          otherForm: { id: "01a0b9e3-34f3-7633-a239-2b8596dfc002", display: "KOWALSKA" },
        }),
      ),
    ).toEqual({ display: "KOWALSKI", otherForm: "KOWALSKA" });
    expect(
      partOf(resolved({ id: "01a0b9e3-34f3-7633-a239-2b8596dfc003", display: "NOWAK" })),
    ).toEqual({
      display: "NOWAK",
      otherForm: null,
    });
    expect(partOf(unresolved())).toBeNull();
    expect(partOf(null)).toBeNull();
  });
});

describe("nameRow", () => {
  it("gives each list's count, never summed", () => {
    const row = nameRow(
      "NOWAK",
      resolved({
        id: "01a0b9e3-34f3-7633-a239-2b8596dfc003",
        display: "NOWAK",
        counts: [
          [98_387, "male"],
          [99_738, "female"],
        ],
      }),
    );
    expect(row).toEqual({
      name: "NOWAK",
      kind: "LISTED",
      counts: [
        { group: "pesel_2026_national_male", count: 98_387, snapshot_date: "2026-01-20" },
        { group: "pesel_2026_national_female", count: 99_738, snapshot_date: "2026-01-20" },
      ],
    });
  });

  it("reads an unresolved name, or one the register has no evidence for, as not on the list, never 0", () => {
    expect(nameRow("NOWAK-WÓJCIK", unresolved())).toEqual({
      name: "NOWAK-WÓJCIK",
      kind: "NOT_LISTED",
    });
    const noEvidence = resolved({
      id: "01a0b9e3-34f3-7633-a239-2b8596dfc004",
      display: "X-Y",
      counts: [],
    });
    expect(nameRow("X-Y", noEvidence)).toEqual({ name: "X-Y", kind: "NOT_LISTED" });
  });

  it("reads a failed lookup as no figure, not as an absence", () => {
    expect(nameRow("NOWAK", null)).toEqual({ name: "NOWAK", kind: "NO_FIGURE" });
  });
});
