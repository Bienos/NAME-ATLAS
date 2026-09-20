import { describe, expect, it } from "vitest";
import { assertIngestionAllowed, evaluateRightsGate } from "./rights.js";
import { PeselImportError } from "./errors.js";
import type { IngestionRights } from "./rights.js";

/**
 * TASK-004 §11 unit item 6 — the rights hard gate
 * (docs/canonical/12 §6.4; ARCHITECTURE.md §10 invariant 13).
 *
 * Pure: it decides before a file is opened or a connection made, which is
 * what makes "writes nothing" structural rather than a promise.
 */
const open: IngestionRights = { automated_access: "ALLOWED", review_status: "APPROVED" };

describe("rights hard gate", () => {
  it("refuses when automated access is prohibited", () => {
    const verdict = evaluateRightsGate({ ...open, automated_access: "PROHIBITED" });
    expect(verdict.allowed).toBe(false);
    expect(verdict.refusal).toContain("automated_access = PROHIBITED");
  });

  it("refuses when the rights review is blocked", () => {
    const verdict = evaluateRightsGate({ ...open, review_status: "BLOCKED" });
    expect(verdict.allowed).toBe(false);
    expect(verdict.refusal).toContain("review_status = BLOCKED");
  });

  it("allows an unreviewed source, because internal ingestion is not a production surface", () => {
    // LEGAL_REVIEW_REQUIRED says a human has not reviewed the terms. It does
    // not say the terms forbid ingestion, and conflating the two would block
    // work the licence permits.
    expect(evaluateRightsGate({ ...open, review_status: "LEGAL_REVIEW_REQUIRED" }).allowed).toBe(
      true,
    );
  });

  it.each(["CONDITIONAL", "EXPIRED", "APPROVED"] as const)(
    "allows review status %s, which the gate does not rule on",
    (review_status) => {
      expect(evaluateRightsGate({ ...open, review_status }).allowed).toBe(true);
    },
  );

  it.each(["ALLOWED", "CONDITIONAL", "UNKNOWN"] as const)(
    "allows automated access %s",
    (automated_access) => {
      expect(evaluateRightsGate({ ...open, automated_access }).allowed).toBe(true);
    },
  );

  it("throws a typed refusal naming the subject", () => {
    let raised: unknown;
    try {
      assertIngestionAllowed({ ...open, automated_access: "PROHIBITED" }, "test profile");
    } catch (error: unknown) {
      raised = error;
    }
    expect(raised).toBeInstanceOf(PeselImportError);
    expect((raised as PeselImportError).reasonCode).toBe("rights_gate");
    expect((raised as PeselImportError).message).toContain("test profile");
  });

  it("does not throw when the gate allows the run", () => {
    expect(() => assertIngestionAllowed(open, "test profile")).not.toThrow();
  });
});
