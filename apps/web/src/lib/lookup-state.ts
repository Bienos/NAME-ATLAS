import type { SurnameLookupOutcome } from "@name-atlas/resolver";
import type { PeselRegisterReading } from "@name-atlas/sources/pesel";

/**
 * Every state the results page can be in, explicitly — never inferred from
 * a missing field (ARCHITECTURE.md §6). Built from the resolver's outcome
 * and, for a resolved surname, the PESEL register reading.
 *
 * A database failure is `LOOKUP_FAILED`, never "unknown surname": an outage
 * must not read as a verdict on someone's name (TASK-003 §8 item 19).
 */
export type SurnameLookup =
  | { readonly state: "NOT_CONFIGURED" }
  | { readonly state: "LOOKUP_FAILED" }
  | {
      readonly state: "INVALID_INPUT";
      readonly reason: "EMPTY" | "EXCEEDS_OPERATIONAL_LIMIT" | "MALFORMED_CONTROL_CHARACTERS";
    }
  | {
      readonly state: "UNRESOLVED";
      readonly reason: "UNKNOWN" | "MULTIPLE_EXACT" | "REVIEW_REQUIRED";
    }
  | {
      readonly state: "RESOLVED";
      /** The surname's stored canonical display — the form the register lists. */
      readonly registerForm: string;
      /** `null` means the PESEL source has never been imported here. */
      readonly register: PeselRegisterReading | null;
    };

export interface LookupDependencies {
  resolve(raw: string): Promise<SurnameLookupOutcome>;
  readRegister(surnameId: string): Promise<PeselRegisterReading | null>;
  report(error: unknown): void;
}

export async function buildSurnameLookup(
  raw: string,
  dependencies: LookupDependencies | null,
): Promise<SurnameLookup> {
  if (!dependencies) {
    return { state: "NOT_CONFIGURED" };
  }

  const outcome = await dependencies.resolve(raw);
  if (outcome.kind === "LOOKUP_FAILED") {
    dependencies.report(outcome.cause);
    return { state: "LOOKUP_FAILED" };
  }

  const resolution = outcome.resolution;
  switch (resolution.resolution_status) {
    case "EXACT":
    case "KNOWN_VARIANT": {
      const surnameId = resolution.resolved_surname_id;
      const registerForm = resolution.resolved_canonical_display;
      if (surnameId === null || registerForm === null) {
        dependencies.report(new Error("resolved outcome without a surname id or display"));
        return { state: "LOOKUP_FAILED" };
      }
      try {
        return {
          state: "RESOLVED",
          registerForm,
          register: await dependencies.readRegister(surnameId),
        };
      } catch (error: unknown) {
        dependencies.report(error);
        return { state: "LOOKUP_FAILED" };
      }
    }
    case "UNKNOWN":
    case "MULTIPLE_EXACT":
    case "REVIEW_REQUIRED":
      return { state: "UNRESOLVED", reason: resolution.resolution_status };
    case "EMPTY":
    case "EXCEEDS_OPERATIONAL_LIMIT":
    case "MALFORMED_CONTROL_CHARACTERS":
      return { state: "INVALID_INPUT", reason: resolution.resolution_status };
  }
}
