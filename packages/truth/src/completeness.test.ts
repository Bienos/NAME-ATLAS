import { describe, expect, it } from "vitest";
import { assessUniverseCompleteness } from "./completeness.js";
import { PESEL_NATIONAL_MALE_2026 } from "@name-atlas/sources";

/**
 * The gate is the substance of TASK-009, so it is tested as a pure function
 * with no database: every branch, and the four situations AC-02 enumerates.
 *
 * The figures below are the real ones. `official_sha256` and
 * `official_row_count` come from the source registry, and the "fixture"
 * digest is the actual SHA-256 of `fixtures/pesel/national-male-2026-01-20.csv`
 * — which is what the repository has ingested by default, and the reason a
 * naive rank would be false.
 */
const OFFICIAL_SHA = PESEL_NATIONAL_MALE_2026.official_sha256;
const OFFICIAL_ROWS = PESEL_NATIONAL_MALE_2026.official_row_count;
const FIXTURE_SHA = "426f44a2304a1f80a5f51c3c7d5f37498d4ecef92076ec7b3ef73a4266be2448";

const descriptor = { officialSha256: OFFICIAL_SHA, officialRowCount: OFFICIAL_ROWS };

describe("assessUniverseCompleteness", () => {
  it("accepts a universe whose checksum and row count both match the registry", () => {
    const verdict = assessUniverseCompleteness({
      externalRecordId: "1148808",
      actualContentHash: OFFICIAL_SHA,
      actualRowCount: OFFICIAL_ROWS,
      descriptor,
    });
    expect(verdict).toEqual({ kind: "COMPLETE", universeSize: OFFICIAL_ROWS });
  });

  it("rejects the committed fixture import, which is the repository's default state", () => {
    const verdict = assessUniverseCompleteness({
      externalRecordId: "1148808",
      actualContentHash: FIXTURE_SHA,
      actualRowCount: 22,
      descriptor,
    });
    expect(verdict.kind).toBe("INCOMPLETE");
    if (verdict.kind !== "INCOMPLETE") throw new Error("unreachable");
    expect(verdict.reason).toBe("CONTENT_HASH_MISMATCH");
    expect(verdict.expectedRowCount).toBe(OFFICIAL_ROWS);
    expect(verdict.actualRowCount).toBe(22);
    expect(verdict.expectedContentHash).toBe(OFFICIAL_SHA);
    expect(verdict.actualContentHash).toBe(FIXTURE_SHA);
  });

  it("reports the checksum mismatch rather than the row count, because it is the precise cause", () => {
    // Both are wrong here. Reporting "22 of 408182 rows" alone would imply an
    // interrupted import of the right file, which is a different problem.
    const verdict = assessUniverseCompleteness({
      externalRecordId: "1148808",
      actualContentHash: FIXTURE_SHA,
      actualRowCount: 22,
      descriptor,
    });
    if (verdict.kind !== "INCOMPLETE") throw new Error("unreachable");
    expect(verdict.reason).toBe("CONTENT_HASH_MISMATCH");
    expect(verdict.message).toContain("not the official resource");
  });

  it("rejects the right bytes with too few rows persisted — a partial or interrupted import", () => {
    const verdict = assessUniverseCompleteness({
      externalRecordId: "1148808",
      actualContentHash: OFFICIAL_SHA,
      actualRowCount: OFFICIAL_ROWS - 1,
      descriptor,
    });
    if (verdict.kind !== "INCOMPLETE") throw new Error("unreachable");
    expect(verdict.reason).toBe("ROW_COUNT_SHORT");
    expect(verdict.message).toContain("matches on checksum");
  });

  it("rejects more rows than the resource holds", () => {
    const verdict = assessUniverseCompleteness({
      externalRecordId: "1148808",
      actualContentHash: OFFICIAL_SHA,
      actualRowCount: OFFICIAL_ROWS + 1,
      descriptor,
    });
    if (verdict.kind !== "INCOMPLETE") throw new Error("unreachable");
    expect(verdict.reason).toBe("ROW_COUNT_EXCESS");
  });

  it("fails closed on an unknown resource: undecidable is not the same as complete", () => {
    const verdict = assessUniverseCompleteness({
      externalRecordId: "99999",
      actualContentHash: OFFICIAL_SHA,
      actualRowCount: OFFICIAL_ROWS,
      descriptor: null,
    });
    if (verdict.kind !== "INCOMPLETE") throw new Error("unreachable");
    expect(verdict.reason).toBe("UNKNOWN_RESOURCE");
    expect(verdict.expectedRowCount).toBeNull();
    expect(verdict.expectedContentHash).toBeNull();
  });

  it("fails closed when the source record carries no external id at all", () => {
    const verdict = assessUniverseCompleteness({
      externalRecordId: null,
      actualContentHash: OFFICIAL_SHA,
      actualRowCount: OFFICIAL_ROWS,
      descriptor: null,
    });
    if (verdict.kind !== "INCOMPLETE") throw new Error("unreachable");
    expect(verdict.reason).toBe("UNKNOWN_RESOURCE");
  });

  it("requires BOTH signals: a matching checksum alone does not pass", () => {
    // A truncated copy of the right file would have the right provenance and
    // the wrong universe. The conjunction is the point.
    const hashOnly = assessUniverseCompleteness({
      externalRecordId: "1148808",
      actualContentHash: OFFICIAL_SHA,
      actualRowCount: 1,
      descriptor,
    });
    expect(hashOnly.kind).toBe("INCOMPLETE");

    // And a right-sized different file has the right universe size and the
    // wrong provenance.
    const countOnly = assessUniverseCompleteness({
      externalRecordId: "1148808",
      actualContentHash: "0".repeat(64),
      actualRowCount: OFFICIAL_ROWS,
      descriptor,
    });
    expect(countOnly.kind).toBe("INCOMPLETE");
  });

  it("takes its expected figures from the registry, never from a literal", () => {
    // Guards against the gate being weakened by hard-coding the fixture's
    // numbers into the predicate itself.
    expect(OFFICIAL_ROWS).toBe(408_182);
    expect(OFFICIAL_SHA).not.toBe(FIXTURE_SHA);
  });
});
