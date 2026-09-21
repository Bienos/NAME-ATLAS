import { describe, expect, it } from "vitest";
import {
  DERIVE_SURNAME_CLAIMS,
  JOB_SCHEMAS,
  QUEUE_NAME,
  deriveSurnameClaimsPayload,
  isJobName,
} from "./jobs.js";

/** TASK-020. A payload crosses a process boundary, so its schema is the contract. */

describe("job names", () => {
  it("recognises only the jobs that exist", () => {
    expect(isJobName(DERIVE_SURNAME_CLAIMS)).toBe(true);
    expect(isJobName("derive-everything")).toBe(false);
    expect(isJobName("")).toBe(false);
  });

  it("has a schema for every name, so nothing can be enqueued unvalidated", () => {
    for (const name of Object.keys(JOB_SCHEMAS)) {
      expect(isJobName(name)).toBe(true);
    }
    expect(Object.keys(JOB_SCHEMAS)).toEqual([DERIVE_SURNAME_CLAIMS]);
  });

  it("names one queue", () => {
    expect(QUEUE_NAME).toBe("name-atlas-runtime");
  });
});

describe("deriveSurnameClaimsPayload", () => {
  it("accepts a surname with the correlation id that caused it", () => {
    const parsed = deriveSurnameClaimsPayload.safeParse({
      surname: "NOWAK",
      correlationId: "01a0c30a-c803-7665-bb5e-5cdd6c8b2406",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty surname, which would resolve to nothing forever", () => {
    expect(deriveSurnameClaimsPayload.safeParse({ surname: "", correlationId: "x" }).success).toBe(
      false,
    );
  });

  it("rejects a surname beyond the operational limit", () => {
    expect(
      deriveSurnameClaimsPayload.safeParse({ surname: "x".repeat(201), correlationId: "x" })
        .success,
    ).toBe(false);
  });

  it("requires the correlation id, so a job cannot be untraceable", () => {
    expect(deriveSurnameClaimsPayload.safeParse({ surname: "NOWAK" }).success).toBe(false);
    expect(
      deriveSurnameClaimsPayload.safeParse({ surname: "NOWAK", correlationId: "" }).success,
    ).toBe(false);
  });
});
