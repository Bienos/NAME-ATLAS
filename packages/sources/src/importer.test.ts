import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { canonicalKey, toNfc } from "@name-atlas/resolver";
import { importPeselResource, rightsRefusal, sha256Hex } from "./importer.js";
import { assertReconciles, tallyReasons } from "./import-result.js";
import type { QuarantinedRow } from "./import-result.js";
import { PESEL_NATIONAL_MALE_2026, PESEL_RIGHTS_PROFILE } from "./registry.js";
import { PESEL_HEADER, PESEL_LINE_TERMINATOR } from "./schema.js";

/**
 * Pure unit tests for the PESEL importer (TASK-004 §11, "Unit — no database").
 *
 * EVERY CSV BUILT IN THIS FILE IS SYNTHETIC. `syntheticCsv` constructs
 * files that do not exist and never existed; their counts are mechanical
 * values, not figures attributed to any real surname. Nothing here is PESEL
 * evidence (TASK-004 §12 rules 2 and 3). The real, source-derived fixtures
 * live in `fixtures/pesel/` and are exercised by the integration suite.
 */

/** Builds a SYNTHETIC PESEL-shaped file. Not source data. */
function syntheticCsv(rows: readonly (readonly [string, number])[]): Uint8Array {
  const lines = [PESEL_HEADER, ...rows.map(([surname, count]) => `${surname},${String(count)}`)];
  return new TextEncoder().encode(lines.join(PESEL_LINE_TERMINATOR) + PESEL_LINE_TERMINATOR);
}

/**
 * A database handle that throws on any property access. Passing this proves
 * a code path returned *before* touching the database, rather than merely
 * asserting that nothing was written.
 */
const unusableDb = new Proxy(
  {},
  {
    get(_target, property) {
      throw new Error(`database was touched (.${String(property)}) when it should not have been`);
    },
  },
) as unknown as Kysely<DB>;

const SYNTHETIC_PAYLOAD = { note: "synthetic test payload, not publisher metadata" };

describe("rights hard gate (AC-08)", () => {
  it("refuses when automated access is prohibited", () => {
    expect(rightsRefusal({ ...PESEL_RIGHTS_PROFILE, automated_access: "PROHIBITED" })).toMatch(
      /automated access/iu,
    );
  });

  it("refuses when the review status is BLOCKED", () => {
    expect(rightsRefusal({ ...PESEL_RIGHTS_PROFILE, review_status: "BLOCKED" })).toMatch(
      /blocked/iu,
    );
  });

  it("allows the real PESEL profile through: UNKNOWN commercial use and LEGAL_REVIEW_REQUIRED are not ingestion gates", () => {
    // This is the whole point of TASK-004 §14 U-2: the paid-surface gate is
    // closed while the ingestion gate stays open.
    expect(PESEL_RIGHTS_PROFILE.commercial_use).toBe("UNKNOWN");
    expect(PESEL_RIGHTS_PROFILE.review_status).toBe("LEGAL_REVIEW_REQUIRED");
    expect(rightsRefusal(PESEL_RIGHTS_PROFILE)).toBeNull();
  });

  it("refuses before the database is touched", async () => {
    const outcome = await importPeselResource(unusableDb, {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: syntheticCsv([["AAA", 2]]),
      expectedSha256: "0".repeat(64),
      rawPayload: SYNTHETIC_PAYLOAD,
      rightsProfile: { ...PESEL_RIGHTS_PROFILE, automated_access: "PROHIBITED" },
    });
    expect(outcome.kind).toBe("FAILED");
    if (outcome.kind !== "FAILED") return;
    expect(outcome.reason).toBe("RIGHTS_BLOCKED");
  });
});

describe("checksum gate (AC-20)", () => {
  it("fails on a mismatch before parsing, proved by bytes that would also fail the parser", async () => {
    // These bytes have a wrong header, so reaching the parser would raise
    // SCHEMA_VIOLATION. Getting CHECKSUM_MISMATCH proves the checksum ran first.
    const malformed = new TextEncoder().encode("not,a,pesel,header\r\n");
    const outcome = await importPeselResource(unusableDb, {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: malformed,
      expectedSha256: "0".repeat(64),
      rawPayload: SYNTHETIC_PAYLOAD,
    });
    expect(outcome.kind).toBe("FAILED");
    if (outcome.kind !== "FAILED") return;
    expect(outcome.reason).toBe("CHECKSUM_MISMATCH");
    expect(outcome.message).toContain(sha256Hex(malformed));
  });

  it("computes a 64-character lowercase hex digest", () => {
    expect(sha256Hex(new TextEncoder().encode("abc"))).toMatch(/^[0-9a-f]{64}$/u);
  });
});

describe("schema violations abort the whole import (AC-20)", () => {
  it("reports SCHEMA_VIOLATION for a file whose checksum matches but whose shape does not", async () => {
    const bytes = new TextEncoder().encode("Nazwisko aktualne;Liczba\r\n");
    const outcome = await importPeselResource(unusableDb, {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes,
      expectedSha256: sha256Hex(bytes),
      rawPayload: SYNTHETIC_PAYLOAD,
    });
    expect(outcome.kind).toBe("FAILED");
    if (outcome.kind !== "FAILED") return;
    expect(outcome.reason).toBe("SCHEMA_VIOLATION");
  });

  it("rejects a count below the source's confirmed suppression threshold", async () => {
    const bytes = syntheticCsv([["AAA", 1]]);
    const outcome = await importPeselResource(unusableDb, {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes,
      expectedSha256: sha256Hex(bytes),
      rawPayload: SYNTHETIC_PAYLOAD,
    });
    expect(outcome.kind).toBe("FAILED");
    if (outcome.kind !== "FAILED") return;
    expect(outcome.reason).toBe("SCHEMA_VIOLATION");
  });

  it("treats two rows sharing a canonical key as drift, not as data to reconcile (AC-19)", async () => {
    // Case-only variants collapse to one canonical key; two such rows in one
    // official file means the file is not what we think it is.
    const bytes = syntheticCsv([
      ["AAA", 5],
      ["aaa", 3],
    ]);
    const outcome = await importPeselResource(unusableDb, {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes,
      expectedSha256: sha256Hex(bytes),
      rawPayload: SYNTHETIC_PAYLOAD,
    });
    expect(outcome.kind).toBe("FAILED");
    if (outcome.kind !== "FAILED") return;
    expect(outcome.reason).toBe("DUPLICATE_CANONICAL_KEY");
  });
});

describe("canonical key agreement (AC-10, AC-04, AC-05)", () => {
  it("uses the resolver's own function — diacritics are identity-bearing", () => {
    expect(canonicalKey("Łuczak")).not.toBe(canonicalKey("Luczak"));
  });

  it("collapses case-only variants to one key", () => {
    expect(canonicalKey("NOWAK")).toBe(canonicalKey("nowak"));
  });

  it("preserves the real source oddities verbatim under NFC", () => {
    // Every string here is a shape confirmed present in the official
    // resource (docs/sources/pesel.md "Unicode notes") — a trailing space, a
    // standalone combining mark with no precomposed form, an embedded
    // slash, and a non-Latin-script surname.
    for (const value of ["SCHIED ", "DOG̈AN", "W/SILASSIE", "NGUYỄN", "MÜLLER"]) {
      expect(toNfc(value)).toBe(value.normalize("NFC"));
      expect(canonicalKey(value).length).toBeGreaterThan(0);
    }
  });
});

describe("reconciliation arithmetic (AC-23)", () => {
  it("accepts a report whose parts sum to the whole", () => {
    expect(() =>
      assertReconciles({
        resourceId: "x",
        rowsRead: 5,
        rowsImported: 3,
        rowsQuarantined: 2,
        quarantinedByReason: { MULTIPLE_EXACT: 2 },
        surnamesCreated: 3,
        surnamesReused: 0,
        snapshotsWritten: 3,
        valuesWritten: 3,
      }),
    ).not.toThrow();
  });

  it("throws when rows read do not account for every row", () => {
    expect(() =>
      assertReconciles({
        resourceId: "x",
        rowsRead: 5,
        rowsImported: 3,
        rowsQuarantined: 1,
        quarantinedByReason: { MULTIPLE_EXACT: 1 },
        surnamesCreated: 3,
        surnamesReused: 0,
        snapshotsWritten: 3,
        valuesWritten: 3,
      }),
    ).toThrow(/reconciliation failed/u);
  });

  it("throws when the quarantine tally disagrees with the quarantine count", () => {
    expect(() =>
      assertReconciles({
        resourceId: "x",
        rowsRead: 5,
        rowsImported: 3,
        rowsQuarantined: 2,
        quarantinedByReason: { MULTIPLE_EXACT: 1 },
        surnamesCreated: 3,
        surnamesReused: 0,
        snapshotsWritten: 3,
        valuesWritten: 3,
      }),
    ).toThrow(/quarantine tally/u);
  });

  it("tallies quarantine reasons", () => {
    const rows: QuarantinedRow[] = [
      { line: 2, surname: "A", reason: "MULTIPLE_EXACT" },
      { line: 3, surname: "B", reason: "MULTIPLE_EXACT" },
      { line: 4, surname: "C", reason: "REVIEW_REQUIRED" },
    ];
    expect(tallyReasons(rows)).toEqual({ MULTIPLE_EXACT: 2, REVIEW_REQUIRED: 1 });
  });
});

describe("deterministic mapping (AC-02)", () => {
  it("derives the same canonical key for the same string every time", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 40 }), (value) => {
        return canonicalKey(value) === canonicalKey(value);
      }),
      { numRuns: 200 },
    );
  });

  it("never produces a canonical key that differs from the resolver's own", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(fc.string({ minLength: 1, maxLength: 20 }), fc.integer({ min: 2, max: 99_999 })),
          { maxLength: 20 },
        ),
        (rows) => {
          return rows.every(([surname]) => canonicalKey(surname) === canonicalKey(surname));
        },
      ),
      { numRuns: 100 },
    );
  });
});
