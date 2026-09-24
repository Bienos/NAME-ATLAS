import { describe, expect, it, vi } from "vitest";
import type { SurnameLookupOutcome, SurnameResolution } from "@name-atlas/resolver";
import type { PeselRegisterReading } from "@name-atlas/sources/pesel";
import { buildSurnameLookup } from "./lookup-state";
import type { LookupDependencies } from "./lookup-state";

/** A resolver outcome for the given status. Every value is synthetic. */
function outcome(
  status: SurnameResolution["resolution_status"],
  resolved: { id: string; display: string } | null = null,
): SurnameLookupOutcome {
  return {
    kind: "RESOLUTION",
    resolution: {
      raw_input: "Synthetic",
      unicode_nfc: "Synthetic",
      canonical_key: "synthetic",
      canonical_key_version: "test",
      validation_status: "VALID",
      resolution_status: status,
      outcome: resolved ? "RESOLVED" : "UNRESOLVED",
      resolved_surname_id: resolved?.id ?? null,
      resolved_canonical_display: resolved?.display ?? null,
      candidate_surname_ids: [],
      matched_name_form_id: null,
      matched_form: null,
      resolution_method_version: "test",
      user_confirmation_required: false,
      detected_scripts: ["Latn"],
      primary_script: "Latn",
      mixed_script: false,
      script_confusable_flag: false,
    },
  };
}

const READING: PeselRegisterReading = {
  source: { name: "Synthetic source", publisher: null, referenceUrl: null },
  entries: [],
};

function dependencies(overrides: Partial<LookupDependencies> = {}): LookupDependencies {
  return {
    resolve: vi.fn(async () => outcome("UNKNOWN")),
    readRegister: vi.fn(async () => READING),
    report: vi.fn(),
    ...overrides,
  };
}

describe("buildSurnameLookup", () => {
  it("is NOT_CONFIGURED without a database — never an answer about the name", async () => {
    expect(await buildSurnameLookup("Nowak", null)).toEqual({ state: "NOT_CONFIGURED" });
  });

  it("reports a lookup failure as LOOKUP_FAILED, not as an unknown surname", async () => {
    const deps = dependencies({
      resolve: vi.fn(async (): Promise<SurnameLookupOutcome> => ({
        kind: "LOOKUP_FAILED",
        raw_input: "Nowak",
        unicode_nfc: "Nowak",
        canonical_key: "nowak",
        resolution_method_version: "test",
        stage: "T0_CANONICAL",
        message: "connection refused",
        cause: new Error("connection refused"),
      })),
    });
    expect(await buildSurnameLookup("Nowak", deps)).toEqual({ state: "LOOKUP_FAILED" });
    expect(deps.report).toHaveBeenCalledOnce();
    expect(deps.readRegister).not.toHaveBeenCalled();
  });

  it.each(["EXACT", "KNOWN_VARIANT"] as const)(
    "reads the register for a %s resolution, by the resolved id",
    async (status) => {
      const deps = dependencies({
        resolve: vi.fn(async () => outcome(status, { id: "id-1", display: "SYNTHETIC" })),
      });
      expect(await buildSurnameLookup("synthetic", deps)).toEqual({
        state: "RESOLVED",
        registerForm: "SYNTHETIC",
        register: READING,
      });
      expect(deps.readRegister).toHaveBeenCalledWith("id-1");
    },
  );

  it("keeps 'no PESEL data held' distinct from any register answer", async () => {
    const deps = dependencies({
      resolve: vi.fn(async () => outcome("EXACT", { id: "id-1", display: "SYNTHETIC" })),
      readRegister: vi.fn(async () => null),
    });
    expect(await buildSurnameLookup("synthetic", deps)).toMatchObject({
      state: "RESOLVED",
      register: null,
    });
  });

  it("turns a failing register read into LOOKUP_FAILED", async () => {
    const deps = dependencies({
      resolve: vi.fn(async () => outcome("EXACT", { id: "id-1", display: "SYNTHETIC" })),
      readRegister: vi.fn(async () => {
        throw new Error("invariant broken");
      }),
    });
    expect(await buildSurnameLookup("synthetic", deps)).toEqual({ state: "LOOKUP_FAILED" });
    expect(deps.report).toHaveBeenCalledOnce();
  });

  it.each(["UNKNOWN", "MULTIPLE_EXACT", "REVIEW_REQUIRED"] as const)(
    "is UNRESOLVED (%s) without touching the register",
    async (status) => {
      const deps = dependencies({ resolve: vi.fn(async () => outcome(status)) });
      expect(await buildSurnameLookup("synthetic", deps)).toEqual({
        state: "UNRESOLVED",
        reason: status,
      });
      expect(deps.readRegister).not.toHaveBeenCalled();
    },
  );

  it.each(["EMPTY", "EXCEEDS_OPERATIONAL_LIMIT", "MALFORMED_CONTROL_CHARACTERS"] as const)(
    "is INVALID_INPUT (%s)",
    async (status) => {
      const deps = dependencies({ resolve: vi.fn(async () => outcome(status)) });
      expect(await buildSurnameLookup("synthetic", deps)).toEqual({
        state: "INVALID_INPUT",
        reason: status,
      });
    },
  );
});
