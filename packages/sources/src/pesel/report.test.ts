import { describe, expect, it } from "vitest";
import { formatPeselImportReport, reconciles, tallyQuarantineReasons } from "./report.js";
import type { PeselImportReport, QuarantinedPeselRow } from "./report.js";

/**
 * TASK-004 §11 unit item 7 — the reconciliation arithmetic holds.
 *
 * Every row read is accounted for exactly once. On a committed run this is
 * AC-23's identity `rows read = rows imported + rows quarantined`; the
 * rolled-back term exists because the answer to §14 U-5 aborts a run
 * containing any quarantined row, and those runs import nothing.
 */
function report(overrides: Partial<PeselImportReport> = {}): PeselImportReport {
  return {
    disposition: "IMPORTED",
    resourceRole: "national_male",
    externalRecordId: "1148808",
    contentHash: "a".repeat(64),
    rowsRead: 22,
    rowsImported: 22,
    rowsQuarantined: 0,
    rowsRolledBack: 0,
    quarantinedByReason: {},
    quarantined: [],
    surnamesCreated: 22,
    surnamesReused: 0,
    snapshotsWritten: 22,
    valuesWritten: 22,
    sourceRecordId: "record-1",
    supersededSourceRecordId: null,
    ...overrides,
  };
}

const quarantinedRow = (
  line: number,
  reason: QuarantinedPeselRow["reason"],
): QuarantinedPeselRow => ({
  line,
  raw: `SYNTHETIC-${String(line)}`,
  canonicalKey: `synthetic-${String(line)}`,
  reason,
  candidateSurnameIds: [],
});

describe("reconciliation arithmetic", () => {
  it("holds for a committed run", () => {
    expect(reconciles(report())).toBe(true);
  });

  it("reduces to rows read = rows imported + rows quarantined when nothing rolled back", () => {
    const committed = report();
    expect(committed.rowsRolledBack).toBe(0);
    expect(committed.rowsRead).toBe(committed.rowsImported + committed.rowsQuarantined);
  });

  it("holds for an aborted run, where nothing was imported", () => {
    const aborted = report({
      disposition: "ABORTED_QUARANTINE",
      rowsRead: 22,
      rowsImported: 0,
      rowsQuarantined: 2,
      rowsRolledBack: 20,
      quarantined: [quarantinedRow(5, "MULTIPLE_EXACT"), quarantinedRow(9, "REVIEW_REQUIRED")],
      quarantinedByReason: { MULTIPLE_EXACT: 1, REVIEW_REQUIRED: 1 },
      surnamesCreated: 0,
      surnamesReused: 0,
      snapshotsWritten: 0,
      valuesWritten: 0,
      sourceRecordId: null,
    });
    expect(reconciles(aborted)).toBe(true);
  });

  it("holds for an already-imported run, where nothing was read", () => {
    const noop = report({
      disposition: "ALREADY_IMPORTED",
      rowsRead: 0,
      rowsImported: 0,
      rowsQuarantined: 0,
      rowsRolledBack: 0,
      surnamesCreated: 0,
      snapshotsWritten: 0,
      valuesWritten: 0,
    });
    expect(reconciles(noop)).toBe(true);
    expect(noop.rowsRead).toBe(noop.rowsImported + noop.rowsQuarantined);
  });

  it("fails when rows go unaccounted for", () => {
    expect(reconciles(report({ rowsRead: 23 }))).toBe(false);
  });

  it("fails when rows imported and values written disagree", () => {
    expect(reconciles(report({ valuesWritten: 21 }))).toBe(false);
  });

  it("fails when the quarantine count and the quarantined rows disagree", () => {
    expect(reconciles(report({ rowsQuarantined: 1, rowsRead: 23 }))).toBe(false);
  });
});

describe("quarantine tally", () => {
  it("counts each reason", () => {
    expect(
      tallyQuarantineReasons([
        quarantinedRow(2, "MULTIPLE_EXACT"),
        quarantinedRow(3, "MULTIPLE_EXACT"),
        quarantinedRow(4, "MALFORMED_CONTROL_CHARACTERS"),
      ]),
    ).toEqual({ MULTIPLE_EXACT: 2, MALFORMED_CONTROL_CHARACTERS: 1 });
  });

  it("returns an empty tally for no quarantined rows", () => {
    expect(tallyQuarantineReasons([])).toEqual({});
  });
});

describe("report formatting", () => {
  it("prints every field AC-23 requires", () => {
    const printed = formatPeselImportReport(report());
    for (const label of [
      "rows read:",
      "rows imported:",
      "surnames created:",
      "surnames reused:",
      "rows quarantined:",
      "snapshots written:",
      "values written:",
      "quarantined by reason:",
    ]) {
      expect(printed).toContain(label);
    }
    expect(printed).toContain("reconciles:         yes");
  });

  it("lists each quarantine reason with its count", () => {
    const printed = formatPeselImportReport(
      report({
        disposition: "ABORTED_QUARANTINE",
        rowsImported: 0,
        rowsQuarantined: 1,
        rowsRolledBack: 21,
        valuesWritten: 0,
        snapshotsWritten: 0,
        surnamesCreated: 0,
        quarantined: [quarantinedRow(7, "REVIEW_REQUIRED")],
        quarantinedByReason: { REVIEW_REQUIRED: 1 },
      }),
    );
    expect(printed).toContain("REVIEW_REQUIRED: 1");
    expect(printed).toContain("ABORTED_QUARANTINE");
  });
});
